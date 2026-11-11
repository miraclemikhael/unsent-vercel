<?php
/* Sends one stored upload (picture or voice note) from the MySQL table `files`.
   Handles "Range" requests, because Safari will not play audio without them. */
define('ROOT', __DIR__);
require_once ROOT . '/config/database.php';
$name = (string)($_GET['f'] ?? '');
/* One retry: the first query against a cold database can fail. A missing row stays a 404,
   but a database problem must say 503 instead of pretending the picture does not exist. */
$row = false;
for ($try = 0; $try < 2; $try++) {
    try {
        $st = db_connect()->prepare('SELECT mime, data FROM files WHERE name = ?');
        $st->execute([$name]);
        $row = $st->fetch();
        break;
    } catch (Throwable $e) {
        error_log('serve_upload failed: ' . $e->getMessage());
        if ($try === 1) {
            http_response_code(503);
            header('Retry-After: 2');
            header('Content-Type: text/plain; charset=utf-8');
            exit('The file could not be loaded. Please try again.');
        }
    }
}
if (!$row) {
    http_response_code(404);
    exit('Not found');
}
$data = $row['data'];
$len = strlen($data);
header('Content-Type: ' . $row['mime']);
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, max-age=86400');
header('Accept-Ranges: bytes');
if (preg_match('/^bytes=(\d*)-(\d*)$/', $_SERVER['HTTP_RANGE'] ?? '', $m) && ($m[1] !== '' || $m[2] !== '')) {
    if ($m[1] === '') { /* "last N bytes" */
        $from = max(0, $len - (int)$m[2]);
        $to = $len - 1;
    } else {
        $from = (int)$m[1];
        $to = $m[2] === '' ? $len - 1 : min((int)$m[2], $len - 1);
    }
    if ($from > $to || $from >= $len) {
        http_response_code(416);
        header("Content-Range: bytes */$len");
        exit;
    }
    http_response_code(206);
    header("Content-Range: bytes $from-$to/$len");
    header('Content-Length: ' . ($to - $from + 1));
    echo substr($data, $from, $to - $from + 1);
    exit;
}
header('Content-Length: ' . $len);
echo $data;
