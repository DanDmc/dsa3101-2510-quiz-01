# === Base image ===
FROM python:3.10-slim

# === Set working directory ===
WORKDIR /app

# === Copy backend scripts and data ===
COPY . /app

# === Install system dependencies and Python libraries ===
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && pip install --no-cache-dir -r requirements.txt \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# === Command to run all scripts sequentially ===
CMD ["bash", "-c", "\
    echo '🚀 Starting backend pipeline...'; \
    python backend/insert_to_db.py && \
    python backend/pdf_extractor.py && \
    python backend/llm_parser.py && \
    python backend/insert_questions.py && \
    echo '✅ All tasks completed successfully!' \
"]




