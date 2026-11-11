<?php
defined('ROOT') || exit;
/* Friends + chat + calls: small SQL helpers. These use MySQL directly, keyed by users.id. */
function q($sql, $args = [])
{
    $st = db_connect()->prepare($sql);
    $st->execute($args);
    return $st;
}
/* create the 3 chat tables if they are missing (safe to run again, never deletes anything) */
function ensure_chat_tables()
{
    if (!empty($_SESSION['chat_tables']) && !empty($_SESSION['chat_cols3'])) return;
    $pdo = db_connect();
    $pdo->exec("CREATE TABLE IF NOT EXISTS friends(
      id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, friend_id INT NOT NULL,
      status ENUM('pending','accepted') DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id,friend_id), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(friend_id) REFERENCES users(id) ON DELETE CASCADE)");
    $pdo->exec("CREATE TABLE IF NOT EXISTS messages(
      id BIGINT AUTO_INCREMENT PRIMARY KEY, from_id INT NOT NULL, to_id INT NOT NULL,
      kind ENUM('text','image','voice') DEFAULT 'text', body TEXT NULL, file VARCHAR(60) NULL, dur INT NULL,
      read_at TIMESTAMP NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, KEY pair(from_id,to_id,id), KEY inbox(to_id,read_at),
      FOREIGN KEY(from_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(to_id) REFERENCES users(id) ON DELETE CASCADE)");
    $pdo->exec("CREATE TABLE IF NOT EXISTS call_signals(
      id BIGINT AUTO_INCREMENT PRIMARY KEY, call_id VARCHAR(20) NOT NULL, from_id INT NOT NULL, to_id INT NOT NULL,
      type VARCHAR(12) NOT NULL, payload MEDIUMTEXT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, KEY inbox(to_id,id))");
    /* edit / delete (15 minute window): add the columns to an older messages table */
    if (empty($_SESSION['chat_cols3'])) {
        $have = array_column($pdo->query('SHOW COLUMNS FROM messages')->fetchAll(), 'Field');
        if (!in_array('edited', $have)) $pdo->exec('ALTER TABLE messages ADD edited TINYINT(1) NOT NULL DEFAULT 0');
        if (!in_array('deleted', $have)) $pdo->exec('ALTER TABLE messages ADD deleted TINYINT(1) NOT NULL DEFAULT 0');
        if (!in_array('upd', $have)) $pdo->exec('ALTER TABLE messages ADD upd DATETIME NULL, ADD KEY pair_upd(from_id,to_id,upd)');
        if (!in_array('del_from', $have)) $pdo->exec('ALTER TABLE messages ADD del_from TINYINT(1) NOT NULL DEFAULT 0');
        if (!in_array('del_to', $have)) $pdo->exec('ALTER TABLE messages ADD del_to TINYINT(1) NOT NULL DEFAULT 0');
        if (!in_array('reply_to', $have)) $pdo->exec('ALTER TABLE messages ADD reply_to BIGINT NULL');
        $_SESSION['chat_cols3'] = 1;
    }
    $_SESSION['chat_tables'] = 1;
}
function are_friends($a, $b)
{
    return (bool)q("SELECT 1 FROM friends WHERE status='accepted' AND ((user_id=? AND friend_id=?) OR (user_id=? AND friend_id=?))", [$a, $b, $b, $a])->fetch();
}
/* number of unread chat messages for a user id (0 if chat tables are not ready) */
function unread_count($uid)
{
    try {
        ensure_chat_tables();
        return (int)q('SELECT COUNT(*) c FROM messages WHERE to_id=? AND read_at IS NULL', [$uid])->fetch()['c'];
    } catch (Throwable $e) {
        return 0;
    }
}
function json_out($d, $code = 200)
{
    while (ob_get_level()) ob_end_clean();
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($d);
    exit;
}
