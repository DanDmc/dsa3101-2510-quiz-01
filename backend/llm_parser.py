"""
LLM-based Question Parser
=========================

This module uses Google's Gemini API to parse extracted text from exam papers
into structured JSON format suitable for database insertion.

Simple, adaptive, and accurate two-step approach:
1. Build a dictionary mapping page_number → image_path from text markers
2. LLM extracts questions (with page numbers), and we map to image paths

Key Features:
- Adaptive chunking: dynamically chooses pages per chunk (3–10) based on content density
- Sequential processing (rate-limit safe)
- Accurate page_number and image_path mapping
- Real-time progress + timing for each chunk and file
- Schema-compatible output for insert_questions.py
"""

import os
import json
import re
import time
import google.generativeai as genai


# === Configuration ===
API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = "gemini-2.5-flash"

TEXT_DIR = os.path.join("data", "text_extracted")
OUTPUT_DIR = os.path.join("data", "json_output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

genai.configure(api_key=API_KEY)
model = genai.GenerativeModel(
    MODEL,
    generation_config={
        "temperature": 0.1,  # low temperature = consistent structured JSON
        "top_p": 0.95,
        "top_k": 40,
    }
)


# === Utility Functions ===
def build_page_to_image_map(full_text):
    """
    Build a dictionary mapping page numbers to image paths.
    Example: {2: "data/question_media/DSA1101_page2.png"}
    """
    page_map = {}
    pages = full_text.split("=== PAGE BREAK ===")

    for page_text in pages:
        page_nums = re.findall(r'\[PAGE_NUMBER:\s*(\d+)\]', page_text)
        img_paths = re.findall(r'\[PAGE_IMAGE_SAVED:\s*([^\]]+)\]', page_text)
        if page_nums:
            page_num = int(page_nums[0])
            page_map[page_num] = img_paths if img_paths else []
    return page_map


def build_prompt(text):
    """Build concise LLM prompt for parsing questions."""
    return f"""
Extract all exam questions as a JSON array.

For each question, extract:
- question_no: exact numbering (e.g., "1", "1a", "2b", "1(a)", "3.1" for subquestions of larger questions)
- question_type: mcq|mrq|coding|open-ended|fill-in-the-blanks|others (it must be classified as one of these categories only, nothing else)
- difficulty_rating_manual only if it is present in the question, such as DifficultyLevel/P-value: decimal 0–1. Otherwise null
- question_stem: the question text only (no options/answers). Replace [PAGE_IMAGE_SAVED: ...] with "(Image - Refer to question paper)"
- question_options: array of {{"label": "A", "text": "..."}} for MCQ/MRQ, empty [] otherwise. Replace [PAGE_IMAGE_SAVED: ...] with "(Image - Refer to question paper)"
- question_answer: correct answer (e.g. A. <answer value here>) with explanation if present, null otherwise. Sometimes correct answer is indicated with a tick mark.
- page_numbers: array of integers only (e.g. [21, 22]) corresponding to the [PAGE_NUMBER: in the next [PAGE_IMAGE_SAVED] marker you find in the text. Never leave it empty
- concept_tags: 1-3 relevant conceptual tags related to math/data science/statistics/similar fields (e.g., ["probability", "distributions"], make it all lowercase.

Ignore: "Item Weight", "Item Psychometrics", or [PAGE_IMAGE_SAVED:...] markers.
Return ONLY valid JSON array — no markdown, no extra commentary.

Text:
{text}
"""


def sanitize_output(text):
    """Remove markdown code fences and trim output."""
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        if len(parts) >= 3:
            text = parts[1]
            if text.strip().startswith("json"):
                text = "\n".join(text.splitlines()[1:])
    return text.strip()


def map_pages_to_images(questions, page_to_image_map):
    """
    Add image paths to questions based on their page numbers.
    Each question gets only the image paths corresponding to its page_numbers.
    """
    for q in questions:
        page_numbers = q.get("page_numbers", [])
        image_paths = []
        for page_num in page_numbers:
            if page_num in page_to_image_map:
                image_paths.extend(page_to_image_map[page_num])
        q["page_image_paths"] = list(set(image_paths))
    return questions


# === Core Processing ===
def parse_file(txt_file):
    """
    Parse a single exam text file using adaptive chunking.
    """
    input_path = os.path.join(TEXT_DIR, txt_file)

    with open(input_path, "r", encoding="utf-8") as f:
        full_text = f.read()

    print(f"   📖 Building page-to-image mapping...")
    page_to_image_map = build_page_to_image_map(full_text)
    print(f"      Found {len(page_to_image_map)} pages with images")

    pages = full_text.split("=== PAGE BREAK ===")
    if not pages:
        print("   ⚠️  No pages found in file!")
        return None

    # Adaptive chunk size based on average page length
    avg_page_length = sum(len(p) for p in pages) / len(pages)
    if avg_page_length < 500:
        adaptive_chunk_size, reason = 10, "sparse content"
    elif avg_page_length < 1500:
        adaptive_chunk_size, reason = 5, "medium content"
    else:
        adaptive_chunk_size, reason = 3, "dense content"

    chunks = []
    for i in range(0, len(pages), adaptive_chunk_size):
        chunk_text = "\n=== PAGE BREAK ===\n".join(pages[i:i + adaptive_chunk_size])
        chunks.append(chunk_text)

    print(f"   📄 {len(pages)} pages → {len(chunks)} chunk(s) "
          f"({adaptive_chunk_size} pages/chunk, {reason})")

    all_questions = []

    for idx, chunk_text in enumerate(chunks, 1):
        print(f"   🚀 Chunk {idx}/{len(chunks)}...", end=" ", flush=True)
        start = time.time()

        try:
            prompt = build_prompt(chunk_text)
            response = model.generate_content(prompt)
            output = sanitize_output(response.text)
            parsed = json.loads(output)

            if not isinstance(parsed, list):
                parsed = [parsed]

            elapsed = time.time() - start
            print(f"✅ {len(parsed)} question(s) ({elapsed:.1f}s)")
            all_questions.extend(parsed)

        except json.JSONDecodeError:
            elapsed = time.time() - start
            print(f"⚠️  Invalid JSON ({elapsed:.1f}s)")
        except Exception as e:
            elapsed = time.time() - start
            print(f"❌ Error: {e} ({elapsed:.1f}s)")

    if not all_questions:
        print("   ⚠️  No questions parsed.")
        return None

    print(f"   🔗 Mapping page numbers to image paths...")
    all_questions = map_pages_to_images(all_questions, page_to_image_map)

    return all_questions


def parse_exam_papers():
    """Main entry: process all .txt files sequentially."""
    txt_files = [f for f in os.listdir(TEXT_DIR) if f.lower().endswith(".txt")]

    if not txt_files:
        print("⚠️  No text files found in text_extracted/")
        return

    print(f"\n{'='*60}")
    print(f"📚 QuizBank LLM Parser — Adaptive Chunking Edition")
    print(f"{'='*60}")
    print(f"Found {len(txt_files)} file(s)\n")

    total_start = time.time()

    for idx, txt_file in enumerate(txt_files, 1):
        print(f"\n[{idx}/{len(txt_files)}] {txt_file}")
        file_start = time.time()

        questions = parse_file(txt_file)

        if questions:
            output_path = os.path.join(OUTPUT_DIR, os.path.splitext(txt_file)[0] + ".json")
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(questions, f, indent=2, ensure_ascii=False)

            elapsed = time.time() - file_start
            with_imgs = sum(1 for q in questions if q.get("page_image_paths"))
            with_pages = sum(1 for q in questions if q.get("page_numbers"))

            print(f"\n   ✅ {len(questions)} questions saved")
            print(f"   📊 {with_pages} with page numbers, {with_imgs} with images")
            print(f"   ⏱️  {elapsed:.1f}s ({elapsed/60:.1f} min)")
        else:
            print(f"   ⚠️  No questions found")

    total_elapsed = time.time() - total_start
    print(f"\n{'='*60}")
    print(f"✅ Complete: {total_elapsed:.1f}s ({total_elapsed/60:.1f} min)")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    parse_exam_papers()
