<?php
defined('ROOT') || exit;
/* Likes + comments on public letters. Same style as includes/chat.php: plain MySQL keyed by users.id.
   letter_likes    = one row per (letter, person) so a person can like a letter only once
   letter_comments = short comments, newest last */
function ensure_react_tables()
{
    if (!empty($_SESSION['react_tables'])) return;
    $pdo = db_connect();
    $pdo->exec("CREATE TABLE IF NOT EXISTS letter_likes(
      letter_id VARCHAR(40) NOT NULL, user_id INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(letter_id,user_id), KEY by_user(user_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)");
    $pdo->exec("CREATE TABLE IF NOT EXISTS letter_comments(
      id BIGINT AUTO_INCREMENT PRIMARY KEY, letter_id VARCHAR(40) NOT NULL, user_id INT NOT NULL,
      body VARCHAR(500) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, KEY by_letter(letter_id,id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)");
    $_SESSION['react_tables'] = 1;
}
/* like + comment counts for many letters at once, and which ones $uid already liked: [id => [likes, comments, liked]] */
function react_counts($ids, $uid)
{
    $out = [];
    foreach ($ids as $i) $out[$i] = [0, 0, 0];
    if (!$ids) return $out;
    try {
        ensure_react_tables();
        $in = implode(',', array_fill(0, count($ids), '?'));
        foreach (q("SELECT letter_id, COUNT(*) c, SUM(user_id=?) mine FROM letter_likes WHERE letter_id IN ($in) GROUP BY letter_id", array_merge([$uid], $ids))->fetchAll() as $r) {
            $out[$r['letter_id']][0] = (int)$r['c'];
            $out[$r['letter_id']][2] = (int)$r['mine'];
        }
        foreach (q("SELECT letter_id, COUNT(*) c FROM letter_comments WHERE letter_id IN ($in) GROUP BY letter_id", $ids)->fetchAll() as $r) $out[$r['letter_id']][1] = (int)$r['c'];
    } catch (Throwable $e) {
    }
    return $out;
}
/* a letter other people may react to: it must be public AND its writer's account must be public (or it is yours).
   Returns the letter row + owner row, or null. Letter and user extras are JSON in the `extra` column. */
function open_letter($id, $uid)
{
    $l = q('SELECT id,owner_email,title,recipient,written_on,body,extra FROM letters WHERE id=?', [(string)$id])->fetch();
    if (!$l) return null;
    $o = q('SELECT id,name,username,avatar,status,extra FROM users WHERE LOWER(email)=LOWER(?)', [(string)$l['owner_email']])->fetch();
    if (!$o || ($o['status'] ?? '') === 'suspended') return null;
    $mine = (int)$o['id'] === (int)$uid;
    $lx = json_decode((string)$l['extra'], true) ?: [];
    $ox = json_decode((string)$o['extra'], true) ?: [];
    if (!$mine && (empty($lx['pub']) || empty($ox['s_public']))) return null;
    $l['mine'] = $mine;
    $l['pub'] = !empty($lx['pub']);
    return [$l, $o];
}
/* "just now", "5m", "3h", "2d", or a short date */
function ago($ts)
{
    $s = max(0, time() - $ts);
    if ($s < 60) return 'just now';
    if ($s < 3600) return floor($s / 60) . 'm';
    if ($s < 86400) return floor($s / 3600) . 'h';
    if ($s < 604800) return floor($s / 86400) . 'd';
    return date('j M', $ts);
}
