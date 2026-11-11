<?php
/* tools/db-setup.php
   Tests the MySQL settings from .env exactly the way the website uses them, then creates
   every table the site needs. Run this on your own computer before you deploy:

       php tools/db-setup.php

   It is safe to run again: the tables are only created when they are missing. */

/* .env has to be read first, because database.php turns the values into constants as soon as it loads. */
$envFile = dirname(__DIR__) . '/.env';
$fromEnvFile = [];
if (is_file($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) continue;
        [$k, $v] = explode('=', $line, 2);
        $k = trim($k);
        $v = trim(trim($v), "\"'");
        if (getenv($k) === false || getenv($k) === '') { putenv("$k=$v"); $fromEnvFile[] = $k; }
    }
}

define('ROOT', dirname(__DIR__) . '/app');
define('DB_RAW_ERRORS', true); /* we want the message, not the HTML error page */
require ROOT . '/config/database.php';

echo "Unsent · database setup\n\n";
echo '  host      ' . DB_HOST . ':' . DB_PORT . "\n";
echo '  database  ' . DB_NAME . "\n";
echo '  user      ' . DB_USER . "\n";
echo '  password  ' . (DB_PASS === '' ? "(empty)" : '(' . strlen(DB_PASS) . ' characters)') . "\n";
echo '  TLS       ' . (DB_SSL ? 'on' : 'off') . "\n";
echo '  source    ' . ($fromEnvFile ? '.env (' . implode(', ', $fromEnvFile) . ')' : 'environment') . "\n\n";

try {
    try {
        $pdo = new PDO(db_dsn(), DB_USER, DB_PASS, db_options());
    } catch (PDOException $e) {
        if ((int)($e->errorInfo[1] ?? 0) !== 1049) throw $e;
        /* the database itself does not exist yet: create it, then go in */
        echo "Database '" . DB_NAME . "' does not exist yet - creating it.\n";
        $server = new PDO(db_dsn(''), DB_USER, DB_PASS, db_options());
        $server->exec('CREATE DATABASE IF NOT EXISTS `' . str_replace('`', '', DB_NAME) . '` CHARACTER SET utf8mb4');
        $pdo = new PDO(db_dsn(), DB_USER, DB_PASS, db_options());
    }
} catch (PDOException $e) {
    echo "Connection FAILED\n\n" . $e->getMessage() . "\n\n";
    echo db_error_hint($e) . "\n";
    exit(1);
}

echo 'Connected: ' . $pdo->query('SELECT VERSION()')->fetchColumn() . "\n";
$charset = (string)$pdo->query('SELECT @@character_set_database')->fetchColumn();
if (strtolower($charset) !== 'utf8mb4') {
    echo "!! The database charset is '$charset'. Change it to utf8mb4, otherwise emoji and accents can break.\n";
}

/* run schema.sql statement by statement, so one failure does not stop the rest */
$sql = preg_replace('~^\s*--.*$~m', '', (string)file_get_contents(ROOT . '/config/schema.sql'));
$done = 0;
$failed = [];
foreach (explode(';', $sql) as $stmt) {
    $stmt = trim($stmt);
    if ($stmt === '') continue;
    try {
        $pdo->exec($stmt);
        $done++;
    } catch (PDOException $e) {
        $failed[] = [preg_replace('~\s+~', ' ', substr($stmt, 0, 60)), $e->getMessage()];
    }
}
echo 'schema.sql: ' . $done . ' statement(s) ok' . ($failed ? ', ' . count($failed) . ' failed' : '') . "\n\n";

foreach ($failed as [$snippet, $message]) {
    echo "!! $snippet ...\n   $message\n";
}

/* what the site really needs, plus the rest it creates on demand */
$tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
$need = ['users', 'moods', 'letters', 'audit_log', 'settings', 'deleted_log', 'app_sessions', 'files', 'app_kv'];
$missing = array_values(array_diff($need, $tables));
echo 'Tables: ' . ($tables ? implode(', ', $tables) : '(none)') . "\n";
echo $missing ? 'MISSING: ' . implode(', ', $missing) . "\n" : "All required tables are there.\n";
if (in_array('users', $tables, true)) echo 'Users in database: ' . $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn() . "\n";

if ($missing || $failed) {
    echo "\nFix the errors above, then run this command again.\n";
    exit(1);
}
echo "\nNext: put the same six values (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS, DB_SSL)\n"
    . "into Vercel > Settings > Environment Variables, then redeploy.\n";
