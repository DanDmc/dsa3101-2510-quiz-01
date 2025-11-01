"""
LLM-based Question Parser
=========================

This module uses Google's Gemini API to parse extracted text from exam papers
into structured JSON format using a formal output schema for reliability.
"""

from pathlib import Path # <-- Standardized to Path
import os
import sys
import io
import json
import re
import time
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold, Schema, Type


# === 1. Configuration ===
API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = "gemini-1.5-flash"

# Standardized to Path
TEXT_DIR = Path("data") / "text_extracted"
OUTPUT_DIR = Path("data") / "json_output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

if not API_KEY:
    print("Error: GEMINI_API_KEY environment variable not set.")
    sys.exit(1)

# === 2. LLM Setup and Schema Definition (MAJOR FIX) ===

# Define the strict schema the model MUST follow
QUESTION_SCHEMA = Schema(
    type=Type.ARRAY,
    items=Schema(
        type=Type.OBJECT,
        properties={
            "question_no": Schema(type=Type.STRING, description="Exact numbering (e.g., '1a', '3.1')."),
            "question_type": Schema(
                type=Type.STRING, 
                description="Classification: mcq|mrq|coding|open-ended|fill-in-the-blanks|others.",
                enum=["mcq", "mrq", "coding", "open-ended", "fill-in-the-blanks", "others"],
            ),
            "difficulty_rating_manual": Schema(
                type=Type.NUMBER, 
                description="Manual difficulty rating, decimal 0.0–1.0. Convert percent to decimal if present.",
            ),
            "question_stem": Schema(
                type=Type.STRING, 
                description="The question text only (no options/answers). Replace any image markers with '(Image - Refer to question paper)'."
            ),
            "question_options": Schema(
                type=Type.ARRAY,
                description="Array of {'label': 'A', 'text': '...'} for MCQ/MRQ, empty list [] otherwise. Replace any image markers with '(Image - Refer to question paper)'."
            ),
            "question_answer": Schema(
                type=Type.STRING, 
                description="The correct answer with explanation if present, or NULL if unknown."
            ),
            "page_numbers": Schema(
                type=Type.ARRAY, 
                items=Schema(type=Type.INTEGER), 
                description="List of page numbers [X] found in the question."
            ),
            "concept_tags": Schema(
                type=Type.ARRAY, 
                items=Schema(type=Type.STRING), 
                description="1-3 relevant concept tags (e.g., ['probability', 'distributions']).",
            ),
        },
        required=["question_no", "question_type", "question_stem"],
    )
)

genai.configure(api_key=API_KEY)
model = genai.GenerativeModel(
    MODEL,
    generation_config={
        "temperature": 0.1, 
        "top_p": 0.95,
        "top_k": 40,
        "response_mime_type": "application/json", # Force JSON output
        "response_schema": QUESTION_SCHEMA,       # Enforce this schema
    },
    safety_settings=[
        # Allow less strict output since exam text might contain math/code
        HarmCategory.HARM_CATEGORY_HARASSMENT, HarmBlockThreshold.BLOCK_NONE
    ]
)


# === Utility Functions ===
def build_page_to_image_map(full_text):
    """Parse text markers to map page number to image paths."""
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
    """
    Construct a structured instruction prompt for an LLM.
    
    The prompt is now much shorter because the schema is passed via API arguments.
    """
    return f"""
Analyze the provided text from an exam paper. 
Your task is to extract every question and organize it into the requested JSON schema.

Instructions for Content:
1. Replace all raw image markers ([PAGE_IMAGE_SAVED:...]) in the stem and options with the exact placeholder text: "(Image - Refer to question paper)".
2. Extract page numbers from markers ([PAGE_NUMBER:X]).
3. Convert any percentage difficulty ratings (e.g., "50%") into a decimal (0.5).
4. Ignore any administrative text like "Item Weight", "Item Psychometrics".
5. Return ONLY the JSON object that conforms to the requested schema.

Text to Analyze:
{text}
"""


def sanitize_output(text):
    """
    Clean LLM output by stripping code fences. 
    
    NOTE: Using response_mime_type should eliminate the need for this, but it's 
    kept as a robust defensive measure against LLM formatting drift.
    """
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        if len(parts) >= 3:
            text = parts[1]
            if text.strip().startswith("json"):
                text = "\n".join(text.splitlines()[1:])
    return text.strip()


def map_pages_to_images(questions, page_to_image_map):
    """Attach image paths to each parsed question based on its page numbers."""
    for q in questions:
        page_numbers_raw = q.get("page_numbers", [])
        image_paths = []
        
        # Ensure page_numbers are integers (V1/V2 cleaning logic)
        page_numbers = []
        if isinstance(page_numbers_raw, list):
            for p in page_numbers_raw:
                try:
                    page_numbers.append(int(p))
                except (ValueError, TypeError):
                    pass # Ignore non-integer page numbers
        
        q["page_numbers"] = page_numbers # Store the cleaned list
        
        for page_num in page_numbers:
            if page_num in page_to_image_map:
                image_paths.extend(page_to_image_map[page_num])
        
        q["page_image_paths"] = list(set(image_paths))
    return questions


