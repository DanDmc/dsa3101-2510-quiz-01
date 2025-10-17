from flask import Flask, request, jsonify
import os
import MySQLdb
import pandas as pd
from sqlalchemy import func, or_
from contextlib import closing
import json

app = Flask(__name__)

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
