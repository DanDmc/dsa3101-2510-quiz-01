# dsa3101-2510-quiz-01

## Overview
This folder contains our quizbank, designed to store, parse and analyse quiz and exam questions specifically from the mathematics, statistics and data science department.
Question extraction from uploaded PDF, categorises metadata, and predicts difficulty ratings using a trained machine learning model.

## Structure
- `ARCHIVE` - Stores backend previous attempts to convert data to for parsing into the DB.
- `backend` - Stores python scripts for manual maintenance, experiments, or running standalone scripts. It provides an isolated container to run.
- `data` - Stores raw data and data parsed at every stage in different formats (JSON, pdf, txt).
- `frontend` - Stores frontend app components based on the frontend Figma prototype.
- `infra` - Stores the infrastructure setup for our quiz project (backend API, frontend app, database, and difficulty rating model)
- `README.md` - This documentation file explaining the folders in dsa3101-2510-quiz-01 folder setup.
  `.env`  - Create a `.env` file to securely store configuration variables used by both the backend and API services when running via Docker.

## How to access and use our quiz project

```bash
cd infra
docker compose up --build
```

This will start up the containers for the DB, the flask API, the frontend server and the difficulty rating model deployment.
When finished running, it should display
```bash
seed-difficulty-1  | [seed] done
```

The database will be populated with seed data from the 4 assessment pdfs stored in data/source_files, which was created through the upload processes using python scripts in 'backend'.

MySQL DB (db) runs on port 3306 in the container.

Adminer for the DB is accessible at: http://127.0.0.1:8080

Flask API (api) runs on port 5000 in the container, and is accessible at: http://127.0.0.1:5001

Frontend app (frontend) runs on port 5173 in the container, and its User Interface is accessible at: http://localhost:5173


## Summary
The folder holds all folder crucial in setting up and dockerising our quiz project.

## Team (Backend)
- Liao Keng Hsu
- Chng Qi Xun
- Randall Chew
- Daniel Christopher Chan

## Team (Frontend)
- Soh Kai Le
- Li Qi Ying
- Angel Bu Tong Mei 
- Ew Pek Ee
