<?php
defined('ROOT') || exit;
/**
 * @var mixed $d
 * @var mixed $v
 * @var mixed $M
 * @var mixed $PM
 * @var mixed $activeIn
 * @var mixed $days
 * @var mixed $endM
 * @var mixed $endP
 * @var mixed $ev
 * @var mixed $letIn
 * @var mixed $newIn
 * @var mixed $pl
 * @var mixed $t0
 * @var mixed $tm
 * @var mixed $totAt
 * @var mixed $vals
 */
$cards = [
    ['Total users', $totAt($endM), $totAt($endP), 'users', 'All accounts · as of ' . date('M j', strtotime($endM)), 'hl'],
    ['Active users', $activeIn($M), $activeIn($PM), 'pulse', 'Unique users · ' . $tm, ''],
    ['New registrations', $newIn($M), $newIn($PM), 'userplus', 'Accounts joined · ' . $tm, ''],
    ['Letters created', $letIn($M), $letIn($PM), 'mail', 'Aggregate count · ' . $tm, ''],
];
echo '<div class=sg>';
foreach ($cards as $c) {
    $dt = change_text($c[1], $c[2], $pl);
    echo '<div class="card sc ' . $c[5] . '"><div class=between><small>' . $c[0] . '</small>' . icon($c[3], 18) . '</div><div class=num><big>' . number_format($c[1]) . '</big>' . ($dt ? '<em class="dl' . ($dt[0] == '-' ? ' neg' : '') . '">' . $dt . '</em>' : '') . '</div><small class=mut>' . $c[4] . '</small></div>';
}
echo '</div><div class="card chart"><div class=between><div><h2 class=hand>A growing space to write</h2><small class=mut>User activity · unique accounts active each day · ' . date('F Y', $t0) . '</small></div><small class=lg><i></i>Daily active users</small></div><div class=chw id=ch></div></div>';
echo '<script>window.AD=' . json_encode(['d' => $days, 'v' => $vals]) . '</script>';
admin_users_table($d, $ev, 4, $v);
