import os
import json
import re
from contextlib import closing
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import OneHotEncoder, StandardScaler, FunctionTransformer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import Ridge, Lasso, ElasticNet
from sklearn.ensemble import RandomForestRegressor
from sklearn.svm import LinearSVR
from sklearn.model_selection import train_test_split, StratifiedKFold, KFold
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.base import clone
from scipy.stats import spearmanr
import joblib

# ---------------- SQLAlchemy engine for pandas.read_sql ----------------
from sqlalchemy import create_engine

def make_sa_engine():
    host = os.getenv("MYSQL_HOST", "127.0.0.1")
    user = os.getenv("MYSQL_USER", "quizbank_user")
    pw   = os.getenv("MYSQL_PASSWORD", "quizbank_pass")
    db   = os.getenv("MYSQL_DATABASE", "quizbank")
    port = os.getenv("MYSQL_PORT", "3306")
    uri = f"mysql+pymysql://{user}:{pw}@{host}:{port}/{db}?charset=utf8mb4"
    return create_engine(uri, pool_pre_ping=True, pool_recycle=3600)

# ---------------- Helpers ----------------
def ensure_dir(p: str | Path) -> Path:
    p = Path(p)
    p.mkdir(parents=True, exist_ok=True)
    return p

def parse_tags(val):
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

# ---------- Numeric feature helpers: length + readability ----------
def _syllable_count(word: str) -> int:
    """Minimal syllable heuristic (adequate for relative signal)."""
    word = word.lower()
    vowels = "aeiouy"
    count, prev_is_vowel = 0, False
    for ch in word:
        is_vowel = ch in vowels
        if is_vowel and not prev_is_vowel:
            count += 1
        prev_is_vowel = is_vowel
    if word.endswith("e") and count > 1:
        count -= 1
    return max(count, 1)

_SENT_SPLIT = re.compile(r"[.!?]+")

