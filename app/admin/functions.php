<?php
defined('ROOT') || exit;
/* format a date like "Jan 5, 2026" */
function admin_date($s)
{
    $t = strtotime((string)$s);
    return $t ? date('M j, Y', $t) : '—';
}
/* format a time as a short date (with time when given) */
function admin_time_ago($s)
{
    $t = $s ? strtotime($s) : 0;
    if (!$t) return '—';
    $tm = strlen($s) > 10;
    return date('Y-m-d', $t) == date('Y-m-d') ? 'Today' . ($tm ? ', ' . date('H:i', $t) : '') : date('M j', $t) . ($tm ? ', ' . date('H:i', $t) : ', ' . date('Y', $t));
}
/* make a fake readable id like USR-12345 from an email */
function user_id_label($em)
{
    return 'USR-' . (10000 + crc32(strtolower($em)) % 90000);
}
/* text like "+5.0% vs last month" */
function change_text($c, $p, $lab)
{
    if (!$p) return $c ? 'New' : '';
    return sprintf('%+.1f%%', ($c - $p) / $p * 100) . ' vs ' . $lab;
}
/* per-day activity, counted only from dates: [date => [email => 1]], letters per day, check-ins per day */
function count_daily_activity($d)
{
    $ok = [];
    $ev = [];
    $lc = [];
    $mc = [];
    foreach ($d['users'] as $u) {
        $em = strtolower($u['email']);
        $ok[$em] = 1;
        foreach (($u['moods'] ?? []) as $k => $m) {
            $ev[$k][$em] = 1;
            $mc[$k] = ($mc[$k] ?? 0) + 1;
        }
        if (!empty($u['last_active'])) $ev[substr($u['last_active'], 0, 10)][$em] = 1;
    }
    foreach ($d['letters'] as $l) {
        $t = strtotime($l['date'] ?? '');
        if (!$t) continue;
        $k = date('Y-m-d', $t);
        $lc[$k] = ($lc[$k] ?? 0) + 1;
        $em = strtolower($l['owner']);
        if (isset($ok[$em])) $ev[$k][$em] = 1;
    }
    return [$ev, $lc, $mc];
}
/* when the user joined (guess from their data if missing) */
function joined_date($u, $ev)
{
    if (!empty($u['joined'])) return $u['joined'];
    $em = strtolower($u['email']);
    $f = null;
    foreach ($ev as $k => $x) if (isset($x[$em]) && ($f === null || $k < $f)) $f = $k;
    return $f;
}
/* when the user was last active (guess from their data if missing) */
function last_active_date($u, $ev)
{
    if (!empty($u['last_active'])) return $u['last_active'];
    $em = strtolower($u['email']);
    $f = null;
    foreach ($ev as $k => $x) if (isset($x[$em]) && ($f === null || $k > $f)) $f = $k;
    return $f;
}
/* add one line to the admin audit log (keeps last 200) */
function add_audit_entry(&$d, $msg, $on = '')
{
    global $me;
    $d['audit'][] = ['t' => date('Y-m-d H:i:s'), 'by' => $me['name'], 'a' => $msg, 'on' => $on];
    $d['audit'] = array_slice($d['audit'], -200);
}
/* make a small POST form with one button (admin actions) */
function admin_button_form($a, $k, $v, $view, $label, $cls, $conf = '')
{
    return '<form method=post class=inl' . ($conf ? ' data-confirm="' . esc($conf) . '"' : '') . '><input type=hidden name=a value=' . $a . '><input type=hidden name=t value="' . esc($_SESSION['csrf'] ?? '') . '"><input type=hidden name=' . $k . ' value="' . esc($v) . '"><input type=hidden name=v value=' . $view . '><button class="btn sm ' . $cls . '">' . $label . '</button></form>';
}
/* the admin workspace has its own sidebar: no writing, letters or profile */
function admin_page_start($act)
{
    global $me;
    $n = ['overview' => ['Overview', 'grid'], 'users' => ['Users', 'users'], 'activity' => ['Activity', 'pulse'], 'audit' => ['Admin audit log', 'clip'], 'settings' => ['Settings', 'sliders']];
    echo '<div class="app adm"><aside><div><a href="?p=admin"><img class=logo src=img/logo.png alt=Unsent></a><div class=aw>' . icon('shield', 15) . '<span>ADMIN WORKSPACE</span></div><nav>';
    foreach ($n as $k => $x) echo "<a href='?p=admin&amp;v=$k' class='" . ($k == $act ? 'on' : '') . "'>" . icon($x[1], 20) . "{$x[0]}</a>";
    echo '<a class=back2 href="?p=home">' . icon('arrow', 16) . 'Back to Unsent</a></nav></div><div class=foot2><div class=quote>' . icon('spark', 18) . '<p class=hand>Some words feel lighter once they’re written.</p><small>A little care behind every account.</small></div><div class=mew><div class=menu id=mem role=menu hidden><a role=menuitem href="?p=home">' . icon('home', 17) . 'Back to Unsent</a><form method=post><input type=hidden name=a value=logout><button role=menuitem class=out>' . icon('out', 17) . 'Log out</button></form></div><button type=button class=me id=meb aria-haspopup=menu aria-expanded=false aria-controls=mem>' . avatar_html($me) . '<span><b>' . esc($me['name']) . '</b><small>Administrator</small></span>' . icon('dots', 18) . '</button></div></div></aside><main id=main tabindex=-1>';
}
/* print the admin top bar with breadcrumb and theme switch */
function admin_top_bar($crumb)
{
    echo '<div class=atop><small class=crumb>Admin / ' . esc($crumb) . '</small><div class=apr><small>Appearance</small><div class=seg id=aseg><button type=button data-t=light>' . icon('sun', 14) . ' Light</button><button type=button data-t=dark>' . icon('moon', 14) . ' Dark</button></div></div></div>';
}
/* print the admin users table */
function admin_users_table($d, $ev, $ps, $v)
{
    global $me;
    $U = $d['users'];
    usort($U, fn($a, $b) => strcmp(joined_date($b, $ev) ?? '', joined_date($a, $ev) ?? ''));
    $rows = '';
    foreach ($U as $u) {
        $self = strtolower($u['email']) == strtolower($me['email']);
        $sus = ($u['status'] ?? '') === 'suspended';
        $ad = ($u['role'] ?? '') === 'admin';
        $j = joined_date($u, $ev);
        $L = admin_time_ago(last_active_date($u, $ev));
        $rows .= '<tr tabindex=0 data-s="' . esc(strtolower($u['name'] . ' ' . $u['username'] . ' ' . $u['email'])) . '" data-st=' . ($sus ? 'suspended' : 'active') . ' data-stl=' . ($sus ? 'Suspended' : 'Active') . ' data-ad=' . ($ad ? 1 : 0) . ' data-role=' . ($ad ? 'Admin' : 'Member') . ' data-self=' . ($self ? 1 : 0) . ' data-j="' . esc($j) . '" data-jd="' . esc(admin_date($j)) . '" data-la="' . esc($L) . '" data-li="' . esc(admin_time_ago($u['last_login'] ?? '')) . '" data-lo="' . esc(admin_time_ago($u['last_logout'] ?? '')) . '" data-pw="' . esc(admin_time_ago($u['pw_changed'] ?? '')) . '" data-name="' . esc($u['name']) . '" data-email="' . esc($u['email']) . '" data-id="' . user_id_label($u['email']) . '"><td><div class=who>' . avatar_html($u) . '<span><b>' . esc($u['name']) . ($ad ? ' <em class="rb adm">Admin</em>' : '') . '</b><small>' . esc($u['email']) . '</small></span></div></td><td>' . esc(admin_date($j)) . '</td><td>' . esc($L) . '</td><td><span class="st ' . ($sus ? 'no' : 'ok') . '">' . ($sus ? 'Suspended' : 'Active') . '</span></td><td class=ra><button type=button class="btn sm wh vw">View</button>' . ($self ? '' : admin_button_form('adm_status', 'u', $u['email'], $v, $sus ? 'Reactivate' : 'Suspend', $sus ? 'wh' : 'rd')) . '</td></tr>';
    }
    $t = esc($_SESSION['csrf'] ?? '');
    $f = fn($a, $id, $label, $cls, $conf = '') => '<form method=post class=inl id=' . $id . ($conf ? ' data-confirm="' . esc($conf) . '"' : '') . '><input type=hidden name=a value=' . $a . '><input type=hidden name=t value="' . $t . '"><input type=hidden name=u><input type=hidden name=v value=' . $v . '><button class="btn sm ' . $cls . '" id=' . $id . 'b>' . $label . '</button></form>';
    echo '<div class=ugrid><div class="card um"><div class=between><h3>User management</h3><small class=mut>' . count($U) . ' accounts</small></div>'
        . '<div class=tools><label class=srch>' . icon('search', 16) . '<input id=uq placeholder="Search name or email" aria-label="Search users"></label><label class=sel>' . icon('filter', 16) . '<select id=ufs aria-label="Filter by status"><option value=all>All statuses<option value=active>Active<option value=suspended>Suspended<option value=admin>Admins</select></label><label class=sel><select id=ufj aria-label="Filter by join date"><option value=all>Joined: Any time<option value=7>Joined: Last 7 days<option value=30>Joined: Last 30 days</select></label></div>'
        . '<div class=tw><table class=at id=ut data-ps=' . $ps . '><thead><tr><th>User<th>Joined ↓<th>Last active<th>Status<th>Actions</tr></thead><tbody>' . $rows . '</tbody></table></div>'
        . '<div class=pgn><small id=uinfo></small><span><small id=upg></small><button type=button class="btn sm wh" id=uprev>Previous</button><button type=button class="btn sm wh" id=unext>Next</button></span></div></div>'
        . '<div class="card sum"><div class=between><h3>Account summary</h3><button type=button class=ib id=sx aria-label="Close summary">' . icon('close', 18) . '</button></div><div id=sbody><div class=sh><i id=sav></i><span><b id=sn></b><em class="st ok" id=ss></em></span></div><p class=mut id=se2></p><dl class=dls><div><dt>Account ID<dd id=si></div><div><dt>Joined<dd id=sj></div><div><dt>Last active<dd id=sl></div><div><dt>Last login<dd id=sli></div><div><dt>Last logout<dd id=slo></div><div><dt>Password changed<dd id=spw></div><div><dt>Role<dd id=sr></div></dl>'
        . '<div class=sact id=sact>' . $f('adm_role', 'fr', 'Make admin', 'yl') . $f('adm_status', 'fs', 'Suspend', 'rd') . $f('adm_user', 'fd', 'Delete', 'wh', 'Delete this account and every letter?') . '</div>'
        . '<div class=green>' . icon('lock', 19) . '<div><b>Their words stay theirs.</b><br><small>Letter content and mood entries are not accessible to admins.</small></div></div></div><p class=mut id=sempty hidden>Select a user to see their account summary.</p></div></div>';
}
