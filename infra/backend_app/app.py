from flask import Flask, request, jsonify, send_file, abort
import os
import MySQLdb
import pandas as pd
from sqlalchemy import func, or_
from contextlib import closing
import mimetypes
import json

app = Flask(__name__)

def get_connection():
    return MySQLdb.connect(
        host=os.getenv("MYSQL_HOST", "db"),
        user=os.getenv("MYSQL_USER", "root"),
        passwd=os.getenv("MYSQL_PASSWORD","root"),
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
@app.route("/health", methods=["GETs"])
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
    difficulty_level = request.args.get("difficulty_level")

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
        "q.question_type", "q.difficulty_level", "q.question_stem", "q.question_stem_html",
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
    if difficulty_level:
        where_clauses.append("q.difficulty_level = %s")
        params.append(difficulty_level)

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
            q_type, diff_level, stem, stem_html,
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
            "difficulty_level": float(diff_level) if diff_level is not None else None,
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
