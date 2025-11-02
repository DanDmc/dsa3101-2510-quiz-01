"""
LLM-based Question Parser
=========================

This module uses Google's Gemini API to parse extracted text from exam papers
into structured JSON format suitable for database insertion.

Simple, adaptive, and accurate two-step approach:
1. Build a dictionary mapping page_number → image_path from text markers
2. LLM extracts questions (with page numbers), and we map to image paths

Key Features:
- Adaptive chunking: dynamically chooses pages per chunk (3-10) based on content density
- Sequential processing (rate-limit safe)
- Accurate page_number and image_path mapping
- Real-time progress + timing for each chunk and file
- Schema-compatible output for insert_questions.py
"""

from pathlib import Path
import os
import sys
import io
import json
import re
import time
import google.generativeai as genai


# === Configuration ===
API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = "gemini-1.5-flash"  # Note: Updated to gemini-1.5-flash as 2.5 isn't public

TEXT_DIR = Path("data/text_extracted")
JSON_DIR = Path("data/json_output")
os.makedirs(JSON_DIR, exist_ok=True)

if not API_KEY:
    print("Error: GEMINI_API_KEY environment variable not set.")
    sys.exit(1)

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
    Parse an extracted PDF/text block and build a mapping from page number to
    the image paths saved for that page.

    The function expects `full_text` to be a single string containing multiple
    pages separated by the literal marker:
        "=== PAGE BREAK ==="
    and, within each page's text, optional markers of the form:
        [PAGE_NUMBER: <int>]
        [PAGE_IMAGE_SAVED: <path/to/image.png>]

    If a page contains multiple `[PAGE_IMAGE_SAVED: ...]` markers, all of them
    are collected into a list for that page. If no image markers are present,
    the page maps to an empty list.

    Example output:
        {
            1: ["data/question_media/DSA1101_page1.png"],
            2: ["data/question_media/DSA1101_page2_img1.png",
                "data/question_media/DSA1101_page2_img2.png"],
        }

    Args:
        full_text (str): The entire extracted text containing page-break and
            page-metadata markers.

    Returns:
        dict[int, list[str]]: A dictionary where each key is a page number and
        each value is a list of image paths (possibly empty) associated with
        that page.
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
    """
    Construct a structured instruction prompt for an LLM to extract exam questions
    from raw PDF/text into a strict JSON array.

    The prompt tells the model to:
      - return **only** a valid JSON array (no markdown, no prose);
      - extract one object per question;
      - normalise fields such as:
          - `question_no` (preserve original numbering, e.g. "1(a)", "2b", "3.1")
          - `question_type` (must be one of: mcq, mrq, coding, open-ended,
            fill-in-the-blanks, others)
          - `difficulty_rating_manual` i.e. DifficultyLevel/P-value (if present) otherwise null
          - `question_stem` (question text only; image markers replaced with
            "(Image - Refer to question paper)")
          - `question_options` (list of {"label": ..., "text": ...} for MCQ/MRQ;
            [] otherwise; image markers replaced similarly)
          - `question_answer` (correct answer with explanation if available,
            or null)
          - `page_numbers` (all page numbers found for the question, corresponding to the [PAGE_NUMBER: in the next [PAGE_IMAGE_SAVED] marker)
          - `concept_tags` (1-3 relevant tags related to math/data science/statistics/similar fields)
      - ignore administrative / non-question metadata such as
        "Item Weight", "Item Psychometrics", and raw `[PAGE_IMAGE_SAVED: ...]`
        markers.

    Args:
        text (str): The raw extracted text (usually from a PDF) that contains
            questions, page markers, and possibly image markers.

    Returns:
        str: A complete prompt string ready to be sent to an LLM.
    """
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
    """
    Clean LLM output by stripping code fences and leading language markers.

    Many LLMs return JSON wrapped in Markdown fences like:

        ```json
        [ ... ]
        ```

    This helper:
      1. trims whitespace;
      2. if the text starts with ``` it splits on ``` and takes the inner part;
      3. if that inner part starts with "json" on the first line, it drops that line;
      4. returns the cleaned string, stripped again.

    Args:
        text (str): Raw LLM output (possibly with Markdown fences).

    Returns:
        str: Plain JSON text (or the original text if no fences were found).
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
    """
    Attach image paths to each parsed question based on its page numbers.

    For every question in `questions`, this looks at the question's
    `page_numbers` field (list of ints) and gathers all image paths from
    `page_to_image_map` for those pages. The collected image paths are
    de-duplicated and stored under `q["page_image_paths"]`.

    Args:
        questions (list[dict]): Parsed questions, each possibly containing
            "page_numbers": [int, ...].
        page_to_image_map (dict[int, list[str]]): Mapping from page number
            to a list of image paths for that page.

    Returns:
        list[dict]: The same list of questions, but each enriched with
        "page_image_paths": [...], possibly empty.
    """
    for q in questions:
        page_numbers_raw = q.get("page_numbers", [])
        image_paths = []
        
        # Ensure page_numbers are integers
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
def parse_file(txt_file):
    """
    Parse a single extracted-exam text file into structured question objects.

    Steps:
        1. Read the text file from TEXT_DIR.
        2. Build a page→image mapping from markers in the text
           (via `build_page_to_image_map`).
        3. Split the text into pages using "=== PAGE BREAK ===".
        4. Choose an adaptive chunk size (how many pages per LLM call)
           based on average page length:
               - < 500 chars → 10 pages per chunk (sparse)
               - < 1500 chars → 5 pages per chunk (medium)
               - else → 3 pages per chunk (dense)
        5. For each chunk:
               - build the LLM prompt (`build_prompt`)
               - call the model (`model.generate_content(...)`)
               - clean the output (`sanitize_output`)
               - JSON-decode it and accumulate the questions
               - log success / failure with timing
        6. After all chunks, map page numbers back to image paths
           (`map_pages_to_images`).

    Args:
        txt_file (str): Filename (relative, e.g. "ST1234_Midterm.txt") inside TEXT_DIR.

    Returns:
        list[dict] | None: List of parsed question dicts if at least one chunk
        was successfully parsed; None if no questions could be parsed.
    """
    input_path = os.path.join(TEXT_DIR, txt_file)

    try:
        with open(input_path, "r", encoding="utf-8") as f:
            full_text = f.read()
    except FileNotFoundError:
        print(f" Error: Text file not found at {input_path}")
        return None
    except Exception as e:
        print(f" Error reading file {input_path}: {e}")
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
            
            # === DEBUG: Show what is sent to LLM (first 500 chars only) ===
            # print("\n=== PROMPT (truncated) ===")
            # print(prompt[:500] + "...\n====================")
            
            response = model.generate_content(prompt)
            
            # === DEBUG: Show raw output from LLM ===
            # print("\n=== RAW LLM OUTPUT ===")
            # print(response.text[:1000] + "...\n====================")

            output = sanitize_output(response.text)

            # Attempt to clean up stray characters if JSON fails
            output_clean = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', output)
            parsed = json.loads(output_clean)

            if not isinstance(parsed, list):
                parsed = [parsed]

            elapsed = time.time() - start
            print(f" {len(parsed)} question(s) ({elapsed:.1f}s)")
            all_questions.extend(parsed)

        except json.JSONDecodeError as e:
            elapsed = time.time() - start
            print(f" Invalid JSON ({elapsed:.1f}s) — {e}")
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


def parse_exam_papers():
    """
    Main entry point for batch parsing of exam text files.

    Behavior:
        - Looks for the environment variable `TARGET_BASE`.
          If present, it will process **only** that single text file:
              <TARGET_BASE>.txt
          located in `TEXT_DIR`, and write the result to:
              JSON_DIR/<TARGET_BASE>.json
        - For that file, it:
              * calls `parse_file(...)`
              * writes parsed questions to JSON (pretty-printed, UTF-8)
              * logs counts of questions, how many had pages, how many had images
              * logs total runtime

    Environment:
        TARGET_BASE (str): base name of the text file (without extension)
            to process, e.g. "ST2131_Midterm_2024".

    Side effects:
        - Writes a JSON file into JSON_DIR.
        - Prints progress and timing to stdout.

    Returns:
        None
    """
    target_base = os.environ.get("TARGET_BASE")
    if target_base:
        txt_file = f"{target_base}.txt"

        print(f"\n{'='*60}")
        print(f"📄 Parsing single text file (TARGET_BASE): {target_base}.txt")
        print(f"{'='*60}")
        
        file_start = time.time()

        questions = parse_file(txt_file)

        if questions:
            output_path = os.path.join(JSON_DIR, os.path.splitext(txt_file)[0] + ".json")
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(questions, f, indent=2, ensure_ascii=False)

            elapsed = time.time() - file_start
            with_imgs = sum(1 for q in questions if q.get("page_image_paths"))
            with_pages = sum(1 for q in questions if q.get("page_numbers"))

            print(f"\n {len(questions)} questions saved")
            print(f" {with_pages} with page numbers, {with_imgs} with images")
            print(f" {elapsed:.1f}s ({elapsed/60:.1f} min)")
        else:
            print(f" No questions found")

    total_elapsed = time.time() - file_start
    print(f"\n{'='*60}")
    print(f" Complete: {total_elapsed:.1f}s ({total_elapsed/60:.1f} min)")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    # ===== Option 2: Ensure stdout supports UTF-8 (cross-platform) =====
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    # --- FIX: Read the environment variable from app.py ---
    target_base = os.getenv("TARGET_BASE")

    if not target_base:
        print("Warning: TARGET_BASE environment variable not set.")
        print("Running in 'process all' mode (legacy).\n")
        parse_exam_papers() # Fallback to old behavior
    else:
        # Pass the single target base name into the function
        print(f"Processing single file from TARGET_BASE: {target_base}\n")
        parse_exam_papers(target_base=target_base)