"""
Difficulty Rating Training Script (5-Feature Version)

This module trains a resilient machine learning pipeline to predict question difficulty 
(0-1) using text (TF-IDF), categorical (One-Hot), AND readability features.
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
    import MySQLdb as mysql 
except ImportError:
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
    """Create a DB connection using env vars (matches docker-compose)."""
    return mysql.connect(
        host=os.getenv("MYSQL_HOST", "127.0.0.1"),
        user=os.getenv("MYSQL_USER", "quizbank_user"),
        passwd=os.getenv("MYSQL_PASSWORD", "quizbank_pass"),
        db=os.getenv("MYSQL_DATABASE", "quizbank"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        charset="utf8mb4",
    )


def parse_tags(val):
    """concept_tags is stored as JSON (string) in DB; normalize to space-joined text."""
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
    Calculate Flesch Reading Ease and Flesch-Kincaid Grade Level.
    Returns: np.ndarray shape (n, 2) with: [FRE, FKGL]
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
    """Applies _compute_readability_features to the 'question_stem' column."""
    stems = X["question_stem"].fillna("").to_numpy()
    return _compute_readability_features(stems)


# This alias is necessary for joblib to find the function when loading the pipeline
_numeric_feats_from_df = numeric_feats_from_df


# ---------------------- Pipeline build ----------------------
def build_pipeline() -> Pipeline:
    """
    Build the full 5-feature sklearn pipeline for difficulty prediction.
    """
    
    # 1. Text Features (TF-IDF on stem/tags)
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
    """Entry point for training the difficulty prediction model."""
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