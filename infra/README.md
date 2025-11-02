# dsa3101-2510-quiz-01
# infra

## Overview
This folder contains the infrastructure setup for our quiz project — including the backend API, frontend app, database, and difficulty rating model deployment.

It provides everything needed to:
- Build and run the entire application with Docker.
- Train and load the ML model for predicting question difficulty.
- Manage schema migrations and database seeding.

## Structure
- `backend_app` - backend Flask application. Contains API routes for uploading and downloading files, predicting difficulty, getting, adding, editing, and deleting questions.
- `difficulty_rating_experimentation` - Trains and experiment with the difficulty rating model, includes the model used in the API route.
- `frontend` - Interacts with backend API endpoints.
- `models` - Stores pre-trained ML models. Mounted into the API container for inference.
- `docker-compose.yml` - Forms the multi-container setup for the project (database, API, frontend, etc.). Handles model seeding and health checks.
- `Dockerfile_api` - Builds the Flask API container, including dependencies (Flask, MySQL client, scikit-learn, joblib, pandas).
- `Dockerfile` - Builds image used for backend to set up the database.
- `Dockerfile.frontend` - Builds the frontend service.
- `schema.sql` - Defines MySQL database schema, with tables such as files and questions. Run automatically when initializing the DB.
- `seed.sql` - Inserts seed data into the DB for some fields.
- `README.md` - This documentation file explaining the infra setup.

## How to Use
From the `/infra` directory, run:
``` bash
docker compose up --build
```
This will start up the containers for the DB, the flask API, the frontend server and the difficulty rating model deployment.

MySQL DB (db) runs on port 3306 in the container.

Adminer for the DB is accessible at: http://127.0.0.1:8080

Flask API (api) runs on port 5000 in the container, and is accessible at:
http://127.0.0.1:5001

Frontend app (frontend) runs on port 5173 in the container, and its User Interface is accessible at:
http://localhost:5173

Difficulty rating seeding (seed-difficulty)

## Verify Running Containers
docker ps

Expected containers:

quizbank-db
quizbank-api
quizbank-backend
quizbank-adminer
infra-seed-difficulty-1
quizbank-frontend

## API Routes Summary
- `/health (GET method) - Health check for API and model.
- `/getquestion (GET method)` - Search and attain question the user wants.
- `/files/<file_id>/download (GET method)` - Download the file specified.
- `/upload_file (POST method)` - Upload the file chosen by user.
- `/predict_difficulty (POST method)` - Runs the saved difficulty rating model and updates the difficulty_rating_model column for questions with NULL manual ratings.
- `/api/editquestions/<id> (PATCH method)` - Allows users to edit question details (concept tags, manual difficulty rating, etc.).
- `/api/harddeletequestions/<id> (DELETE method)`- Permanently deletes a question by ID.
- `/api/addquestion (POST method)` - Adds a new question record.
- `/api/createquestion (POST method)` - Creates a new question record.
- `/upload_file (POST method)` - Uploads a new PDF, which is extracted, parsed, and inserted into the DB.
- `/search (GET method)` - Search for questions matching the user inputs.

## Note
When running with Docker, the seed-difficulty container triggers the difficulty prediction API route (/predict_difficulty) automatically at startup to ensure all existing questions have up-to-date model values.

## Environment Variables
Variable	Default	Description
- `MYSQL_HOST	(db)` - Hostname for MySQL service.
- `MYSQL_PORT	(3306)` - Port for MySQL.
- `MYSQL_USER	(quizbank_user)` - Database username.
- `MYSQL_PASSWORD (quizbank_pass)` - Database password.
- `MYSQL_DATABASE (quizbank)` - Database name.
- `diff_model_path (/app/models/model_ridge.pkl)` - Path to difficulty model inside the container.

## Summary
The infra/ directory is the foundation of our quizbank system:
- Defines backend, frontend, and DB setup.
- Integrates machine learning model for difficulty rating prediction.
- Enables reproducible deployment across all environments.
