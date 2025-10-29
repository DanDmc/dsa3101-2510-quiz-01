from flask import Flask, request, jsonify, send_file, abort, render_template_string
import os
import MySQLdb
import pandas as pd
from sqlalchemy import func, or_
from contextlib import closing
import mimetypes
import json
import datetime
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
import tempfile, shutil, hashlib, subprocess, shlex
from werkzeug.utils import secure_filename

app = Flask(__name__)

# ---- Upload / pipeline config ----
app.config.setdefault("UPLOAD_FOLDER", os.getenv("UPLOAD_FOLDER", "./uploads"))
app.config.setdefault("MAX_CONTENT_LENGTH", int(os.getenv("MAX_UPLOAD_MB", "50")) * 1024 * 1024)
ALLOWED_EXTENSIONS = {"pdf"}

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
SRC_DIR  = DATA_DIR / "source_files"
TXT_DIR  = DATA_DIR / "text_extracted"
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

# HEALTH
@app.route("/health", methods=["GET"])
def health(): return {"ok": True}

# GET QUESTIONS
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
        order_by_sql = "q.difficulty_level"
    else:
        order_by_sql = "q.updated_at"
    sort_sql = "ASC" if sort_arg == "asc" else "DESC"

    # SELECT columns (include some file metadata for convenience)
    select_cols = [
        "q.id", "q.question_base_id", "q.version_id", "q.file_id", "q.question_no",
        "q.question_type", "q.question_stem", "q.question_stem_html",
        "q.concept_tags", "q.question_media", "q.last_used", "q.created_at", "q.updated_at",
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
        # MySQL will return true only if every element in the candidate array exists in the target array.
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
            f_course, f_year, f_semester, f_assessment, f_name, f_path
        ) = row

        # Convert JSON text to Python objects if present
        try:
            concept_list = json.loads(concept_json) if concept_json else []
        except Exception:
            concept_list = concept_json  # fallback raw

        try:
            media_list = json.loads(media_json) if media_json else []
        except Exception:
            media_list = media_json  # fallback raw

        def ts(v):
            # jsonify can't handle datetime directly; convert to ISO strings
            return v.isoformat() if hasattr(v, "isoformat") else (str(v) if v is not None else None)

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
            "last_used": ts(last_used),
            "created_at": ts(created_at),
            "updated_at": ts(updated_at),

            # Helpful file metadata in the payload
            "course": f_course,
            "year": f_year,
            "semester": f_semester,
            "assessment_type": f_assessment,
            "file_name": f_name,
            "file_path": f_path,
        })

    return jsonify({"total": len(items), "items": items})

# Helper to convert a single row to the same JSON format as get_question
def _map_question_row(row):
    (
        q_id, q_base_id, q_version_id, file_id, q_no,
        q_type, stem, stem_html,
        concept_json, media_json, last_used, created_at, updated_at,
        options_json, answer_json,
        difficulty_manual, difficulty_model,
        f_course, f_year, f_semester, f_assessment, f_name, f_path
    ) = row

    def parse_json_field(field_json):
        if not field_json: return None
        try: return json.loads(field_json)
        except Exception: return field_json

    concept_list = parse_json_field(concept_json)
    media_list = parse_json_field(media_json)
    options_list = parse_json_field(options_json)
    answer_data = parse_json_field(answer_json)
    
    def ts(v):
        return v.isoformat() if hasattr(v, "isoformat") else (str(v) if v is not None else None)
    
    difficulty_level = difficulty_manual if difficulty_manual is not None else difficulty_model
    
    return {
        "id": q_id, "question_base_id": q_base_id, "version_id": q_version_id,
        "file_id": file_id, "question_no": q_no, "question_type": q_type,
        "question_stem": stem, "question_stem_html": stem_html,
        "concept_tags": concept_list, 
        "question_media": media_list, # This uses the 'media_list' from page_image_paths
        "question_options": options_list, "question_answer": answer_data,
        "last_used": ts(last_used), "created_at": ts(created_at), "updated_at": ts(updated_at),
        "difficulty_manual": difficulty_manual, "difficulty_model": difficulty_model,
        "difficulty_level": difficulty_level, "course": f_course, "year": f_year,
        "semester": f_semester, "assessment_type": f_assessment,
        "file_name": f_name, "file_path": f_path,
    }

# ❗️ NEW API ROUTE
@app.route("/question/<int:q_id>", methods=["GET"])
def get_single_question(q_id):
    select_cols = [
        "q.id", "q.question_base_id", "q.version_id", "q.file_id", "q.question_no",
        "q.question_type", "q.question_stem", "q.question_stem_html",
        "q.concept_tags", "q.page_image_paths", "q.last_used", "q.created_at", "q.updated_at",
        "q.question_options", "q.question_answer", "q.difficulty_rating_manual", 
        "q.difficulty_rating_model", "f.course", "f.year", "f.semester", 
        "f.assessment_type", "f.file_name", "f.file_path"
    ]
    
    sql = f"""
        SELECT {", ".join(select_cols)}
        FROM questions q
        JOIN files f ON f.id = q.file_id
        WHERE q.id = %s
    """
    
    with closing(get_connection()) as conn, closing(conn.cursor()) as cur:
        cur.execute(sql, (q_id,))
        row = cur.fetchone()
        
    if not row:
        abort(404, description="Question not found")
        
    return jsonify(_map_question_row(row))

# DOWNLOAD
# Directory for files in the container
file_base_directory = os.getenv("file_base_directory", "/app/data/source_files")

