from flask import Flask, request, jsonify, send_file, abort, render_template_string
import pandas as pd
import numpy as np
from sqlalchemy import func, or_
from flask_cors import CORS, cross_origin
from contextlib import closing
from werkzeug.utils import secure_filename
from pathlib import Path
import os, MySQLdb, mimetypes, json, datetime, joblib, tempfile, shutil, hashlib, subprocess, shlex
import sys, importlib.util, re, time

app = Flask(__name__)

# -----------------------------------------------------
# 💡 FIX: CORS is set to the correct Vite port 5173
CORS(app, 
     origins=["http://localhost:5173", "http://127.0.0.1:5173"],
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=True)
# -----------------------------------------------------

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
    """
    Checks if an uploaded filename has a permitted extension

    Currently only `.pdf` files are allowed
    The check is case-insensitive and only looks at the final extension

    Args:
        filename (str): Name of the uploaded file

    Returns:
        bool: True if the filename ends with an allowed extension, False otherwise
    """
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def _ensure_dirs(*parts) -> Path:
    """
    description: Constructs a full filesystem path by joining a configured base upload 
                 directory with one or more subdirectories specified in `parts`. It 
                 ensures that all necessary directories in the path exist, creating 
                 them if they do not. Handles null or empty parts by replacing them with 
                 the string "unknown".

    args:
        *parts (tuple[Any]): One or more path components (strings, integers, etc.) 
                             to be joined to the base upload folder.

    returns:
        pathlib.Path: A Path object representing the final, verified (existing) directory.

    raises:
        OSError: If the function is unable to create the directory path (e.g., due to 
                 permission issues, or if a component is a file instead of a directory).
    """

    p = Path(app.config["UPLOAD_FOLDER"]).joinpath(*[str(x or "unknown") for x in parts])
    p.mkdir(parents=True, exist_ok=True)
    return p

def _run(cmd, env_extra=None, timeout=900):
    """
    Run a subprocess in the project base directory and capture its output

    Args:
        cmd (str): Shell-like command to run (e.g. "python pdf_extractor.py")
        env_extra (dict, optional): Extra environment variables to merge into
            the current process environment
        timeout (int, optional): Max number of seconds to allow the process
            to run before raising a timeout - Defaults to 900s

    Returns:
        tuple[int, str, str]:
            - returncode (int): Process return code (0 on success)
            - stdout (str): Captured standard output (stripped)
            - stderr (str): Captured standard error (stripped)
    """
    env = dict(os.environ)
    if env_extra: env.update(env_extra)
    p = subprocess.run(shlex.split(cmd), cwd=str(BASE_DIR), capture_output=True, text=True, timeout=timeout, env=env)
    return p.returncode, p.stdout.strip(), p.stderr.strip()

def get_connection():
    """
    Create a new MySQL connection using environment variables:
    MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE.

    Args:
        None.

    Returns:
        MYSQLdb.connection: Open a connection to the quizbank database.

    Raises:
        MySQLdb.Error: If connection cannot be established. 
    """
    return MySQLdb.connect(
        host=os.getenv("MYSQL_HOST", "db"),
        user=os.getenv("MYSQL_USER", "quizbank_user"),
        passwd=os.getenv("MYSQL_PASSWORD","quizbank_pass"),
        db=os.getenv("MYSQL_DATABASE", "quizbank"),
    )

def has_column(conn, table: str, col: str) -> bool:
    """
    Check whether a given column exists in a table in the current database

    Args:
        conn: An open DB-API compatible database connection
        table (str): The name of the table to inspect
        col (str): The column name to look for

    Returns:
        bool: `True` if the column exists on the table in the current database,
        `False` otherwise
    """
    with closing(conn.cursor()) as c:
        c.execute("""
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = %s
              AND COLUMN_NAME = %s
        """, (table, col))
        return c.fetchone()[0] == 1

# ---- Utility Helper Functions ----
def parse_json_field(field_json):
    """
    Parses JSON string into appropriate Python object (i.e. dict or str)

    Args:
        field_json (str): JSON string / May also be a non-JSON string
    
    Returns:
        Any: Deserialized Python object
    
    Raises:
        None if input is empty or falsy
    """
    if not field_json:
        return None
    try:
        return json.loads(field_json)
    except Exception:
        return field_json
    
