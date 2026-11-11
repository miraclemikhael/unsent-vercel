<?php
defined('ROOT') || exit;
/**
 * @var mixed $d
 * @var mixed $me
 * @var mixed $mi
 * @var mixed $a
 */
if ($a == 'theme') {
    if (in_array($_POST['v'] ?? '', ['light', 'dark'])) {
        $d['users'][$mi]['a_theme'] = $_POST['v'];
        save_data($d);
    }
    exit;
}
if ($a == 'mood' || $a == 'moodrm') {
    /* one check-in per day, kept forever. */
    /* only today can be logged: a day that has passed is locked, and nothing can be removed */
    $day = date('Y-m-d');
    if ($a == 'moodrm') redirect_to_page(($_POST['back'] ?? '') === 'mood' ? 'mood&m=' . substr($day, 0, 7) : 'home');
    $ms = $d['users'][$mi]['moods'] ?? [];
    $m = $_POST['m'] ?? '';
    if ($a == 'moodrm') {
        unset($ms[$day]);
        $d['users'][$mi]['moods'] = $ms;
        save_data($d);
    } elseif (in_array($m, ['Heavy', 'Low', 'Okay', 'Good', 'Bright'])) {
        $g = mb_substr(trim(strip_tags($_POST['g'] ?? '')), 0, 80);
        $at = $day == date('Y-m-d') ? ['at' => date('Y-m-d H:i:s')] : (isset($ms[$day]['at']) ? ['at' => $ms[$day]['at']] : []);
        $ms[$day] = ['m' => $m, 'g' => $g] + $at;
        krsort($ms);
        $d['users'][$mi]['moods'] = $ms; /* no limit: whole history stays */
        save_data($d);
    }
    if (($_POST['back'] ?? '') === 'mood') redirect_to_page('mood&m=' . substr($day, 0, 7));
    redirect_to_page('home');
}
/* "Me" page: look (color + vibe + bio), account public/private, one letter public/private. Answers JSON. */
if ($a == 'space') {
    header('Content-Type: application/json');
    $f = $_POST['f'] ?? '';
    if ($f == 'look') {
        $ac = (string)($_POST['accent'] ?? '');
        $d['users'][$mi]['s_accent'] = preg_match('/^#[0-9a-fA-F]{6}$/', $ac) ? $ac : '#ffec85';
        $d['users'][$mi]['s_vibe'] = in_array($_POST['vibe'] ?? '', array_keys(SPACE_VIBES)) ? $_POST['vibe'] : 'cozy';
        $d['users'][$mi]['s_bio'] = mb_substr(trim(strip_tags($_POST['bio'] ?? '')), 0, 140);
    } elseif ($f == 'acct') {
        $d['users'][$mi]['s_public'] = !empty($_POST['v']) ? 1 : 0;
    } elseif ($f == 'pub') {
        foreach ($d['letters'] as $j => $l) if (($l['id'] ?? '') === ($_POST['id'] ?? '') && is_owner($l, $me['email'])) $d['letters'][$j]['pub'] = !empty($_POST['v']) ? 1 : 0;
    } else {
        echo json_encode(['ok' => 0]);
        exit;
    }
    save_data($d);
    echo json_encode(['ok' => 1]);
    exit;
}
/* Profile photo (avup) and Me-page banner (bnup). "pic" = the cropped picture people see.
   "orig" (optional) = the full picture, kept so the crop can be moved and resized again later. */
