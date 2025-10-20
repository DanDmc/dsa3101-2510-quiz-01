import os
import pdfplumber

# === 1. Directories ===
SOURCE_DIR = os.path.join("data", "source_files")
OUTPUT_DIR = os.path.join("data", "text_extracted")

os.makedirs(OUTPUT_DIR, exist_ok=True)

# === 2. Loop through PDFs ===
TARGET_PDF = os.getenv('TARGET_PDF')
pdf_files = [f for f in os.listdir(SOURCE_DIR) if f.lower().endswith('.pdf')]
if TARGET_PDF:
    want = TARGET_PDF if TARGET_PDF.lower().endswith('.pdf') else f"{TARGET_PDF}.pdf"
    pdf_files = [f for f in pdf_files if f == want]

for pdf_file in pdf_files:
    pdf_path = os.path.join(SOURCE_DIR, pdf_file)
    txt_filename = os.path.splitext(pdf_file)[0] + ".txt"
    output_path = os.path.join(OUTPUT_DIR, txt_filename)

    print(f"🧾 Extracting text from {pdf_file}...")

    try:
        with pdfplumber.open(pdf_path) as pdf:
            text = "\n".join(page.extract_text() for page in pdf.pages if page.extract_text())

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(text)

        print(f"✅ Saved extracted text to {output_path}")
        print("🪶 Preview:\n", text[:400].replace("\n", " "), "\n")

    except Exception as e:
        print(f"❌ Failed to process {pdf_file}: {e}")
