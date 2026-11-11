<?php
defined('ROOT') || exit;

/* ---- MySQL settings: on Vercel set these as Environment Variables (Project > Settings > Environment Variables) ----
   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS   and   DB_SSL=1 if your MySQL host needs a secure (TLS) connection.
   Locally (Laragon) the defaults below work: root, no password, database "unsent".
   DB_DEBUG=1 shows the exact MySQL error on the page (for debugging a failed deploy; leave unset on a real site).
   DIAG_KEY=<secret> turns on /db-check.php, a read-only connection report (see DEPLOY.md). */
function env_str(string $name, string $default = ''): string
{
    $v = getenv($name);
    if ($v === false || trim($v) === '') return $default;
    /* values pasted into the Vercel dashboard often carry a line break or quotes */
    return trim($v, " \t\r\n\"'");
}
/* DB_HOST may be given as "host" or "host:port" (some hosts print it that way) */
$dbHost = env_str('DB_HOST', '127.0.0.1');
$dbPort = env_str('DB_PORT', '3306');
if ($dbHost[0] !== '[' && preg_match('~^(.+):(\d+)$~', $dbHost, $m)) { $dbHost = $m[1]; $dbPort = $m[2]; }
define('DB_HOST', $dbHost);
define('DB_PORT', $dbPort);
define('DB_NAME', env_str('DB_NAME', 'unsent'));
define('DB_USER', env_str('DB_USER', 'root'));
define('DB_PASS', env_str('DB_PASS', ''));
define('DB_SSL', in_array(strtolower(env_str('DB_SSL')), ['1', 'true', 'yes', 'on'], true));
define('DB_DEBUG', in_array(strtolower(env_str('DB_DEBUG')), ['1', 'true', 'yes', 'on'], true));

/* The site keeps all its data in one PHP array $d:
     $d['users']   = list of users   (each user has a 'moods' list inside)
     $d['letters'] = list of letters
     $d['audit']   = admin audit log
   These two lists say: "array key on the site" => "column in the MySQL table".
   Any key not listed here is saved in the 'extra' column, so nothing is lost. */
const USER_FIELDS = [
    'name' => 'name', 'username' => 'username', 'email' => 'email', 'phone' => 'phone',
    'private' => 'is_private', 'hash' => 'password_hash', 'role' => 'role', 'status' => 'status',
    'joined' => 'joined', 'last_active' => 'last_active', 'avatar' => 'avatar',
    'a_theme' => 'theme', 'a_calm' => 'calm_mode',
    'n_remind' => 'remind_on', 'n_streak' => 'streak_on', 'n_tips' => 'tips_on', 'n_time' => 'remind_time',
    'last_login' => 'last_login_at', 'last_logout' => 'last_logout_at', 'pw_changed' => 'password_changed_at',
];
const LETTER_FIELDS = [
    'id' => 'id', 'owner' => 'owner_email', 'kind' => 'kind', 'to' => 'recipient', 'rel' => 'relationship',
    'title' => 'title', 'body' => 'body', 'paper' => 'paper', 'date' => 'written_on', 'front' => 'front_image',
    'at' => 'written_at', 'pfont' => 'postcard_font', 'pcolor' => 'postcard_color', 'efont' => 'envelope_font', 'esize' => 'envelope_size',
];
const AUDIT_FIELDS = ['t' => 'at_time', 'by' => 'admin_name', 'a' => 'action', 'on' => 'target'];

