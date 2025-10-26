## llm_parser.py by the backend

import os
import google.generativeai as genai
# --- injected filter: process a single base if TARGET_BASE is set ---
import os as _os_injected
_ORIG_LISTDIR = _os_injected.listdir
def _filtered_listdir(path):
    try:
        target = _os_injected.getenv("TARGET_BASE")
        if target and ("text_extracted" in str(path)):
            want = f"{target}.txt"
            return [f for f in _ORIG_LISTDIR(path) if f == want]
    except Exception:
        pass
    return _ORIG_LISTDIR(path)
_os_injected.listdir = _filtered_listdir
# --- end injected filter ---



# === 1. configuration ===
API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyBoCIKzP_K3n1o6gKLSItv1sg9IFZKH6u8")
MODEL = "gemini-2.5-flash"

TEXT_DIR = os.path.join("data", "text_extracted")
OUTPUT_DIR = os.path.join("data", "json_output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# === 2. set up model ===
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel(MODEL)

# === 3. helper: build the prompt ===
def build_prompt(text: str) -> str:
    return f"""
You are an information extractor that converts exam paper text into a structured JSON array for a quiz database.

The input text below may contain multiple questions, sometimes with code blocks, math formulas, or messy formatting.
Each question usually begins with a line such as "Question #:" or with a numbered sequence.

Your task:
1. Identify each distinct question or subpart.
2. **IMPORTANT**: Preserve question numbering exactly as it appears in the source:
   - If questions are numbered "1a", "1b", "2a", use those as question_no (as strings)
   - If questions are numbered "(a)", "(b)", "(c)", use "1a", "1b", "1c" format
   - If questions are numbered "1", "2", "3", use those (as strings)
   - Question numbers should always be strings to handle formats like "1a", "2b", etc.
3. Ignore any answer options, checkmarks, solutions, "Item Weight", "Item Psychometrics", or metadata sections.
4. If the text contains code output, math equations, or R/Python logs, **keep only what is necessary** to understand the question context.
5. Clean up formatting – add missing spaces and punctuation so that each question stem is coherent and human-readable.
6. Generate **1–3 relevant concept tags** that you are reasonably confident represent what the question tests (e.g., "simple regression", "hypothesis testing", "probability", "combinatorics").
7. If unsure about tags, return an empty list `[]`.
8. Keep "difficulty_level" as null.
9. Keep "question_id" as null (it will be populated later by MySQL).

You must return **only valid JSON**, formatted as an array of question objects.

Each object must strictly follow this schema:
{{
  "question_id": null,
  "version_id": 1,
  "file_id": null,
  "question_no": "<string: e.g. '1', '1a', '2b', etc>",
  "question_type": "mcq" | "mrq" | "coding" | "open-ended" | "fill-in-the-blanks" | "others",
  "difficulty_rating_manual": null,
  "difficulty_rating_model": null,
  "question_stem": "<cleaned, coherent text of the question only – no answers, no explanations>",
  "question_stem_html": null,
  "concept_tags": ["tag1", "tag2"],
  "last_used": null
}}

Return only a valid JSON array – no markdown, no commentary.
Your response must begin with "[" and end with "]" – no ```json or ``` or markdown code fences.


Here is the text to parse:
<<<BEGIN EXAM TEXT>>>
{text}
<<<END EXAM TEXT>>>
"""


# === 4. main loop ===
txt_files = [f for f in os.listdir(TEXT_DIR) if f.lower().endswith(".txt")]

for txt_file in txt_files:
    input_path = os.path.join(TEXT_DIR, txt_file)
    output_path = os.path.join(OUTPUT_DIR, os.path.splitext(txt_file)[0] + ".json")

    print(f"🤖 Parsing {txt_file} with Gemini...")

    with open(input_path, "r", encoding="utf-8") as f:
        text = f.read()

    try:
        prompt = build_prompt(text)
        response = model.generate_content(prompt)
        output_text = response.text.strip()

        # --- 🧹 Sanitize Markdown fences if Gemini wraps output ---
        if output_text.startswith("```"):
            parts = output_text.split("```")
            if len(parts) >= 3:
                output_text = parts[1]
                # Remove "json" label if present on the first line
                if output_text.strip().startswith("json"):
                    output_text = "\n".join(output_text.splitlines()[1:])
            output_text = output_text.strip()

        # --- ✅ Optional safety check: verify JSON validity ---
        import json
        try:
            json.loads(output_text)
        except json.JSONDecodeError as e:
            print(f"⚠️ Warning: Output from {txt_file} might not be valid JSON ({e})")

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(output_text)

        print(f"✅ Saved parsed JSON to {output_path}\n")

    except Exception as e:
        print(f"❌ Failed on {txt_file}: {e}")
