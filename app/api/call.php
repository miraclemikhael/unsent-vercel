<?php
/* WebRTC signaling over plain PHP + MySQL. Audio/video goes browser to browser. */
require __DIR__ . '/boot.php';
$a = $_GET['a'] ?? '';
if ($a === 'ice') {
    $ice = [['urls' => 'stun:stun.l.google.com:19302']];
    if (TURN_URL !== '') $ice[] = ['urls' => [TURN_URL, TURN_URL . '?transport=tcp'], 'username' => TURN_USER, 'credential' => TURN_PASS];
    json_out(['ok' => 1, 'ice' => ['iceServers' => $ice]]);
}
if ($a === 'send') {
    $to = (int)($_POST['to'] ?? 0);
    $type = $_POST['type'] ?? '';
    $cid = $_POST['cid'] ?? '';
    if (!in_array($type, ['ring', 'accept', 'decline', 'desc', 'ice', 'end'], true) || !preg_match('/^\w{4,20}$/', $cid) || !are_friends($uid, $to)) json_out(['ok' => 0], 403);
    q('INSERT INTO call_signals(call_id,from_id,to_id,type,payload) VALUES(?,?,?,?,?)', [$cid, $uid, $to, $type, mb_substr($_POST['payload'] ?? '', 0, 20000)]);
    if ($type === 'ring') push_notify($to, 'Incoming call', $row['name'] . ' is calling you', 'index.php?p=chat&with=' . $uid, 'call' . $uid);
    json_out(['ok' => 1]);
}
if ($a === 'poll') {
    if (random_int(1, 20) === 1) q('DELETE FROM call_signals WHERE created_at < NOW() - INTERVAL 3 MINUTE');
    $after = $_GET['after'] ?? '';
    if ($after === '') json_out(['ok' => 1, 'sigs' => [], 'last' => (int)q('SELECT COALESCE(MAX(id),0) m FROM call_signals')->fetch()['m']]);
    $r = q('SELECT id,call_id,from_id,type,payload FROM call_signals WHERE to_id=? AND id>? ORDER BY id', [$uid, (int)$after])->fetchAll();
    json_out(['ok' => 1, 'sigs' => $r, 'last' => $r ? (int)end($r)['id'] : (int)$after]);
}
json_out(['ok' => 0], 400);
