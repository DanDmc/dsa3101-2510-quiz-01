import os
import json
import mysql.connector

# ---------------------------------------------------------------------
# Database connection info (read from Docker .env)
# ---------------------------------------------------------------------
DB_HOST = os.getenv("DB_HOST", "db")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_NAME = os.getenv("MYSQL_DATABASE", "quizbank")
DB_USER = os.getenv("MYSQL_USER", "quizuser")
DB_PASS = os.getenv("MYSQL_PASSWORD", "changeme_user")

# ---------------------------------------------------------------------
# Path to one JSON file (adjust this to whichever one you want to test)
# ---------------------------------------------------------------------
JSON_PATH = "/question_bank/dsa1101/2410/json/Final_Sem1_2425_Q1.json"

# ---------------------------------------------------------------------
# Connect to the database
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
# Insert one question (and any items/choices)
# ---------------------------------------------------------------------
def insert_single_question(json_path):
    # Read the JSON
    with open(json_path, "r", encoding="utf-8") as f:
        q = json.load(f)

    conn = get_connection()
    cur = conn.cursor()

    # ---------------------- Insert into questions ----------------------
    cur.execute(
        """
        INSERT INTO questions
            (question_id, course, semester, assessment_type, question_no,
             question_stem, question_stem_html, version, update_timestamp,
             question_media, concept_tags)
        VALUES
            (%s,%s,%s,%s,%s,%s,%s,%s,%s,CAST(%s AS JSON),CAST(%s AS JSON))
        """,
        (
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
        ),
    )
    question_id = cur.lastrowid
    print(f"✅ Inserted question: {q.get('question_id') or question_id}")

    # ---------------------- Insert items (if any) ----------------------
    for item in q.get("items", []):
        cur.execute(
            """
            INSERT INTO items
                (question_id, part_number, type, subtype,
                 part_stem, part_stem_html, solution, solution_html,
                 difficulty_level, shuffle_choices,
                 scoring, feedback, items_media)
            VALUES
                (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,CAST(%s AS JSON),CAST(%s AS JSON),CAST(%s AS JSON))
            """,
            (
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
            ),
        )
        item_id = cur.lastrowid
        print(f"   ↳ Inserted item part {item.get('part_number')} (id={item_id})")

        # ---------------------- Insert choices (if any) ----------------------
        for choice in item.get("choices", []):
            cur.execute(
                """
                INSERT INTO choices
                    (item_id, choice_id, text, text_html, is_correct, explanation)
                VALUES
                    (%s,%s,%s,%s,%s,%s)
                """,
                (
                    item_id,
                    choice.get("choice_id"),
                    choice.get("text"),
                    choice.get("text_html"),
                    choice.get("is_correct"),
                    choice.get("explanation"),
                ),
            )
            print(f"      ↳ Inserted choice: {choice.get('choice_id')}")

    conn.commit()
    cur.close()
    conn.close()
    print("✅ Finished import successfully!\n")


# ---------------------------------------------------------------------
# Run script
# ---------------------------------------------------------------------
if __name__ == "__main__":
    if not os.path.exists(JSON_PATH):
        print(f"❌ File not found: {JSON_PATH}")
    else:
        insert_single_question(JSON_PATH)
