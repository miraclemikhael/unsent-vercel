-- Unsent database structure (tables only, no data, safe for GitHub).
-- Safe to run again: it never deletes anything.
-- IMPORTANT: this file does not create or select a database, because managed MySQL
-- (TiDB, Aiven, filess.io, a shared host ...) does not let you create one and the
-- name is usually fixed by the provider.
--   phpMyAdmin : click your database in the left column first, then Import this file.
--   HeidiSQL   : right-click your database > "Run SQL file...", or select it first.
--   CLI        : mysql -h HOST -P PORT -u USER -p YOUR_DB_NAME < app/config/schema.sql
-- On an empty database the site starts with no accounts: open it and choose "Create account".
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `pos` INT NOT NULL DEFAULT 0,
  `name` VARCHAR(255) NULL,
  `username` VARCHAR(255) NULL,
  `email` VARCHAR(255) NULL,
  `phone` VARCHAR(255) NULL,
  `is_private` TINYINT NULL,
  `password_hash` VARCHAR(255) NULL,
  `role` VARCHAR(255) NULL,
  `status` VARCHAR(255) NULL,
  `joined` VARCHAR(255) NULL,
  `last_active` VARCHAR(255) NULL,
  `avatar` VARCHAR(255) NULL,
  `theme` VARCHAR(255) NULL,
  `calm_mode` TINYINT NULL,
  `remind_on` TINYINT NULL,
  `streak_on` TINYINT NULL,
  `tips_on` TINYINT NULL,
  `remind_time` VARCHAR(255) NULL,
  `last_login_at` DATETIME NULL,
  `last_logout_at` DATETIME NULL,
  `password_changed_at` DATETIME NULL,
  `extra` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS `moods` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `day` VARCHAR(20) NOT NULL,
  `mood` VARCHAR(50) NULL,
  `note` TEXT NULL,
  `logged_at` DATETIME NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `user_day` (`user_id`, `day`)
);
CREATE TABLE IF NOT EXISTS `letters` (
  `pos` INT NOT NULL DEFAULT 0,
  `id` VARCHAR(40) NOT NULL PRIMARY KEY,
  `owner_email` VARCHAR(255) NULL,
  `kind` VARCHAR(255) NULL,
  `recipient` VARCHAR(255) NULL,
  `relationship` VARCHAR(255) NULL,
  `title` VARCHAR(255) NULL,
  `body` MEDIUMTEXT NULL,
  `paper` VARCHAR(255) NULL,
  `written_on` VARCHAR(255) NULL,
  `front_image` VARCHAR(255) NULL,
  `postcard_font` VARCHAR(255) NULL,
  `postcard_color` VARCHAR(255) NULL,
  `envelope_font` VARCHAR(255) NULL,
  `envelope_size` VARCHAR(255) NULL,
  `written_at` DATETIME NULL,
  `extra` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `pos` INT NOT NULL DEFAULT 0,
  `at_time` VARCHAR(30) NULL,
  `admin_name` VARCHAR(255) NULL,
  `action` VARCHAR(255) NULL,
  `target` VARCHAR(255) NULL,
  `extra` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS `settings` (
  `name` VARCHAR(50) NOT NULL PRIMARY KEY,
  `value` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS `deleted_log` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `table_name` VARCHAR(30) NULL,
  `row_id` VARCHAR(40) NULL,
  `label` VARCHAR(255) NULL,
  `deleted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ===== Friends, chat (text / pictures / voice notes) and calls =====
-- The site also creates these by itself the first time Friends is opened. Safe to run again.
CREATE TABLE IF NOT EXISTS `friends` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `friend_id` INT NOT NULL,
  `status` ENUM('pending','accepted') DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (`user_id`, `friend_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`friend_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS `messages` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `from_id` INT NOT NULL,
  `to_id` INT NOT NULL,
  `kind` ENUM('text','image','voice') DEFAULT 'text',
  `body` TEXT NULL,
  `file` VARCHAR(60) NULL,
  `dur` INT NULL,
  `read_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `edited` TINYINT(1) NOT NULL DEFAULT 0,
  `deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `upd` DATETIME NULL,
  KEY `pair` (`from_id`, `to_id`, `id`),
  KEY `inbox` (`to_id`, `read_at`),
  FOREIGN KEY (`from_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`to_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS `call_signals` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `call_id` VARCHAR(20) NOT NULL,
  `from_id` INT NOT NULL,
  `to_id` INT NOT NULL,
  `type` VARCHAR(12) NOT NULL,
  `payload` MEDIUMTEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `inbox` (`to_id`, `id`)
);

-- ---- Added for Vercel (the site also creates these by itself the first time they are needed) ----
CREATE TABLE IF NOT EXISTS `app_sessions` (
  `id` VARCHAR(128) NOT NULL PRIMARY KEY,
  `data` MEDIUMBLOB NOT NULL,
  `ts` INT UNSIGNED NOT NULL,
  KEY `ts` (`ts`)
);
CREATE TABLE IF NOT EXISTS `files` (
  `name` VARCHAR(80) NOT NULL PRIMARY KEY,
  `mime` VARCHAR(80) NOT NULL,
  `data` LONGBLOB NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS `app_kv` (
  `name` VARCHAR(60) NOT NULL PRIMARY KEY,
  `value` MEDIUMTEXT NOT NULL
);
