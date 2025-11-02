"""
Simple EDA for Difficulty Rating Model
Coverse features such as 
- stem, tags, type
- readability (FRE, FKGL)
- length metrics (chars, tokens, sentences, syllables)
"""

import sys
import os
import json
import re
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from datetime import datetime

try:
    from sqlalchemy import create_engine, text
except ImportError:
    print("ERROR: sqlalchemy not installed. Run: pip install sqlalchemy pymysql")
    sys.exit(1)

print(f"Python: {sys.version}")
print(f"Pandas: {pd.__version__}")
print(f"NumPy: {np.__version__}")
print(f"Matplotlib: {matplotlib.__version__}")
print()

# ============================================================
# Setup
# ============================================================

def make_sa_engine():
    host = os.getenv("MYSQL_HOST", "127.0.0.1")
    user = os.getenv("MYSQL_USER", "quizbank_user")
    pw = os.getenv("MYSQL_PASSWORD", "quizbank_pass")
    db = os.getenv("MYSQL_DATABASE", "quizbank")
    port = os.getenv("MYSQL_PORT", "3307")
    uri = f"mysql+pymysql://{user}:{pw}@{host}:{port}/{db}?charset=utf8mb4"
    return create_engine(uri, pool_pre_ping=True, pool_recycle=3600)

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

def syllable_count(word: str) -> int:
    """Count syllables in a word (heuristic)."""
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

def compute_text_features(text: str) -> dict:
    """Compute length + readability features used in 4 & 5-feature models."""
    text = text if isinstance(text, str) else ""
    
    # Length metrics (5-feature model)
    num_chars = len(text)
    tokens = re.findall(r"\b\w+\b", text)
    num_tokens = len(tokens) if tokens else 1
    sentences = [s for s in _SENT_SPLIT.split(text) if s.strip()]
    num_sentences = max(1, len(sentences))
    num_syllables = sum(syllable_count(w) for w in tokens) if tokens else 1
    
    # Readability metrics (4 & 5-feature models)
    # Flesch Reading Ease (higher = easier)
    fre = 206.835 - 1.015 * (num_tokens / num_sentences) - 84.6 * (num_syllables / num_tokens)
    # Flesch-Kincaid Grade Level (higher = harder)
    fkgl = 0.39 * (num_tokens / num_sentences) + 11.8 * (num_syllables / num_tokens) - 15.59
    
    return {
        'num_chars': num_chars,
        'num_tokens': num_tokens,
        'num_sentences': num_sentences,
        'num_syllables': num_syllables,
        'flesch_reading_ease': fre,
        'flesch_kincaid_grade': fkgl,
    }

# ============================================================
# Main
# ============================================================

