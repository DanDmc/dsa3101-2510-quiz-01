# === Base image ===
FROM python:3.10-slim

# === Set working directory ===
WORKDIR /app

# === Install system dependencies ===
# 🚨 CONSOLIDATION FIX: Added required system libraries (libmysqlclient-dev, libpoppler-cpp-dev)
# required by pip packages (MySQLdb/pdfplumber) that were missing in V1/V2.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    netcat-traditional \
    libmysqlclient-dev \
    libpoppler-cpp-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# === Copy requirements and install Python dependencies ===
# NOTE: V1/V2 assumed requirements.txt is in 'backend/' relative to the compose context.
COPY backend/requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# === Copy backend scripts ===
COPY backend/ ./backend/

# === Copy data directory (with source_files) ===
COPY data/ ./data/

# === Ensure output directories exist ===
RUN mkdir -p data/text_extracted data/json_output

# === Command with retry logic and proper wait ===
# 💡 CONSOLIDATION: Retaining the exact idle command provided in V1/V2.
CMD ["bash", "-c", "\
    echo '🟢 Backend container started in idle mode. MySQL host: db'; \
    echo '💡 To process new PDFs manually, run:'; \
    echo '   docker exec -it quizbank-backend python backend/pdf_extractor.py --new-only'; \
    echo '   docker exec -it quizbank-backend python backend/llm_parser.py --new-only'; \
    echo '   docker exec -it quizbank-backend python backend/insert_questions.py --new-only'; \
    tail -f /dev/null \
"]