def ts(v):
    """
    Converts datetime-like objects to string representations

    Args:
        v (Any): datetime/date/object with ISO formatting / May also be non-datetime-like

    Returns:
        str: ISO 8601 formatted string if input supports isoformat, regular string otherwise
    
    Raises:
        None if empty or falsy
    """
    if not v:
        return None
    if hasattr(v, "isoformat"):
        return v.isoformat()
    else:
        return str(v)

def _get_file_row(file_id: int):
    """
    Fetch file metadata from files table using its primary key

    Args:
        file_id (int): file_id of the desired file for download

    Returns:
        dict: {
            "id": int,
            "file_name": str,
            "file_path" str, 
            "uploaded_at": datetime.datetime
        }
    
    Raises:
        None if not found
    """
    with closing(get_connection()) as conn:
        cur = conn.cursor(MySQLdb.cursors.DictCursor)
        cur.execute("SELECT id, file_name, file_path, uploaded_at FROM files WHERE id=%s", (file_id,))
        return cur.fetchone()

def _strip_known_prefixes(p: str) -> str:
    """
    Removes known leading path prefixes from a string

    Args:
        p (str): The input path to normalise

    Returns:
        str: The path without known leading prefixes, or the original input path if no prefix was removed
    """
    prefixes = ("data/", "source_files/")
    for pref in prefixes:
        if p.startswith(pref):
            return p[len(pref):]
    return p

def _normalize_semester(sem: str) -> str:
    """
    Normalize various semester inputs to a compact canonical form
    Examples: "Sem 1" -> "S1", "Semester 2" -> "S2", "ST I" -> "ST1"

    Args:
        sem (str): Semester label/value

    Returns:
        str: Semester Code

    Raises:
        None
    """
    if sem is None:
        return ""
    s = str(sem).strip().lower().replace("-", " ").replace("_", " ")
    # Remove duplicate spaces
    s = " ".join(s.split())

    # Common mappings
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
    """
    Normalize assessment_type strings to lowercase and remove whitespaces

    Args:
        t (str): Assessment type

    Returns:
        str: Normalised assessment type lowercased with whitespaces trimmed

    Raises:
        None
    """
    if t is None:
        return ""
    s = str(t).strip().lower().replace("-", " ")
    s = " ".join(s.split())
    return s.lower()

def get_file_id(course: str, year, semester: str, assessment_type: str, latest: bool = True):
    """
    Search for 'file_id' by matching 'course', 'year', 'semester', 'assessment_type'
    If latest = 'True', look for the most recently uploaded file

    Args:
        course (str): Course code, e.g. "ST2131"
        year (int/str): Year (convert to int)
        semester (str): Semester code, e.g. 2410
        assessment_type (str): e.g. "quiz", "midterm"
        latest (bool): If True, choose the most recent match based on uploaded_at and id

    Returns:
        int/None:
            Matching files.id else None if no match
    
    Raises:
        ValueError: If missing course or year not integer-like
        MySQLError: If database cannot be established
    """
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
    params = (course, year, semester, assessment_type)

    with closing(get_connection()) as conn:
        cur = conn.cursor()
        cur.execute(sql, params)
        row = cur.fetchone()
        return int(row[0]) if row else None
    return

def _safe_join_file(base_dir: str, file_path: str) -> str:
    """
    Safely resolves a file path, normalising it relative to the base directory

    Args:
        base_dir (str): The base directory under which files are allowed
        file_path (str): The input path to resolve

    Returns:
        str: The normalised, absolute (or base-relative) path that is guaranteed
        to be inside base_dir

    Raises:
        FileNotFoundError: If file_path is empty or resolves outside base_dir.
    """
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

def normalize_concept_tags(val):
    """
    Normalise the 'concept_tags' to JSON string for storing in the database
    Accepts lists/tuples/JSON/strings

    Args:
        val (lists/tuples/JSON/strings): Concept tags provided by user
    
    Returns:
        str: JSON string (e.g., '["regression","r-squared"]') or string if JSON array not valid
            None when input is None
    
    Raises:
        None if not found
    """
    # Standardise the format of the concept_tags field
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
        return val
    return json.dumps(val, ensure_ascii=False)

