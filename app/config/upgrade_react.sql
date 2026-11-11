-- Likes + comments on public letters. The site creates these by itself the first time a Me / space page opens. Safe to run again.
USE `unsent`;
CREATE TABLE IF NOT EXISTS `letter_likes` (
  `letter_id` VARCHAR(40) NOT NULL,
  `user_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`letter_id`, `user_id`),
  KEY `by_user` (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS `letter_comments` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `letter_id` VARCHAR(40) NOT NULL,
  `user_id` INT NOT NULL,
  `body` VARCHAR(500) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `by_letter` (`letter_id`, `id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
