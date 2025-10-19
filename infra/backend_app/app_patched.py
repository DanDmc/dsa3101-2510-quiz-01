from flask import Flask, request, jsonify
import os
import MySQLdb
import pandas as pd
from sqlalchemy import func, or_
from contextlib import closing
import json
from flask import render_template_string
import tempfile, shutil, hashlib, subprocess, shlex
from pathlib import Path
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
        user=os.getenv("MYSQL_USER", "root"),
        passwd=os.getenv("MYSQL_PASSWORD","root"),
        db=os.getenv("MYSQL_DATABASE", "quizbank"),
    )

@app.get("/health")
def health(): return {"ok": True}

@app.route("/getquestion", methods=["GET"])
def getquestion():
    course          = request.args.get("course")
    year            = request.args.get("year", type=int)
    semester        = request.args.get("semester")
    assessment_type = request.args.get("assessment_type")
    question_type   = request.args.get("question_type")
    question_no     = request.args.get("question_no", type=int)
    difficulty      = request.args.get("difficulty_level", type=float)
    tags: list[str] = request.args.getlist("concept_tags")
    if not tags:
        req = request.args.get("concept_tags")
        if req:
            tags = [t.strip() for t in req.split(",") if t.strip()] 

    # setting defaults and sorts
    limit  = request.args.get("limit", 50, type=int)
    offset = request.args.get("offset", 0, type=int)
    order_by_arg = (request.args.get("order_by") or "updated_at").lower()
    sort_arg     = (request.args.get("sort") or "desc").lower()

    # whitelist ordering
    if order_by_arg == "created_at":
        order_by = "q.created_at"
    elif order_by_arg == "difficulty":
        order_by = "q.difficulty_level"
    else:
        order_by = "q.updated_at"
    sort_sql = "ASC" if sort_arg == "asc" else "DESC"

    # columns to show
    cols = [
        "q.id","q.question_base_id","q.version_id","q.file_id","q.question_no","q.question_type",
        "q.difficulty_level","q.question_stem","q.question_stem_html","q.concept_tags",
        "q.question_media","q.last_used","q.created_at","q.updated_at"
    ]

    # SQL portion
    sql_parts = [
        f"SELECT {', '.join(cols)}",
        "FROM questions q",
        "JOIN files f ON q.file_id = f.id",
        "WHERE 1=1"
    ]
    args = []

    # filters
    if course:
        sql_parts.append("AND f.course = %s")
        args.append(course)
    if year is not None:
        sql_parts.append("AND f.year = %s")
        args.append(year)
    if semester:
        sql_parts.append("AND f.semester = %s")
        args.append(semester)
    if assessment_type:
        sql_parts.append("AND f.assessment_type = %s")
        args.append(assessment_type)
    if question_type:
        sql_parts.append("AND q.question_type = %s")
        args.append(question_type)
    if question_no is not None:
        sql_parts.append("AND q.question_no = %s")
        args.append(question_no)
    if difficulty is not None:
        sql_parts.append("AND q.difficulty_level = %s")
        args.append(difficulty)
    if tags:
        # AND logic: require all tags to be present in q.concept_tags
        sql_parts.append("AND JSON_CONTAINS(q.concept_tags, CAST(%s AS JSON))")
        args.append(json.dumps(tags))


    # ORDER BY before LIMIT/OFFSET
    sql_parts.append(f"ORDER BY {order_by} {sort_sql}")
    sql_parts.append("LIMIT %s OFFSET %s")
    args.extend([limit, offset])   # <-- ensure BOTH are appended

    # run (and always close the connection)
    with closing(get_connection()) as conn:
        cur = conn.cursor(MySQLdb.cursors.DictCursor)
        cur.execute(" ".join(sql_parts), args)
        # DEBUG: print the final SQL MySQLdb executed (helps catch % issues)
        try:
            app.logger.debug(getattr(cur, "_last_executed", "<no _last_executed>"))
        except Exception:
            pass
        rows = cur.fetchall()

    # parse JSON columns such as concept_tags and question_media, store JSON columns as str/bytes, normalise to Python types.
    def parse_json_field(v):
        if v is None: return None
        if isinstance(v, (bytes, bytearray)):
            v = v.decode("utf-8", errors="ignore")
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return None
            try:
                return json.loads(v)
            except Exception:
                pass
        return v

    items = []
    for r in rows:
        items.append({
            "id": r["id"],
            "question_base_id": r["question_base_id"],
            "version_id": r["version_id"],
            "file_id": r["file_id"],
            "question_no": r["question_no"],
            "question_type": r["question_type"],
            "difficulty_level": r["difficulty_level"],
            "question_stem": r["question_stem"],
            "question_stem_html": r["question_stem_html"],
            "concept_tags": parse_json_field(r["concept_tags"]) or [],
            "question_media": parse_json_field(r["question_media"]) or [],
            "last_used": r["last_used"].isoformat() if r["last_used"] else None,
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
        })

    return jsonify({"total": len(items), "items": items})

# @app.route("/add_question", methods=["POST"])
# def add_question():
#     content = request.get_json(force=True, silence=True) or {} #read JSON
#     #add primary key fields for the database
#     primary = ["question_id", "file_id", "question_type"]
#     missing = [i for i in primary if not content.get(i)]
#     if missing:
#         return jsonify({["error"]: f"Missing key: {', '.join(missing)}"}), 400
#     #restrict the question types 
#     allowed_qn_types = {'mcq', 'mrq', 'coding', 'open-ended', 'fill-in-the-blanks', 'others'}
#     if content.get("question_type") not in allowed_qn_types:
#         return jsonify({"error": "invalid question type"}), 400

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