def _strip_known_prefixes(p: str) -> str:
    # file_base_directory set as /app/data/source_files, so want to remove this part from the file_path
    prefixes = ("data/", "source_files/")
    for pref in prefixes:
        if p.startswith(pref):
            return p[len(pref):]
    return p

def _safe_join_file(base_dir: str, file_path: str) -> str:
    # ensure file path is consistent to be in the file_base_directory
    if not file_path:
        raise FileNotFoundError("Empty file path")

    # if the path is already from to the file_base_directory
    if os.path.isabs(file_path):
        candidate = os.path.normpath(file_path)
    else:
    # strip and connect to file_base_directory to ensure consistency in connectedness
        cleaned = _strip_known_prefixes(file_path.strip())
        candidate = os.path.normpath(os.path.join(base_dir, cleaned))

    base_dir_norm = os.path.normpath(base_dir)
    # Ensure candidate stays inside base_dir (no traversal)
    if not (candidate == base_dir_norm or candidate.startswith(base_dir_norm + os.sep)):
        raise FileNotFoundError("Invalid file path")
    return candidate

def _get_file_row(file_id: int):
    with closing(get_connection()) as conn:
        cur = conn.cursor(MySQLdb.cursors.DictCursor)
        cur.execute("SELECT id, file_name, file_path, uploaded_at FROM files WHERE id=%s", (file_id,))
        return cur.fetchone()

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

# DIFFICULTY RATING MODEL
# load the difficulty rating model
MODEL_PATH = os.getenv("diff_model_path", "/app/models/difficulty_v1.pkl")
difficulty_model = None
try:
    difficulty_model = joblib.load(MODEL_PATH)
    app.logger.info(f"[difficulty] Loaded model: {MODEL_PATH}")
except Exception as e:
    app.logger.warning(f"[difficulty] Model not loaded ({MODEL_PATH}): {e}")

def parse_tags(val):
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
    tags_text = " ".join(parse_tags(row.get("concept_tags")))
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

@app.get("/upload")
def upload_page():
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



@app.post("/upload_file")
def upload_file():
    course = request.form.get("course")
    year = request.form.get("year")
    semester = request.form.get("semester")
    assessment_type = request.form.get("assessment_type")

    if "file" not in request.files:
        return jsonify({"error":"No file part"}), 400
    f = request.files["file"]
    if not f or f.filename == "":
        return jsonify({"error":"No selected file"}), 400
    if not _allowed_pdf(f.filename):
        return jsonify({"error":"Only .pdf allowed"}), 400

    head = f.stream.read(5)
    f.stream.seek(0)
    if head != b"%PDF-":
        return jsonify({"error":"Invalid PDF header"}), 400

    # Save to uploads
    original_name = secure_filename(f.filename)
    h = hashlib.sha256()
    tmp_path = Path(tempfile.mkstemp(suffix=".pdf")[1])
    with open(tmp_path, "wb") as w:
        while True:
            chunk = f.stream.read(1024*1024)
            if not chunk: break
            h.update(chunk); w.write(chunk)
    file_hash = h.hexdigest()
    dest_dir = _ensure_dirs(course, year, semester, assessment_type)
    dest_path = dest_dir / f"{file_hash}.pdf"
    if not dest_path.exists():
        shutil.move(str(tmp_path), dest_path)
    else:
        try: os.unlink(tmp_path)
        except Exception: pass

    # Insert into files
    file_id = None
    try:
        with closing(get_connection()) as conn, closing(conn.cursor()) as cur:
            cur.execute(
                """INSERT INTO files (course, year, semester, assessment_type, file_name, file_path)
                     VALUES (%s,%s,%s,%s,%s,%s)""",
                (course, year, semester, assessment_type, original_name, str(dest_path))
            )
            conn.commit()
            file_id = cur.lastrowid
    except Exception as e:
        return jsonify({"saved": True, "message":"PDF saved but DB insert failed", "db_error": str(e), "path": str(dest_path)}), 201

    # Stage the original filename into data/source_files for pipeline
    src_pdf = SRC_DIR / original_name
    try:
        if not src_pdf.exists():
            shutil.copyfile(str(dest_path), src_pdf)
    except Exception as e:
        return jsonify({"saved": True, "file_id": file_id, "error": f"could not stage PDF: {e}"}), 500

    logs = {}

    # 1) Extract text (filter to this PDF via TARGET_PDF)
    code, out, err = _run("python pdf_extractor.py", env_extra={"TARGET_PDF": original_name})
    logs["pdf_extractor"] = {"code": code, "stdout": out, "stderr": err}
    if code != 0:
        return jsonify({"saved": True, "file_id": file_id, "pipeline": logs, "error": "pdf_extractor failed"}), 500

    base = Path(original_name).stem

    # 2) LLM parse (filter via TARGET_BASE) -- requires GEMINI_API_KEY env
    code, out, err = _run("python llm_parser.py", env_extra={"TARGET_BASE": base})
    logs["llm_parser"] = {"code": code, "stdout": out, "stderr": err}
    if code != 0:
        return jsonify({"saved": True, "file_id": file_id, "pipeline": logs, "error": "llm_parser failed"}), 500

    # 3) Insert questions (filter via TARGET_BASE)
    code, out, err = _run("python insert_questions.py", env_extra={"TARGET_BASE": base})
    logs["insert_questions"] = {"code": code, "stdout": out, "stderr": err}
    if code != 0:
        return jsonify({"saved": True, "file_id": file_id, "pipeline": logs, "error": "insert_questions failed"}), 500

    return jsonify({
        "saved": True,
        "file": {"file_id": file_id, "original_name": original_name, "stored_path": str(dest_path)},
        "pipeline": logs
    }), 201

