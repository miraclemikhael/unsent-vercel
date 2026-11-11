<?php
/* /db-check.php?key=<DIAG_KEY>
   A read-only report of what this deployment actually sees, because Vercel gives you no shell.
   It stays invisible (404) unless DIAG_KEY is set as an Environment Variable in Vercel.
   Remove DIAG_KEY again once the site works. */
define('ROOT', __DIR__);
$key = (string)(getenv('DIAG_KEY') ?: '');
if ($key === '' || !hash_equals($key, (string)($_GET['key'] ?? ''))) {
    http_response_code(404);
    exit('Not found');
}
define('DB_RAW_ERRORS', true);
require_once ROOT . '/config/database.php';
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store');

$yes = fn($b) => $b ? 'yes' : 'no';
echo "Unsent · database check\n\n";
echo 'PHP ' . PHP_VERSION . "   pdo_mysql: " . $yes(extension_loaded('pdo_mysql')) . "   openssl: " . $yes(extension_loaded('openssl')) . "\n\n";

echo "Values this request sees\n";
echo '  DB_HOST  ' . DB_HOST . "\n";
echo '  DB_PORT  ' . DB_PORT . "\n";
echo '  DB_NAME  ' . DB_NAME . "\n";
echo '  DB_USER  ' . DB_USER . "\n";
echo '  DB_PASS  ' . (DB_PASS === '' ? "(empty)" : '(' . strlen(DB_PASS) . ' characters)') . "\n";
echo '  DB_SSL   ' . $yes(DB_SSL) . "\n";
foreach (['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASS'] as $v) {
    if (trim((string)getenv($v)) === '') echo "  !! $v is NOT set, so the default is used\n";
}
echo "\n";

$ips = @gethostbynamel(DB_HOST) ?: [];
echo 'DNS  ' . DB_HOST . ': ' . ($ips ? implode(', ', $ips) : 'CANNOT RESOLVE') . "\n";

$t0 = microtime(true);
$fp = @fsockopen(DB_HOST, (int)DB_PORT, $no, $text, 5);
echo 'TCP  ' . DB_HOST . ':' . DB_PORT . ': ' . ($fp ? 'open' : 'FAILED (' . $text . ' ' . $no . ')')
    . ' in ' . round((microtime(true) - $t0) * 1000) . " ms\n\n";
if ($fp) fclose($fp);

try {
    $pdo = db_connect();
} catch (Throwable $e) {
    echo "MySQL login: FAILED\n\n" . $e->getMessage() . "\n\n";
    echo "What that means: " . db_error_hint($e instanceof PDOException ? $e : new PDOException($e->getMessage())) . "\n";
    exit;
}

echo "MySQL login: OK\n\n";
echo 'Server    ' . $pdo->query('SELECT VERSION()')->fetchColumn() . "\n";
echo 'Database  ' . $pdo->query('SELECT DATABASE()')->fetchColumn() . "\n";
$tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
echo 'Tables    ' . ($tables ? implode(', ', $tables) : '(none)') . "\n";
$need = ['users', 'moods', 'letters', 'audit_log', 'settings', 'app_sessions', 'files', 'app_kv', 'friends', 'messages', 'call_signals'];
$missing = array_values(array_diff($need, $tables));
echo $missing ? 'Missing   ' . implode(', ', $missing) . "  ->  run app/config/schema.sql\n" : "All expected tables exist.\n";
if (in_array('users', $tables, true)) {
    echo 'Users     ' . $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn() . "\n";
}