MODEL_PATH = os.getenv("diff_model_path", "/app/models/model_elasticnet.pkl")
difficulty_model = None
featurepath = "/app/difficulty_rating_experimentation/model_experimentation 4 features.py"

def _load_training_helpers():
    """
    Dynamically import the training script so that pickled helper functions can be resolved
    
    Args: 
        None

    Returns:
        None
    
    Raises:
        Logs warnings only, does not raise to avoid crashes
    """
    if not os.path.exists(featurepath):
        app.logger.warning(f"[difficulty] Helper file not found at {featurepath}")
        return
    try:
        spec = importlib.util.spec_from_file_location("feats_mod", featurepath)
        mod = importlib.util.module_from_spec(spec)
        # Run the file so _numeric_feats_from_df is defined
        spec.loader.exec_module(mod)  
        # Register under __main__ so unpickler finds it
        sys.modules["__main__"] = mod
        app.logger.info("[difficulty] Registered _numeric_feats_from_df from training script.")
    except Exception as e:
        app.logger.warning(f"[difficulty] Could not import training helpers: {e}")

def parse_tags(val):
    """
    Converts the concept tags into JSON list format

    Args:
        val (list/tuple/JSON): stored as JSON list

    Return:
        list: If val is not empty, else empty list []
    
    Raises:
        None
    """
    if not val:
        return []
    if isinstance(val, (list, tuple)):
        return list(val)
    try:
        return json.loads(val) or []
    except Exception:
        return []

def predict_row(row: dict) -> float:
    """
    Predicts the difficulty rating using the Machine Learning model when taking the row as input

    Args:
        row (dict): {
            "question_stem": stem,
            "tags_text": tags_text,
            "question_type": row.get("question_type") or "",
            }
    
    Returns:
        float: Difficulty rating value predicted by the model used
    
    Raises:
        None
    """
    stem = (row.get("question_stem") or "").strip()
    tags_text = " ".join(parse_tags(row.get("concept_tags")))
    X = pd.DataFrame([{
        "question_stem": stem,
        "tags_text": tags_text,
        "question_type": row.get("question_type") or "",
    }])
    yhat = float(difficulty_model.predict(X)[0])
    return float(np.clip(yhat, 0.0, 1.0))

def _get_question_row(question_id: int):
    with closing(get_connection()) as conn:
        cur = conn.cursor(MySQLdb.cursors.DictCursor)
        # Fetch the page_image_paths column
        cur.execute("SELECT id, page_image_paths FROM questions WHERE id=%s", (question_id,))
        return cur.fetchone()

def _safe_join_media(base_dir: str, file_path: str) -> str:
    """Safely join a base directory with a media file path."""
    if not file_path:
        raise FileNotFoundError("Empty file path")
    
    # Clean the path: remove leading slashes and "data/question_media/" prefix
    cleaned_path = file_path.strip().lstrip('/')
    if cleaned_path.startswith('data/question_media/'):
        cleaned_path = cleaned_path[len('data/question_media/'):]
        
    candidate = os.path.normpath(os.path.join(base_dir, cleaned_path))
    base_dir_norm = os.path.normpath(base_dir)
    
    # Security check to prevent path traversal
    if not candidate.startswith(base_dir_norm + os.sep):
        raise FileNotFoundError("Invalid media path")
    return candidate

# ---- Health Route ----
@app.route("/health", methods=["GET"])
def health():
    """
    Lightweight health check endpoint.

    Returns:
        tuple[dict, int]: JSON containing:
            - "ok" (bool): Always True if the app is running.
            - "model_loaded" (bool): Whether the difficulty model was successfully loaded at startup.
        and HTTP 200.
    """
    return {"ok": True, "model_loaded": difficulty_model is not None}, 200

