"""
Difficulty Rating Training Script

This module trains a machine learning pipeline to predict question difficulty
(0-1) from the existing `questions` table in the quizbank database.

Flow:
1. Connect to MySQL using env vars (MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_PORT).
2. Pull rows with a non-NULL `difficulty_rating_manual`.
3. Turn `concept_tags` into text, and use three feature branches:
   - TF-IDF over `question_stem`
   - TF-IDF over tags text (parsed from JSON)
   - One-hot over `question_type`
4. Fit a Ridge regressor.
5. Report MAE and R² on a holdout split.
6. Save the entire pipeline (preprocessing + model) to `diff_model_path`
   so the Flask app can later `joblib.load(...)` it and call `.predict(...)`.

This script is meant to be run as a standalone training job:
    python train_difficulty.py
(or similar).
"""

import os
import json
from contextlib import closing
import re  # <-- 1. IMPORT ADDED

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import OneHotEncoder, FunctionTransformer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import Ridge
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import joblib

# --- DB driver: prefer MySQLdb, fall back to PyMySQL (works on macOS) ---
try:
    import MySQLdb as mysql  # mysqlclient
except ImportError:  # pure python fallback
    import pymysql as mysql  # type: ignore

# --- Load ../.env automatically when running locally ---
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(
        os.path.dirname(__file__), '..', '.env'))
except Exception:
    pass


# ---------------------- DB helpers ----------------------
def get_conn():
    """
    Create and return a MySQL connection using environment variables.

    Environment variables:
        - MYSQL_HOST (default "127.0.0.1")
        - MYSQL_USER (default "quizbank_user")
        - MYSQL_PASSWORD (default "quizbank_pass")
        - MYSQL_DATABASE (default "quizbank")
        - MYSQL_PORT (default 3306)

    Returns:
        mysql.connections.Connection: An open DB connection ready for queries.
    """
    return mysql.connect(
        host=os.getenv("MYSQL_HOST", "127.0.0.1"),
        user=os.getenv("MYSQL_USER", "quizbank_user"),
        passwd=os.getenv("MYSQL_PASSWORD", "quizbank_pass"),
        db=os.getenv("MYSQL_DATABASE", "quizbank"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        charset="utf8mb4",
    )


def parse_tags(val):
    """
    
    Normalize the `concept_tags` field from the DB into a single space-joined string.

    The DB stores `concept_tags` as JSON text (e.g. '["regression", "anova"]').
    This helper converts it into `"regression anova"` so it can be TF-IDF'ed.

    Args:
        val (Any): Raw value from the DB (None, str JSON, list, tuple, etc.)

    Returns:
        str: Space-joined tag string suitable for text vectorization.
    """
    if val is None or val == "":
        return ""
    if isinstance(val, (list, tuple)):
        return " ".join(map(str, val))
    try:
        parsed = json.loads(val)
        if isinstance(parsed, (list, tuple)):
            return " ".join(map(str, parsed))
        return str(parsed)
    except Exception:
        return str(val)


# ---------------------- MODEL LOADING & PREDICTION (NEW) ----------------------

# 2. HELPER FUNCTIONS FOR THE MODEL (MOVED FROM APP.PY)
_SENT_SPLIT = re.compile(r'[.!?]')


def _syllable_count(w): return 1


def _compute_readability_features(texts):
    """
    texts: iterable of question stems (strings)
    returns: np.ndarray shape (n, 2) with:
           [Flesch Reading Ease, Flesch-Kincaid Grade Level]
    """
    rows = []

    for t in texts:
        t = t if isinstance(t, str) else ""
        tokens = re.findall(r"\b\w+\b", t)
        n_w = len(tokens) if tokens else 1
        n_sents = max(1, len([s for s in _SENT_SPLIT.split(t) if s.strip()]))
        n_syll = sum(_syllable_count(w) for w in tokens) if tokens else 1

        # Flesch Reading Ease (higher = easier)
        fre = 206.835 - 1.015 * (n_w / n_sents) - 84.6 * (n_syll / n_w)
        # Flesch-Kincaid Grade Level (higher = harder)
        fkgl = 0.39 * (n_w / n_sents) + 11.8 * (n_syll / n_w) - 15.59

        rows.append([fre, fkgl])
    return np.array(rows, dtype=float)


# This is the function you found in app.py. It now lives here.
def numeric_feats_from_df(X):
    stems = X["question_stem"].fillna("").to_numpy()
    return _compute_readability_features(stems)  # <-- This will now work


# This is the alias your model file (difficulty_v1.pkl) is looking for.
_numeric_feats_from_df = numeric_feats_from_df


# Function to load the model
def load_model(path):
    try:
        # The functions above must be defined *before* this load() call
        model = joblib.load(path)
        print(f"[difficulty] Model loaded successfully from {path}")
        return model
    except Exception as e:
        # This will catch the 'Cant get attribute' error if functions are missing
        print(f"[difficulty] Model not loaded ({path}): {e}")
        return None


# This is the global variable your app.py imports
# It will be 'None' if load_model fails
difficulty_model = load_model(os.getenv(
    "diff_model_path", "./models/difficulty_v1.pkl"))


# This is the prediction function your app.py imports
def predict_row(row_data):
    """
    Takes a single row (as a dict) from the DB and returns a difficulty score.
    """
    if difficulty_model is None:
        raise ValueError("Model is not loaded.")

    try:
        # 1. Convert the single row_data (dict) into a pandas DataFrame
        # The DataFrame must have the *exact* column names the model was trained on.
        df = pd.DataFrame([row_data])

        # 2. Re-create any feature columns (like 'tags_text' from your training script)
        # This part MUST match the features your model expects.
        if "concept_tags" in df.columns:
            df["tags_text"] = df["concept_tags"].apply(parse_tags)

        # 3. The model's "predict" method expects a DataFrame.
        prediction = difficulty_model.predict(df)

        # 4. Return the first (and only) prediction as a float
        return float(prediction[0])

    except Exception as e:
        print(
            f"ERROR during predict_row for id={row_data.get('id')}: {e}")
        return 0.5  # Return a default value on failure


# ---------------------- Pipeline build (FOR TRAINING) ----------------------
def concat_text_cols(df: pd.DataFrame):
    return (df["question_stem"].fillna("") + " " + df["tags_text"].fillna("")).to_numpy()


def build_pipeline() -> Pipeline:
    """
    Build the full sklearn pipeline for difficulty prediction.

    The pipeline:
        - applies TF-IDF to question stems (1-2 grams)
        - applies TF-IDF to tags text (1-2 grams)
        - one-hot encodes question_type
        - combines all features with ColumnTransformer (sparse)
        - fits a Ridge regressor

    Returns:
        sklearn.pipeline.Pipeline: A ready-to-fit pipeline that takes a dataframe
        with columns ["question_stem", "tags_text", "question_type"] and outputs
        a difficulty score.
    """
    # Separate TF-IDF vectorizers for each text column (no custom function)
    stem_branch = Pipeline(steps=[
        ("tfidf_stem", TfidfVectorizer(
            ngram_range=(1, 2), min_df=2, max_features=20000)),
    ])
    tags_branch = Pipeline(steps=[
        ("tfidf_tags", TfidfVectorizer(
            ngram_range=(1, 2), min_df=2, max_features=20000)),
    ])
    cat_branch = Pipeline(steps=[
        ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=True)),
    ])

    prep = ColumnTransformer(
        transformers=[
            ("stem", stem_branch, "question_stem"),
            ("tags", tags_branch, "tags_text"),
            ("cat",  cat_branch,  ["question_type"]),
        ],
        remainder="drop",
        sparse_threshold=1.0,
    )

    reg = Ridge(alpha=1.0, random_state=42)
    pipe = Pipeline(steps=[("prep", prep), ("reg", reg)])
    return pipe

