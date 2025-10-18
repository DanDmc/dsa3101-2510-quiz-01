# train_difficulty.py
import os, json
import pandas as pd
import numpy as np
from contextlib import closing

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import Ridge
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import MySQLdb

# quizbank
def get_conn():
    return MySQLdb.connect(
        host=os.getenv("MYSQL_HOST", "db"),
        user=os.getenv("MYSQL_USER", "root"),
        passwd=os.getenv("MYSQL_PASSWORD", "root"),
        db=os.getenv("MYSQL_DATABASE", "quizbank"),
        charset="utf8mb4"
    )

# check if there is the column mentioned
def has_column(conn, table: str, col: str) -> bool:
    with closing(conn.cursor()) as c:
        c.execute("""
          SELECT COUNT(*)
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = %s
            AND COLUMN_NAME = %s
        """, (table, col))
        return c.fetchone()[0] == 1

def parse_tags(val):
    if not val:
        return []
    if isinstance(val, (list, tuple)):
        return list(val)
    try:
        return json.loads(val) or []
    except Exception:
        return []

# ---------- Train ----------
def main():
    sql = """
        SELECT question_stem, question_type, concept_tags, difficulty_rating
        FROM questions
        WHERE difficulty_rating IS NOT NULL
    """
    with closing(get_conn()) as conn:
        df = pd.read_sql(sql, conn)

    if df.empty:
        print("No labeled rows in questions.difficulty_rating — add some labels first.")
        return

    # Ensure numeric in [0,1]; coerce bad values to NaN then drop
    y = pd.to_numeric(df["difficulty_rating"], errors="coerce")
    y = y.clip(0.0, 1.0)
    df = df.assign(y=y).dropna(subset=["y"])

    # Text features = stem + tags as space-joined
    df["tags_text"] = df["concept_tags"].apply(parse_tags).apply(lambda xs: " ".join(xs))
    df["text"] = (df["question_stem"].fillna("") + " " + df["tags_text"]).str.strip()

    X = df[["text", "question_type"]]
    y = df["y"].astype(float)

    text_vec = TfidfVectorizer(min_df=3, ngram_range=(1,2), max_features=20000)
    cat_enc  = OneHotEncoder(handle_unknown="ignore")

    pre = ColumnTransformer([
        ("text", text_vec, "text"),
        ("cats", cat_enc, ["question_type"]),
    ])

    model = Ridge(alpha=1.0, random_state=42)  # strong, fast baseline
    pipe = Pipeline([("prep", pre), ("reg", model)])

    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)
    pipe.fit(Xtr, ytr)
    pred = np.clip(pipe.predict(Xte), 0.0, 1.0)

    print(f"MAE={mean_absolute_error(yte, pred):.4f}  R2={r2_score(yte, pred):.4f}  n_test={len(yte)}")

    os.makedirs("models", exist_ok=True)
    joblib.dump(pipe, "models/difficulty_v1.pkl")
    print("Saved: models/difficulty_v1.pkl")

if __name__ == "__main__":
    main()