def main():
    print("Simple EDA: Difficulty Rating Model")
    print("=" * 50)
    
    # Load data
    print("\nLoading data...")
    try:
        sql = text("""
            SELECT question_stem, question_type, concept_tags, difficulty_rating_manual
            FROM questions
            WHERE difficulty_rating_manual IS NOT NULL
        """)
        engine = make_sa_engine()
        print(f"Connecting to database...")
        
        # Use connection context manager with SQLAlchemy 2.0+ compatibility
        with engine.connect() as conn:
            df = pd.read_sql(sql, conn)
        
        print(f"Query executed successfully")
    except Exception as e:
        print(f"ERROR loading data: {e}")
        print("\nTroubleshooting:")
        print("1. Check if MySQL is running")
        print("2. Verify DB credentials in environment variables")
        print("3. Ensure 'questions' table exists with 'difficulty_rating_manual' column")
        return
    
    print(f"✓ Loaded {len(df)} rows from database")
    
    if df.empty:
        print("\n❌ ERROR: No data found!")
        print("The query returned 0 rows.")
        print("\nPossible reasons:")
        print("1. No questions have difficulty_rating_manual set")
        print("2. Wrong database selected")
        print("3. Table 'questions' is empty")
        return
    
    # Prepare
    df['difficulty'] = pd.to_numeric(df['difficulty_rating_manual'], errors='coerce').clip(0.0, 1.0)
    df = df.dropna(subset=['difficulty'])
    df['tags_text'] = df['concept_tags'].apply(parse_tags)
    
    # Compute text features for all variants
    print("Computing text features...")
    text_features = df['question_stem'].fillna("").apply(compute_text_features)
    text_features_df = pd.DataFrame(text_features.tolist())
    df = pd.concat([df, text_features_df], axis=1)
    
    # Output
    repo_root = Path(os.getenv("REPO_ROOT", Path.cwd()))
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = repo_root / "eda" / "difficulty_ratings" / timestamp
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # ============================================================
    # Plot 1: 3-Feature Model (Base)
    # ============================================================
    print("Creating plots...")
    
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    
    # Target histogram
    axes[0, 0].hist(df['difficulty'], bins=30, edgecolor='black', alpha=0.7)
    axes[0, 0].axvline(df['difficulty'].mean(), color='red', linestyle='--', 
                       label=f'Mean: {df["difficulty"].mean():.2f}')
    axes[0, 0].set_xlabel('Difficulty (1=easy, 0=hard)')
    axes[0, 0].set_ylabel('Count')
    axes[0, 0].set_title('Target: Difficulty Distribution')
    axes[0, 0].legend()
    axes[0, 0].grid(alpha=0.3)
    
    # Question type
    type_diff = df.groupby('question_type')['difficulty'].mean().sort_values()
    axes[0, 1].barh(range(len(type_diff)), type_diff.values)
    axes[0, 1].set_yticks(range(len(type_diff)))
    axes[0, 1].set_yticklabels(type_diff.index)
    axes[0, 1].set_xlabel('Mean Difficulty')
    axes[0, 1].set_title('3-Feature: Question Type')
    axes[0, 1].grid(alpha=0.3)
    
    # Question stem length
    axes[1, 0].scatter(df['num_tokens'], df['difficulty'], alpha=0.4, s=10)
    corr_tokens = df['num_tokens'].corr(df['difficulty'])
    axes[1, 0].set_xlabel('Word Count')
    axes[1, 0].set_ylabel('Difficulty')
    axes[1, 0].set_title(f'3-Feature: Question Stem (corr={corr_tokens:.2f})')
    axes[1, 0].grid(alpha=0.3)
    
    # Tags
    has_tags = df['tags_text'].str.len() > 0
    axes[1, 1].boxplot([df[has_tags]['difficulty'], df[~has_tags]['difficulty']], 
                       tick_labels=['Has Tags', 'No Tags'])
    axes[1, 1].set_ylabel('Difficulty')
    axes[1, 1].set_title(f'3-Feature: Concept Tags ({has_tags.sum()} with tags)')
    axes[1, 1].grid(alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(output_dir / '01_base_3features.png', dpi=150, bbox_inches='tight')
    plt.close()
    
    # ============================================================
    # Plot 2: 4-Feature Model (+ Readability)
    # ============================================================
    
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    
    # Flesch Reading Ease vs Difficulty
    axes[0].scatter(df['flesch_reading_ease'], df['difficulty'], alpha=0.4, s=10, color='green')
    corr_fre = df['flesch_reading_ease'].corr(df['difficulty'])
    axes[0].set_xlabel('Flesch Reading Ease (higher = easier text)')
    axes[0].set_ylabel('Difficulty (1=easy, 0=hard)')
    axes[0].set_title(f'4-Feature: FRE (corr={corr_fre:.2f})')
    axes[0].grid(alpha=0.3)
    
    # Flesch-Kincaid Grade Level vs Difficulty
    axes[1].scatter(df['flesch_kincaid_grade'], df['difficulty'], alpha=0.4, s=10, color='orange')
    corr_fkgl = df['flesch_kincaid_grade'].corr(df['difficulty'])
    axes[1].set_xlabel('Flesch-Kincaid Grade Level (higher = harder text)')
    axes[1].set_ylabel('Difficulty (1=easy, 0=hard)')
    axes[1].set_title(f'4-Feature: FKGL (corr={corr_fkgl:.2f})')
    axes[1].grid(alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(output_dir / '02_readability_4features.png', dpi=150, bbox_inches='tight')
    plt.close()
    
    # ============================================================
    # Plot 3: 5-Feature Model (+ Length Metrics)
    # ============================================================
    
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    
    # Character count
    axes[0, 0].scatter(df['num_chars'], df['difficulty'], alpha=0.4, s=10, color='purple')
    corr_chars = df['num_chars'].corr(df['difficulty'])
    axes[0, 0].set_xlabel('Character Count')
    axes[0, 0].set_ylabel('Difficulty')
    axes[0, 0].set_title(f'5-Feature: num_chars (corr={corr_chars:.2f})')
    axes[0, 0].grid(alpha=0.3)
    
    # Sentence count
    axes[0, 1].scatter(df['num_sentences'], df['difficulty'], alpha=0.4, s=10, color='brown')
    corr_sents = df['num_sentences'].corr(df['difficulty'])
    axes[0, 1].set_xlabel('Sentence Count')
    axes[0, 1].set_ylabel('Difficulty')
    axes[0, 1].set_title(f'5-Feature: num_sentences (corr={corr_sents:.2f})')
    axes[0, 1].grid(alpha=0.3)
    
    # Syllable count
    axes[1, 0].scatter(df['num_syllables'], df['difficulty'], alpha=0.4, s=10, color='teal')
    corr_sylls = df['num_syllables'].corr(df['difficulty'])
    axes[1, 0].set_xlabel('Syllable Count')
    axes[1, 0].set_ylabel('Difficulty')
    axes[1, 0].set_title(f'5-Feature: num_syllables (corr={corr_sylls:.2f})')
    axes[1, 0].grid(alpha=0.3)
    
    # Correlation heatmap for all numeric features
    numeric_cols = ['num_chars', 'num_tokens', 'num_sentences', 'num_syllables',
                    'flesch_reading_ease', 'flesch_kincaid_grade', 'difficulty']
    corr_matrix = df[numeric_cols].corr()
    sns.heatmap(corr_matrix, annot=True, fmt='.2f', cmap='coolwarm', center=0,
                square=True, ax=axes[1, 1], cbar_kws={"shrink": 0.8})
    axes[1, 1].set_title('5-Feature: All Numeric Feature Correlations')
    
    plt.tight_layout()
    plt.savefig(output_dir / '03_length_5features.png', dpi=150, bbox_inches='tight')
    plt.close()
    
    # ============================================================
    # Summary stats
    # ============================================================
    with open(output_dir / 'eda_summary.txt', 'w') as f:
        f.write("SIMPLE EDA SUMMARY\n")
        f.write("=" * 70 + "\n\n")
        
        f.write(f"Total questions: {len(df)}\n\n")
        
        f.write("TARGET: difficulty_rating_manual (1=easy, 0=hard)\n")
        f.write(f"  Mean: {df['difficulty'].mean():.3f}\n")
        f.write(f"  Median: {df['difficulty'].median():.3f}\n")
        f.write(f"  Std: {df['difficulty'].std():.3f}\n")
        f.write(f"  Range: [{df['difficulty'].min():.3f}, {df['difficulty'].max():.3f}]\n\n")
        
        f.write("=" * 70 + "\n")
        f.write("3-FEATURE MODEL (Base)\n")
        f.write("=" * 70 + "\n\n")
        
        f.write("FEATURE 1: question_type (categorical -> One-Hot)\n")
        f.write(f"{df['question_type'].value_counts()}\n\n")
        
        f.write("FEATURE 2: question_stem (text -> TF-IDF)\n")
        f.write(f"  Avg tokens: {df['num_tokens'].mean():.1f}\n")
        f.write(f"  Min tokens: {df['num_tokens'].min()}\n")
        f.write(f"  Max tokens: {df['num_tokens'].max()}\n")
        f.write(f"  Correlation with difficulty: {corr_tokens:.3f}\n\n")
        
        f.write("FEATURE 3: concept_tags (text -> TF-IDF)\n")
        f.write(f"  Questions with tags: {has_tags.sum()} ({has_tags.sum()/len(df)*100:.1f}%)\n")
        f.write(f"  Questions without tags: {(~has_tags).sum()} ({(~has_tags).sum()/len(df)*100:.1f}%)\n")
        f.write(f"  Mean difficulty (with tags): {df[has_tags]['difficulty'].mean():.3f}\n")
        f.write(f"  Mean difficulty (no tags): {df[~has_tags]['difficulty'].mean():.3f}\n\n")
        
        f.write("=" * 70 + "\n")
        f.write("4-FEATURE MODEL (+ Readability)\n")
        f.write("=" * 70 + "\n\n")
        
        f.write("FEATURE 4a: Flesch Reading Ease (higher = easier text)\n")
        f.write(f"  Mean: {df['flesch_reading_ease'].mean():.2f}\n")
        f.write(f"  Std: {df['flesch_reading_ease'].std():.2f}\n")
        f.write(f"  Range: [{df['flesch_reading_ease'].min():.2f}, {df['flesch_reading_ease'].max():.2f}]\n")
        f.write(f"  Correlation with difficulty: {corr_fre:.3f}\n\n")
        
        f.write("FEATURE 4b: Flesch-Kincaid Grade Level (higher = harder text)\n")
        f.write(f"  Mean: {df['flesch_kincaid_grade'].mean():.2f}\n")
        f.write(f"  Std: {df['flesch_kincaid_grade'].std():.2f}\n")
        f.write(f"  Range: [{df['flesch_kincaid_grade'].min():.2f}, {df['flesch_kincaid_grade'].max():.2f}]\n")
        f.write(f"  Correlation with difficulty: {corr_fkgl:.3f}\n\n")
        
        f.write("=" * 70 + "\n")
        f.write("5-FEATURE MODEL (+ Length Metrics)\n")
        f.write("=" * 70 + "\n\n")
        
        f.write("FEATURE 5a: num_chars\n")
        f.write(f"  Mean: {df['num_chars'].mean():.1f}\n")
        f.write(f"  Correlation with difficulty: {corr_chars:.3f}\n\n")
        
        f.write("FEATURE 5b: num_tokens\n")
        f.write(f"  Mean: {df['num_tokens'].mean():.1f}\n")
        f.write(f"  Correlation with difficulty: {corr_tokens:.3f}\n\n")
        
        f.write("FEATURE 5c: num_sentences\n")
        f.write(f"  Mean: {df['num_sentences'].mean():.1f}\n")
        f.write(f"  Correlation with difficulty: {corr_sents:.3f}\n\n")
        
        f.write("FEATURE 5d: num_syllables\n")
        f.write(f"  Mean: {df['num_syllables'].mean():.1f}\n")
        f.write(f"  Correlation with difficulty: {corr_sylls:.3f}\n\n")
        
        f.write("KEY INSIGHTS\n")
        f.write("-" * 70 + "\n")
        
        # Find strongest correlations
        correlations = {
            'num_tokens': corr_tokens,
            'num_chars': corr_chars,
            'num_sentences': corr_sents,
            'num_syllables': corr_sylls,
            'flesch_reading_ease': corr_fre,
            'flesch_kincaid_grade': corr_fkgl,
        }
        sorted_corrs = sorted(correlations.items(), key=lambda x: abs(x[1]), reverse=True)
        
        f.write("\nStrongest correlations with difficulty (by absolute value):\n")
        for i, (feat, corr) in enumerate(sorted_corrs[:3], 1):
            f.write(f"  {i}. {feat}: {corr:.3f}\n")
    
    print(f"\nDone! Saved to: {output_dir}")
    print(f"  - 01_base_3features.png")
    print(f"  - 02_readability_4features.png")
    print(f"  - 03_length_5features.png")
    print(f"  - eda_summary.txt")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        print("\nScript failed. Check the error above.")
