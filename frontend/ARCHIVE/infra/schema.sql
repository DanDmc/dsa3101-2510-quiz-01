CREATE DATABASE IF NOT EXISTS quizbank;
USE quizbank;

CREATE TABLE questions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  question_id VARCHAR(64) UNIQUE,
  course VARCHAR(32) NOT NULL,
  semester VARCHAR(64),
  assessment_type VARCHAR(64),
  question_no INT,
  is_multi BOOLEAN,
  question_stem LONGTEXT,
  question_stem_html LONGTEXT,
  version INT DEFAULT 1,
  update_timestamp DATETIME,
  question_media JSON,
  concept_tags JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  question_id BIGINT NOT NULL,
  part_number VARCHAR(8),
  type VARCHAR(64),
  subtype VARCHAR(64),
  language VARCHAR(32),
  code_snippet LONGTEXT,
  part_stem LONGTEXT,
  part_stem_html LONGTEXT,
  solution LONGTEXT,
  solution_html LONGTEXT,
  difficulty_level FLOAT,
  shuffle_choices BOOLEAN,
  scoring JSON,
  feedback JSON,
  items_media JSON,
  concept_tags JSON,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE choices (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  item_id BIGINT NOT NULL,
  choice_id VARCHAR(64),
  text LONGTEXT,
  text_html LONGTEXT,
  is_correct BOOLEAN,
  explanation LONGTEXT,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
) ENGINE=InnoDB;