/* The one thing people need when a deploy cannot reach MySQL: which part is wrong. */
function db_error_hint(PDOException $e): string
{
    $code = (int)($e->errorInfo[1] ?? 0);
    $msg = strtolower($e->getMessage());
    if ($code === 1045 || str_contains($msg, 'access denied')) return 'MySQL refused the username or password (DB_USER / DB_PASS). Copy them exactly from the database panel of your host.';
    if ($code === 1044) return 'That user may not open DB_NAME. On shared hosting the name is usually prefixed, like if0_12345678_unsent.';
    if ($code === 1049 || str_contains($msg, 'unknown database')) return 'DB_NAME does not exist on that server. Use the exact name shown in the database panel (often prefixed).';
    if ($code === 1130 || str_contains($msg, 'not allowed to connect')) return 'The server only accepts connections from a fixed list of IP addresses. Vercel functions change IP on every request, so allow all IPs (0.0.0.0/0) or use a host with a public endpoint.';
    if ($code === 2026 || preg_match('~\bssl\b|\btls\b|certificate~', $msg)) return 'TLS failed. DB_SSL=1 is set, but this server may not offer a secure connection (or it listens on a different port).';
    if (in_array($code, [2002, 2003], true) || str_contains($msg, 'connection refused') || str_contains($msg, 'timed out')) return 'Nothing is listening on DB_HOST:DB_PORT. Either the host name is wrong, or the database only accepts connections from its own web server. Free hosting like InfinityFree / ByetHost works that way, so it can never be reached from Vercel.';
    if ($code === 2005 || str_contains($msg, 'unknown mysql server host') || str_contains($msg, 'getaddrinfo')) return 'DB_HOST cannot be found in DNS. Use the MySQL hostname from your database panel, not the FTP or website hostname.';
    if ($code === 2006) return 'The server closed the connection during the login handshake. Usually TLS: try DB_SSL=1, or remove DB_SSL if your host does not support TLS.';
    return 'The database server answered, but not with a usable connection. Check every value.';
}

/* one readable page instead of a blank error, then stop. */
function db_fail(PDOException $e): never
{
    error_log('MySQL connect failed: ' . $e->getMessage());
    $state = (string)($e->errorInfo[0] ?? '');
    $code = (int)($e->errorInfo[1] ?? 0);
    $e2 = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
    http_response_code(500);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    $detail = DB_DEBUG ? '<pre style="white-space:pre-wrap;background:#f6efec;padding:12px;border-radius:8px;font-size:12px;overflow:auto">' . $e2($e->getMessage()) . '</pre>' : '';
    echo '<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Database offline · Unsent</title>'
        . '<body style="font-family:system-ui,-apple-system,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#fcf7f4;color:#2a2a2a;padding:24px">'
        . '<div style="max-width:640px;line-height:1.55">'
        . '<h1 style="font-weight:600;font-size:22px;margin:0 0 12px">Cannot connect to the database</h1>'
        . '<p style="margin:0 0 14px">' . $e2(db_error_hint($e)) . '</p>'
        . '<p style="margin:0 0 6px;font-size:14px;color:#6b625e">This deploy tried to reach</p>'
        . '<pre style="white-space:pre-wrap;background:#fff;border:1px solid #eaddd7;padding:10px 12px;border-radius:8px;font-size:13px;margin:0 0 14px">' . $e2(DB_USER . '@' . DB_HOST . ':' . DB_PORT . ' / ' . DB_NAME . '   (TLS: ' . (DB_SSL ? 'on' : 'off') . ')') . '</pre>'
        . ($state || $code ? '<p style="margin:0 0 14px;font-size:13px;color:#6b625e">Error code: ' . $e2(trim($state . ' [' . $code . ']')) . '</p>' : '')
        . $detail
        . '<p style="margin:0;font-size:13px;color:#6b625e">Environment variables on Vercel: Project → Settings → Environment Variables, then <b>Redeploy</b> (old deployments keep the old values). The full MySQL message is in the function logs. Set DB_DEBUG=1 to show it here instead.</p>'
        . '</div>';
    exit;
}

