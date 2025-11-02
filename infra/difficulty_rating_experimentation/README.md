# Difficulty Rating Experimentation

## Overview
This folder contains various experiments and experimental script for predicting question difficulty

## Structure
- `data` - Folder containing split files (e.g. difficulty_split_v1.json) that contains the index numbers used for training/testing to ensure consistent train-test splits
- `eda` - Folder for exploratory data analysis diagrams output
- `experiments` - Auto generated folder containing experiment results, models, metrics and predictions. Each run creates a timestamped subfolder
- `eda.py` - Script for basic exploratory data analysis of question features and difficulty distributions.
- `model_experimentation 3 features.py` - Uses 3 features — question stem, concept tags, and question type.
- `model_experimentation 4 features.py` - Adds readability metrics (Flesch Reading Ease and Flesch-Kincaid Grade) as a fourth feature.
- `model_experimentation 5 features.py` - Adds length-based features (character count, token count, sentence count, syllable count) for a total of 5 features.

## How to Use
Before running any of the experiment scripts, ensure MySQL service is active.

From the `/infra` directory, run:
``` bash
docker compose up --build
```
This will start the MySQL container. 

## How to run Experiment
Once MySQL is running, navigate to the `/infra/difficulty_rating_experimentation` folder and run one of the model script 

``` bash
python "model_experimentation 3 features.py"
```

Each script will
1. Connect to MySQL database to load labelled question data
2. Check if data/splits has a json file that has equivalent number of datasets. If it doesnt, it will delete the previous file and create a new one.
3. Train multiple regression models using cross-validation
4. Evaluate model performacne on the test set
5. Save all experiemnts in a timestamped folder under `experiments/difficulty_ratings/`

## View Results
After each run, a `leaderboard.csv` is generated with a a summary of all model metrics(MAE, RMSE, R², and Spearman ρ).

## Note
* You do not need to set environment variables manually - they are already defined inside each Python script. 
