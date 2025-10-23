import os
import google.generativeai as genai

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
3. Extract difficulty rating if present in the source text:
   - Look for labels like "Difficulty Level", "P-value", "Item Difficulty", "Difficulty:", etc.
   - If found, extract the numeric value (e.g., 0.75, 0.5, 85%)
   - Convert percentages to decimal (e.g., 85% → 0.85)
   - If no difficulty rating is found, set to null
4. Ignore any answer options, checkmarks, solutions, "Item Weight", "Item Psychometrics" (except difficulty), or metadata sections.
5. If the text contains code output, math equations, embedded images, or R/Python logs, try to conver them into text. Keep what is necessary to understand the question context as much as possible.
6. Clean up formatting – add missing spaces and punctuation so that each question stem is coherent and human-readable.
7. Generate **1–3 relevant concept tags** that you are reasonably confident represent what the question tests (e.g., "simple regression", "hypothesis testing", "probability", "combinatorics").
8. If unsure about tags, return an empty list `[]`.
9. Keep "difficulty_rating_model" as null (will be populated by ML model later).
10. Keep "question_id" as null (it will be populated later by MySQL).

You must return **only valid JSON**, formatted as an array of question objects.

Each object must strictly follow this schema:
{{
  "question_id": null,
  "version_id": 1,
  "file_id": null,
  "question_no": "<string: e.g. '1', '1a', '2b', etc>",
  "question_type": "mcq" | "mrq" | "coding" | "open-ended" | "fill-in-the-blanks" | "others",
  "difficulty_rating_manual": null | <float between 0 and 1>,
  "difficulty_rating_model": null,
  "question_stem": "<cleaned, coherent text of the question only – no answers, no explanations>",
  "question_stem_html": null,
  "concept_tags": ["tag1", "tag2"],
  "question_media": [],
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