# ---------------------- Training entry ----------------------


def main():
    """
    Entry point for training the difficulty prediction model.

    Steps:
        1. Query labeled data from the `questions` table:
           rows where `difficulty_rating_manual IS NOT NULL`.
        2. Coerce the target to float and clip to [0,1].
        3. Build feature columns:
               - question_stem
               - tags_text (from concept_tags via `parse_tags`)
               - question_type
        4. Train/test split (80/20).
        5. Fit the pipeline (preprocess + Ridge).
        6. Evaluate using MAE and R².
        7. Save the entire pipeline to `diff_model_path` (env) or
           `./models/difficulty_v1.pkl` by default.

    Environment:
        diff_model_path: override the output path for the saved pipeline.

    Side effects:
        - prints metrics to stdout
        - creates the output directory if needed
        - writes a `.pkl` with the trained pipeline

    Returns:
        None
    """
    # Pull labeled data
    sql = """
        SELECT question_stem, question_type, concept_tags, difficulty_rating_manual
        FROM questions
        WHERE difficulty_rating_manual IS NOT NULL
    """
    with closing(get_conn()) as conn:
        df = pd.read_sql(sql, conn)

    if df.empty:
        print(
            "[difficulty] No labeled rows found in questions.difficulty_rating_manual")
        return

    # Target in [0,1]
    y = pd.to_numeric(
        df["difficulty_rating_manual"], errors="coerce").clip(0.0, 1.0)
    df = df.assign(y=y).dropna(subset=["y"])

    # Build feature columns expected by the API
    df["tags_text"] = df["concept_tags"].apply(parse_tags)

    X = df[["question_stem", "tags_text", "question_type"]].copy()
    y = df["y"].astype(float)

    # Train pipeline
    pipe = build_pipeline()
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)
    pipe.fit(Xtr, ytr)
    pred = np.clip(pipe.predict(Xte), 0.0, 1.0)

    print(
        f"[difficulty] MAE={mean_absolute_error(yte, pred):.4f}  R2={r2_score(yte, pred):.4f}  n_test={len(yte)}")

    # Save pipeline (NOT just Ridge) to the configured path
    out_path = os.getenv("diff_model_path", "./models/difficulty_v1.pkl")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    joblib.dump(pipe, out_path)
    print(f"[difficulty] Saved Pipeline to {out_path}")


if __name__ == "__main__":
    main()