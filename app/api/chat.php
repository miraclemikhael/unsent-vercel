<?php
/* Friends + messages (text, pictures, voice notes). Polled by js/chat.js. */
require __DIR__ . '/boot.php';
$a = $_GET['a'] ?? '';
$with = (int)($_REQUEST['with'] ?? 0);

const EDIT_SECS = 900; /* 15 minutes, like WhatsApp's edit window */
function dto($m, $uid)
{
    $t = strtotime($m['created_at']);
    $gone = !empty($m['deleted']);
    return ['id' => (int)$m['id'], 'mine' => (int)$m['from_id'] === $uid, 'kind' => $m['kind'], 'body' => $gone ? null : $m['body'],
        'url' => ($m['file'] && !$gone) ? 'uploads/' . $m['file'] : null, 'dur' => (int)$m['dur'], 'day' => date('D j M', $t), 'hm' => date('H:i', $t),
        'edited' => !empty($m['edited']), 'deleted' => $gone, 'hidden' => (int)$m['from_id'] === $uid ? !empty($m['del_from']) : !empty($m['del_to']), 'left' => max(0, EDIT_SECS - (int)($m['age'] ?? EDIT_SECS))];
}

function dtos($rows, $uid, $with, $drop = false)
{
    $ids = [];
    foreach ($rows as $m) if (!empty($m['reply_to'])) $ids[(int)$m['reply_to']] = 1;
    $map = [];
    if ($ids) {
        $in = implode(',', array_map('intval', array_keys($ids)));
        foreach (q("SELECT id,from_id,kind,body,deleted FROM messages WHERE id IN ($in) AND ((from_id=? AND to_id=?) OR (from_id=? AND to_id=?))", [$uid, $with, $with, $uid])->fetchAll() as $r) {
            $txt = !empty($r['deleted']) ? 'Message deleted' : ($r['kind'] === 'image' ? ($r['body'] !== null && $r['body'] !== '' ? 'Photo · ' . mb_substr((string)$r['body'], 0, 80) : 'Photo') : ($r['kind'] === 'voice' ? 'Voice note' : mb_substr((string)$r['body'], 0, 100)));
            $map[(int)$r['id']] = ['id' => (int)$r['id'], 'mine' => (int)$r['from_id'] === $uid, 'kind' => $r['kind'], 'text' => $txt];
        }
    }
    $out = array_map(function ($m) use ($uid, $map) {
        $d = dto($m, $uid);
        $d['reply'] = $map[(int)($m['reply_to'] ?? 0)] ?? null;
        return $d;
    }, $rows);
    return $drop ? array_values(array_filter($out, function ($d) { return empty($d['hidden']); })) : $out;
}
function reply_id($uid, $with)
{
    $rt = (int)($_POST['reply_to'] ?? 0);
    if (!$rt) return null;
    return q('SELECT 1 FROM messages WHERE id=? AND ((from_id=? AND to_id=?) OR (from_id=? AND to_id=?))', [$rt, $uid, $with, $with, $uid])->fetch() ? $rt : null;
}

