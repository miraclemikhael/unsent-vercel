<?php
defined('ROOT') || exit;
/**
 * @var mixed $p
 * @var mixed $d
 * @var mixed $err
 * @var mixed $a
 */
if ($a == 'login') {
    $lid = strtolower(trim($_POST['id'] ?? ''));
    $lpw = (string)($_POST['pw'] ?? '');
    if (($_SESSION['lock'] ?? 0) > time()) $err = 'Too many attempts. Please wait a minute and try again.';
    else foreach ($d['users'] as $i => $u) if ($lid !== '' && (strtolower($u['email']) == $lid || strtolower($u['username']) == $lid) && empty($u['hash'])) {
        $err = 'This account uses Google. Tap “Continue with Google”, or use Forgot password to set a password.';
        break;
    } elseif ($lid !== '' && (strtolower($u['email']) == $lid || strtolower($u['username']) == $lid) && password_verify($lpw, $u['hash'])) {
        if (($u['status'] ?? '') === 'suspended') {
            $err = 'This account is suspended. Please contact support.';
            break;
        }
        session_regenerate_id(true);
        unset($_SESSION['fails'], $_SESSION['lock']);
        $_SESSION['u'] = $u['email'];
        $d['users'][$i]['last_login'] = date('Y-m-d H:i:s');
        save_data($d);
        if (($u['role'] ?? '') === 'admin') {
            $_SESSION['flash'] = 'Signed in as admin';
            redirect_to_page('admin');
        }
        redirect_to_page('home');
    }
    if (!$err) {
        usleep(250000);
        $_SESSION['fails'] = ($_SESSION['fails'] ?? 0) + 1;
        if ($_SESSION['fails'] >= 6) {
            $_SESSION['lock'] = time() + 60;
            $_SESSION['fails'] = 0;
            $err = 'Too many attempts. Please wait a minute and try again.';
        }
    }
    $err = $err ?: 'Wrong details, try again.';
    $p = 'signin';
}
if ($a == 'register') {
    $name = mb_substr(trim($_POST['name'] ?? ''), 0, 60);
    $em = strtolower(trim($_POST['id'] ?? ''));
    $pw = $_POST['pw'] ?? '';
    $dup = false;
    foreach ($d['users'] as $u) if (strtolower($u['email']) == strtolower($em)) $dup = true;
    if (($d['settings']['signups'] ?? 1) == 0) {
        $err = 'New sign-ups are paused right now.';
        $p = 'signin';
    } elseif ($name === '' || !filter_var($em, FILTER_VALIDATE_EMAIL)) {
        $err = 'Please enter your name and a valid email.';
        $p = 'signin';
    } elseif (!password_ok($pw)) {
        $err = 'Use at least 8 characters with a letter and a number.';
        $p = 'signin';
    } elseif ($pw !== ($_POST['pw2'] ?? '')) {
        $err = 'Passwords don’t match.';
        $p = 'signin';
    } elseif ($dup) {
        $err = 'That email already has an account. Try signing in.';
        $p = 'signin';
    } else {
        $un = $base = strtolower(preg_replace('/\W/', '', $name)) ?: 'user';
        $n = 2;
        while (in_array($un, array_column($d['users'], 'username'))) $un = $base . $n++;
        $d['users'][] = ['name' => $name, 'username' => $un, 'email' => $em, 'phone' => '', 'private' => 1, 'hash' => password_hash($pw, PASSWORD_DEFAULT), 'joined' => date('Y-m-d'), 'last_login' => date('Y-m-d H:i:s'), 'pw_changed' => date('Y-m-d H:i:s')];
        save_data($d);
        session_regenerate_id(true);
        $_SESSION['u'] = $em;
        redirect_to_page('home');
    }
}
if ($a == 'google') { /* Continue with Google: JSON in, JSON out */
    header('Content-Type: application/json');
    require_once ROOT . '/includes/google.php';
    $g = google_verify((string)($_POST['credential'] ?? ''));
    if (!$g) {
        echo json_encode(['ok' => 0, 'err' => GOOGLE_CLIENT_ID === '' ? 'Google sign-in isn’t set up yet. Add GOOGLE_CLIENT_ID in config/secrets.php.' : 'Google sign-in failed. ' . ($GLOBALS['G_ERR'] ?? '')]);
        exit;
    }
    $gem = strtolower($g['email']);
    $gi = null;
    foreach ($d['users'] as $i => $u) if (strtolower($u['email']) === $gem) $gi = $i;
    if ($gi === null) {
        if (($d['settings']['signups'] ?? 1) == 0) {
            echo json_encode(['ok' => 0, 'err' => 'New sign-ups are paused right now.']);
            exit;
        }
        $gname = mb_substr(trim($g['name'] ?? '') ?: explode('@', $gem)[0], 0, 60);
        $un = $base = strtolower(preg_replace('/[^a-z0-9._-]/i', '', explode('@', $gem)[0])) ?: 'user';
        $n = 2;
        while (in_array($un, array_column($d['users'], 'username'))) $un = $base . $n++;
        $d['users'][] = ['name' => $gname, 'username' => $un, 'email' => $gem, 'phone' => '', 'private' => 1, 'joined' => date('Y-m-d'), 'last_login' => date('Y-m-d H:i:s')];
        $gi = array_key_last($d['users']);
    } elseif (($d['users'][$gi]['status'] ?? '') === 'suspended') {
        echo json_encode(['ok' => 0, 'err' => 'This account is suspended. Please contact support.']);
        exit;
    } else $d['users'][$gi]['last_login'] = date('Y-m-d H:i:s');
    save_data($d);
    session_regenerate_id(true);
    $_SESSION['u'] = $gem;
    $isadm = ($d['users'][$gi]['role'] ?? '') === 'admin';
    if ($isadm) $_SESSION['flash'] = 'Signed in as admin';
    echo json_encode(['ok' => 1, 'url' => 'index.php?p=' . ($isadm ? 'admin' : 'home')]);
    exit;
}
if ($a == 'send') { /* recovery: email me a 6-digit code (Gmail) */
    $p = 'recover';
    $rid = strtolower(trim($_POST['id'] ?? ''));
    if (!mail_ready()) $err = 'Password recovery by email isn’t set up yet. Please contact support.';
    elseif (!filter_var($rid, FILTER_VALIDATE_EMAIL)) $err = 'Enter a valid email address.';
    elseif (($_SESSION['rc']['sent'] ?? 0) > time() - 30) $err = 'Please wait a few seconds before asking for another code.';
    else {
        $hit = null;
        foreach ($d['users'] as $u) if (strtolower($u['email']) === $rid && ($u['role'] ?? '') !== 'admin') $hit = $u;
        $code = (string)random_int(100000, 999999);
        if ($hit && !mail_send($rid, 'Your Unsent code', "<p style='font:16px Georgia,serif'>Your Unsent code is <b style='font-size:24px;letter-spacing:3px'>$code</b>.<br>It expires in 10 minutes. If you didn’t ask for it, ignore this email.</p>")) error_log('Unsent mail: ' . mail_why());
        /* same answer whether or not the email has an account: nobody can probe who is registered */
        $_SESSION['rc'] = ['email' => $hit ? $hit['email'] : null, 'shown' => $rid, 'h' => password_hash($code, PASSWORD_DEFAULT), 'exp' => time() + 600, 'tries' => 0, 'sent' => time()];
        redirect_to_page('recover');
    }
}
if ($a == 'verify') {
    $p = 'recover';
    if (mail_ready()) {
        $rc = $_SESSION['rc'] ?? null;
        if (!$rc || $rc['exp'] < time()) {
            unset($_SESSION['rc']);
            $err = 'That code expired. Ask for a new one.';
        } elseif (++$_SESSION['rc']['tries'] > 5) {
            unset($_SESSION['rc']);
            $err = 'Too many wrong codes. Start again.';
        } elseif ($rc['email'] && password_verify(trim((string)($_POST['code'] ?? '')), $rc['h'])) {
            $_SESSION['rec'] = $rc['email'];
            unset($_SESSION['rc']);
            redirect_to_page('recover');
        } else $err = 'Wrong code. Try again.';
    } else {
        $rid = strtolower(trim($_POST['id'] ?? ''));
        $hit = null;
        foreach ($d['users'] as $u) if ($rid !== '' && (strtolower($u['email']) == $rid || strtolower($u['username']) == $rid)) $hit = $u;
        if (!DEMO) $err = 'Password recovery by email isn’t set up yet. Please contact support.';
        elseif (!$hit || ($hit['role'] ?? '') === 'admin') $err = 'We couldn’t find a member account with that email.';
        elseif (($_POST['code'] ?? '') === '72550') {
            $_SESSION['rec'] = $hit['email'];
            redirect_to_page('recover');
        } else $err = 'Wrong code. Demo code is 72550.';
    }
}
if ($a == 'resend') { /* start over from the email step */
    unset($_SESSION['rc']);
    redirect_to_page('recover');
}
if ($a == 'recover') {
    if (empty($_SESSION['rec'])) redirect_to_page('recover');
    if (!password_ok($_POST['pw'] ?? '')) {
        $err = 'Use at least 8 characters with a letter and a number.';
        $p = 'recover';
    } else {
        foreach ($d['users'] as $i => $u) if (strtolower($u['email']) == strtolower($_SESSION['rec'])) {
            $d['users'][$i]['hash'] = password_hash($_POST['pw'], PASSWORD_DEFAULT);
            $d['users'][$i]['pw_changed'] = date('Y-m-d H:i:s');
        }
        save_data($d);
        unset($_SESSION['rec']);
        $_SESSION['flash'] = 'Password updated. You can sign in now.';
        redirect_to_page('signin');
    }
}