# ---- Main Query Route ----
@app.route("/getquestion", methods=["GET"])
def get_question():
    """
    Fetch questions with their source file metadata from the database, with filters and pagination

    Supported query parameters (All Optional):
        - course (str): Filter by files.course
        - year (int): Filter by files.year
        - semester (str): Filter by files.semester
        - assessment_type (str): Filter by files.assessment_type
        - question_type (str): Filter by questions.question_type
        - question_no (str/int): Filter by questions.question_no
        - concept_tags (repeated or comma-separated): e.g.
              ?concept_tags=regression&concept_tags=anova
              ?concept_tags=regression,anova
          Matched via JSON_CONTAINS on questions.concept_tags.
        - limit (int, default=50): Max number of rows to return
        - offset (int, default=0): Offset for pagination
        - order_by (str, default="updated_at"): One of {"created_at","difficulty","updated_at"}
        - sort (str, default="desc"): "asc" or "desc"

    Returns:
        flask.Response (application/json):
            {
              "total": <int>,
              "items": [
                 {
                   "id": ...,
                   "question_stem": ...,
                   "concept_tags": [...],
                   ...
                   "course": ...,
                   "year": ...,
                   ...
                 },
                 ...
              ]
            }
        with HTTP 200.
    """
    # Allowed Query Parameters
    course = request.args.get("course")
    year = request.args.get("year")
    semester = request.args.get("semester")
    assessment_type = request.args.get("assessment_type")

    question_type = request.args.get("question_type")
    question_no = request.args.get("question_no")

    # Concept Tags supports both:
        # ?concept_tags=a&concept_tags=b
        # ?concept_tags=a,b
    # Normalize into one list
    raw_tags = request.args.getlist("concept_tags")
    concept_tags = []
    for t in raw_tags:
        concept_tags.extend([s.strip() for s in t.split(",") if s.strip()])

    # Default Pagination and Sorting
    limit = int(request.args.get("limit", 100000))
    offset = int(request.args.get("offset", 0))
    order_by_arg = (request.args.get("order_by") or "").lower()
    sort_arg = (request.args.get("sort") or "desc").lower()

    # Whitelist order_by to prevent SQL injection
    # Future Improvement: Flexibility of order_by_args
    if order_by_arg == "created_at":
        order_by_sql = "q.created_at"
    elif order_by_arg == "difficulty":
        order_by_sql = "q.difficulty_rating_model"
    else:
        order_by_sql = "q.updated_at"
    sort_sql = "ASC" if sort_arg == "asc" else "DESC"

    # SELECT columns 
    select_cols = [
        "q.id", "q.question_base_id", "q.version_id", "q.file_id", "q.question_no",
        "q.question_type", "q.question_stem", "q.question_stem_html",
        "q.concept_tags", "q.page_image_paths", 
        "q.last_used", "q.created_at", "q.updated_at",
        "q.question_options", "q.question_answer",
        "q.difficulty_rating_manual", "q.difficulty_rating_model",
        "f.course", "f.year", "f.semester", "f.assessment_type", "f.file_name", "f.file_path"
    ]

    # Build WHERE with parameters
    where_clauses = []
    params = []

    # File table filters
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

    # Question table filters
    if question_type:
        where_clauses.append("q.question_type = %s")
        params.append(question_type)
    if question_no:
        where_clauses.append("q.question_no = %s")
        params.append(question_no)

    if concept_tags:
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

    # Execute Query
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
            options_json, answer_json,
            difficulty_manual, difficulty_model,
            f_course, f_year, f_semester, f_assessment, f_name, f_path
        ) = row
        
        # Normalize JSON fields
        concept_list = parse_json_field(concept_json)
        media_list = parse_json_field(media_json)
        options_list = parse_json_field(options_json)
        answer_data = parse_json_field(answer_json)

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

            "difficulty_manual": difficulty_manual,
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

# ---- Download Route ----
file_base_directory = os.getenv("file_base_directory", "/app/data/source_files")
question_media_base_directory = os.getenv("question_media_base_directory", "/app/data/question_media")

@app.route("/files/<int:file_id>/download", methods=["GET"])
def download_file(file_id: int):
    file_row = _get_file_row(file_id)
    if not file_row:
        abort(404, description = "Invalid file")
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
    
