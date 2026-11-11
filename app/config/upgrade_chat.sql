-- Already have the database? Run only this file in HeidiSQL. It adds the chat tables and keeps everything else.
USE `unsent`;
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

-- Already have a messages table from before? (edit/delete in the first 15 minutes) The site adds these by itself; or run:
-- ALTER TABLE `messages` ADD `edited` TINYINT(1) NOT NULL DEFAULT 0, ADD `deleted` TINYINT(1) NOT NULL DEFAULT 0, ADD `upd` DATETIME NULL;
