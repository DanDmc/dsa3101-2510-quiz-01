# dsa3101-2510-quiz-01
# backend_app

## Overview
This folder contains script for the API, and relevant scripts to assist selected API routes. 

It handles file uploads, PDF parsing, LLM question extraction, database insertion and difficulty rating predictions using a trained ML model. It also enables users to search, edit, add and delete questions.

## Structure
- `app.py` - main Flask application. Host all API routes (uploading and downloading files, predicting difficulty, getting, adding, editing, and deleting questions), DB connections and loading of the ML model.
- `difficulty_rating.py` - Trains and used as the base difficulty rating model, not the model used in the API route.
- `insert_questions.py` - Inserts parsed question data into the DB (questions table) after file upload.
- `llm_parser.py` - Uses a Large Language Model (LLM) to parse text into structred question data extracted from PDF uploaded. Output is JSON format for DB insertion.
- `pdf_extractor.py` - Extracts raw text from uploaded PDF.
- `requirements.txt` - List all Python dependencies required for the backend app.
- `README.md` - This documentation file explaining the backend setup.

## API Routes Summary
- `/health (GET method) - Health check for API and model.
- `/getquestion (GET method)` - Search and attain question the user wants.
- `/files/<file_id>/download (GET method)` - Download the file specified.
- `/upload_file (POST method)` - Upload the file chosen by user.
- `/predict_difficulty (POST method)` - Runs the saved difficulty rating model and updates the difficulty_rating_model column for questions with NULL manual ratings.
- `/api/editquestions/<id> (PATCH method)` - Allows users to edit question details (concept tags, manual difficulty rating, etc.).
- `/api/harddeletequestions/<id> (DELETE method)`- Permanently deletes a question by ID.
- `/api/createquestion (POST method)` - Creates a new question record.
- `/upload_file (POST method)` - Uploads a new PDF, which is extracted, parsed, and inserted into the DB.
- `/search (GET method)` - Search for questions matching the user inputs.

## Difficulty Rating Model
The backend loads a pre-trained model (model_ridge.pkl) from /app/models/.

## Summary
The backend_app/ directory provides the API endpoints our quizbank system:
- Enables users to upload, download and manage questions.
- Retrain and obtain difficulty rating values for better inferences.
- Enables reproducible deployment across all environments.
