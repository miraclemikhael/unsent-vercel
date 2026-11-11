<?php
defined('ROOT') || exit;
/* Notifications (top right on phones). Nothing new to store: it reads what the app already has.
   - friend requests waiting for you, and unread chat messages (new until you deal with them)
   - likes + comments on your letters (new = after the last time you opened the bell; the time lives in the cookie unsent_nseen) */
function notifications($me)
{
    $uid = (int)($me['_id'] ?? 0);
    $email = (string)($me['email'] ?? '');
    $seen = (int)($_COOKIE['unsent_nseen'] ?? 0);
    $out = [];
    try {
        ensure_chat_tables();
        foreach (q("SELECT u.id,u.name,u.username,u.avatar,f.created_at ts FROM friends f JOIN users u ON u.id=f.user_id WHERE f.friend_id=? AND f.status='pending' ORDER BY f.id DESC LIMIT 10", [$uid])->fetchAll() as $r)
            $out[] = ['t' => strtotime((string)$r['ts']), 'u' => $r, 'text' => 'wants to be friends', 'href' => '?p=friends', 'new' => 1];
        foreach (q("SELECT u.id,u.name,u.username,u.avatar,COUNT(*) n,MAX(m.created_at) ts FROM messages m JOIN users u ON u.id=m.from_id WHERE m.to_id=? AND m.read_at IS NULL GROUP BY u.id,u.name,u.username,u.avatar ORDER BY ts DESC LIMIT 10", [$uid])->fetchAll() as $r)
            $out[] = ['t' => strtotime((string)$r['ts']), 'u' => $r, 'text' => (int)$r['n'] == 1 ? 'sent you a message' : 'sent you ' . (int)$r['n'] . ' messages', 'href' => '?p=chat&with=' . (int)$r['id'], 'new' => 1];
    } catch (Throwable $e) {
    }
    try {
        ensure_react_tables();
        foreach ([['letter_likes', 'k', 'liked'], ['letter_comments', 'k', 'commented on']] as [$tb, $a, $verb]) {
            foreach (q("SELECT u.id,u.name,u.username,u.avatar,l.title,$a.created_at ts FROM $tb $a JOIN letters l ON l.id=$a.letter_id JOIN users u ON u.id=$a.user_id WHERE LOWER(l.owner_email)=LOWER(?) AND $a.user_id<>? ORDER BY $a.created_at DESC LIMIT 8", [$email, $uid])->fetchAll() as $r) {
                $t = strtotime((string)$r['ts']);
                $out[] = ['t' => $t, 'u' => $r, 'text' => $verb . ' “' . mb_substr((string)$r['title'], 0, 28) . '”', 'href' => '?p=space', 'new' => $t > $seen ? 1 : 0];
            }
        }
    } catch (Throwable $e) {
    }
    usort($out, fn($a, $b) => $b['t'] <=> $a['t']);
    return array_slice($out, 0, 15);
}
/* the bell + its panel (css/round5.css, js/sidebar.js). Phones only; the desktop sidebar already shows a badge on Friends. */
function notify_markup()
{
    global $me;
    $L = notifications($me);
    $n = array_sum(array_column($L, 'new'));
    $h = '<div class=nw><button type=button class=nbt id=nbt aria-label="Notifications' . ($n ? ', ' . $n . ' new' : '') . '" aria-haspopup=true aria-expanded=false aria-controls=npn>' . icon('bell', 22) . ($n ? '<em class=nbd id=nbd>' . ($n > 9 ? '9+' : $n) . '</em>' : '') . '</button>'
        . '<div class=npn id=npn role=dialog aria-label=Notifications hidden><div class=nph><b class=hand>Notifications</b></div><div class=npl>';
    $h .= notify_list_html($L);
    return $h . '</div><a class=npf href="?p=space#customize">' . icon('sliders', 15) . ' Alert settings</a></div></div>';
}

/* inner list of the bell panel (api/chat.php?a=notes returns the same html, so the bell refreshes without a reload) */
function notify_list_html($L)
{
    $h = '';
    if (!$L) $h .= '<div class=npe>' . icon('bell', 26) . '<b class=hand>All caught up</b><p class=mut>Messages, friend requests, likes and comments show up here.</p></div>';
    foreach ($L as $x)
        $h .= '<a class="ni' . ($x['new'] ? ' new' : '') . '" href="' . esc($x['href']) . '">' . avatar_html($x['u']) . '<span><b>' . esc($x['u']['name']) . '</b> ' . esc($x['text']) . '<small>' . esc(ago($x['t'])) . '</small></span>' . ($x['new'] ? '<i class=nd aria-label=new></i>' : '') . '</a>';
    return $h;
}
