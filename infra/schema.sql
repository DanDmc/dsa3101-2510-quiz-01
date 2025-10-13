CREATE DATABASE IF NOT EXISTS quizbank;
USE quizbank;

-- ──────────────────────────────────────────────
-- 1) Source files (PDFs, Rmds, etc.)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS files (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  file_base_id BIGINT NULL,                     -- NULL = standalone file, NOT NULL = part of version chain
  file_version INT DEFAULT 1,                   -- Version number within a version chain
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
  question_base_id BIGINT NOT NULL,             -- Groups all versions of same question
  version_id INT DEFAULT 1,                     -- Version number (1, 2, 3...)
  file_id BIGINT NOT NULL,                      -- Which file this came from
  question_no VARCHAR(20),
  question_type ENUM('mcq','mrq','coding','open-ended','fill-in-the-blanks','others') NOT NULL,
  difficulty_level FLOAT,
  question_stem LONGTEXT,
  question_stem_html LONGTEXT,
  concept_tags JSON,
  question_media JSON,
  last_used DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_base_version (question_base_id, version_id),
  INDEX idx_base_id (question_base_id),
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ──────────────────────────────────────────────
-- 3) File version history (for future UI)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS file_versions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  file_base_id BIGINT NOT NULL,
  old_version_id BIGINT,                        -- files.id of old version
  new_version_id BIGINT,                        -- files.id of new version
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
  question_base_id BIGINT NOT NULL,             -- Which question was changed
  old_version_id BIGINT,                        -- questions.id of old version
  new_version_id BIGINT,                        -- questions.id of new version
  changed_by VARCHAR(128),
  change_description TEXT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (old_version_id) REFERENCES questions(id) ON DELETE CASCADE,
  FOREIGN KEY (new_version_id) REFERENCES questions(id) ON DELETE CASCADE
) ENGINE=InnoDB;