# === Core Processing ===
def parse_file(txt_file_path: Path): # <-- Accepts a Path object
    """Parse a single extracted-exam text file into structured question objects."""
    
    # Use Path object directly
    try:
        with open(txt_file_path, "r", encoding="utf-8") as f:
            full_text = f.read()
    except FileNotFoundError:
        print(f" Error: Text file not found at {txt_file_path}")
        return None
    except Exception as e:
        print(f" Error reading file {txt_file_path}: {e}")
        return None


    print(f" Building page-to-image mapping...")
    page_to_image_map = build_page_to_image_map(full_text)
    print(f" Found {len(page_to_image_map)} pages with images")

    pages = full_text.split("=== PAGE BREAK ===")
    if not pages:
        print(" No pages found in file!")
        return None

    avg_page_length = sum(len(p) for p in pages) / len(pages) if pages else 0
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

    print(f" {len(pages)} pages → {len(chunks)} chunk(s) "
          f"({adaptive_chunk_size} pages/chunk, {reason})")

    all_questions = []

    for idx, chunk_text in enumerate(chunks, 1):
        print(f" Chunk {idx}/{len(chunks)}...", end=" ", flush=True)
        start = time.time()

        try:
            prompt = build_prompt(chunk_text)
            
            response = model.generate_content(prompt)
            
            # Since the model is forced to output JSON, the text *should* be clean.
            output = sanitize_output(response.text)

            # Attempt to clean up stray characters if JSON fails
            output_clean = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', output)
            
            # The output is an array of questions, but if the LLM output is wrapped 
            # in prose, the schema enforcement might put it in a single object.
            parsed = json.loads(output_clean)

            if not isinstance(parsed, list):
                # If the schema enforcement produced a single object instead of an array
                parsed = [parsed]

            elapsed = time.time() - start
            print(f" {len(parsed)} question(s) ({elapsed:.1f}s)")
            all_questions.extend(parsed)

        except json.JSONDecodeError as e:
            elapsed = time.time() - start
            print(f" Invalid JSON ({elapsed:.1f}s) — {e}")
            # Log the invalid content for later debugging/manual correction
            print("---START OF INVALID JSON---")
            print(output_clean)
            print("---END OF INVALID JSON---")
        except Exception as e:
            elapsed = time.time() - start
            print(f" Error: {e} ({elapsed:.1f}s)")

    if not all_questions:
        print(" No questions parsed.")
        return None

    print(f" Mapping page numbers to image paths...")
    all_questions = map_pages_to_images(all_questions, page_to_image_map)

    return all_questions


# === Main Execution Entry Point (Fixed V2 Logic) ===
def parse_exam_papers(target_base=None):
    
    total_start = time.time()
    
    # --- Determine Files to Process ---
    if target_base:
        # SINGLE FILE MODE (Pipeline)
        txt_file_name = f"{target_base}.txt"
        txt_file_path = TEXT_DIR / txt_file_name
        
        if not txt_file_path.exists():
            print(f" Error: Target text file not found: {txt_file_name}")
            sys.exit(1) # Signal failure to the Flask app
        
        txt_files_to_process = [txt_file_path] 
        print(f"Found 1 target text file to process: {txt_file_name}\n")
    else:
        # LEGACY MODE (Standalone/Batch)
        txt_files_to_process = [f for f in TEXT_DIR.glob("*.txt")]
        if not txt_files_to_process:
            print(" No text files found in text_extracted/")
            return
        print(f"Found {len(txt_files_to_process)} file(s) to process (legacy mode)\n")
    # --- End Determination ---


    print(f"\n{'='*60}")
    print("QuizBank LLM Parser — Structured JSON Edition")
    print(f"{'='*60}")
    print(f"Processing {len(txt_files_to_process)} file(s)\n")


    for idx, txt_file_path in enumerate(txt_files_to_process, 1):
        txt_file_name = txt_file_path.name
        
        print(f"\n[{idx}/{len(txt_files_to_process)}] {txt_file_name}")
        file_start = time.time()

        questions = parse_file(txt_file_path)

        if questions:
            output_path = OUTPUT_DIR / f"{txt_file_path.stem}.json"
            
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(questions, f, indent=2, ensure_ascii=False)

            elapsed = time.time() - file_start
            with_imgs = sum(1 for q in questions if q.get("page_image_paths"))
            with_pages = sum(1 for q in questions if q.get("page_numbers"))

            print(f"\n {len(questions)} questions saved to {output_path.name}")
            print(f" {with_pages} with page numbers, {with_imgs} with images")
            print(f" {elapsed:.1f}s ({elapsed/60:.1f} min)")
        else:
            print(f" No questions found in {txt_file_name}")

    total_elapsed = time.time() - total_start
    print(f"\n{'='*60}")
    print(f" Complete: {total_elapsed:.1f}s ({total_elapsed/60:.1f} min)")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    # ===== Ensure stdout supports UTF-8 (cross-platform) =====
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    target_base = os.getenv("TARGET_BASE")

    if target_base:
        # Pipeline Mode
        parse_exam_papers(target_base=target_base)
    else:
        # Legacy Mode
        parse_exam_papers()