<?php
/* API calls go through index.php (api=chat|call|push|react): this host blocks direct requests to the endpoint files (403). */
if (isset($_GET['api']) && in_array($_GET['api'], ['chat', 'call', 'push', 'react'], true)) { require __DIR__ . '/api/' . $_GET['api'] . '.php'; exit; }
/* Unsent · front controller. Every page is reached as index.php?p=<name>.
   Order: config -> helpers -> bootstrap (session, data, current user) -> POST actions -> guards -> page -> footer. */
define('ROOT', __DIR__);
require ROOT . '/config/config.php';
require_once ROOT . '/config/database.php';
require ROOT . '/includes/functions.php';
require ROOT . '/includes/icons.php';
require ROOT . '/includes/mail.php';
require ROOT . '/includes/chat.php';
require ROOT . '/includes/react.php';
require ROOT . '/includes/notify.php';
require ROOT . '/includes/header.php';
require ROOT . '/includes/sidebar.php';
require ROOT . '/includes/layout-page.php';
require ROOT . '/admin/functions.php';
require ROOT . '/includes/bootstrap.php';
require ROOT . '/includes/process.php';

if (!$me && !in_array($p, ['signin', 'recover'])) redirect_to_page('signin');
if ($p == 'admin' && !is_admin()) redirect_to_page('home');
$v = in_array($_GET['v'] ?? '', ['overview', 'users', 'activity', 'audit', 'settings']) ? $_GET['v'] : 'overview';
if ($p == 'admin' && isset($_GET['export'])) {
    [$ev] = count_daily_activity($d);
    $cs = fn($x) => preg_match('/^[=+\-@]/', (string)$x) ? "'" . $x : $x;
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="unsent-users-' . date('Y-m-d') . '.csv"');
    $o = fopen('php://output', 'w');
    fputcsv($o, ['Name', 'Username', 'Email', 'Role', 'Status', 'Joined', 'Last active']);
    foreach ($d['users'] as $u) fputcsv($o, [$cs($u['name']), $cs($u['username']), $cs($u['email']), $u['role'] ?? 'member', $u['status'] ?? 'active', joined_date($u, $ev), last_active_date($u, $ev)]);
    exit;
}
$L = $me ? array_values(array_filter($d['letters'], fn($l) => is_owner($l, $me['email']))) : [];
usort($L, fn($a, $b) => strtotime($b['date']) <=> strtotime($a['date']));


/* ?p= name => page file */
$ROUTES = [
    'signin'  => isset($_GET['new']) ? 'register.php' : 'login.php',
    'recover' => 'forgot-password.php',
    'home'    => 'user/home.php',
    'write'   => 'user/write.php',
    'editor'  => 'user/write.php',
    'unsent'  => 'user/unsent.php',
    'friends' => 'user/friends.php',
    'chat'    => 'user/chat.php',
    'profile' => 'user/profile.php',
    'mood'    => 'user/mood.php',
    'space'   => 'user/space.php',
    'admin'   => 'admin/dashboard.php',
];
require ROOT . '/' . ($ROUTES[$p] ?? '404.php');
require ROOT . '/includes/footer.php';
