<?php
defined('ROOT') || exit;

/* ---- MySQL settings: on Vercel set these as Environment Variables (Project > Settings > Environment Variables) ----
   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS   and   DB_SSL=1 if your MySQL host needs a secure (TLS) connection.
   Locally (Laragon) the defaults below work: root, no password, database "unsent". */
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'unsent');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_SSL', in_array(strtolower((string)getenv('DB_SSL')), ['1', 'true', 'yes', 'on'], true));

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

/* open the MySQL connection (only once per page) */
function db_connect()
{
    static $pdo = null;
    if ($pdo === null) {
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
            $ca = null;
            foreach (['/etc/pki/tls/certs/ca-bundle.crt', '/etc/ssl/certs/ca-certificates.crt'] as $f) if (is_file($f)) { $ca = $f; break; }
            if ($ca) $opts[$my('SSL_CA')] = $ca;
            else $opts[$my('SSL_VERIFY_SERVER_CERT')] = false;
        }
        try {
            $pdo = new PDO('mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, $opts);
        } catch (PDOException $e) {
            error_log('MySQL connect failed: ' . $e->getMessage());
            http_response_code(500);
            exit('Cannot connect to the database. Check the DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASS (and DB_SSL) environment variables.');
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
