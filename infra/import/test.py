import os
import json
import mysql.connector

# ---------------------------------------------------------------------
# Database connection info
# ---------------------------------------------------------------------
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_NAME = os.getenv("MYSQL_DATABASE", "quizbank")
DB_USER = os.getenv("MYSQL_USER", "quizuser")
DB_PASS = os.getenv("MYSQL_PASSWORD", "changeme_user")

# ---------------------------------------------------------------------
# Root path that contains all modules (each with assessments/json folders)
# ---------------------------------------------------------------------
ROOT_PATH = "../../data/questions_bank_json_and_assets"

# ---------------------------------------------------------------------
def get_connection():
    return mysql.connector.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME
    )

# ---------------------------------------------------------------------
def insert_single_question(conn, json_path):
    with open(json_path, "r", encoding="utf-8") as f:
        q = json.load(f)

    cur = conn.cursor()

    cur.execute("""
        INSERT INTO questions
            (question_id, course, semester, assessment_type, question_no,
             question_stem, question_stem_html, version, update_timestamp,
             question_media, concept_tags)
        VALUES
            (%s,%s,%s,%s,%s,%s,%s,%s,%s,CAST(%s AS JSON),CAST(%s AS JSON))
    """, (
        q.get("question_id"),
        q.get("course"),
        q.get("semester"),
        q.get("assessment_type"),
        q.get("question_no"),
        q.get("question_stem"),
        q.get("question_stem_html"),
        q.get("version"),
        q.get("update_timestamp"),
        json.dumps(q.get("question_media") or []),
        json.dumps(q.get("concept_tags") or []),
    ))
    question_id = cur.lastrowid
    print(f"✅ Inserted question: {q.get('question_id') or question_id}")

    for item in q.get("items", []):
        cur.execute("""
            INSERT INTO items
                (question_id, part_number, type, subtype,
                 part_stem, part_stem_html, solution, solution_html,
                 difficulty_level, shuffle_choices,
                 scoring, feedback, items_media)
            VALUES
                (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,CAST(%s AS JSON),CAST(%s AS JSON),CAST(%s AS JSON))
        """, (
            question_id,
            item.get("part_number"),
            item.get("type"),
            item.get("subtype"),
            item.get("part_stem"),
            item.get("part_stem_html"),
            item.get("solution"),
            item.get("solution_html"),
            item.get("difficulty_level"),
            item.get("shuffle_choices"),
            json.dumps(item.get("scoring") or {}),
            json.dumps(item.get("feedback") or {}),
            json.dumps(item.get("items_media") or []),
        ))
        item_id = cur.lastrowid
        print(f"   ↳ Inserted item part {item.get('part_number')} (id={item_id})")

        for choice in item.get("choices", []):
            cur.execute("""
                INSERT INTO choices
                    (item_id, choice_id, text, text_html, is_correct, explanation)
                VALUES
                    (%s,%s,%s,%s,%s,%s)
            """, (
                item_id,
                choice.get("choice_id"),
                choice.get("text"),
                choice.get("text_html"),
                choice.get("is_correct"),
                choice.get("explanation"),
            ))
            print(f"      ↳ Inserted choice: {choice.get('choice_id')}")

    conn.commit()
    cur.close()

# ---------------------------------------------------------------------
# Walk recursively and import all JSON files
# ---------------------------------------------------------------------
if __name__ == "__main__":
    conn = get_connection()

    for root, dirs, files in os.walk(ROOT_PATH):
        for filename in files:
            if filename.endswith(".json"):
                json_path = os.path.join(root, filename)
                print(f"\n📄 Importing {json_path} ...")
                try:
                    insert_single_question(conn, json_path)
                except Exception as e:
                    print(f"❌ Error importing {json_path}: {e}")

    conn.close()
    print("\n✅ All JSON files imported successfully!")