@app.route("/question/<int:question_id>/download_image", methods=["GET"])
def download_question_image(question_id: int):
    question_row = _get_question_row(question_id)
    if not question_row:
        abort(404, description="Invalid question ID")

    image_paths_json = question_row.get("page_image_paths")
    if not image_paths_json:
        abort(404, description="No images found for this question")

    try:
        image_paths = json.loads(image_paths_json)
    except Exception:
        abort(500, description="Failed to parse image paths")

    if not image_paths or not isinstance(image_paths, list) or len(image_paths) == 0:
        abort(404, description="No image path in list")

    # --- Download only the FIRST image for simplicity ---
    first_image_path = image_paths[0]

    try:
        # Use the new safe join function and base directory
        full_path = _safe_join_media(question_media_base_directory, first_image_path)
    except FileNotFoundError as e:
        abort(404, description=str(e))

    if not os.path.exists(full_path):
        app.logger.error("Image file not in folder: %s", full_path)
        abort(404, description="Image file not in folder")

    # Get mimetype and download name
    guessed, _ = mimetypes.guess_type(full_path)
    download_name = os.path.basename(full_path)

    app.logger.info("DOWNLOAD_IMAGE full_path=%s base=%s dbpath=%s",
                    full_path, question_media_base_directory, first_image_path)

    return send_file(
        full_path,
        mimetype=guessed or "image/png", # Default to image/png
        as_attachment=True,
        download_name=download_name,
        conditional=True,
    )
    
_SENT_SPLIT = re.compile(r'[.!?]')
def _syllable_count(w): return 1
def _compute_readability_features(texts):

    """

    texts: iterable of question stems (strings)

    returns: np.ndarray shape (n, 2) with:

        [Flesch Reading Ease, Flesch-Kincaid Grade Level]

    """

    rows = []

    for t in texts:

        t = t if isinstance(t, str) else ""

        tokens = re.findall(r"\b\w+\b", t)

        n_w = len(tokens) if tokens else 1

        n_sents = max(1, len([s for s in _SENT_SPLIT.split(t) if s.strip()]))

        n_syll = sum(_syllable_count(w) for w in tokens) if tokens else 1



        # Flesch Reading Ease (higher = easier)

        fre = 206.835 - 1.015 * (n_w / n_sents) - 84.6 * (n_syll / n_w)

        # Flesch-Kincaid Grade Level (higher = harder)

# ---- Difficulty Rating Model ----
# Load the difficulty rating model
_load_training_helpers()

try:
    difficulty_model = joblib.load(MODEL_PATH)
    app.logger.info(f"[difficulty] Loaded model: {MODEL_PATH}")
except Exception as e:
    app.logger.warning(f"[difficulty] Model not loaded ({MODEL_PATH}): {e}")

@app.route("/predict_difficulty", methods=["POST"])
def predict_difficulty():
    """
    Predict difficulty for questions as a whole batch
    Selects questions from 'questions' table with NULL in 'difficulty_rating_manual'
    with the saved Machine Learning pipeline, and update the Database

    Args: 
        file_id (int, optional): If provided, restricts difficulty prediction to only files in 'file_id'
        dry_run (int, optional): If dry_run=1, does not fill in the value in the database, and only return result
                                    Default 0 to fill in the difficulty_rating_model field

        JSON body: {} (empty object). Body required for POST

    Returns:
        flask.Response(application/json):
            200 with {"processed": int, # number of rows predicted
                    "updated" int, # number of rows written
                    "dry_run": bool,
                    "items": [
                    {
                    "id": int,
                    "question_base_id": int,
                    "file_id": int,
                    "difficulty_rating_model": float
                    },
                    ...
                ]
            }
            500 with {"error": "model not loaded"} if the model cannot be reached
    
    Raises:
        Database and model errors handled and returned as 4xx/5xx flask responses
    """
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

