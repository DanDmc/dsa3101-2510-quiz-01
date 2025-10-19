import os
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

# === 2. Folder containing PDFs ===
SOURCE_DIR = os.path.join("data", "source_files")

# === 3. Connect to DB with retry logic ===
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

# === 4. Loop through PDFs ===
pdf_files = [f for f in os.listdir(SOURCE_DIR) if f.lower().endswith(".pdf")]

if not pdf_files:
    print("⚠️ No PDF files found in source_files directory")
else:
    print(f"\n📁 Found {len(pdf_files)} PDF file(s) to process\n")

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

    try:
        cursor.execute(insert_query, data)
        conn.commit()
        print(f"   ✅ Inserted file id={cursor.lastrowid}")
    except mysql.connector.Error as e:
        print(f"   ❌ Error inserting {pdf_file}: {e}")
        conn.rollback()

print(f"\n🎯 Processed {len(pdf_files)} files.")
cursor.close()
conn.close()