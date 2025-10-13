# === Base image ===
FROM python:3.10-slim

# === Set working directory ===
WORKDIR /app

# === Install system dependencies ===
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# === Copy requirements and install Python dependencies ===
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# === Copy backend scripts ===
COPY backend/ ./backend/

# === Copy data directory (with source_files) ===
COPY data/ ./data/

# === Ensure output directories exist ===
RUN mkdir -p data/text_extracted data/json_output

# === Command to run all scripts sequentially ===
CMD ["bash", "-c", "\
    echo '🚀 Starting backend pipeline...'; \
    python backend/insert_to_db.py && \
    python backend/pdf_extractor.py && \
    python backend/llm_parser.py && \
    python backend/insert_questions.py && \
    echo '✅ All tasks completed successfully!' \
"]