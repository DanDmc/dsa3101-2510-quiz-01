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
    print(f"📄  Processing {pdf_file}")

    insert_query = """
        INSERT INTO files (
            file_id, course, year, semester, assessment_type,
            file_name, file_path, uploaded_by, uploaded_at
        )
        VALUES (UUID(), %s, %s, %s, %s, %s, %s, %s, %s)
    """

    data = (
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

conn.commit()
print(f"✅ Inserted {len(pdf_files)} files into database.")
cursor.close()
conn.close()