# ---- Upload Route ----
@app.post("/upload_file")
def upload_file():
    """
    Handle PDF uploads, persist metadata to the database, and trigger the 3-step parsing pipeline

    Workflow:
        1. Validate request:
        2. Save the PDF into the configured file_base_directory
        3. Insert a row into the `files` table with the provided metadata
        4. Mirror a copy into the pipeline's canonical source directory
        5. Run the parsing pipeline:
            - `python pdf_extractor.py` with TARGET_PDF=<filename>
            - `python llm_parser.py` with TARGET_BASE=<filename_without_ext>
            - `python insert_questions.py` with TARGET_BASE=<filename_without_ext>

    Form fields:
        - course (str, optional)
        - year (str/int, optional)
        - semester (str, optional)
        - assessment_type (str, optional)

    Returns:
        flask.Response (application/json):
            - 201 on success:
                {
                  "saved": true,
                  "file": {
                    "file_id": <int or null>,
                    "original_name": "...",
                    "stored_filename": "...",
                    "stored_path": "..."
                  },
                  "pipeline": {
                    "pdf_extractor": {...},
                    "llm_parser": {...},
                    "insert_questions": {...}
                  }
                }
            - 400 on bad upload (no file, wrong type, invalid PDF header)
            - 500 if a pipeline step fails (upload is still saved)

    Future Improvements:
        - DB insert failure is reported but does not roll back the file save
        - Accept more file types
    """
    print("--- STARTING UPLOAD HANDLER ---") # <--- ADDED
    course = request.form.get("course")
    year = request.form.get("year")
    semester = request.form.get("semester")
    assessment_type = request.form.get("assessment_type")

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

    # Where downloads look for files
    base_dir = Path(os.getenv("file_base_directory", "/data/source_files"))
    base_dir.mkdir(parents=True, exist_ok=True)

    # Secure the original name; we prefer to keep it for nicer downloads/UX
    original_name = secure_filename(f.filename)

    # Stream to a temp file while hashing
    h = hashlib.sha256()
    tmp_path = Path(tempfile.mkstemp(suffix=".pdf")[1])
    with open(tmp_path, "wb") as w:
        while True:
            chunk = f.stream.read(1024 * 1024)
            if not chunk:
                break
            h.update(chunk)
            w.write(chunk)
    short_hash = h.hexdigest()[:8]

    # Choose final filename inside file_base_directory
    # If a same-named file already exists, append a short hash before the extension.
    stem = Path(original_name).stem
    suffix = Path(original_name).suffix or ".pdf"
    candidate_name = original_name
    dest_path = base_dir / candidate_name
    if dest_path.exists():
        candidate_name = f"{stem}_{short_hash}{suffix}"
        dest_path = base_dir / candidate_name
    dest_path = dest_path.relative_to('/app')

    # Move temp file into the canonical storage directory
    shutil.move(str(tmp_path), dest_path)

    # Insert into DB — IMPORTANT: download uses file_name to resolve under file_base_directory
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

    # Ensure the parser can find the file.
    # By default, SRC_DIR == BASE_DIR/"data/source_files".
    # If the env var points elsewhere, mirror a copy into SRC_DIR for your existing pipeline.
    try:
        if Path(file_base_directory) != SRC_DIR:
            SRC_DIR.mkdir(parents=True, exist_ok=True)
            mirror_path = SRC_DIR / candidate_name
            if not mirror_path.exists():
                shutil.copyfile(dest_path, mirror_path)
    except Exception as e:
        app.logger.warning(f"Mirror to SRC_DIR failed: {e}")

    # Use the ACTUAL saved filename as TARGET_BASE for the pipeline
    base = Path(candidate_name).stem
    logs = {}

    # 1) Extract text (filter to this PDF via TARGET_PDF)
    code, out, err = _run("python pdf_extractor.py", env_extra={"TARGET_PDF": candidate_name})
    logs["pdf_extractor"] = {"code": code, "stdout": out, "stderr": err}
    if code != 0:
        return jsonify({"saved": True, "file_id": file_id, "pipeline": logs, "error": "pdf_extractor failed"}), 500

    # 2) LLM parse (filter via TARGET_BASE)
    code, out, err = _run("python llm_parser.py", env_extra={"TARGET_BASE": base})
    logs["llm_parser"] = {"code": code, "stdout": out, "stderr": err}
    if code != 0:
        return jsonify({
            "saved": True,
            "file_id": file_id,
            "pipeline": logs,
            "error": "llm_parser failed"
        }), 500

    # 3) Insert questions (filter via TARGET_BASE)
    code, out, err = _run("python insert_questions.py", env_extra={"TARGET_BASE": base})
    logs["insert_questions"] = {"code": code, "stdout": out, "stderr": err}
    if code != 0:
        return jsonify({
            "saved": True,
            "file_id": file_id,
            "pipeline": logs,
            "error": "insert_questions failed"
        }), 500

    return jsonify({
        "saved": True,
        "file": {
            "file_id": file_id,
            "original_name": original_name,
            "stored_filename": candidate_name,
            "stored_path": str(dest_path)
        },
        "pipeline": logs
    }), 201



