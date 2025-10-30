from flask import Flask, request, jsonify, send_file, abort, render_template_string
import os
import MySQLdb
import pandas as pd
from sqlalchemy import func, or_
from contextlib import closing
import mimetypes
import time
import json
import datetime
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
import tempfile, shutil, hashlib, subprocess, shlex
from werkzeug.utils import secure_filename
# app.py (New/Modified section)
from flask_cors import CORS, cross_origin # ⬅️ ADD cross_origin here

app = Flask(__name__)

# -----------------------------------------------------
# 💡 FIX: CORS is set to the correct Vite port 5173
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})
# -----------------------------------------------------

# ---- Upload / pipeline config ----
app.config.setdefault("UPLOAD_FOLDER", os.getenv("UPLOAD_FOLDER", "./uploads"))
app.config.setdefault("MAX_CONTENT_LENGTH", int(os.getenv("MAX_UPLOAD_MB", "50")) * 1024 * 1024)
ALLOWED_EXTENSIONS = {"pdf"}

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
SRC_DIR = DATA_DIR / "source_files" 
TXT_DIR = DATA_DIR / "text_extracted" 
JSON_DIR = DATA_DIR / "json_output" 
for _d in (Path(app.config["UPLOAD_FOLDER"]), SRC_DIR, TXT_DIR, JSON_DIR):
    _d.mkdir(parents=True, exist_ok=True)

