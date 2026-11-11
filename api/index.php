<?php
/* Unsent on Vercel: router.
   Vercel serves real files from public/ (css, js, img, sw.js ...) by itself.
   Everything else lands here, and only the pages listed below are allowed through. */
$path = rawurldecode((string)parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));
$app = dirname(__DIR__) . '/app';

$pages = [
    '/'              => 'index.php',
    '/index.php'     => 'index.php',
    '/chat-api.php'  => 'chat-api.php',
    '/call-api.php'  => 'call-api.php',
    '/push-api.php'  => 'push-api.php',
    '/react-api.php' => 'react-api.php',
];
if (isset($pages[$path])) {
    chdir($app);
    require $app . '/' . $pages[$path];
    return;
}
/* uploaded pictures + voice notes are stored in MySQL */
if (preg_match('~^/uploads/([\w.\-]+)$~', $path, $m)) {
    $_GET['f'] = $m[1];
    require $app . '/serve_upload.php';
    return;
}
/* read-only database report; it answers only with the right DIAG_KEY (otherwise 404, inside the file) */
if ($path === '/db-check.php') {
    require $app . '/db-check.php';
    return;
}
http_response_code(404);
header('Content-Type: text/html; charset=utf-8');
echo '<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Not found · Unsent</title>'
    . '<body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#fcf7f4;color:#2a2a2a">'
    . '<div style="text-align:center"><h1 style="font-weight:600">Page not found</h1><p>That page isn’t here.</p><a href="/index.php?p=home">Back home</a></div>';