# -----------------------------------------------------
# Question Editing (PATCH)

allowed_question_fields_for_edit = {"question_stem", "concept_tags", "difficulty_rating_manual", "question_type", "question_options", "question_answer"}
allowed_file_fields_for_edit = {"assessment_type", "course", "year", "semester"}

@app.route("/api/editquestions/<int:q_id>", methods=["PATCH"]) # PATCH method to allow partial update
# ---- Temporary Endpoint for backend testing of upload feature ---
@app.get("/upload")
def upload_page():
    """
    Temporary Endpoint for backend to test upload feature
    """
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

# ---- Edit Question Route ----

Aallowed_question_fields_for_edit = {"question_stem", "concept_tags", "difficulty_rating_manual", "question_type", "question_options", "question_answer"}
allowed_file_fields_for_edit = {"assessment_type", "course", "year", "semester"}

@app.route("/api/editquestions/<int:q_id>", methods=["PATCH"]) # PATCH method to allow partial update
def update_question(q_id):
    """
    Supports editing selected fields in the 'questions' table ("question_stem", 
    "concept_tags", "difficulty_rating_manual", "question_type", "question_options", 
    "question_answer") and selected metadata in the 'files' row ("assessment_type", 
    "course", "year", "semester").

    Args:
        q_id (int): 
            Primary key of the question for editing.
        JSON body (dict):
            Key-value pairs for edit. Allowed keys are:
                - questions: {"question_stem", "concept_tags", "difficulty_rating_manual", 
                            "question_type", "question_options", "question_answer"}
                - files: {"assessment_type", "course", "year", "semester"}
            Notes:
                - concept_tags must be list/tuple.
                - difficulty_rating_manual must be float or null.

    Returns:
        flask.Response (application/json):
            200 with the edited record if successful.
            400 with {"error": "..."} if field input is not an allowed type.
            404 if the question does not exist for editing.

    Raises:
        Database and JSON errors are handled and returned as 4xx/5xx flask responses.
    """

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

# ---- Hard Deletion Route ----
@app.route("/api/deletequestion/<int:q_id>", methods=["DELETE"])
def delete_question(q_id):
    """
    Permanently delete a question from the 'questions' table.

    Args:
        q_id (int): 
            Primary key of the question to be deleted.
        Confirmation string (str):
            MUST BE "YES" to proceed with deletion, otherwise error 400 is returned.

    Returns:
        flask.Response(application/json):
            200 with {"status": "deleted_permanently", "id": q_id} if successful
            400 with {"error": "confirmation_required", ...} if confirmation not stated/invalid.
            404 with {"status": "not_found", "id": q_id} if q_id does not exist in 'questions' table
            500 with {"error": "delete_failed", ..." if error in database.

    Raises:
        All exceptions handled and returned as 4xx/5xx flask responses.

    """

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

# ---- Add Question Route ----
@app.route("/addquestion", methods=["POST"])
def addquestion():
    """
    Create a new question and adds it to the 'questions' table.

    Args:
        JSON body (dict):
            Either:
                - file_id (int): existing file row to attach the question to
            Or ALL fields to find file_id:
                - course (str)
                - year (int)
                - semester (str)
                - assessment_type (str)
            Required fields:
                - question_type (str)
                - question_stem (str)
            Optional fields:
                - concept_tags (list/tuple/JSON string/str): will be normalised to JSON.
                - question_options (list/dict/JSON string): stored as JSON string.
                - question_answer (JSON)L store as JSON.
    
    Returns:
        flask.Response(application/json):
            201 with {"status": "created", "question_id": <int>, "file": {...}, "data": {...}} if successful
            400 with {"error": "missing_field", ...} when required field inputs are not present.
            404 with {"error": "file_not_found"} when file_id is invalid.
            500 with {"error": "insert_failed", "message": "..."} if error in database.

    Raises:
        Input and database error are handled and returned as 4xx/5xx flask responses.

    """

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
## Question Creation (File-Independent)
## Unique Endpoint from Template 2

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
    
    # Extracting difficulty_rating_manual
    difficulty_rating_manual = payload.get("difficulty_rating_manual")
    
    # Enforce FLOAT conversion or keep None if not provided
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


