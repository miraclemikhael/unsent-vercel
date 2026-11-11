<?php
defined('ROOT') || exit;
/**
 * @var mixed $d
 * @var mixed $me
 * @var mixed $a
 */
/* keep only safe, in-range pictures placed on the note: [{src,x,y,w,r}] (x,y,w are % of the sheet) */
function clean_stickers($j)
{
    $o = [];
    foreach (array_slice((array)json_decode((string)$j, true), 0, 12) as $s) {
        $src = upload_path($s['src'] ?? '');
        if (!$src) continue;
        $o[] = ['src' => $src, 'x' => round(max(-20, min(100, (float)($s['x'] ?? 30))), 2), 'y' => round(max(-20, min(400, (float)($s['y'] ?? 30))), 2),
            'w' => round(max(5, min(100, (float)($s['w'] ?? 36))), 2), 'r' => round(max(-180, min(180, (float)($s['r'] ?? 0))), 1), 'p' => max(0, min(300, (int)($s['p'] ?? 0)))];
    }
    return $o;
}
/* delete the picture files of a letter's stickers, except the ones in $keep */
function delete_stickers($l, $keep = [])
{
    foreach (($l['stickers'] ?? []) as $s) if (!in_array($s['src'] ?? '', $keep, true) && ($s['src'] ?? '') !== ($l['front'] ?? '')) delete_upload($s['src'] ?? '');
}
if ($a == 'start') {
    $id = uniqid();
    $d['letters'][] = ['id' => $id, 'owner' => $me['email'], 'kind' => $_POST['kind'] ?? 'someone', 'to' => mb_substr(trim($_POST['to'] ?? ''), 0, 40), 'rel' => '', 'title' => mb_substr(trim($_POST['title'] ?? ''), 0, 120) ?: 'Untitled letter', 'body' => '', 'paper' => 'quiet', 'date' => date('M j, Y'), 'at' => date('Y-m-d H:i:s')];
    save_data($d);
    redirect_to_page("editor&id=$id");
}
if ($a == 'letter') {
    $id = preg_match('/^\w{1,20}$/', $_POST['id'] ?? '') ? $_POST['id'] : '';
    $f = [];
    foreach ($d['letters'] as $i => $l) if ($id && $l['id'] == $id && is_owner($l, $me['email'])) $f[] = $i;
    $kind = in_array($_POST['kind'] ?? '', ['someone', 'past', 'other', 'myself']) ? $_POST['kind'] : 'someone';
    $row = ['title' => mb_substr(trim($_POST['title'] ?? ''), 0, 120) ?: 'Untitled letter', 'to' => mb_substr(trim($_POST['to'] ?? ''), 0, 40), 'kind' => $kind, 'body' => clean_body($_POST['body'] ?? ''), 'paper' => preg_replace('/[^\w:.\-]/', '', $_POST['paper'] ?? 'img:birds'), 'front' => upload_path($_POST['front'] ?? ''), 'pfont' => in_array($_POST['pfont'] ?? '', ['caveat', 'kalam', 'dancing', 'lora', 'elite', 'manrope']) ? $_POST['pfont'] : '', 'pcolor' => preg_match('/^#[0-9a-fA-F]{6}$/', $_POST['pcolor'] ?? '') ? $_POST['pcolor'] : '', 'efont' => in_array($_POST['efont'] ?? '', ['caveat', 'kalam', 'dancing', 'lora', 'elite', 'manrope']) ? $_POST['efont'] : '', 'esize' => in_array((int)($_POST['esize'] ?? 0), [12, 16, 18, 20, 24, 28, 32, 40, 48]) ? (int)$_POST['esize'] : 0, 'stickers' => clean_stickers($_POST['stickers'] ?? '[]'), 'ffit' => ($_POST['ffit'] ?? '') === 'contain' ? 'contain' : 'cover', 'fz' => max(100, min(300, (int)($_POST['fz'] ?? 100))), 'fx' => max(0, min(100, (int)($_POST['fx'] ?? 50))), 'fy' => max(0, min(100, (int)($_POST['fy'] ?? 50)))];
    foreach ($f ? [$d['letters'][$f[0]]] : [] as $o) delete_stickers($o, array_column($row['stickers'], 'src'));
    foreach ($f ? [$d['letters'][$f[0]]] : [] as $o) if (($o['front'] ?? '') && $o['front'] !== $row['front']) delete_upload($o['front']);
    if ($f) {
        $d['letters'][$f[0]] = array_merge($d['letters'][$f[0]], $row);
    } else {
        $id = uniqid();
        $d['letters'][] = array_merge(['id' => $id, 'owner' => $me['email'], 'rel' => '', 'date' => date('M j, Y'), 'at' => date('Y-m-d H:i:s')], $row);
    }
    save_data($d);
    if (isset($_POST['ajax'])) {
        header('Content-Type: application/json');
        echo json_encode(['ok' => 1, 'id' => $id]);
        exit;
    }
    redirect_to_page(isset($_POST['keep']) ? 'unsent' : "editor&id=$id");
}
if ($a == 'clearall') {
    foreach ($d['letters'] as $l) if (is_owner($l, $me['email'])) {
        delete_upload($l['front'] ?? '');
        delete_stickers($l);
    }
    $d['letters'] = array_values(array_filter($d['letters'], fn($l) => !is_owner($l, $me['email'])));
    save_data($d);
    redirect_to_page('unsent');
}
if ($a == 'pcup') {
    header('Content-Type: application/json');
    $f = $_FILES['pic'] ?? null;
    $ok = $f && $f['error'] === 0 && $f['size'] <= 8 * 1048576 && ($im = @getimagesize($f['tmp_name'])) && in_array($im[2], [IMAGETYPE_PNG, IMAGETYPE_JPEG, IMAGETYPE_WEBP]);
    if (!$ok) {
        echo json_encode(['ok' => 0, 'err' => 'Please choose a PNG, JPG or WebP under 8 MB.']);
        exit;
    }
    $x = [IMAGETYPE_PNG => 'png', IMAGETYPE_JPEG => 'jpg', IMAGETYPE_WEBP => 'webp'][$im[2]];
    $n = 'uploads/' . store_upload($f['tmp_name'], image_type_to_mime_type($im[2]), $x);
    echo json_encode(['ok' => 1, 'src' => $n]);
    exit;
}
if ($a == 'del') {
    $did = (string)($_POST['id'] ?? '');
    foreach ($d['letters'] as $l) if ($l['id'] == $did && is_owner($l, $me['email'])) {
        delete_upload($l['front'] ?? '');
        delete_stickers($l);
    }
    $d['letters'] = array_values(array_filter($d['letters'], fn($l) => !($l['id'] == $did && is_owner($l, $me['email']))));
    save_data($d);
    redirect_to_page('unsent');
}
if ($a == 'email') { /* email this letter (with its pictures) through Gmail */
    header('Content-Type: application/json');
    $id = (string)($_POST['id'] ?? '');
    $to = trim($_POST['to'] ?? '');
    $l = null;
    foreach ($d['letters'] as $x) if ($id !== '' && $x['id'] == $id && is_owner($x, $me['email'])) $l = $x;
    $_SESSION['mails'] = array_filter($_SESSION['mails'] ?? [], fn($t) => $t > time() - 3600);
    if (!mail_ready()) $r = ['ok' => 0, 'err' => 'Email isn’t set up yet. Add GMAIL_USER and GMAIL_APP_PASSWORD in config/secrets.php.'];
    elseif (!$l || !filter_var($to, FILTER_VALIDATE_EMAIL)) $r = ['ok' => 0, 'err' => 'Enter a valid email address.'];
    elseif (count($_SESSION['mails']) >= 10) $r = ['ok' => 0, 'err' => 'Limit: 10 emails per hour.'];
    else {
        [$html, $imgs] = email_letter_html($l, $me, mb_substr(trim($_POST['note'] ?? ''), 0, 600));
        $ok = mail_send($to, mb_substr(trim($_POST['subject'] ?? '') ?: $l['title'], 0, 150), $html, $imgs);
        if ($ok) $_SESSION['mails'][] = time();
        $r = $ok ? ['ok' => 1] : ['ok' => 0, 'err' => 'Email failed. ' . mail_why()];
    }
    echo json_encode($r);
    exit;
}
