CREATE DATABASE IF NOT EXISTS quizbank;
USE quizbank;

-- ══════════════════════════════════════════════════════════════════════════════
-- QUIZBANK DATABASE SCHEMA
-- ══════════════════════════════════════════════════════════════════════════════-- 

-- ──────────────────────────────────────────────
-- 1) Source files (PDFs, Rmds, etc.)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS files (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  file_base_id BIGINT NULL COMMENT 'NULL = standalone file, NOT NULL = part of version chain',
  file_version INT DEFAULT 1 COMMENT 'Version number within a version chain',
  course VARCHAR(32),
  year INT,
  semester VARCHAR(64),
  assessment_type ENUM('quiz','midterm','final','assessment','project','others') NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT,
  uploaded_by VARCHAR(128),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_base_version (file_base_id, file_version),
  INDEX idx_filename (file_name)
) ENGINE=InnoDB;

-- ──────────────────────────────────────────────
-- 2) Questions
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  question_base_id BIGINT NOT NULL COMMENT 'Groups all versions of same question',
  version_id INT DEFAULT 1 COMMENT 'Version number (1, 2, 3...)',
  file_id BIGINT NOT NULL COMMENT 'Which file this came from',
  question_no VARCHAR(20),
  page_numbers JSON COMMENT 'Array of page numbers where question appears (supports multi-page questions)',
  question_type ENUM('mcq','mrq','coding','open-ended','fill-in-the-blanks','others') NOT NULL,
  difficulty_rating_manual FLOAT COMMENT 'Manual difficulty rating (0-1 scale)',
  difficulty_rating_model FLOAT COMMENT 'ML model predicted difficulty (0-1 scale)',
  question_stem LONGTEXT COMMENT 'Main question text',
  question_stem_html LONGTEXT COMMENT 'HTML formatted question (future use)',
  question_options JSON COMMENT 'MCQ/MRQ options as array of {label, text} objects',
  question_answer LONGTEXT COMMENT 'Correct answer(s) with explanation',
  page_image_paths JSON COMMENT 'Array of file paths to saved page images (all pages saved as images)',
  concept_tags JSON COMMENT 'Array of concept tags for categorization',
  last_used DATE COMMENT 'Last date this question was used in assessment',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_base_version (question_base_id, version_id),
  INDEX idx_base_id (question_base_id),
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ──────────────────────────────────────────────
-- 3) File version history 
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS file_versions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  file_base_id BIGINT NOT NULL,
  old_version_id BIGINT COMMENT 'files.id of old version',
  new_version_id BIGINT COMMENT 'files.id of new version',
  changed_by VARCHAR(128),
  change_description TEXT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (old_version_id) REFERENCES files(id) ON DELETE CASCADE,
  FOREIGN KEY (new_version_id) REFERENCES files(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ──────────────────────────────────────────────
-- 4) Question version history
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS question_versions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  question_base_id BIGINT NOT NULL COMMENT 'Which question was changed',
  old_version_id BIGINT COMMENT 'questions.id of old version',
  new_version_id BIGINT COMMENT 'questions.id of new version',
  changed_by VARCHAR(128),
  change_description TEXT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (old_version_id) REFERENCES questions(id) ON DELETE CASCADE,
  FOREIGN KEY (new_version_id) REFERENCES questions(id) ON DELETE CASCADE
) ENGINE=InnoDB;