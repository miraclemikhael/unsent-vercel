<?php
/* Shared start for the chat + call endpoints (api/chat.php, api/call.php).
   Same session, same CSRF token and same login as the rest of Unsent. */
define('ROOT', dirname(__DIR__));
require ROOT . '/config/config.php';
require_once ROOT . '/config/database.php';
require ROOT . '/includes/functions.php';
require ROOT . '/includes/chat.php';
require ROOT . '/includes/push.php';
$email = $_SESSION['u'] ?? '';
$row = $email ? q('SELECT id,name,username,email,avatar,status FROM users WHERE email=?', [$email])->fetch() : null;
if (!$row || ($row['status'] ?? '') === 'suspended') json_out(['ok' => 0, 'err' => 'Sign in first.'], 401);
$uid = (int)$row['id'];
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !hash_equals((string)$_SESSION['csrf'], (string)($_SERVER['HTTP_X_CSRF'] ?? ''))) json_out(['ok' => 0, 'err' => 'Your session expired. Please refresh the page.'], 403);
ensure_chat_tables();
session_write_close(); /* polling must not block other pages */