# ---------------------------------------------
# SEARCH QUESTIONS ENDPOINT (dedup by question_base_id)
# ---------------------------------------------
@app.route("/search", methods=["GET"])
def search_questions():
    keyword = (request.args.get("q") or "").strip().lower()
    qtype = (request.args.get("type") or "all").strip().lower()
    course = (request.args.get("course") or "").strip().upper()  # filter key
    assessment_type = (request.args.get("assessment_type") or "").strip().lower()
    academic_year = (request.args.get("academic_year") or "").strip()
    concept = (request.args.get("concept_tags") or "").strip().lower()

    latest_sql = """
        SELECT COALESCE(question_base_id, id) AS gid, MAX(id) AS max_id
        FROM questions
        GROUP BY COALESCE(question_base_id, id)
    """

    # Derive course_key from f.course, else from filename prefix like ST2131
    # REGEXP_SUBSTR is available in MySQL 8
    sql = f"""
        SELECT
            q.id AS question_id,
            q.question_base_id,
            q.file_id,
            q.question_no,
            q.question_stem,
            q.question_type,
            q.concept_tags,
            COALESCE(
               UPPER(NULLIF(TRIM(f.course), '')),
               UPPER(REGEXP_SUBSTR(f.file_name, '^[A-Za-z]{{2,5}}[0-9]{{4}}'))
            )                             AS course_key,
            f.year,
            LOWER(NULLIF(TRIM(f.assessment_type), '')) AS assessment_type_raw,
            q.updated_at
        FROM ({latest_sql}) t
        JOIN questions q ON q.id = t.max_id
        JOIN files     f ON f.id = q.file_id
    """

    where, params = [], []

    if keyword:
        where.append("(LOWER(q.question_stem) LIKE %s OR LOWER(q.concept_tags) LIKE %s)")
        like = f"%{keyword}%"
        params += [like, like]

    if qtype != "all":
        where.append("LOWER(q.question_type) = %s")
        params.append(qtype)

    # Only filter by course when a *real* key comes in
    if course:
        where.append("""COALESCE(
               UPPER(NULLIF(TRIM(f.course), '')),
               UPPER(REGEXP_SUBSTR(f.file_name, '^[A-Za-z]{2,5}[0-9]{4}'))
            ) = %s""")
        params.append(course)

    if assessment_type:
        where.append("LOWER(NULLIF(TRIM(f.assessment_type), '')) = %s")
        params.append(assessment_type)

    if academic_year:
        where.append("f.year = %s")
        params.append(academic_year)

    if concept:
        where.append("LOWER(q.concept_tags) LIKE %s")
        params.append(f"%{concept}%")

    if where:
        sql += " WHERE " + " AND ".join(where)

    sql += " ORDER BY f.year DESC, q.updated_at DESC LIMIT 200"

    with closing(get_connection()) as conn, closing(conn.cursor(MySQLdb.cursors.DictCursor)) as cur:
        cur.execute(sql, tuple(params))
        rows = cur.fetchall()

    out = []
    for r in rows:
        # tags → list
        try:
            tags = json.loads(r.get("concept_tags") or "[]")
            if not isinstance(tags, list):
                tags = [tags]
        except Exception:
            tags = [r["concept_tags"]] if r.get("concept_tags") else []

        ck = r.get("course_key") or "UNKNOWN"
        course_label = "Unknown" if ck == "UNKNOWN" else ck

        atype = (r.get("assessment_type_raw") or "").lower()
        atype = atype if atype in ("final", "midterm", "quiz") else "Unknown"

        out.append({
            "question_id": r["question_id"],
            "question_base_id": r.get("question_base_id"),
            "file_id": r.get("file_id"),
            "question_no": r.get("question_no"),
            "question_stem": r.get("question_stem"),
            "question_type": r.get("question_type"),
            "concept_tags": tags,
            "course": course_label,   # display
            "course_key": ck,         # filter key to send back
            "year": r.get("year"),
            "assessment_type": atype,
            "updated_at": r.get("updated_at"),
        })

    return jsonify(out)


if __name__ == "__main__":
    # Run the Flask app directly
    app.run(host="0.0.0.0", port=5000, debug=True)
