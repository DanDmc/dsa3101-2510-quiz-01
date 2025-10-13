import os
import json
import uuid
import mysql.connector
from datetime import datetime

# === 1. DB connection settings ===
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "root",
    "database": "quizbank",
    "port": 3306,
}

# === 2. Paths ===
JSON_DIR = os.path.join("data", "json_output")

# === 3. Connect to MySQL ===
conn = mysql.connector.connect(**DB_CONFIG)
cursor = conn.cursor()

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
            question_id, version_id, file_id,
            question_no, question_type, difficulty_level,
            question_stem, question_stem_html,
            concept_tags, question_media,
            last_used, created_at, updated_at
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """
    data = (
        q.get("question_id") or str(uuid.uuid4()),   # 👈 generate UUID if null
        q.get("version_id", 1),
        file_id,
        q.get("question_no"),
        q.get("question_type"),
        q.get("difficulty_level"),
        q.get("question_stem"),
        q.get("question_stem_html"),
        json.dumps(q.get("concept_tags", [])),
        json.dumps(q.get("question_media", [])),
        q.get("last_used"),
        datetime.now(),
        datetime.now(),
    )
    cursor.execute(insert_query, data)

# === 4. Loop through JSON files ===
json_files = [f for f in os.listdir(JSON_DIR) if f.lower().endswith(".json")]

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
            # ✅ Auto-populate question_id if missing
            if not q.get("question_id"):
                q["question_id"] = str(uuid.uuid4())
                print(f"🆔 Assigned question_id={q['question_id']} for question_no={q.get('question_no')}")

            insert_question(cursor, q, file_id)
            success_count += 1

        conn.commit()
        print(f"✅ Inserted {success_count} / {len(questions)} questions for {pdf_name}\n")

        # Optional: overwrite JSON file with updated IDs (for debugging or persistence)
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(questions, f, indent=2, ensure_ascii=False)

    except Exception as e:
        conn.rollback()
        print(f"❌ Failed for {json_file}: {e}\n")

cursor.close()
conn.close()
print("🎯 Done inserting all questions!")
