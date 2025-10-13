import os
import mysql.connector
from datetime import datetime

# === 1. DB connection settings ===
DB_CONFIG = {
    "host": "db",
    "user": "root",
    "password": "root",
    "database": "quizbank",
    "port": 3306,
}

# === 2. Folder containing PDFs ===
SOURCE_DIR = os.path.join("data", "source_files")

# === 3. Connect to DB ===
conn = mysql.connector.connect(**DB_CONFIG)
cursor = conn.cursor()

# === 4. Loop through PDFs ===
pdf_files = [f for f in os.listdir(SOURCE_DIR) if f.lower().endswith(".pdf")]

for pdf_file in pdf_files:
    file_path = os.path.join(SOURCE_DIR, pdf_file)
    print(f"📄 Processing {pdf_file}")

    # For now, every file is standalone (file_base_id = NULL)
    # UI will handle linking versions later
    insert_query = """
        INSERT INTO files (
            file_base_id, file_version,
            course, year, semester, assessment_type,
            file_name, file_path, uploaded_by, uploaded_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    data = (
        None,          # file_base_id (NULL = standalone file, not part of version chain yet)
        1,             # file_version (default to 1)
        None,          # course  (placeholder for now)
        None,          # year
        None,          # semester
        "others",      # assessment_type
        pdf_file,      # file_name
        file_path,     # file_path
        "system_demo", # uploaded_by
        datetime.now(),# uploaded_at
    )

    cursor.execute(insert_query, data)
    print(f"   ✅ Inserted file id={cursor.lastrowid}")

conn.commit()
print(f"\n🎯 Processed {len(pdf_files)} files.")
cursor.close()
conn.close()