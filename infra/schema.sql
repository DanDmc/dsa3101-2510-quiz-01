CREATE DATABASE IF NOT EXISTS quizbank;
USE quizbank;

-- ──────────────────────────────────────────────
-- 1) Source files (PDFs, Rmds, etc.)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS files (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  file_id VARCHAR(64) UNIQUE,
  file_version_id INT DEFAULT 1,
  course VARCHAR(32),
  year INT,
  semester VARCHAR(64),
  assessment_type ENUM('quiz','midterm','final','assessment','project','others') NOT NULL,
  file_name VARCHAR(255),
  file_path TEXT,
  uploaded_by VARCHAR(128),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ──────────────────────────────────────────────
-- 2) Questions
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  question_id VARCHAR(64) NOT NULL,
  version_id INT DEFAULT 1,
  file_id BIGINT NOT NULL,
  question_no INT,
  question_type ENUM('mcq','mrq','coding','open-ended','fill-in-the-blanks','others') NOT NULL,
  difficulty_level FLOAT,
  question_stem LONGTEXT,
  question_stem_html LONGTEXT,
  concept_tags JSON,
  question_media JSON,
  last_used DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (question_id, version_id),
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ──────────────────────────────────────────────
-- 3) Version history (optional)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS question_versions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  question_id VARCHAR(64) NOT NULL,
  old_version INT,
  new_version INT,
  changed_by VARCHAR(128),
  change_description TEXT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
