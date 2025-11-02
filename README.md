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

## How to access and use our quiz project

```bash
cd infra
docker compose up --build
```
## Summary
The folder holds all folder crucial in setting up and dockerising our quiz project.