def _compute_readability_features(texts):
    """
    texts: iterable of question stems (strings)
    returns: np.ndarray shape (n, 6) with:
        [num_chars, num_tokens, num_sentences, num_syllables, FRE, FKGL]
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

        rows.append([len(t), n_w, n_sents, n_syll, fre, fkgl])
    return np.array(rows, dtype=float)

def _numeric_feats_from_df(X):
    """
    X: DataFrame slice that includes 'question_stem'
    Returns numeric feature matrix using the stem only.
    """
    stems = X["question_stem"].fillna("").to_numpy()
    return _compute_readability_features(stems)

def build_preprocessor() -> ColumnTransformer:
    # Text branches
    stem_branch = Pipeline(steps=[
        ("tfidf_stem", TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_features=20000)),
    ])
    tags_branch = Pipeline(steps=[
        ("tfidf_tags", TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_features=20000)),
    ])

    # Categorical branch
    cat_branch = Pipeline(steps=[
        ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=True)),
    ])

    # NEW: numeric branch (length + readability derived from the stem)
    num_branch = Pipeline(steps=[
        ("num_feats", FunctionTransformer(_numeric_feats_from_df, validate=False)),
        # with_mean=False to play nicely when stacked with sparse matrices
        ("scale", StandardScaler(with_mean=False))
    ])

    prep = ColumnTransformer(
        transformers=[
            ("stem", stem_branch, "question_stem"),
            ("tags", tags_branch, "tags_text"),
            ("cat",  cat_branch,  ["question_type"]),
            ("num",  num_branch,  ["question_stem"]),  # <- added numeric features
        ],
        remainder="drop",
        sparse_threshold=1.0,
    )
    return prep

MODEL_REGISTRY = {
    "ridge": Ridge(alpha=1.0, random_state=42),
    "lasso": Lasso(alpha=0.0005, random_state=42, max_iter=10000),
    "elasticnet": ElasticNet(alpha=0.0005, l1_ratio=0.5, random_state=42, max_iter=10000),
    "rf": RandomForestRegressor(n_estimators=300, max_depth=None, n_jobs=-1, random_state=42),
    "linearsvr": LinearSVR(C=1.0, epsilon=0.0, random_state=42, max_iter=10000),
}

def evaluate_all(y_true, y_pred):
    y_pred = np.clip(np.asarray(y_pred, dtype=float), 0.0, 1.0)
    y_true = np.asarray(y_true, dtype=float)
    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))
    r2 = float(r2_score(y_true, y_pred))
    # Spearman: handle constant vectors safely
    try:
        rho, _ = spearmanr(y_true, y_pred)
        rho = float(0.0 if np.isnan(rho) else rho)
    except Exception:
        rho = 0.0
    return {"MAE": mae, "RMSE": rmse, "R2": r2, "Spearman": rho, "n": int(len(y_true))}

def load_or_make_split(df: pd.DataFrame, split_path: Path, test_size: float = 0.2, seed: int = 42):
    if split_path.exists():
        idx = json.loads(split_path.read_text())
        train_idx = idx["train_idx"]
        test_idx = idx["test_idx"]
    else:
        all_idx = np.arange(len(df))
        train_idx, test_idx = train_test_split(all_idx, test_size=test_size, random_state=seed)
        split_path.parent.mkdir(parents=True, exist_ok=True)
        split_path.write_text(json.dumps({"train_idx": train_idx.tolist(), "test_idx": test_idx.tolist()}))
    return np.array(train_idx), np.array(test_idx)

def make_strat_labels_safe(y: np.ndarray, qtype: pd.Series, n_bins: int, n_splits: int):
    """
    Try to create stratification labels (question_type + y-quantile-bin) such that
    every class has at least n_splits members. Reduce bins if needed; if impossible, return None.
    """
    qtype_s = qtype.fillna("NA").astype(str).to_numpy()
    unique_y = np.unique(y)
    max_bins = max(2, min(n_bins, unique_y.size))
    for bins in range(max_bins, 1, -1):
        ybins = pd.qcut(y, q=bins, labels=False, duplicates="drop")
        labels = np.array([f"{qt}_{b}" for qt, b in zip(qtype_s, ybins)])
        counts = pd.Series(labels).value_counts()
        if counts.min() >= n_splits:
            return labels
    return None

def build_cv(ytr: np.ndarray, Xtr_qtype: pd.Series, n_splits: int, random_state: int = 42):
    labels = make_strat_labels_safe(ytr, Xtr_qtype, n_bins=5, n_splits=n_splits)
    if labels is not None:
        cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=random_state)
        return cv, labels, "StratifiedKFold"
    else:
        cv = KFold(n_splits=n_splits, shuffle=True, random_state=random_state)
        return cv, None, "KFold"

def main():
    # ---------- Load labeled data ----------
    sql = """
        SELECT question_stem, question_type, concept_tags, difficulty_rating_manual
        FROM questions
        WHERE difficulty_rating_manual IS NOT NULL
    """
    engine = make_sa_engine()
    df = pd.read_sql(sql, engine)

    if df.empty:
        print("[difficulty] No labeled rows found in questions.difficulty_rating_manual")
        return

    # Target in [0,1]
    y = pd.to_numeric(df["difficulty_rating_manual"], errors="coerce").clip(0.0, 1.0)
    df = df.assign(y=y).dropna(subset=["y"])

    # Features
    df["tags_text"] = df["concept_tags"].apply(parse_tags)
    X = df[["question_stem", "tags_text", "question_type"]].copy()
    y = df["y"].astype(float).to_numpy()

    repo_root = Path(os.getenv("REPO_ROOT", Path.cwd()))
    split_path = repo_root / "data" / "splits" / "difficulty_split_v1.json"
    train_idx, test_idx = load_or_make_split(df, split_path, test_size=0.2, seed=42)

    Xtr, Xte = X.iloc[train_idx], X.iloc[test_idx]
    ytr, yte = y[train_idx], y[test_idx]

    # CV setup (robust)
    default_splits = int(os.getenv("CV_N_SPLITS", "5"))
    cv_n_splits = min(default_splits, max(2, len(Xtr)))  # guard tiny datasets
    cv, labels, cv_name = build_cv(ytr, Xtr["question_type"], n_splits=cv_n_splits, random_state=42)

    # Experiment folder
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    exp_root = ensure_dir(repo_root / "experiments" / "difficulty_ratings" / timestamp)

    # Save config + strata counts if available
    cfg = {"cv_n_splits": cv_n_splits, "cv_strategy": cv_name, "random_state": 42}
    with open(exp_root / "config.json", "w") as f:
        json.dump(cfg, f, indent=2)
    if labels is not None:
        pd.Series(labels, name="stratum").value_counts().to_csv(exp_root / "strata_counts.csv")

    # Shared preprocessor (now includes numeric features)
    preproc = build_preprocessor()

    leaderboard = []
    for name, base_model in MODEL_REGISTRY.items():
        print(f"[difficulty] CV model={name}")
        model = clone(base_model)

        fold_metrics = []
        cv_preds_records = []

        # Iterate folds
        splitter = (cv.split(Xtr, labels) if labels is not None else cv.split(Xtr))
        for fold, (cv_tr_idx, cv_va_idx) in enumerate(splitter, start=1):
            pipe = Pipeline(steps=[("prep", preproc), ("reg", clone(model))])

            X_cv_tr, X_cv_va = Xtr.iloc[cv_tr_idx], Xtr.iloc[cv_va_idx]
            y_cv_tr, y_cv_va = ytr[cv_tr_idx], ytr[cv_va_idx]

            pipe.fit(X_cv_tr, y_cv_tr)
            va_pred = np.clip(pipe.predict(X_cv_va), 0.0, 1.0)

            m = evaluate_all(y_cv_va, va_pred)
            m["fold"] = fold
            fold_metrics.append(m)

            original_idx = X_cv_va.index.to_numpy()
            cv_preds_records.append(pd.DataFrame({
                "row_index": original_idx,
                "fold": fold,
                "y_true": y_cv_va,
                "y_pred": va_pred
            }))

        cv_metrics_df = pd.DataFrame(fold_metrics)
        cv_preds_df = pd.concat(cv_preds_records, ignore_index=True)

        # Final train on full TRAIN partition, evaluate on frozen TEST
        final_pipe = Pipeline(steps=[("prep", preproc), ("reg", clone(model))])
        final_pipe.fit(Xtr, ytr)
        test_pred = np.clip(final_pipe.predict(Xte), 0.0, 1.0)
        test_metrics = evaluate_all(yte, test_pred)

        # Persist artifacts
        run_dir = ensure_dir(exp_root / name)
        joblib.dump(final_pipe, run_dir / f"model_{name}.pkl")
        cv_metrics_df.to_csv(run_dir / "cv_metrics.csv", index=False)
        cv_preds_df.to_csv(run_dir / "cv_predictions.csv", index=False)
        pd.DataFrame({"row_index": Xte.index, "y_true": yte, "y_pred": test_pred}).to_csv(
            run_dir / "test_predictions.csv", index=False
        )
        with open(run_dir / "metrics_test.json", "w") as f:
            json.dump(test_metrics, f, indent=2)

        # Summaries for comparison
        summary = {
            "model": name,
            "cv_MAE_mean": float(cv_metrics_df["MAE"].mean()),
            "cv_MAE_std": float(cv_metrics_df["MAE"].std()),
            "cv_RMSE_mean": float(cv_metrics_df["RMSE"].mean()),
            "cv_RMSE_std": float(cv_metrics_df["RMSE"].std()),
            "cv_R2_mean": float(cv_metrics_df["R2"].mean()),
            "cv_R2_std": float(cv_metrics_df["R2"].std()),
            "cv_Spearman_mean": float(cv_metrics_df["Spearman"].mean()),
            "cv_Spearman_std": float(cv_metrics_df["Spearman"].std()),
            "test_MAE": test_metrics["MAE"],
            "test_RMSE": test_metrics["RMSE"],
            "test_R2": test_metrics["R2"],
            "test_Spearman": test_metrics["Spearman"],
            "n_cv_val_per_fold_avg": float(cv_metrics_df["n"].mean()),
            "n_test": test_metrics["n"],
        }
        with open(run_dir / "cv_summary.json", "w") as f:
            json.dump(summary, f, indent=2)

        leaderboard.append(summary)

    lb = pd.DataFrame(leaderboard).sort_values(by=["cv_MAE_mean", "cv_RMSE_mean", "cv_R2_mean"], ascending=[True, True, False])
    lb.to_csv(exp_root / "leaderboard.csv", index=False)
    print(f"[difficulty] CV complete. Artifacts at {exp_root}")

if __name__ == "__main__":
    main()
