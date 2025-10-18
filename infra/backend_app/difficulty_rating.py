# difficulty_rating.py
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

# concept tags stored as JSON in sql db, so ensure is python list
def parse_tags(val):
    if not val:
        return []
    if isinstance(val, (list, tuple)):
        return list(val)
    try:
        return json.loads(val) or []
    except Exception:
        return []

# model
def main():
    # select fields that are used in the model
    sql = """
        SELECT question_stem, question_type, concept_tags, difficulty_rating
        FROM questions
        WHERE difficulty_rating IS NOT NULL
    """
    with closing(get_conn()) as conn:
        df = pd.read_sql(sql, conn)

    if df.empty:
        print("No labeled rows in questions.difficulty_rating")
        return

    # Ensure numeric in [0,1]; drop row that has NA in difficulty_rating
    y = pd.to_numeric(df["difficulty_rating"], errors="coerce")
    y = y.clip(0.0, 1.0)
    df = df.assign(y=y).dropna(subset=["y"])

    # convert concept tags to text
    df["tags_text"] = df["concept_tags"].apply(parse_tags).apply(lambda x: " ".join(x))

    # X and y
    X = df[["question_stem", "tags_text", "question_type"]]
    y = df["y"].astype(float)

    # Vectorizers for each branch using TFIDF
    stem_vec = TfidfVectorizer(min_df=3, ngram_range=(1,2), max_features=20000)
    tags_vec = TfidfVectorizer(min_df=1, ngram_range=(1,1), max_features=5000)

    cat_enc  = OneHotEncoder(handle_unknown="ignore")

    # Column-wise transformers; weight tags lower if desired
    pre = ColumnTransformer(
        transformers=[
            ("stem", stem_vec, "question_stem"),
            ("tags", tags_vec, "tags_text"),
            ("cats", cat_enc, ["question_type"]),
        ],
        transformer_weights={  # tweak these if you want to rebalance
            "stem": 1.0,
            "tags": 0.5,
            "cats": 1.0,
        }
    )

    model = Ridge(alpha=1.0, random_state=42)
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