/* the PDO options, built once so tools/db-setup.php tests exactly the same connection */
function db_options(): array
{
    /* PHP 8.4+ moved the MySQL option names to Pdo\Mysql; older PHP still uses PDO::MYSQL_ATTR_* */
    $my = fn($n) => defined("Pdo\\Mysql::ATTR_$n") ? constant("Pdo\\Mysql::ATTR_$n") : constant("PDO::MYSQL_ATTR_$n");
    $opts = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false, /* numbers come back as numbers */
        PDO::ATTR_TIMEOUT => 10,
        $my('INIT_COMMAND') => "SET time_zone = '" . date('P') . "'", /* same clock as the site (config.php TZ) */
    ];
    if (DB_SSL) {
        /* a CA bundle is also what switches TLS on, so look for one in the usual places
           (Amazon Linux / Debian / macOS) or wherever DB_SSL_CA / php.ini points */
        $ca = env_str('DB_SSL_CA');
        foreach (['/etc/pki/tls/certs/ca-bundle.crt', '/etc/ssl/certs/ca-certificates.crt', '/etc/ssl/cert.pem', (string)ini_get('openssl.cafile'), (string)ini_get('curl.cainfo')] as $f) {
            if ($ca === '' && $f !== '' && is_file($f)) { $ca = $f; break; }
        }
        if ($ca !== '') $opts[$my('SSL_CA')] = $ca;
        else $opts[$my('SSL_VERIFY_SERVER_CERT')] = false; /* encrypt, but without a CA we cannot check who we talk to */
    }
    return $opts;
}

function db_dsn(string $database = DB_NAME): string
{
    return 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ($database === '' ? '' : ';dbname=' . $database) . ';charset=utf8mb4';
}

/* open the MySQL connection (only once per page) */
function db_connect()
{
    static $pdo = null;
    if ($pdo === null) {
        try {
            $pdo = new PDO(db_dsn(), DB_USER, DB_PASS, db_options());
        } catch (PDOException $e) {
            if (defined('DB_RAW_ERRORS')) throw $e; /* /db-check.php wants the message instead of the error page */
            db_fail($e);
        }
    }
    return $pdo;
}

/* turn one MySQL row into a site array (empty columns are left out) */
function row_to_array($row, $fields)
{
    $item = [];
    foreach ($fields as $key => $column) {
        if ($row[$column] !== null) $item[$key] = $row[$column];
    }
    if (!empty($row['extra'])) $item += json_decode($row['extra'], true) ?: [];
    return $item;
}