def _allowed_pdf(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def _ensure_dirs(*parts) -> Path:
    p = Path(app.config["UPLOAD_FOLDER"]).joinpath(*[str(x or "unknown") for x in parts])
    p.mkdir(parents=True, exist_ok=True)
    return p

def _run(cmd, env_extra=None, timeout=900):
    env = dict(os.environ)
    if env_extra: env.update(env_extra)
    p = subprocess.run(shlex.split(cmd), cwd=str(BASE_DIR), capture_output=True, text=True, timeout=timeout, env=env)
    return p.returncode, p.stdout.strip(), p.stderr.strip()

def get_connection():
    return MySQLdb.connect(
        host=os.getenv("MYSQL_HOST", "db"),
        user=os.getenv("MYSQL_USER", "quizbank_user"),
        passwd=os.getenv("MYSQL_PASSWORD","quizbank_pass"),
        db=os.getenv("MYSQL_DATABASE", "quizbank"),
    )

# check if table has the column mentioned
def has_column(conn, table: str, col: str) -> bool:
    with closing(conn.cursor()) as c:
        c.execute("""
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = %s
              AND COLUMN_NAME = %s
        """, (table, col))
        return c.fetchone()[0] == 1

# Helper function for safely parsing JSON fields from the database
def parse_json_field(field_json):
    if not field_json: return None 
    try:
        return json.loads(field_json)
    except Exception:
        return field_json 

# Helper function to convert datetime to ISO string
def ts(v):
    return v.isoformat() if hasattr(v, "isoformat") else (str(v) if v is not None else None)

# Helper function for getting a file row from the database
def _get_file_row(file_id: int):
    with closing(get_connection()) as conn:
        cur = conn.cursor(MySQLdb.cursors.DictCursor)
        cur.execute("SELECT id, file_name, file_path, uploaded_at FROM files WHERE id=%s", (file_id,))
        return cur.fetchone()

# -----------------------------------------------------
## 🗂️ File Normalization Helpers (Used by addquestion/get_file_id)

def _normalize_semester(sem: str) -> str:
    """
    Normalize various semester inputs to a compact canonical form.
    Examples: "Sem 1" -> "S1", "Semester 2" -> "S2", "ST I" -> "ST1"
    """
    if sem is None:
        return ""
    s = str(sem).strip().lower().replace("-", " ").replace("_", " ")
    # remove duplicate spaces
    s = " ".join(s.split())

    # common mappings
    if s in {"1", "sem 1", "semester 1", "s1", "sem1"}:
        return "S1"
    if s in {"2", "sem 2", "semester 2", "s2", "sem2"}:
        return "S2"
    if s in {"st1", "st 1", "special term 1", "specialterm 1", "special term i", "st i"}:
        return "ST1"
    if s in {"st2", "st 2", "special term 2", "specialterm 2", "special term ii", "st ii"}:
        return "ST2"
    return s.upper()


def _normalize_assessment_type(t: str) -> str:
    if t is None:
        return ""
    s = str(t).strip().lower().replace("-", " ").replace("_", " ")
    s = " ".join(s.split())
    return s.lower()


def get_file_id(course: str, year, semester: str, assessment_type: str, latest: bool = True):
    if not course:
        raise ValueError("course is required")
    try:
        year_int = int(str(year).strip())
    except Exception:
        raise ValueError("year must be an integer-like value")

    course_norm = str(course).strip().upper()
    sem_norm = _normalize_semester(semester)
    atype_norm = _normalize_assessment_type(assessment_type)

    sql = """
        SELECT id
        FROM files
        WHERE UPPER(course) = %s
          AND year = %s
          AND UPPER(semester) = %s
          AND UPPER(assessment_type) = %s
        {order_clause}
        LIMIT 1
    """.format(order_clause="ORDER BY uploaded_at DESC, id DESC" if latest else "")

    params = (course_norm, year_int, sem_norm, atype_norm)

    with closing(get_connection()) as conn:
        cur = conn.cursor()
        cur.execute(sql, params)
        row = cur.fetchone()
        return int(row[0]) if row else None

# -----------------------------------------------------
## 🏷️ Tag Normalization Helper (Used by addquestion/update_question/create_question)

def normalize_concept_tags(val):
    # standardise the format of the concept_tags field
    if val is None:
        return None
    if isinstance(val, (list, tuple)):
        return json.dumps(list(val), ensure_ascii=False)
    if isinstance(val, str):
        try:
            parsed = json.loads(val)
            if isinstance(parsed, (list, tuple)):
                return json.dumps(list(parsed), ensure_ascii=False)
        except Exception:
            pass
        return val  # plain string (e.g., "regression metrics")
    return json.dumps(val, ensure_ascii=False)

# -----------------------------------------------------
## 🩺 Health Check

@app.route("/health", methods=["GET"])
def health(): return {"ok": True}

# -----------------------------------------------------
## 📥 Question Retrieval

@app.route("/getquestion", methods=["GET"])
def get_question():
    # Query params
    course = request.args.get("course")
    year = request.args.get("year")
    semester = request.args.get("semester")
    assessment_type = request.args.get("assessment_type")

    question_type = request.args.get("question_type")
    question_no = request.args.get("question_no")

    # concept_tags can be ?concept_tags=probability&concept_tags=bayes or ?concept_tags=probability,bayes
    raw_tags = request.args.getlist("concept_tags")
    concept_tags = []
    for t in raw_tags:
        concept_tags.extend([s.strip() for s in t.split(",") if s.strip()])

    # pagination / sorting
    limit = int(request.args.get("limit", 50))
    offset = int(request.args.get("offset", 0))
    order_by_arg = (request.args.get("order_by") or "").lower()
    sort_arg = (request.args.get("sort") or "desc").lower()

    # Whitelist order_by to prevent SQL injection
    if order_by_arg == "created_at":
        order_by_sql = "q.created_at"
    elif order_by_arg == "difficulty":
        order_by_sql = "COALESCE(q.difficulty_rating_manual, q.difficulty_rating_model)" # Use manual if present, else model
    else:
        order_by_sql = "q.updated_at"
    sort_sql = "ASC" if sort_arg == "asc" else "DESC"

    # SELECT columns (include some file metadata for convenience)
    select_cols = [
        "q.id", "q.question_base_id", "q.version_id", "q.file_id", "q.question_no",
        "q.question_type", "q.question_stem", "q.question_stem_html",
        "q.concept_tags", 
        "q.page_image_paths", 
        "q.last_used", "q.created_at", "q.updated_at",
        "q.question_options", 
        "q.question_answer", 
        "q.difficulty_rating_manual", 
        "q.difficulty_rating_model",
        "f.course", "f.year", "f.semester", "f.assessment_type", "f.file_name", "f.file_path"
    ]

    # Build WHERE with parameters
    where_clauses = []
    params = []

    # ---- File-level filters (JOIN target) ----
    if course:
        where_clauses.append("f.course = %s")
        params.append(course)
    if year:
        where_clauses.append("f.year = %s")
        params.append(year)
    if semester:
        where_clauses.append("f.semester = %s")
        params.append(semester)
    if assessment_type:
        where_clauses.append("f.assessment_type = %s")
        params.append(assessment_type)

    # ---- Question-level filters ----
    if question_type:
        where_clauses.append("q.question_type = %s")
        params.append(question_type)
    if question_no:
        where_clauses.append("q.question_no = %s")
        params.append(question_no)

    if concept_tags:
        # AND logic: require ALL provided tags to be present in q.concept_tags (a JSON array)
        where_clauses.append("JSON_CONTAINS(q.concept_tags, CAST(%s AS JSON))")
        params.append(json.dumps(concept_tags))

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    sql = f"""
        SELECT {", ".join(select_cols)}
        FROM questions q
        JOIN files f ON f.id = q.file_id
        {where_sql}
        ORDER BY {order_by_sql} {sort_sql}
        LIMIT %s OFFSET %s
    """
    params.extend([limit, offset])

    # Execute
    with closing(get_connection()) as conn, closing(conn.cursor()) as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()

    # Map to dicts
    items = []
    for row in rows:
        (
            q_id, q_base_id, q_version_id, file_id, q_no,
            q_type, stem, stem_html,
            concept_json, media_json, last_used, created_at, updated_at,
            options_json,
            answer_json,
            difficulty_manual, difficulty_model, 
            f_course, f_year, f_semester, f_assessment, f_name, f_path
        ) = row

        concept_list = parse_json_field(concept_json)
        media_list = parse_json_field(media_json)
        options_list = parse_json_field(options_json)
        answer_data = parse_json_field(answer_json)
        
        # Use manual difficulty rating if it exists, otherwise use the model's prediction
        difficulty_level = difficulty_manual if difficulty_manual is not None else difficulty_model


        items.append({
            "id": q_id,
            "question_base_id": q_base_id,
            "version_id": q_version_id,
            "file_id": file_id,
            "question_no": q_no,
            "question_type": q_type,
            "question_stem": stem,
            "question_stem_html": stem_html,
            "concept_tags": concept_list,
            "question_media": media_list, 
            "question_options": options_list,
            "question_answer": answer_data,
            "last_used": ts(last_used),
            "created_at": ts(created_at),
            "updated_at": ts(updated_at),

            "difficulty_rating_manual": difficulty_manual,
            "difficulty_model": difficulty_model,
            "difficulty_level": difficulty_level, 
            
            "course": f_course,
            "year": f_year,
            "semester": f_semester,
            "assessment_type": f_assessment,
            "file_name": f_name,
            "file_path": f_path,
        })

    return jsonify({"total": len(items), "items": items})

# -----------------------------------------------------
## ⬇️ File Download

# Directory for files in the container
file_base_directory = os.getenv("file_base_directory", "/app/data/source_files")

def _strip_known_prefixes(p: str) -> str:
    prefixes = ("data/", "source_files/")
    for pref in prefixes:
        if p.startswith(pref):
            return p[len(pref):]
    return p

def _safe_join_file(base_dir: str, file_path: str) -> str:
    if not file_path:
        raise FileNotFoundError("Empty file path")

    if os.path.isabs(file_path):
        candidate = os.path.normpath(file_path)
    else:
        cleaned = _strip_known_prefixes(file_path.strip())
        candidate = os.path.normpath(os.path.join(base_dir, cleaned))

    base_dir_norm = os.path.normpath(base_dir)
    if not (candidate == base_dir_norm or candidate.startswith(base_dir_norm + os.sep)):
        raise FileNotFoundError("Invalid file path")
    return candidate


@app.route("/files/<int:file_id>/download", methods=["GET"])
def download_file(file_id: int):
    file_row = _get_file_row(file_id)
    if not file_row:
        abort(404, description="Invalid file")

    try:
        path_in_db = (file_row.get("file_name") or "").strip()
        full_path = _safe_join_file(file_base_directory, path_in_db)
    except FileNotFoundError as e:
        abort(404, description=str(e))

    if not os.path.exists(full_path):
        abort(404, description="File not in folder")

    guessed, _ = mimetypes.guess_type(file_row.get("file_name") or full_path)
    app.logger.info("DOWNLOAD full_path=%s base=%s dbpath=%s",
                 full_path, file_base_directory, path_in_db)

    return send_file(
        full_path,
        mimetype=guessed or "application/octet-stream",
        as_attachment=True,
        download_name=file_row.get("file_name") or os.path.basename(full_path),
        conditional=True,
    )

# -----------------------------------------------------
## 🧠 Difficulty Rating Model

# load the difficulty rating model
MODEL_PATH = os.getenv("diff_model_path", "/app/models/difficulty_v1.pkl")
difficulty_model = None
try:
    difficulty_model = joblib.load(MODEL_PATH)
    app.logger.info(f"[difficulty] Loaded model: {MODEL_PATH}")
except Exception as e:
    app.logger.warning(f"[difficulty] Model not loaded ({MODEL_PATH}): {e}")

def parse_tags_for_model(val):
    if not val:
        return []
    if isinstance(val, (list, tuple)):
        return list(val)
    try:
        return json.loads(val) or []
    except Exception:
        return []

def predict_row(row: dict) -> float:
    stem = (row.get("question_stem") or "").strip()
    tags_text = " ".join(parse_tags_for_model(row.get("concept_tags")))
    X = pd.DataFrame([{
        "question_stem": stem,
        "tags_text": tags_text,
        "question_type": row.get("question_type") or "",
    }])
    yhat = float(difficulty_model.predict(X)[0])
    return float(np.clip(yhat, 0.0, 1.0))

@app.route("/predict_difficulty", methods=["POST"])
def predict_difficulty():

    if difficulty_model is None:
        return jsonify({"error": "model not loaded"}), 503

    file_id = request.args.get("file_id", type=int)
    dry_run = request.args.get("dry_run", default=0, type=int) == 1

    # SQL portion
    where = "WHERE q.difficulty_rating_manual IS NULL"
    args = []
    if file_id:
        where += " AND q.file_id=%s"
        args.append(file_id)

    sql = f"""
        SELECT q.id, q.question_base_id, q.file_id,
               q.question_type, q.question_stem, q.concept_tags
        FROM questions q
        {where}
    """

    to_update, results = [], []

    with closing(get_connection()) as conn:
        cur = conn.cursor(MySQLdb.cursors.DictCursor)
        cur.execute(sql, tuple(args))
        rows = cur.fetchall()

        for r in rows:
            yhat = predict_row(r)
            results.append({
                "id": r["id"],
                "question_base_id": r["question_base_id"],
                "file_id": r["file_id"],
                "difficulty_rating_model": round(yhat, 4),
            })
            if not dry_run:
                to_update.append((yhat, r["id"]))

        if not dry_run and to_update:
            cur.executemany("""
                UPDATE questions
                   SET difficulty_rating_model = %s
                 WHERE id = %s
            """, to_update)
            conn.commit()

    return jsonify({
        "processed": len(results),
        "updated": 0 if dry_run else len(to_update),
        "dry_run": dry_run,
        "items": results[:100],
    })

# -----------------------------------------------------
## ⬆️ File Upload

@app.get("/upload")
def upload_page():
    # Helper endpoint for a simple HTML upload form
    return render_template_string("""
<!doctype html><html><head><meta charset='utf-8'><title>Upload PDF</title></head>
<body style="font-family:system-ui;padding:2rem;max-width:720px">
    <h1>Upload a PDF</h1>
    <form action="/upload_file" method="post" enctype="multipart/form-data">
        <label>PDF file <input type="file" name="file" accept="application/pdf" required></label><br><br>
        <label>Course <input type="text" name="course" placeholder="ST1131"></label><br>
        <label>Year <input type="text" name="year" placeholder="2024"></label><br>
        <label>Semester <input type="text" name="semester" placeholder="Sem 1"></label><br>
        <label>Assessment Type <input type="text" name="assessment_type" placeholder="quiz"></label><br><br>
        <button type="submit">Upload</button>
    </form>
</body></html>
""")


@app.post("/api/upload_file")
@cross_origin(origin='localhost:5173')  # ⬅️ CORS fix remains
def upload_file():
    import time
    course = request.form.get("course")
    year = request.form.get("year")
    semester = request.form.get("semester")
    assessment_type = request.form.get("assessment_type") or "others"
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    f = request.files["file"]
    if not f or f.filename == "":
        return jsonify({"error": "No selected file"}), 400
    if not _allowed_pdf(f.filename):
        return jsonify({"error": "Only .pdf allowed"}), 400
    # Basic PDF magic header check
    head = f.stream.read(5)
    f.stream.seek(0)
    if head != b"%PDF-":
        return jsonify({"error": "Invalid PDF header"}), 400
    # 💥 BEGIN LOCK FIX: Read entire stream into memory
    try:
        f.stream.seek(0)
        file_content = f.stream.read()
    except Exception as e:
        app.logger.error(f"Failed to read file stream: {e}")
        return jsonify({"error": "file_read_failed", "message": str(e)}), 500
    base_dir = Path(os.getenv("file_base_directory", "/app/data/source_files"))
    base_dir.mkdir(parents=True, exist_ok=True)
    original_name = secure_filename(f.filename)
    h = hashlib.sha256()
    fd, tmp_path_str = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    tmp_path = Path(tmp_path_str)
    with open(tmp_path, "wb") as w:
        h.update(file_content)
        w.write(file_content)
    short_hash = h.hexdigest()[:8]
    stem = Path(original_name).stem
    suffix = Path(original_name).suffix or ".pdf"
    candidate_name = original_name
    dest_path = base_dir / candidate_name
    if dest_path.exists():
        candidate_name = f"{stem}_{short_hash}{suffix}"
        dest_path = base_dir / candidate_name
    shutil.move(str(tmp_path), dest_path)
    # Insert into DB
    file_id = None
    try:
        with closing(get_connection()) as conn, closing(conn.cursor()) as cur:
            cur.execute(
                """INSERT INTO files (course, year, semester, assessment_type, file_name, file_path)
                   VALUES (%s,%s,%s,%s,%s,%s)""",
                (course, year, semester, assessment_type, candidate_name, str(dest_path))
            )
            conn.commit()
            file_id = cur.lastrowid
    except Exception as e:
        return jsonify({
            "saved": True,
            "message": "PDF saved but DB insert failed",
            "db_error": str(e),
            "path": str(dest_path)
        }), 201
    # Mirror to SRC_DIR if needed
    try:
        if Path(file_base_directory) != SRC_DIR:
            SRC_DIR.mkdir(parents=True, exist_ok=True)
            mirror_path = SRC_DIR / candidate_name
            if not mirror_path.exists():
                shutil.copyfile(dest_path, mirror_path)
    except Exception as e:
        app.logger.warning(f"Mirror to SRC_DIR failed: {e}")
    base = Path(candidate_name).stem
    logs = {}
    # 1) Extract text
    code, out, err = _run("python pdf_extractor.py", env_extra={"TARGET_PDF": candidate_name})
    logs["pdf_extractor"] = {"code": code, "stdout": out, "stderr": err}
    if code != 0:
        return jsonify({"saved": True, "file_id": file_id, "pipeline": logs, "error": "pdf_extractor failed"}), 500
    # 2) LLM parse
    code, out, err = _run("python llm_parser.py", env_extra={"TARGET_BASE": base})
    logs["llm_parser"] = {"code": code, "stdout": out, "stderr": err}
    if code != 0:
        return jsonify({"saved": True, "file_id": file_id, "pipeline": logs, "error": "llm_parser failed"}), 500
    # 3) Insert questions
    code, out, err = _run("python insert_questions.py", env_extra={"TARGET_BASE": base})
    logs["insert_questions"] = {"code": code, "stdout": out, "stderr": err}
    if code != 0:
        return jsonify({"saved": True, "file_id": file_id, "pipeline": logs, "error": "insert_questions failed"}), 500
    # ============================================================== 
    # 🔑 Retry loop for newly_inserted_questions with exponential backoff
    # ============================================================== 
    new_questions = []
    select_cols = [
        "q.id", "q.question_base_id", "q.version_id", "q.file_id", "q.question_no",
        "q.question_type", "q.question_stem", "q.question_stem_html",
        "q.concept_tags", "q.page_image_paths",
        "q.last_used", "q.created_at", "q.updated_at",
        "q.question_options", "q.question_answer",
        "q.difficulty_rating_manual", "q.difficulty_rating_model",
        "f.course", "f.year", "f.semester", "f.assessment_type", "f.file_name", "f.file_path"
    ]
    max_attempts = 12      # Exponential backoff, max 12 attempts (~5 min total)
    base_wait = 5          # initial wait in seconds
    for attempt in range(max_attempts):
        with closing(get_connection()) as conn, closing(conn.cursor()) as cur:
            sql = f"""
                SELECT {", ".join(select_cols)}
                FROM questions q
                JOIN files f ON f.id = q.file_id
                WHERE q.file_id = %s
                ORDER BY q.question_no ASC, q.id ASC
            """
            cur.execute(sql, (file_id,))
            rows = cur.fetchall()
        if rows:
            # populate new_questions
            for row in rows:
                (
                    q_id, q_base_id, q_version_id, file_id_r, q_no,
                    q_type, stem, stem_html,
                    concept_json, media_json, last_used, created_at, updated_at,
                    options_json, answer_json,
                    difficulty_manual, difficulty_model,
                    f_course, f_year, f_semester, f_assessment, f_name, f_path
                ) = row
                difficulty_level = difficulty_manual if difficulty_manual is not None else difficulty_model
                new_questions.append({
                    "id": q_id,
                    "question_base_id": q_base_id,
                    "version_id": q_version_id,
                    "file_id": file_id_r,
                    "question_no": q_no,
                    "question_type": q_type,
                    "question_stem": stem,
                    "question_stem_html": stem_html,
                    "concept_tags": parse_json_field(concept_json),
                    "question_media": parse_json_field(media_json),
                    "question_options": parse_json_field(options_json),
                    "question_answer": parse_json_field(answer_json),
                    "last_used": ts(last_used),
                    "created_at": ts(created_at),
                    "updated_at": ts(updated_at),
                    "difficulty_rating_manual": difficulty_manual,
                    "difficulty_model": difficulty_model,
                    "difficulty_level": difficulty_level,
                    "course": f_course,
                    "year": f_year,
                    "semester": f_semester,
                    "assessment_type": f_assessment,
                    "file_name": f_name,
                    "file_path": f_path,
                })
            break  # exit loop once rows are found
        else:
            wait_time = min(base_wait * (2 ** attempt), 30)  # exponential backoff, max 30s
            app.logger.info(f"Attempt {attempt+1}/{max_attempts}: no questions yet, retrying in {wait_time}s")
            time.sleep(wait_time)
    return jsonify({
        "saved": True,
        "file": {
            "file_id": file_id,
            "original_name": original_name,
            "stored_filename": candidate_name,
            "stored_path": str(dest_path)
        },
        "pipeline": logs,
        "newly_inserted_questions": new_questions
    }), 201



# -----------------------------------------------------
## ✏️ Question Editing (PATCH)

allowed_question_fields_for_edit = {"question_stem", "concept_tags", "difficulty_rating_manual", "question_type", "question_options", "question_answer"}
allowed_file_fields_for_edit = {"assessment_type", "course", "year", "semester"}

@app.route("/api/editquestions/<int:q_id>", methods=["PATCH"]) # PATCH method to allow partial update
def update_question(q_id):
    # the requested edit attribute
    payload = request.get_json(silent=True) or {}
    if not payload:
        return jsonify({"error": "empty_body"}), 400

    # Filter to allowed fields only
    question_updates = {}
    file_updates = {}
    for k,v in payload.items():
        if k in allowed_question_fields_for_edit:
            question_updates[k] = v
        elif k in allowed_file_fields_for_edit:
            file_updates[k] = v

    if not question_updates and not file_updates:
        return jsonify({"error": "no_allowed_fields"}), 400

    # Handle difficulty_rating_manual: must be a FLOAT or None
    if "difficulty_rating_manual" in question_updates:
        try:
            if question_updates["difficulty_rating_manual"] is None:
                pass
            else:
                question_updates["difficulty_rating_manual"] = float(question_updates["difficulty_rating_manual"])
        except Exception:
            return jsonify({"error": "invalid_type",
                            "field": "difficulty_rating_manual"}), 400

    # Handle concept_tags: normalise to JSON string
    if "concept_tags" in question_updates:
        question_updates["concept_tags"] = normalize_concept_tags(question_updates["concept_tags"])
        
    # Handle question_options: normalise to JSON string (if provided)
    if "question_options" in question_updates and question_updates["question_options"] is not None:
        try:
            # Ensure it's a JSON string if not already
            if isinstance(question_updates["question_options"], (list, dict)):
                question_updates["question_options"] = json.dumps(question_updates["question_options"], ensure_ascii=False)
            elif isinstance(question_updates["question_options"], str):
                json.loads(question_updates["question_options"]) # Just validate
            else:
                raise ValueError("Invalid format")
        except:
             return jsonify({"error": "invalid_json_format", "field": "question_options"}), 400
             
    # Handle question_answer: normalise to JSON string if complex type (if provided)
    if "question_answer" in question_updates and question_updates["question_answer"] is not None:
        if isinstance(question_updates["question_answer"], (list, dict)):
            question_updates["question_answer"] = json.dumps(question_updates["question_answer"], ensure_ascii=False)


    with closing(get_connection()) as conn:
        cur = conn.cursor(MySQLdb.cursors.DictCursor)

        # for questions table edits
        if question_updates:
            set_sql = ", ".join(f"{k}=%s" for k in question_updates)
            cur.execute(f"UPDATE questions SET {set_sql} WHERE id=%s LIMIT 1",
                        (*question_updates.values(), q_id))
            conn.commit()

        # for files table edits
        if file_updates:
            # first get the file_id
            cur.execute("SELECT file_id FROM questions WHERE id=%s", (q_id,))
            row = cur.fetchone()
            # if not row then file don't exist
            if not row:
                return jsonify({"error": "not_found_or_deleted", "id": q_id}), 404
            file_id = row["file_id"]
            set_sql = ", ".join(f"{k}=%s" for k in file_updates)
            cur.execute(f"UPDATE files SET {set_sql} WHERE id=%s LIMIT 1",
                        (*file_updates.values(), file_id))
            conn.commit()
            
        # Return the updated record, combined files and questions
        cur.execute("""
            SELECT q.id, q.question_base_id, q.file_id,
                   q.question_type, q.question_stem, q.concept_tags,
                   q.difficulty_rating_manual, q.difficulty_rating_model,
                   f.assessment_type, f.course, f.year, f.semester,
                   q.created_at, q.updated_at
              FROM questions q
              JOIN files f ON q.file_id = f.id
             WHERE q.id = %s
        """, (q_id,))
        row = cur.fetchone()

    # convert concept_tags back from JSON string to Python List for readibility
    if row and row.get("concept_tags"):
        row["concept_tags"] = parse_json_field(row["concept_tags"])
        
    # convert dates to string
    if row and row.get("created_at"):
        row["created_at"] = ts(row["created_at"])
    if row and row.get("updated_at"):
        row["updated_at"] = ts(row["updated_at"])

    return jsonify(row), 200

# -----------------------------------------------------
## 🗑️ Hard Delete Question (DELETE)

@app.route("/api/deletequestion/<int:q_id>", methods=["DELETE"])
def delete_question(q_id):
    deleted_file_id = None
    
    with closing(get_connection()) as conn:
        cur = conn.cursor()
        
        # 1. Get file_id before deleting the question
        try:
            cur.execute("SELECT file_id FROM questions WHERE id = %s", (q_id,))
            file_id_row = cur.fetchone()
            if file_id_row:
                deleted_file_id = file_id_row[0]
        except Exception as e:
            app.logger.warning(f"Error fetching file_id for QID {q_id}: {e}")
        
        # 2. Delete the question from the questions table
        try:
            cur.execute("DELETE FROM questions WHERE id = %s LIMIT 1", (q_id,))
            if cur.rowcount == 0:
                conn.commit()
                return jsonify({"status": "not_found", "id": q_id}), 404
            
            # 3. Clean up orphaned file record if a file_id was found
            if deleted_file_id is not None:
                
                # Count remaining questions linked to this file_id
                cur.execute("SELECT COUNT(*) FROM questions WHERE file_id = %s", (deleted_file_id,))
                remaining_count = cur.fetchone()[0]
                
                # 4. If count is zero, delete the file record
                if remaining_count == 0:
                    app.logger.info(f"Deleting orphaned file container with ID {deleted_file_id}")
                    cur.execute("DELETE FROM files WHERE id = %s LIMIT 1", (deleted_file_id,))
            
            conn.commit()
            return jsonify({"status": "deleted_permanently", "id": q_id}), 200

        except Exception as e:
            conn.rollback()
            app.logger.error(f"Transaction failed during question delete for QID {q_id}: {e}")
            return jsonify({"error": "delete_failed", "message": str(e)}), 500

# -----------------------------------------------------
## ➕ Question Creation (Legacy/File-Dependent)

@app.route("/addquestion", methods=["POST"])
def addquestion():
    payload = request.get_json(silent=True) or {}

    # Required fields: find file_id or create it from metadata
    file_id = payload.get("file_id")
    if not (file_id and isinstance(file_id, int)):
        course = payload.get("course")
        year = payload.get("year")
        semester = payload.get("semester")
        assessment_type = payload.get("assessment_type")

        # Validate file metadata fields
        if not course:
            return jsonify({"error": "missing_field", "field": "course"}), 400
        if not year:
            return jsonify({"error": "missing_field", "field": "year"}), 400
        if not semester:
            return jsonify({"error": "missing_field", "field": "semester"}), 400
        if not assessment_type:
            return jsonify({"error": "missing_field", "field": "assessment_type"}), 400

        try:
            file_id = get_file_id(course, year, semester, assessment_type)
        except ValueError as e:
            return jsonify({"error": "invalid_file_metadata", "message": str(e)}), 400
        
        if not file_id:
             return jsonify({"error": "file_container_not_found", "message": "No existing file container matches the provided metadata. Consider using /api/createquestion."}), 404


    question_type  = (payload.get("question_type") or "").strip()
    question_stem  = (payload.get("question_stem") or "").strip()
    
    if not question_type:
        return jsonify({"error": "missing_field", "field": "question_type"}), 400
    if not question_stem:
        return jsonify({"error": "missing_field", "field": "question_stem"}), 400

    file_row = _get_file_row(file_id)
    if not file_row:
        return jsonify({"error": "file_not_found", "file_id": file_id}), 404

    # Optional fields
    concept_tags_raw = payload.get("concept_tags")
    concept_tags = normalize_concept_tags(concept_tags_raw)

    options_raw = payload.get("question_options")
    options_val = []
    if isinstance(options_raw, str):
        try:
            options_val = json.loads(options_raw)
        except Exception:
            return jsonify({"error": "invalid_json", "field": "question_options"}), 400
    else:
        options_val = options_raw if options_raw is not None else []
        
    answer_raw = payload.get("question_answer")
    if isinstance(answer_raw, (dict, list)):
        answer_val = json.dumps(answer_raw, ensure_ascii=False)
    else:
        # Template 1 uses raw_answer which is not defined, Template 2 uses answer_raw. Using answer_raw.
        answer_val = answer_raw 

    # ---- Insert ----
    insert_sql = """
        INSERT INTO questions (
            question_base_id, version_id, file_id,
            question_no, page_numbers, question_type,
            difficulty_rating_manual, difficulty_rating_model,
            question_stem, question_stem_html,
            question_options, question_answer,
            page_image_paths, concept_tags,
            last_used, created_at, updated_at
        ) VALUES (
            %s,%s,%s,
            %s,%s,%s,
            %s,%s,
            %s,%s,
            %s,%s,
            %s,%s,
            %s,%s,%s
        )
    """

    now = datetime.datetime.now()
    
    # Template 2 has some None/json.dumps([]) defaults that conflict with T1, 
    # but the logic for T1 seems more complete and robust, so using T1's logic 
    # for data values here, except where T2 has a clearer default (e.g., question_no is optional).
    data = (
        0, # question_base_id (will be updated below)
        1, # version_id
        file_id, # The file_id we found
        payload.get("question_no") or None, # question_no (optional, from both)
        json.dumps([]), # page_numbers
        question_type,
        payload.get("difficulty_rating_manual") or None, # difficulty_rating_manual (optional)
        None, # difficulty_rating_model
        question_stem,
        None, # question_stem_html
        json.dumps(options_val if options_val is not None else []),
        answer_val,
        json.dumps([]), # page_image_paths
        concept_tags, # Already json string or None
        None, # last_used
        now,
        now
    )

    with closing(get_connection()) as conn:
        try:
            cur = conn.cursor()
            cur.execute(insert_sql, data)
            new_id = cur.lastrowid

            # Set question_base_id to its own ID
            cur.execute(
                "UPDATE questions SET question_base_id = %s WHERE id = %s",
                (new_id, new_id)
            )
            conn.commit()

            # For the response, we need the file's original metadata if it wasn't provided in the payload
            # (which is the case if file_id was provided), so we re-fetch if needed.
            if not all([payload.get("course"), payload.get("year"), payload.get("semester"), payload.get("assessment_type")]):
                 cur.execute("SELECT course, year, semester, assessment_type FROM files WHERE id = %s", (file_id,))
                 f_meta = cur.fetchone()
                 if f_meta:
                     course, year, semester, assessment_type = f_meta
                
            return jsonify({
                "status": "created",
                "question_id": new_id,
                "file": {
                    "id": file_row["id"],
                    "file_name": file_row.get("file_name"),
                    "file_path": file_row.get("file_path"),
                },
                "data": {
                    "question_type": question_type,
                    "question_stem": question_stem,
                    "question_options": options_val or [],
                    "question_answer": answer_val,
                    "concept_tags": parse_json_field(concept_tags) or [], # return as list
                    "course": course,
                    "year": year,
                    "semester": semester,
                    "assessment_type": assessment_type,
                }
            }), 201

        except Exception as e:
            conn.rollback()
            app.logger.error(f"Failed to insert new question: {e}")
            return jsonify({"error": "insert_failed", "message": str(e)}), 500

# --# -----------------------------------------------------
## ➕ Question Creation (File-Independent)
## 🎯 Unique Endpoint from Template 2

@app.route("/api/createquestion", methods=["POST"])
def create_question():
    payload = request.get_json(silent=True) or {}
    
    # --- 1. Validate Core Question Fields ---
    question_type = (payload.get("question_type") or "").strip()
    question_stem = (payload.get("question_stem") or "").strip()
    
    if not question_type: 
        return jsonify({"error": "missing_field", "field": "question_type"}), 400
    if not question_stem: 
        return jsonify({"error": "missing_field", "field": "question_stem"}), 400
        
    # --- 2. Extract Optional File Metadata ---
    course = payload.get("course") or None
    year = payload.get("year") or None
    semester = payload.get("semester") or None
    assessment_type = payload.get("assessment_type") or None
    
    # 🌟 Extracting difficulty_rating_manual
    difficulty_rating_manual = payload.get("difficulty_rating_manual")
    
    # ✅ FIX: Enforce FLOAT conversion or keep None if not provided
    if difficulty_rating_manual is not None and difficulty_rating_manual != "":
        try:
            difficulty_rating_manual = float(difficulty_rating_manual)
        except (ValueError, TypeError):
            # If the value is invalid but not None, default to None to prevent SQL crash
            difficulty_rating_manual = None 
    else:
        difficulty_rating_manual = None
    
    # --- 3. Create Unique File Container Record ---
    file_id = None
    file_row = None
    
    with closing(get_connection()) as conn:
        try:
            cur = conn.cursor()
            
            # Insert file record 
            insert_file_sql = """
                INSERT INTO files (course, year, semester, assessment_type, file_name, file_path)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            
            # Determine file name/path defaults
            timestamp_str = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
            file_name_default = f"MANUAL_Q_{timestamp_str}.txt" 
            file_path_default = f"data/source_files/{file_name_default}" 
            
            cur.execute(
                insert_file_sql, 
                (
                    course, year, semester, assessment_type, 
                    file_name_default, file_path_default
                )
            )
            conn.commit()
            file_id = cur.lastrowid
            
            # Fetch the newly created file row for the response payload
            file_row = _get_file_row(file_id)
            
        except Exception as e:
            conn.rollback()
            app.logger.error(f"Failed to create synthetic file record in create_question: {e}")
            return jsonify({"error": "file_creation_failed", "message": str(e)}), 500
            
    # --- 4. Prepare Question Data and Insert ---
    
    # Optional fields (reusing logic from above)
    concept_tags = normalize_concept_tags(payload.get("concept_tags"))
    
    options_raw = payload.get("question_options")
    options_val = []
    if isinstance(options_raw, str):
        try:
            options_val = json.loads(options_raw)
        except Exception:
            return jsonify({"error": "invalid_json", "field": "question_options"}), 400
    else:
        options_val = options_raw if options_raw is not None else []
        
    answer_raw = payload.get("question_answer")
    if isinstance(answer_raw, (dict, list)):
        answer_val = json.dumps(answer_raw, ensure_ascii=False)
    else:
        answer_val = answer_raw # leave as scalar string/number/None

    # --- Insert SQL (Fixed to include difficulty_rating_manual) ---
    insert_sql = """
        INSERT INTO questions (
            question_base_id, version_id, file_id,
            question_no, page_numbers, question_type,
            difficulty_rating_manual, difficulty_rating_model,
            question_stem, question_stem_html,
            question_options, question_answer,
            page_image_paths, concept_tags,
            last_used, created_at, updated_at
        ) VALUES (
            %s,%s,%s,
            %s,%s,%s,
            %s,%s,
            %s,%s,
            %s,%s,
            %s,%s,
            %s,%s,%s
        )
    """
    now = datetime.datetime.now()
    
    data = (
        0, # question_base_id 
        1, # version_id
        file_id, # The newly created file_id
        payload.get("question_no") or None, # question_no (optional)
        json.dumps([]), # page_numbers
        question_type,
        difficulty_rating_manual, # <-- Uses the GUARANTEED FLOAT or NONE value
        None, # difficulty_rating_model (Set by ML/pipeline later)
        question_stem,
        None, # question_stem_html
        json.dumps(options_val if options_val is not None else []),
        answer_val,
        json.dumps([]), # page_image_paths
        concept_tags, # Already json string or None
        None, # last_used
        now,
        now
    )
    
    with closing(get_connection()) as conn:
        try:
            cur = conn.cursor()
            cur.execute(insert_sql, data)
            new_id = cur.lastrowid
            
            # Set question_base_id to its own ID
            cur.execute(
                "UPDATE questions SET question_base_id = %s WHERE id = %s",
                (new_id, new_id)
            )
            conn.commit()
            
            return jsonify({
                "status": "created",
                "question_id": new_id,
                "file": {
                    "id": file_row["id"],
                    "file_name": file_row.get("file_name"),
                    "file_path": file_row.get("file_path"),
                },
                "data": {
                    "question_type": question_type,
                    "question_stem": question_stem,
                    "question_options": options_val or [],
                    "question_answer": answer_val,
                    "concept_tags": parse_json_field(concept_tags) or [],
                    "course": course,
                    "year": year,
                    "semester": semester,
                    "assessment_type": assessment_type,
                }
            }), 201
            
        except Exception as e:
            conn.rollback()
            app.logger.error(f"Failed to insert new question: {e}")
            return jsonify({"error": "insert_failed", "message": str(e)}), 500
            
    # --- 4. Prepare Question Data and Insert ---
    
    # Optional fields (reusing logic from above)
    concept_tags = normalize_concept_tags(payload.get("concept_tags"))
    
    options_raw = payload.get("question_options")
    options_val = []
    if isinstance(options_raw, str):
        try:
            options_val = json.loads(options_raw)
        except Exception:
            return jsonify({"error": "invalid_json", "field": "question_options"}), 400
    else:
        options_val = options_raw if options_raw is not None else []
        
    answer_raw = payload.get("question_answer")
    if isinstance(answer_raw, (dict, list)):
        answer_val = json.dumps(answer_raw, ensure_ascii=False)
    else:
        answer_val = answer_raw # leave as scalar string/number/None

    # --- Insert SQL (Reusing the structure from addquestion) ---
    insert_sql = """
        INSERT INTO questions (
            question_base_id, version_id, file_id,
            question_no, page_numbers, question_type,
            difficulty_rating_manual, difficulty_rating_model,
            question_stem, question_stem_html,
            question_options, question_answer,
            page_image_paths, concept_tags,
            last_used, created_at, updated_at
        ) VALUES (
            %s,%s,%s,
            %s,%s,%s,
            %s,%s,
            %s,%s,
            %s,%s,
            %s,%s,
            %s,%s,%s
        )
    """
    now = datetime.datetime.now()
    
    # We explicitly set all other non-user-supplied fields to None/default
    data = (
        0, # question_base_id (will be updated below)
        1, # version_id
        file_id, # The newly created file_id
        payload.get("question_no") or None, # question_no (optional)
        json.dumps([]), # page_numbers
        question_type,
        payload.get("difficulty_rating_manual") or None, # difficulty_rating_manual (optional)
        None, # difficulty_rating_model
        question_stem,
        None, # question_stem_html
        json.dumps(options_val if options_val is not None else []),
        answer_val,
        json.dumps([]), # page_image_paths
        concept_tags, # Already json string or None
        None, # last_used
        now,
        now
    )
    with closing(get_connection()) as conn:
        try:
            cur = conn.cursor()
            cur.execute(insert_sql, data)
            new_id = cur.lastrowid
            
            # Set question_base_id to its own ID
            cur.execute(
                "UPDATE questions SET question_base_id = %s WHERE id = %s",
                (new_id, new_id)
            )
            conn.commit()
            
            return jsonify({
                "status": "created",
                "question_id": new_id,
                "file": {
                    "id": file_row["id"],
                    "file_name": file_row.get("file_name"),
                    "file_path": file_row.get("file_path"),
                },
                # Return the data we used for clarity (including optional metadata)
                "data": {
                    "question_type": question_type,
                    "question_stem": question_stem,
                    "question_options": options_val or [],
                    "question_answer": answer_val,
                    "concept_tags": parse_json_field(concept_tags) or [],
                    "course": course,
                    "year": year,
                    "semester": semester,
                    "assessment_type": assessment_type,
                }
            }), 201
            
        except Exception as e:
            conn.rollback()
            app.logger.error(f"Failed to insert new question: {e}")
            return jsonify({"error": "insert_failed", "message": str(e)}), 500