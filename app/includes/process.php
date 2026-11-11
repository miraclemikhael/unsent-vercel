<?php
defined('ROOT') || exit;
/**
 * @var mixed $me
 * @var mixed $a
 */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $a = $_POST['a'] ?? '';
    if (!hash_equals($_SESSION['csrf'], (string)($_POST['t'] ?? ''))) {
        if (isset($_POST['ajax']) || in_array($a, ['theme', 'pcup', 'avup', 'avrm', 'email', 'google', 'space', 'bnup', 'bnrm'])) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['ok' => 0, 'err' => 'Your session expired. Please refresh the page.']);
            exit;
        }
        $_SESSION['flash'] = 'Your session expired. Please try again.';
        $_SESSION['flash_t'] = 'error';
        redirect_to_page($me ? 'home' : 'signin');
    }
    require ROOT . '/process_login.php';   /* login, register, verify, recover */
    require ROOT . '/logout.php';
    if ($me) {
        require ROOT . '/user/process_user.php';    /* theme, mood, avatar, profile, delete account */
        require ROOT . '/user/process_letter.php';  /* start, save, delete, postcard upload */
        require ROOT . '/admin/process_admin.php';  /* adm_* actions */
    }
}