if ($a === 'add') { /* friend by username or email */
    $w = strtolower(trim($_POST['who'] ?? ''));
    $w = ltrim($w, '@');
    $f = $w !== '' ? q('SELECT id FROM users WHERE (LOWER(username)=? OR LOWER(email)=?) AND id<>?', [$w, $w, $uid])->fetch() : null;
    if ($f) {
        $rev = q('SELECT id FROM friends WHERE user_id=? AND friend_id=?', [$f['id'], $uid])->fetch();
        if ($rev) q("UPDATE friends SET status='accepted' WHERE id=?", [$rev['id']]);
        else q('INSERT IGNORE INTO friends(user_id,friend_id) VALUES(?,?)', [$uid, $f['id']]);
    }
    /* same answer either way: nobody can probe which usernames exist */
    json_out(['ok' => 1, 'msg' => 'Request sent. If that person is on Unsent, they will see it.']);
}
if ($a === 'accept') {
    q("UPDATE friends SET status='accepted' WHERE id=? AND friend_id=?", [(int)($_POST['id'] ?? 0), $uid]);
    json_out(['ok' => 1]);
}
if ($a === 'decline') {
    q("DELETE FROM friends WHERE id=? AND friend_id=? AND status='pending'", [(int)($_POST['id'] ?? 0), $uid]);
    json_out(['ok' => 1]);
}
if ($a === 'notes') { /* live bell: count, panel list, and the new items (for pop-ups) */
    require_once ROOT . '/includes/icons.php';
    require_once ROOT . '/includes/react.php';
    require_once ROOT . '/includes/notify.php';
    $me = ['_id' => $uid, 'email' => $row['email']];
    $L = notifications($me);
    $items = [];
    foreach ($L as $x) if (!empty($x['new'])) $items[] = ['key' => md5($x['u']['id'] . '|' . $x['text'] . '|' . $x['t']), 'name' => $x['u']['name'], 'text' => $x['text'], 'href' => $x['href']];
    json_out(['ok' => 1, 'n' => count($items), 'html' => notify_list_html($L), 'items' => $items]);
}
if ($a === 'badge') json_out(['ok' => 1, 'badge' => unread_count($uid)]);

if (!$with || !are_friends($uid, $with)) json_out(['ok' => 0, 'err' => 'Friends only.'], 403);

