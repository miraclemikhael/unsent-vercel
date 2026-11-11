<?php
/* Push alerts: public key, save/remove a device, test, and "pull" (called by sw.js when the phone is woken). */
require __DIR__ . '/boot.php';
push_tables();
$a = $_GET['a'] ?? '';
if ($a === 'key') json_out(['ok' => 1, 'key' => vapid_keys()['pub']]);
if ($a === 'sub' || $a === 'unsub') {
    $ep = (string)($_POST['endpoint'] ?? '');
    if (!preg_match('~^https://[^\s]{10,900}$~', $ep)) json_out(['ok' => 0, 'err' => 'Bad device.'], 400);
    if ($a === 'sub') q('INSERT INTO push_subs(user_id,endpoint_hash,endpoint) VALUES(?,?,?) ON DUPLICATE KEY UPDATE user_id=VALUES(user_id), endpoint=VALUES(endpoint)', [$uid, hash('sha256', $ep), $ep]);
    else q('DELETE FROM push_subs WHERE user_id=? AND endpoint_hash=?', [$uid, hash('sha256', $ep)]);
    json_out(['ok' => 1]);
}
if ($a === 'test') {
    push_notify($uid, 'Unsent', 'Notifications are on. You will hear about messages and calls.', 'index.php?p=space', 'test');
    json_out(['ok' => 1]);
}
if ($a === 'pull') {
    $r = q('SELECT id,title,body,url,tag FROM push_msgs WHERE user_id=? AND created_at > NOW() - INTERVAL 10 MINUTE ORDER BY id DESC LIMIT 5', [$uid])->fetchAll();
    q('DELETE FROM push_msgs WHERE user_id=?', [$uid]);
    json_out(['ok' => 1, 'items' => array_reverse($r)]);
}
json_out(['ok' => 0], 400);
