<?php
defined('ROOT') || exit;
/**
 * @var mixed $d
 * @var mixed $v
 */
page_head('Admin');
admin_page_start($v);
$_SESSION['csrf'] ??= bin2hex(random_bytes(16));
[$ev, $lc, $mc] = count_daily_activity($d);
$U = $d['users'];
$M = preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $_GET['m'] ?? '') ? $_GET['m'] : date('Y-m');
$t0 = strtotime("$M-01");
$PM = date('Y-m', strtotime('-1 month', $t0));
$nd = (int)date('t', $t0);
$endM = date('Y-m-t', $t0);
$endP = date('Y-m-t', strtotime("$PM-01"));
$pl = date('M', strtotime("$PM-01"));
$tm = $M == date('Y-m') ? 'this month' : 'in ' . date('F', $t0);
$mrange = date('M j', $t0) . '–' . date('j, Y', strtotime($endM));
$activeIn = function ($m) use ($ev) {
    $s = [];
    foreach ($ev as $k => $e) if (str_starts_with($k, $m)) foreach ($e as $em => $_) $s[$em] = 1;
    return count($s);
};
$newIn = function ($m) use ($U, $ev) {
    $n = 0;
    foreach ($U as $u) if (str_starts_with((string)joined_date($u, $ev), $m)) $n++;
    return $n;
};
$letIn = function ($m) use ($lc) {
    $n = 0;
    foreach ($lc as $k => $c) if (str_starts_with($k, $m)) $n += $c;
    return $n;
};
$totAt = function ($end) use ($U, $ev) {
    $n = 0;
    foreach ($U as $u) {
        $j = joined_date($u, $ev);
        if (!$j || $j <= $end) $n++;
    }
    return $n;
};
$names = ['overview' => 'Overview', 'users' => 'Users', 'activity' => 'Activity', 'audit' => 'Admin audit log', 'settings' => 'Settings'];
$HD = [
    'overview' => ['A little care, at a glance.', 'Your community’s growth, with their privacy intact.'],
    'users' => ['The people behind the letters.', 'Manage accounts, never what they wrote.'],
    'activity' => ['How the space is being used.', 'Daily totals only, never who wrote what.'],
    'audit' => ['Every admin action, on the record.', 'A trail of who changed what, and when.'],
    'settings' => ['Keep the space running smoothly.', 'A few controls for the whole workspace.'],
];
$mf = '<form method=get class=inl><input type=hidden name=p value=admin><input type=hidden name=v value=' . $v . '><label class=dr>' . icon('calendar', 16) . '<span>' . $mrange . '</span><input type=month name=m value="' . $M . '" aria-label="Choose month"></label></form>';
$ex = '<a class="btn yl" href="?p=admin&amp;v=users&amp;export=1">' . icon('download', 16) . 'Export report</a>';
admin_top_bar($names[$v]);
page_title($HD[$v][0], $HD[$v][1], '<div class=ahr>' . (in_array($v, ['overview', 'activity']) ? $mf : '') . (in_array($v, ['overview', 'users']) ? $ex : '') . '</div>');
$days = [];
$vals = [];
for ($i = 1; $i <= $nd; $i++) {
    $k = sprintf('%s-%02d', $M, $i);
    $days[] = $k;
    $vals[] = count($ev[$k] ?? []);
}
require ROOT . '/admin/' . $v . '.php'; /* overview | users | activity | audit | settings */
echo '<div class=afoot>' . icon('lock', 16) . 'Private by design. Admins see account metadata and aggregate activity, never letters or personal mood entries.</div>';
