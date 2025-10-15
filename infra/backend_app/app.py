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
    if tags: # to accept all individual requested tag, combine with OR to match any of the tags provided
        or_parts = ["JSON_CONTAINS(q.concept_tags, JSON_QUOTE(%s), '$')" for _ in tags]
        sql_parts.append("AND (" + " OR ".join(or_parts) + ")")
        args.extend(tags)


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