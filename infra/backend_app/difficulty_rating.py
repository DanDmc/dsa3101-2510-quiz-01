"""
Difficulty Rating Training Script (5-Feature Version)

This module trains a resilient machine learning pipeline to predict question difficulty 
(0-1) using text (TF-IDF), categorical (One-Hot), AND readability features.

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
import re # Added for readability feature extraction

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
    import MySQLdb as mysql # mysqlclient
except ImportError: # pure python fallback
    import pymysql as mysql # type: ignore

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


# ---------------------- READABILITY FEATURE LOGIC (From V2) ----------------------
_SENT_SPLIT = re.compile(r'[.!?]')


def _syllable_count(w): return 1


def _compute_readability_features(texts):
    """
    description: Calculates the Flesch Reading Ease (FRE) and Flesch-Kincaid Grade Level (FKGL) 
                 for a collection of text strings. It handles non-string inputs and empty texts 
                 by applying defaults to avoid division by zero.

    args:
        texts (list or numpy.ndarray): A sequence of strings (or potentially non-strings) 
                                       to analyze for readability features.

    returns:
        numpy.ndarray: A 2-dimensional array of shape (n, 2), where n is the number of input texts. 
                       Each row contains the calculated [FRE, FKGL] scores.

    raises:
        # Since the function includes defensive checks (e.g., setting n_w=1 if no tokens), 
        # it is robust against common errors like ZeroDivisionError.
        # No specific external exceptions are guaranteed to be raised by this function itself.
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


def numeric_feats_from_df(X):
    """
    description: Applies _compute_readability_features to the 'question_stem' column of a DataFrame.
                 It first handles missing values by replacing them with an empty string.

    args:
        X (pandas.DataFrame): The input DataFrame containing the data. 
                              It must include a column named 'question_stem'.

    returns:
        numpy.ndarray or pandas.DataFrame: The computed readability features 
                                           returned by the internal function _compute_readability_features.

    raises:
        KeyError: If the input DataFrame X is missing the required 'question_stem' column.
    """

    stems = X["question_stem"].fillna("").to_numpy()
    return _compute_readability_features(stems)


# This alias is necessary for joblib to find the function when loading the pipeline
_numeric_feats_from_df = numeric_feats_from_df


# ---------------------- Pipeline build ----------------------
def concat_text_cols(df: pd.DataFrame):
    """
    Concatenate question stem and tags text into a single text feature.

    This is a utility-style transform that joins:
        df["question_stem"] + " " + df["tags_text"]
    and returns a NumPy array of strings.

    Args:
        df (pd.DataFrame): Input dataframe with 'question_stem' and 'tags_text'.

    Returns:
        np.ndarray: Array of concatenated text strings.
    """
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
    
    # 2. Categorical Features (One-Hot on question type)
    cat_branch = Pipeline(steps=[
        ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=True)),
    ])

    # 3. Numeric Features (Readability scores from FunctionTransformer)
    # The 'FunctionTransformer' calls 'numeric_feats_from_df' on the input dataframe.
    num_branch = Pipeline(steps=[
        ("numeric_feats", FunctionTransformer(numeric_feats_from_df, validate=False)),
    ])

    # Combine all feature branches
    prep = ColumnTransformer(
        transformers=[
            ("stem", stem_branch, "question_stem"),
            ("tags", tags_branch, "tags_text"),
            ("cat",  cat_branch,  ["question_type"]),
            ("num",  num_branch,  ["question_stem"]), # Pass question_stem to numeric_feats_from_df
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

    # Use all columns needed for the 5 features in the pipeline
    X = df[["question_stem", "tags_text", "question_type"]].copy() 
    y = df["y"].astype(float)

    # Train pipeline
    pipe = build_pipeline()
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)
    pipe.fit(Xtr, ytr)
    pred = np.clip(pipe.predict(Xte), 0.0, 1.0)

    print(
        f"[difficulty] MAE={mean_absolute_error(yte, pred):.4f}  R2={r2_score(yte, pred):.4f}  n_test={len(yte)}")

    # Save pipeline (NOT just Ridge) to the preferred path
    out_path = os.getenv("diff_model_path", "./models/model_ridge.pkl") # Changed default name
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    joblib.dump(pipe, out_path)
    print(f"[difficulty] Saved Pipeline to {out_path}")


if __name__ == "__main__":
    main()