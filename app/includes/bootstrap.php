<?php
defined('ROOT') || exit;
$p = $_GET['p'] ?? 'home';
if ($p === 'register') { $p = 'signin'; $_GET['new'] = 1; } /* ?p=register = create-account view */
$d = load_data();
if (!$d['users'] && getenv('SEED_DEMO')) { /* demo user only when SEED_DEMO=1 is set (never on a public site) */
    $d['users'][] = ['name' => 'Miracle', 'username' => 'miracle', 'email' => 'miracle@gmail.com', 'phone' => '+234 812 345 6789', 'private' => 1, 'hash' => password_hash('password123', PASSWORD_DEFAULT)];
    foreach ([['someone', 'you', 'I think about you all the time', 'Sep 28, 2026', 'Dear you,<br><br>I think about you all the time. Not in the dramatic way people write about in songs, but in small, ordinary moments...'], ['past', 'me', 'To the girl I used to be', 'Sep 24, 2026', 'You did better than you think. I hope you know that now.'], ['other', 'them', 'Things I want to say', 'Sep 18, 2026', 'Maybe one day I\'ll find the courage. For now, these words stay here.'], ['myself', 'myself', 'It\'s okay to rest', 'Sep 12, 2026', 'You are not behind. You are allowed to take up space and breathe.'], ['someone', 'you', 'A birthday I missed', 'Aug 30, 2026', 'I remembered. I just didn\'t know if hearing from me would help.'], ['other', 'them', 'Thank you, quietly', 'Aug 21, 2026', 'You changed more than you know, and I carry that with me.']] as $i => $x) $d['letters'][] = ['id' => 's' . $i, 'owner' => 'miracle@gmail.com', 'kind' => $x[0], 'to' => $x[1], 'rel' => '', 'title' => $x[2], 'body' => $x[4], 'paper' => 'quiet', 'date' => $x[3]];
    save_data($d);
}
$err = '';
$me = null;
if (empty($d['wiped2'])) {
    foreach ($d['letters'] as $l) delete_upload($l['front'] ?? '');
    $d['letters'] = [];
    $d['wiped2'] = 1;
    save_data($d);
}
foreach ($d['users'] as $i => $u) if ($u['email'] == ($_SESSION['u'] ?? '')) {
    $me = $u;
    $mi = $i;
}
if ($me && ($me['status'] ?? '') === 'suspended') {
    session_destroy();
    header('Location: index.php?p=signin&sus=1');
    exit;
}
if (isset($_GET['sus']) && !$me) $err = 'This account is suspended. Please contact support.';
if ($me && (strtotime($me['last_active'] ?? '') ?: 0) < time() - 300) {
    $d['users'][$mi]['last_active'] = date('Y-m-d H:i:s');
    save_data($d);
}
