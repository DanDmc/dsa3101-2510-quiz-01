import os
import google.generativeai as genai

# === 1. configuration ===
API_KEY = "AIzaSyBoCIKzP_K3n1o6gKLSItv1sg9IFZKH6u8"  # replace or load from .env later
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
1. Identify each distinct question.
2. Ignore any answer options, checkmarks, solutions, "Item Weight", "Item Psychometrics", or metadata sections.
3. If the text contains code output, math equations, or R/Python logs, **keep only what is necessary** to understand the question context.
4. Clean up formatting — add missing spaces and punctuation so that each question stem is coherent and human-readable.
5. Generate **1–3 relevant concept tags** that you are reasonably confident represent what the question tests (e.g., "simple regression", "hypothesis testing", "probability", "combinatorics").
6. If unsure about tags, return an empty list `[]`.
7. Keep "difficulty_level" as null.
8. Keep "question_id" as null (it will be populated later by MySQL).

You must return **only valid JSON**, formatted as an array of question objects.

Each object must strictly follow this schema:
{{
  "question_id": null,
  "version_id": 1,
  "file_id": null,
  "question_no": <integer>,
  "question_type": "mcq" | "mrq" | "coding" | "open-ended" | "fill-in-the-blanks" | "others",
  "difficulty_level": null,
  "question_stem": "<cleaned, coherent text of the question only — no answers, no explanations>",
  "question_stem_html": null,
  "concept_tags": ["tag1", "tag2"],
  "question_media": [],
  "last_used": null
}}

Return only a valid JSON array — no markdown, no commentary.
Your response must begin with "[" and end with "]" — no ```json or ``` or markdown code fences.


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
