<?php
defined('ROOT') || exit;
/**
 * @var mixed $me
 */
/* Mood journal: every check-in is kept forever. Month calendar, streaks, balance, past days editable. */
page_head('Mood');
page_start('mood');
$MO = ['Heavy' => 'heavy', 'Low' => 'low', 'Okay' => 'okay', 'Good' => 'good', 'Bright' => 'bright'];
$SC = ['Heavy' => 1, 'Low' => 2, 'Okay' => 3, 'Good' => 4, 'Bright' => 5];
$ml = $me['moods'] ?? [];
krsort($ml);
$today = date('Y-m-d');
$mm = $_GET['m'] ?? date('Y-m');
if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $mm)) $mm = date('Y-m');
if ($mm > date('Y-m')) $mm = date('Y-m');
$first = strtotime("$mm-01");
$prev = date('Y-m', strtotime('-1 month', $first));
$next = date('Y-m', strtotime('+1 month', $first));
$total = count($ml);
$cur = 0;
for ($i = isset($ml[$today]) ? 0 : 1; isset($ml[date('Y-m-d', strtotime("-$i day"))]); $i++) $cur++;
$best = 0;
$run = 0;
$last = null;
$asc = $ml;
ksort($asc);
foreach ($asc as $k => $x) {
    $run = ($last && round((strtotime($k) - strtotime($last)) / 86400) == 1) ? $run + 1 : 1;
    $best = max($best, $run);
    $last = $k;
}
$cnt = array_fill_keys(array_keys($MO), 0);
foreach ($ml as $x) if (isset($cnt[$x['m']])) $cnt[$x['m']]++;
$avg = $total ? array_sum(array_map(fn($x) => $SC[$x['m']] ?? 3, $ml)) / $total : 0;
$top = $total ? array_search(max($cnt), $cnt) : '';
$wd = [];
foreach ($ml as $k => $x) $wd[date('l', strtotime($k))][] = $SC[$x['m']] ?? 3;
$bestd = '';
$bv = 0;
foreach ($wd as $n => $v) if (count($v) >= 2 && array_sum($v) / count($v) > $bv) {
    $bv = array_sum($v) / count($v);
    $bestd = $n;
}
$tm = $ml[$today] ?? null;
$HX = ['Heavy' => '#f59ea0', 'Low' => '#83c1ff', 'Okay' => '#a6f89b', 'Good' => '#ffee83', 'Bright' => '#e9bdff'];
page_title('Mood journal', 'Every check-in is kept forever. Look back whenever you want.', '<a class="btn" href="?p=home">' . icon('plusc', 17) . 'Check in today</a>'); ?>
<section class="card mj-hero <?= $tm ? 't-' . $MO[$tm['m']] : 't-good' ?>">
    <div class=mj-hl>
        <small class=mut><?= $tm ? 'Today' : 'Not yet today' ?></small>
        <h2 class=hand><?= $tm ? 'You feel ' . esc(strtolower($tm['m'])) . '.' : 'How is today?' ?></h2>
        <p class=mut><?= !$total ? 'Your first check-in starts the story.' : ($bestd ? 'Your brightest day tends to be <b>' . $bestd . '</b>.' : 'Keep going. Patterns show up after a few days.') ?></p>
    </div>
    <?php if ($tm) echo '<img class=mj-hf src="img/mood/' . $MO[$tm['m']] . '-on.svg" alt="">'; ?>
