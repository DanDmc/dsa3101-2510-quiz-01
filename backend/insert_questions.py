import os
import json
import mysql.connector
from datetime import datetime
import time

# === 1. DB connection settings ===
DB_CONFIG = {
    "host": os.getenv("MYSQL_HOST", "db"),
    "user": os.getenv("MYSQL_USER", "root"),
    "password": os.getenv("MYSQL_PASSWORD", "root"),
    "database": os.getenv("MYSQL_DATABASE", "quizbank"),
    "port": int(os.getenv("MYSQL_PORT", 3306)),
}

# === 2. Paths ===
JSON_DIR = os.path.join("data", "json_output")

# === 3. Connect to MySQL with retry logic ===
max_retries = 5
retry_delay = 3

for attempt in range(max_retries):
    try:
        print(f"📡 Attempting to connect to database (attempt {attempt + 1}/{max_retries})...")
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        print("✅ Successfully connected to database!")
        break
    except mysql.connector.Error as e:
        if attempt < max_retries - 1:
            print(f"⚠️ Connection failed: {e}")
            print(f"⏳ Retrying in {retry_delay} seconds...")
            time.sleep(retry_delay)
        else:
            print(f"❌ Failed to connect after {max_retries} attempts")
            raise

# --- helper: get file_id by pdf name ---
def get_file_id(cursor, file_name):
    cursor.execute("SELECT id FROM files WHERE file_name = %s", (file_name,))
    result = cursor.fetchone()
    if result:
        return result[0]
    else:
        raise ValueError(f"❌ No matching file record for {file_name}")

# --- helper: insert a single question ---
def insert_question(cursor, q, file_id):
    insert_query = """
        INSERT INTO questions (
            question_base_id, version_id, file_id,
            question_no, question_type, 
            difficulty_rating_manual, difficulty_rating_model,
            question_stem, question_stem_html,
            concept_tags, question_media,
            last_used, created_at, updated_at
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """
    
    # For initial import, question_base_id = id (will be set after insert)
    # We'll update it after getting the lastrowid
    data = (
        0,  # Temporary, will update after insert
        q.get("version_id", 1),
        file_id,
        q.get("question_no"),
        q.get("question_type"),
        q.get("difficulty_rating_manual"),
        q.get("difficulty_rating_model"),
        q.get("question_stem"),
        q.get("question_stem_html"),
        json.dumps(q.get("concept_tags", [])),
        json.dumps(q.get("question_media", [])),
        q.get("last_used"),
        datetime.now(),
        datetime.now(),
    )
    cursor.execute(insert_query, data)
    question_id = cursor.lastrowid
    
    # Set question_base_id = id for initial imports (no versions yet)
    cursor.execute("UPDATE questions SET question_base_id = %s WHERE id = %s", (question_id, question_id))
    
    return question_id

# === 4. Loop through JSON files ===
json_files = [f for f in os.listdir(JSON_DIR) if f.lower().endswith(".json")]

if not json_files:
    print("⚠️ No JSON files found in json_output directory")
    print("💡 Make sure llm_parser.py has run successfully first")
else:
    print(f"\n📁 Found {len(json_files)} JSON file(s) to process\n")

for json_file in json_files:
    json_path = os.path.join(JSON_DIR, json_file)
    pdf_name = os.path.splitext(json_file)[0] + ".pdf"
    print(f"📄 Inserting questions for {pdf_name}")

    # --- read and validate JSON file ---
    with open(json_path, "r", encoding="utf-8-sig") as f:
        content = f.read().strip()

    if not content:
        print(f"⚠️ Skipping {json_file} (empty file)\n")
        continue

    try:
        questions = json.loads(content)
    except json.JSONDecodeError as e:
        print(f"⚠️ Skipping {json_file}: Invalid JSON ({e})\n")
        continue

    try:
        file_id = get_file_id(cursor, pdf_name)

        success_count = 0
        for q in questions:
            question_id = insert_question(cursor, q, file_id)
            difficulty_info = f", difficulty={q.get('difficulty_rating_manual', 'N/A')}" if q.get('difficulty_rating_manual') else ""
            print(f"🆔 Inserted id={question_id} for question_no={q.get('question_no')}{difficulty_info}")
            success_count += 1

        conn.commit()
        print(f"✅ Inserted {success_count} / {len(questions)} questions for {pdf_name}\n")

    except Exception as e:
        conn.rollback()
        print(f"❌ Failed for {json_file}: {e}\n")

cursor.close()
conn.close()
print("🎯 Done inserting all questions!")