if ($a == 'avup' || $a == 'bnup') {
    header('Content-Type: application/json');
    $k = $a == 'avup' ? 'avatar' : 'banner';
    $n = take_upload($_FILES['pic'] ?? null, 8 * 1048576);
    if (!$n) {
        echo json_encode(['ok' => 0, 'err' => 'Please choose a PNG, JPG or WebP under 8 MB.']);
        exit;
    }
    $o = !empty($_FILES['orig']) ? take_upload($_FILES['orig'], 12 * 1048576) : '';
    delete_upload($d['users'][$mi][$k] ?? '');
    $d['users'][$mi][$k] = $n;
    if ($o) {
        delete_upload($d['users'][$mi][$k . '_src'] ?? '');
        $d['users'][$mi][$k . '_src'] = $o;
    }
    save_data($d);
    echo json_encode(['ok' => 1, 'src' => $n, 'orig' => upload_path($d['users'][$mi][$k . '_src'] ?? '') ?: $n]);
    exit;
}
if ($a == 'bnrm') {
    header('Content-Type: application/json');
    delete_upload($d['users'][$mi]['banner'] ?? '');
    delete_upload($d['users'][$mi]['banner_src'] ?? '');
    unset($d['users'][$mi]['banner'], $d['users'][$mi]['banner_src']);
    save_data($d);
    echo json_encode(['ok' => 1]);
    exit;
}
if ($a == 'avrm') {
    header('Content-Type: application/json');
    delete_upload($d['users'][$mi]['avatar'] ?? '');
    delete_upload($d['users'][$mi]['avatar_src'] ?? '');
    unset($d['users'][$mi]['avatar'], $d['users'][$mi]['avatar_src']);
    save_data($d);
    echo json_encode(['ok' => 1]);
    exit;
}
if ($a == 'profile') {
    $old = $me['email'];
    $bad = '';
    $new = strtolower(trim($_POST['email'] ?? ''));
    if (!filter_var($new, FILTER_VALIDATE_EMAIL)) {
        $new = $old;
        $bad = 'That email address isn’t valid.';
    }
    foreach ($d['users'] as $j => $u) if ($j != $mi && strtolower($u['email']) == strtolower($new)) {
        $new = $old;
        $bad = 'That email is already in use.';
    }
    $nm = mb_substr(trim($_POST['name'] ?? ''), 0, 60);
    if ($nm !== '') $d['users'][$mi]['name'] = $nm;
    else $bad = $bad ?: 'Please enter your name.';
    $un = trim($_POST['username'] ?? '');
    $udup = false;
    foreach ($d['users'] as $j => $u) if ($j != $mi && strcasecmp($u['username'], $un) == 0) $udup = true;
    if (preg_match('/^[\w.\-]{2,30}$/', $un) && !$udup) $d['users'][$mi]['username'] = $un;
    else $bad = $bad ?: 'Usernames use 2–30 letters, numbers, dots or dashes, and must be unique.';
    $d['users'][$mi]['phone'] = preg_replace('/[^\d+\-\s().]/', '', mb_substr(trim($_POST['phone'] ?? ''), 0, 25));
    $d['users'][$mi]['email'] = $new;
    if ($new != $old) foreach ($d['letters'] as $j => $l) if (is_owner($l, $old)) $d['letters'][$j]['owner'] = $new;
    $_POST['email'] = $new;
    $_SESSION['flash'] = $bad ?: 'Changes saved';
    if ($bad) $_SESSION['flash_t'] = 'error';
    $d['users'][$mi]['private'] = isset($_POST['private']) ? 1 : 0;
    foreach (['a_calm'] as $k) $d['users'][$mi][$k] = isset($_POST[$k]) ? 1 : 0;
    $d['users'][$mi]['a_theme'] = in_array($_POST['a_theme'] ?? '', ['light', 'dark', 'auto']) ? $_POST['a_theme'] : 'light';
    save_data($d);
    $_SESSION['u'] = $_POST['email'];
    redirect_to_page('profile#' . preg_replace('/\W/', '', $_POST['tab'] ?? 'profile'));
}
if ($a == 'delacct') {
    foreach (['banner', 'banner_src', 'avatar', 'avatar_src'] as $k) delete_upload($d['users'][$mi][$k] ?? '');
    foreach ($d['letters'] as $l) if (is_owner($l, $me['email'])) delete_upload($l['front'] ?? '');
    $d['letters'] = array_values(array_filter($d['letters'], fn($l) => !is_owner($l, $me['email'])));
    unset($d['users'][$mi]);
    $d['users'] = array_values($d['users']);
    save_data($d);
    session_destroy();
    redirect_to_page('signin');
}
