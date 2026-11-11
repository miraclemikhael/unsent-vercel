<?php
/* Unsent · config: switches, headers, session, CSRF token, output filter. */
defined('ROOT') || exit;
/* PUB = folder with the files the browser downloads directly (css, js, img). On Vercel that is public/ next to app/. */
defined('PUB') || define('PUB', dirname(ROOT) . '/public');
/* ---- switches ----
   DEMO: true keeps the demo recovery code (72550) - anyone can reset any password with it. Set false before going live. */
const DEMO = false;
const TZ = 'Asia/Jakarta'; /* mood days + "today" follow this zone */
date_default_timezone_set(TZ);
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: same-origin');
/* Vercel: every request may run on a fresh, read-only machine, so sessions live in MySQL (table app_sessions). */
require_once ROOT . '/config/database.php';
require_once ROOT . '/config/session.php';
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'secure' => $https]);
ini_set('session.use_strict_mode', '1');
ini_set('session.gc_maxlifetime', (string)SESSION_TTL);
session_set_save_handler(new DbSessionHandler(), true);
session_start();
$_SESSION['csrf'] ??= bin2hex(random_bytes(16));
$GLOBALS['CSRF'] = $_SESSION['csrf'];
/* every POST form gets the session token automatically */
function add_csrf_to_forms($h)
{
    $t = '<input type=hidden name=t value="' . ($GLOBALS['CSRF'] ?? '') . '">';
    return preg_replace('~<form\b[^>]*\bmethod=["\']?post\b[^>]*>~i', '$0' . $t, $h);
}
ob_start(fn($h) => add_csrf_to_forms(preg_replace_callback('~img/(\w+)\.png~', function ($m) {
    $f = is_file(PUB . "/img/{$m[1]}.svg") ? "img/{$m[1]}.svg" : $m[0];
    return $f . '?v=' . @filemtime(PUB . '/' . $f);
}, $h)));

/* ---- Google sign-in + Gmail + calls ----
   Easiest: copy config/secrets.example.php to config/secrets.php and fill it in there (secrets.php is git-ignored, so your password never goes to GitHub).
   Environment variables also work. Empty = that feature stays off.
   GOOGLE_CLIENT_ID: console.cloud.google.com > Credentials > OAuth client ID (Web).
     Add your site (e.g. http://localhost) under "Authorized JavaScript origins".
   GMAIL_USER + GMAIL_APP_PASSWORD: Google Account > Security > 2-Step Verification > App passwords.
     Used for the password-reset code and for emailing a letter.
   TURN_*: optional relay so calls work on mobile data (coturn, or a free tier at metered.ca). */
$SECRETS = is_file(ROOT . '/config/secrets.php') ? (array)(require ROOT . '/config/secrets.php') : [];
$sec = fn($k) => trim((string)(getenv($k) ?: ($SECRETS[$k] ?? '')));
define('GOOGLE_CLIENT_ID', $sec('GOOGLE_CLIENT_ID'));
define('GMAIL_USER', $sec('GMAIL_USER'));
define('GMAIL_APP_PASSWORD', $sec('GMAIL_APP_PASSWORD'));
define('TURN_URL', $sec('TURN_URL'));   /* e.g. turn:turn.example.com:3478 */
define('TURN_USER', $sec('TURN_USER'));
define('TURN_PASS', $sec('TURN_PASS'));