/* turn one site array into a MySQL row */
function array_to_row($item, $fields)
{
    $row = [];
    foreach ($fields as $key => $column) {
        $row[$column] = $item[$key] ?? null;
        unset($item[$key]);
    }
    unset($item['_id'], $item['moods']);
    $row['extra'] = $item ? json_encode($item, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null;
    return $row;
}

/* insert a row, or update it when it already exists.
   MySQL only touches updated_at when a value really changed. */
function put_row($table, $row)
{
    $columns = array_keys($row);
    $names = '`' . implode('`,`', $columns) . '`';
    $marks = implode(',', array_fill(0, count($row), '?'));
    $changes = implode(',', array_map(fn($c) => "`$c` = VALUES(`$c`)", $columns));
    db_connect()->prepare("INSERT INTO `$table` ($names) VALUES ($marks) ON DUPLICATE KEY UPDATE $changes")->execute(array_values($row));
}

/* delete every row of $table whose id is not in $keep.
   $label (a piece of SQL) makes a short note in deleted_log first: what was deleted and when. */
function delete_others($table, $keep, $label = null)
{
    $pdo = db_connect();
    $where = $keep ? ' WHERE `id` NOT IN (' . implode(',', array_fill(0, count($keep), '?')) . ')' : '';
    if ($label) {
        $pdo->prepare("INSERT INTO `deleted_log` (`table_name`, `row_id`, `label`) SELECT '$table', `id`, $label FROM `$table`$where")->execute(array_values($keep));
    }
    $pdo->prepare("DELETE FROM `$table`$where")->execute(array_values($keep));
}

/* read everything from MySQL into the $d array */
function load_data()
{
    $pdo = db_connect();
    $d = ['users' => [], 'letters' => []];
    $position = []; /* user id => place in $d['users'] */
    foreach ($pdo->query('SELECT * FROM users ORDER BY pos, id') as $row) {
        $user = row_to_array($row, USER_FIELDS);
        $user['_id'] = (int)$row['id'];
        $d['users'][] = $user;
        $position[$row['id']] = array_key_last($d['users']);
    }
    foreach ($pdo->query('SELECT * FROM moods ORDER BY id') as $row) {
        if (!isset($position[$row['user_id']])) continue;
        $mood = ['m' => $row['mood'], 'g' => $row['note'], 'at' => $row['logged_at']];
        $d['users'][$position[$row['user_id']]]['moods'][$row['day']] = array_filter($mood, fn($v) => $v !== null);
    }
    foreach ($pdo->query('SELECT * FROM letters ORDER BY pos, id') as $row) {
        $d['letters'][] = row_to_array($row, LETTER_FIELDS);
    }
    $audit = [];
    foreach ($pdo->query('SELECT * FROM audit_log ORDER BY pos, id') as $row) {
        $entry = row_to_array($row, AUDIT_FIELDS);
        $entry['_id'] = (int)$row['id'];
        $audit[] = $entry;
    }
    if ($audit) $d['audit'] = $audit;
    foreach ($pdo->query('SELECT * FROM settings') as $row) {
        $d[$row['name']] = json_decode($row['value'], true);
    }
    return $d;
}

/* write the $d array back into MySQL (all or nothing) */
function save_data(&$d)
{
    $pdo = db_connect();
    $pdo->beginTransaction();
    try {
        /* users + their moods */
        $keepUsers = [];
        foreach (array_keys($d['users']) as $i) {
            $row = array_to_row($d['users'][$i], USER_FIELDS);
            $row = ['id' => $d['users'][$i]['_id'] ?? null, 'pos' => count($keepUsers)] + $row;
            put_row('users', $row);
            $id = $row['id'] ?? (int)$pdo->lastInsertId();
            $d['users'][$i]['_id'] = $id;
            $keepUsers[] = $id;
            $days = [];
            foreach (($d['users'][$i]['moods'] ?? []) as $day => $mood) {
                put_row('moods', ['user_id' => $id, 'day' => (string)$day, 'mood' => $mood['m'] ?? null, 'note' => $mood['g'] ?? null, 'logged_at' => $mood['at'] ?? null]);
                $days[] = (string)$day;
            }
            $marks = implode(',', array_fill(0, count($days), '?'));
            $pdo->prepare('DELETE FROM moods WHERE user_id = ?' . ($days ? " AND day NOT IN ($marks)" : ''))->execute(array_merge([$id], $days));
        }
        delete_others('users', $keepUsers, "CONCAT(IFNULL(`username`, ''), ' <', IFNULL(`email`, ''), '>')");
        $pdo->exec('DELETE FROM moods WHERE user_id NOT IN (SELECT id FROM users)');

        /* letters */
        $keepLetters = [];
        foreach (array_values($d['letters']) as $pos => $letter) {
            $row = ['pos' => $pos] + array_to_row($letter, LETTER_FIELDS);
            put_row('letters', $row);
            $keepLetters[] = $row['id'];
        }
        delete_others('letters', $keepLetters, "CONCAT(IFNULL(`title`, ''), ' (', IFNULL(`owner_email`, ''), ')')");

        /* audit log */
        $keepAudit = [];
        foreach (array_keys($d['audit'] ?? []) as $i) {
            $row = ['id' => $d['audit'][$i]['_id'] ?? null, 'pos' => count($keepAudit)] + array_to_row($d['audit'][$i], AUDIT_FIELDS);
            put_row('audit_log', $row);
            $id = $row['id'] ?? (int)$pdo->lastInsertId();
            $d['audit'][$i]['_id'] = $id;
            $keepAudit[] = $id;
        }
        delete_others('audit_log', $keepAudit);

        /* any other top-level value (like 'wiped2') */
        foreach ($d as $name => $value) {
            if (in_array($name, ['users', 'letters', 'audit'], true)) continue;
            put_row('settings', ['name' => $name, 'value' => json_encode($value)]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        error_log('save_data failed: ' . $e->getMessage());
        http_response_code(500);
        exit('Could not save to the database.');
    }
}
