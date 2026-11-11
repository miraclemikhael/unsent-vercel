<?php
/* Like + comment on public letters. Called by js/react.js.
   GET  ?a=open&id=LETTER        -> the letter, like state and all comments
   POST ?a=like    id            -> toggle your like
   POST ?a=comment id, text      -> add a comment (max 500 characters)
   POST ?a=del     cid           -> delete a comment (its writer, or the letter's owner) */
require __DIR__ . '/boot.php';
require ROOT . '/includes/react.php';
ensure_react_tables();
$a = $_GET['a'] ?? '';
$id = (string)($_REQUEST['id'] ?? '');

function comment_dto($c, $uid, $owner)
{
    return ['id' => (int)$c['id'], 'name' => $c['name'], 'username' => $c['username'], 'av' => upload_path($c['avatar'] ?? ''), 'body' => $c['body'],
        'ago' => ago(strtotime($c['created_at'])), 'mine' => (int)$c['user_id'] === $uid, 'del' => (int)$c['user_id'] === $uid || $owner];
}
function state($id, $uid)
{
    $n = react_counts([$id], $uid)[$id];
    return ['likes' => $n[0], 'comments' => $n[1], 'liked' => (bool)$n[2]];
}

if ($a === 'del') {
    $c = q('SELECT c.id,c.user_id,c.letter_id FROM letter_comments c WHERE c.id=?', [(int)($_POST['cid'] ?? 0)])->fetch();
    if (!$c) json_out(['ok' => 0, 'err' => 'That comment is already gone.']);
    $ol = open_letter($c['letter_id'], $uid);
    $isOwner = $ol && $ol[0]['mine'];
    if ((int)$c['user_id'] !== $uid && !$isOwner) json_out(['ok' => 0, 'err' => 'You can only delete your own comments.'], 403);
    q('DELETE FROM letter_comments WHERE id=?', [$c['id']]);
    json_out(['ok' => 1] + state($c['letter_id'], $uid));
}

$ol = $id !== '' ? open_letter($id, $uid) : null;
if (!$ol) json_out(['ok' => 0, 'err' => 'This letter is private or no longer shared.'], 404);
[$l, $o] = $ol;

if ($a === 'open') {
    $cs = q('SELECT c.id,c.user_id,c.body,c.created_at,u.name,u.username,u.avatar FROM (SELECT * FROM letter_comments WHERE letter_id=? ORDER BY id DESC LIMIT 200) c JOIN users u ON u.id=c.user_id ORDER BY c.id', [$id])->fetchAll();
    $body = plain_text(clean_body($l['body']));
    json_out(['ok' => 1, 'letter' => ['id' => $l['id'], 'title' => $l['title'], 'to' => $l['recipient'] ?: 'you', 'date' => $l['written_on'], 'body' => $body,
        'by' => $o['name'], 'username' => $o['username'], 'av' => upload_path($o['avatar'] ?? ''), 'mine' => $l['mine']],
        'comments' => array_map(fn($c) => comment_dto($c, $uid, $l['mine']), $cs)] + state($id, $uid));
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['ok' => 0, 'err' => 'Unknown action.'], 400);

if ($a === 'like') {
    if ($l['mine']) json_out(['ok' => 0, 'err' => 'Your own letters can’t be liked by you. Others can.']);
    $had = q('SELECT 1 FROM letter_likes WHERE letter_id=? AND user_id=?', [$id, $uid])->fetch();
    if ($had) q('DELETE FROM letter_likes WHERE letter_id=? AND user_id=?', [$id, $uid]);
    else {
        q('INSERT IGNORE INTO letter_likes(letter_id,user_id) VALUES(?,?)', [$id, $uid]);
        require_once ROOT . '/includes/push.php';
        push_notify((int)$o['id'], $row['name'], 'liked your letter “' . mb_substr((string)$l['title'], 0, 60) . '”', 'index.php?p=space', 'l' . $id);
    }
    json_out(['ok' => 1] + state($id, $uid));
}
if ($a === 'comment') {
    $t = mb_substr(trim(preg_replace('/[ \t]+/', ' ', str_replace("\r", '', (string)($_POST['text'] ?? '')))), 0, 500);
    if ($t === '') json_out(['ok' => 0, 'err' => 'Write something first.']);
    $last = q('SELECT TIMESTAMPDIFF(SECOND,created_at,NOW()) s FROM letter_comments WHERE user_id=? ORDER BY id DESC LIMIT 1', [$uid])->fetch();
    if ($last && (int)$last['s'] < 3) json_out(['ok' => 0, 'err' => 'Slow down a little, then try again.']);
    q('INSERT INTO letter_comments(letter_id,user_id,body) VALUES(?,?,?)', [$id, $uid, $t]);
    $nid = (int)db_connect()->lastInsertId();
    if (!$l['mine']) {
        require_once ROOT . '/includes/push.php';
        push_notify((int)$o['id'], $row['name'], 'commented: ' . $t, 'index.php?p=space', 'c' . $id);
    }
    $c = q('SELECT c.id,c.user_id,c.body,c.created_at,u.name,u.username,u.avatar FROM letter_comments c JOIN users u ON u.id=c.user_id WHERE c.id=?', [$nid])->fetch();
    json_out(['ok' => 1, 'comment' => comment_dto($c, $uid, $l['mine'])] + state($id, $uid));
}
json_out(['ok' => 0, 'err' => 'Unknown action.'], 400);