if ($a === 'poll') {
    $after = (int)($_GET['after'] ?? 0);
    $since = (int)($_GET['since'] ?? 0);
    $rows = q('SELECT * FROM (SELECT *, TIMESTAMPDIFF(SECOND,created_at,NOW()) age FROM messages WHERE id>? AND ((from_id=? AND to_id=?) OR (from_id=? AND to_id=?)) ORDER BY id DESC LIMIT 100) t ORDER BY id',
        [$after, $uid, $with, $with, $uid])->fetchAll();
    /* messages edited or deleted since the last poll */
    $ch = $since ? q('SELECT *, TIMESTAMPDIFF(SECOND,created_at,NOW()) age FROM messages WHERE id<=? AND upd>=FROM_UNIXTIME(?) AND ((from_id=? AND to_id=?) OR (from_id=? AND to_id=?))',
        [$after, $since - 2, $uid, $with, $with, $uid])->fetchAll() : [];
    q('UPDATE messages SET read_at=NOW() WHERE to_id=? AND from_id=? AND read_at IS NULL', [$uid, $with]);
    $now = (int)q('SELECT UNIX_TIMESTAMP(NOW()) n')->fetch()['n'];
    json_out(['ok' => 1, 'msgs' => dtos($rows, $uid, $with, true), 'changed' => dtos($ch, $uid, $with), 'now' => $now, 'badge' => unread_count($uid)]);
}
if ($a === 'edit' || $a === 'delete') { /* edit / delete for everyone: your own message, first 15 minutes. delete for me: any message, any time */
    try {
        ensure_chat_tables();
        $id = (int)($_POST['id'] ?? 0);
        if ($a === 'delete' && ($_POST['mode'] ?? '') === 'me') {
            $r = q('SELECT from_id FROM messages WHERE id=? AND ((from_id=? AND to_id=?) OR (from_id=? AND to_id=?))', [$id, $uid, $with, $with, $uid])->fetch();
            if (!$r) json_out(['ok' => 0, 'err' => 'Message not found.']);
            $col = (int)$r['from_id'] === $uid ? 'del_from' : 'del_to';
            q("UPDATE messages SET $col=1, upd=NOW() WHERE id=?", [$id]);
            json_out(['ok' => 1]);
        }
        $win = 'id=? AND from_id=? AND to_id=? AND deleted=0 AND created_at >= NOW() - INTERVAL ' . EDIT_SECS . ' SECOND';
        if ($a === 'edit') {
            $t = mb_substr(trim(str_replace("\r", '', $_POST['text'] ?? '')), 0, 1000);
            if ($t === '') json_out(['ok' => 0, 'err' => 'A message cannot be empty. Delete it instead.']);
            $n = q("UPDATE messages SET body=?, edited=1, upd=NOW() WHERE kind='text' AND $win", [$t, $id, $uid, $with])->rowCount();
        } else {
            $old = q("SELECT file FROM messages WHERE $win", [$id, $uid, $with])->fetch();
            $n = q("UPDATE messages SET deleted=1, body=NULL, upd=NOW() WHERE $win", [$id, $uid, $with])->rowCount();
            if ($n && !empty($old['file']) && preg_match('/^[\w.]+$/', $old['file'])) delete_upload('uploads/' . $old['file']);
        }
        json_out($n ? ['ok' => 1] : ['ok' => 0, 'err' => 'Messages can only be changed in the first 15 minutes.']);
    } catch (Throwable $e) {
        json_out(['ok' => 0, 'err' => 'Database said: ' . mb_substr($e->getMessage(), 0, 160)]);
    }
}
if ($a === 'send') {
    $t = mb_substr(trim(str_replace("\r", '', $_POST['text'] ?? '')), 0, 1000);
    if ($t === '') json_out(['ok' => 0, 'err' => 'Write something first.']);
    q("INSERT INTO messages(from_id,to_id,kind,body,reply_to) VALUES(?,?,'text',?,?)", [$uid, $with, $t, reply_id($uid, $with)]);
    push_notify($with, $row['name'], $t, 'index.php?p=chat&with=' . $uid, 'm' . $uid);
    json_out(['ok' => 1]);
}
if ($a === 'upload') { /* pictures + voice notes */
    $f = $_FILES['file'] ?? null;
    if (!$f || $f['error'] || $f['size'] > 8 * 1048576) json_out(['ok' => 0, 'err' => 'File missing or over 8 MB.']);
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
    $img = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
    $aud = ['audio/webm' => 'webm', 'video/webm' => 'webm', 'audio/ogg' => 'ogg', 'application/ogg' => 'ogg', 'audio/mp4' => 'm4a', 'video/mp4' => 'm4a', 'audio/x-m4a' => 'm4a', 'audio/m4a' => 'm4a', 'audio/aac' => 'm4a', 'video/quicktime' => 'm4a', 'audio/mpeg' => 'mp3'];
    $kind = ($_POST['kind'] ?? '') === 'voice' ? 'voice' : 'image';
    $ext = ($kind === 'voice' ? $aud : $img)[$mime] ?? null;
    if (!$ext) json_out(['ok' => 0, 'err' => 'That file type is not allowed.']);
    $smime = $kind === 'voice' ? (['webm' => 'audio/webm', 'm4a' => 'audio/mp4', 'ogg' => 'audio/ogg', 'mp3' => 'audio/mpeg'][$ext] ?? $mime) : $mime;
    try {
        $name = store_upload($f['tmp_name'], $smime, $ext, 10);
    } catch (Throwable $e) {
        json_out(['ok' => 0, 'err' => 'Could not save file.'], 500);
    }
    $cap = $kind === 'image' ? mb_substr(trim(str_replace("\r", '', $_POST['text'] ?? '')), 0, 1000) : '';
    q('INSERT INTO messages(from_id,to_id,kind,body,file,dur,reply_to) VALUES(?,?,?,?,?,?,?)', [$uid, $with, $kind, $cap !== '' ? $cap : null, $name, min(600, (int)($_POST['dur'] ?? 0)), reply_id($uid, $with)]);
    push_notify($with, $row['name'], $kind === 'voice' ? 'Sent a voice note' : ($cap !== '' ? $cap : 'Sent a picture'), 'index.php?p=chat&with=' . $uid, 'm' . $uid);
    json_out(['ok' => 1]);
}
json_out(['ok' => 0, 'err' => 'Unknown action.'], 400);