</section>
<div class=mj>
    <div class="card mj-cal">
        <div class=between>
            <a class="ib mj-nav" href="?p=mood&amp;m=<?= $prev ?>" aria-label="Previous month"><?= icon('arrowl', 18) ?></a>
            <h2 class=hand><?= date('F Y', $first) ?></h2>
            <?= $mm < date('Y-m') ? '<a class="ib mj-nav" href="?p=mood&amp;m=' . $next . '" aria-label="Next month">' . icon('arrow', 18) . '</a>' : '<span class="ib mj-nav off"></span>' ?>
        </div>
        <div class=mj-stage><div class=mj-grid role=grid>
            <?php foreach (['M', 'T', 'W', 'T', 'F', 'S', 'S'] as $w) echo "<small class=mj-h>$w</small>";
            for ($i = 0; $i < (int)date('N', $first) - 1; $i++) echo '<span></span>';
            for ($n = 1; $n <= (int)date('t', $first); $n++) {
                $k = sprintf('%s-%02d', $mm, $n);
                $x = $ml[$k] ?? null;
                $fut = $k > $today;
                $past = $k < $today;
                echo '<button type=button class="mj-d' . ($x ? ' has t-' . $MO[$x['m']] : '') . ($k == $today ? ' td' : '') . ($past ? ' past' : '') . '"' . ($fut || $past ? ' disabled' : '') . ' data-day="' . $k . '" data-m="' . esc($x['m'] ?? '') . '" data-g="' . esc($x['g'] ?? '') . '" aria-label="' . date('D j M', strtotime($k)) . ($x ? ', ' . esc($x['m']) : '') . '">'
                    . ($x ? '<img src="img/mood/' . $MO[$x['m']] . '-on.svg" alt="">' : '') . '<i>' . $n . '</i></button>';
            } ?>
        </div></div>
        <form method=post class=mj-edit id=mjf hidden>
            <input type=hidden name=back value=mood><input type=hidden name=day id=mjday><input type=hidden name=m id=mjm>
            <b id=mjt class=hand>Pick a day</b>
            <div class=mpick><?php foreach ($MO as $n => $k) echo "<button type=button class=mo data-m=$n aria-pressed=false><img src=img/mood/$k-on.svg alt=''><span>$n</span></button>"; ?></div>
            <input name=g id=mjg maxlength=80 placeholder="A few words about that day (optional)">
            <div class=mj-act><button class=btn name=a value=mood id=mjs disabled><?= icon('check', 16) ?> Save</button></div>
        </form>
        <small class=mut>Only today can be logged. Once a day has passed, it stays as it was.</small>
    </div>
    <div class=mj-side>
        <div class="card mj-stats">
            <div><b><?= $total ?></b><small>check-ins</small></div>
            <div><b><?= $cur ?></b><small>day streak</small></div>
            <div><b><?= $best ?></b><small>best streak</small></div>
        </div>
        <div class=card>
            <h3 class=hand>Your balance</h3>
            <?php if (!$total) echo '<p class=mut>Nothing logged yet. Your first check-in starts the story.</p>'; else { ?>
                <?php $dv = $dc = []; foreach ($cnt as $n => $c) if ($c) { $dv[] = $c; $dc[] = $HX[$n]; } ?>
                <div class="chart3d donut3d" data-3d=donut data-v="<?= implode(',', $dv) ?>" data-c="<?= implode(',', $dc) ?>" data-w=300 data-h=190 role=img aria-label="Mood balance chart. The list below has the numbers.">
                    <div class=mj-bar><?php foreach ($cnt as $n => $c) if ($c) echo '<i class="m-' . $MO[$n] . '" style="flex:' . $c . '" title="' . $n . ' · ' . $c . '"></i>'; ?></div>
                </div>
                <div class=mj-leg><?php foreach ($cnt as $n => $c) echo '<span><img src="img/mood/' . $MO[$n] . '-on.svg" alt="">' . $n . ' <b>' . $c . '</b></span>'; ?></div>
                <small class=mut>Most often <b><?= esc($top) ?></b> · average <?= number_format($avg, 1) ?> / 5</small>
            <?php } ?>
        </div>
        <div class=card>
            <h3 class=hand>Last 14 days</h3>
            <?php $bv = $bc = $bl = []; for ($i = 13; $i >= 0; $i--) {
                $k = date('Y-m-d', strtotime("-$i day"));
                $x = $ml[$k] ?? null;
                $bv[] = $x ? ($SC[$x['m']] ?? 3) : 0;
                $bc[] = $x ? ($HX[$x['m']] ?? '#ffee83') : '#d9d4cb';
                $bl[] = substr(date('D', strtotime($k)), 0, 1);
            } ?>
            <div class="chart3d bars3d" data-3d=bars data-v="<?= implode(',', $bv) ?>" data-c="<?= implode(',', $bc) ?>" data-l="<?= implode(',', $bl) ?>" data-w=320 data-h=210 role=img aria-label="Your mood for the last 14 days, one bar per day. Taller is brighter.">
                <div class=mj-trend><?php for ($i = 13; $i >= 0; $i--) {
                                        $k = date('Y-m-d', strtotime("-$i day"));
                                        $x = $ml[$k] ?? null;
                                        echo '<div class=mjb><span class=mjbar><i title="' . date('j M', strtotime($k)) . ($x ? ' · ' . esc($x['m']) : '') . '"' . ($x ? ' class="m-' . $MO[$x['m']] . '" style="height:' . ($SC[$x['m']] * 20) . '%"' : ' class=none') . '></i></span><small>' . substr(date('D', strtotime($k)), 0, 1) . '</small></div>';
                                    } ?></div>
            </div>
</div>
        </div>
    </div>
    <div class="card mj-log">
        <h3 class=hand>Everything you logged</h3>
        <?php if (!$ml) echo '<p class=mut>No entries yet.</p>';
        foreach (array_slice($ml, 0, 40, true) as $k => $x) echo '<div class=mj-row><img src="img/mood/' . $MO[$x['m']] . '-on.svg" alt=""><span><b>' . esc($x['m']) . '</b>' . (($x['g'] ?? '') !== '' ? ' · ' . esc($x['g']) : '') . '</span><small>' . date('D j M Y', strtotime($k)) . '</small></div>';
        if ($total > 40) echo '<small class=mut>Showing the latest 40. Use the calendar for older months.</small>'; ?>
    </div>
</div>
