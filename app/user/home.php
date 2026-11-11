<?php
defined('ROOT') || exit;
/**
 * @var mixed $me
 * @var mixed $L
 */
    page_head('Home');
    page_start('home');
    page_title('<span data-greet>Good morning</span>, ' . esc(strtolower(strtok($me['name'], ' '))) . '.', 'A quiet space for the things that are hard to say.'); ?>
    <div class=hgrid>
        <div class=hmain><?php $MO = ['Heavy' => 'heavy', 'Low' => 'low', 'Okay' => 'okay', 'Good' => 'good', 'Bright' => 'bright'];
                            // per-mood copy: [hint under heading, input placeholder, closing message]
                            $MP = [
                                'Heavy' => ['That sounds heavy. You can let it out here.', 'What’s weighing on you?', 'Thank you for naming it. Carrying <b class="gw hand">{g}</b> is hard, and you don’t have to hold it alone. We’re here with you.', 'weighing on you: '],
                                'Low' => ['It’s okay to feel low. Want to say why?', 'What’s got you feeling down?', 'Thank you for sharing that <b class="gw hand">{g}</b> is on your heart. Be gentle with yourself today.', 'feeling down about '],
                                'Okay' => ['A steady kind of day. Anything on your mind?', 'What’s on your mind today?', 'Thanks for checking in. We’re glad you took a moment for <b class="gw hand">{g}</b>.', 'on your mind: '],
                                'Good' => ['Nice! Let’s remember what made it good.', 'What made today good?', 'We’re glad that <b class="gw hand">{g}</b> made your day good! We wish you more of it.', 'good because of '],
                                'Bright' => ['Love that for you! Tell us what’s lighting you up.', 'What’s making you so happy?', 'We’re so happy that <b class="gw hand">{g}</b> means a lot to you! Keep shining.', 'happy about '],
                            ];
                            $ml = $me['moods'] ?? [];
                            $today = date('Y-m-d');
                            $tm = $ml[$today] ?? null;
                            $mp0 = $MP[$tm['m'] ?? ''] ?? null;
                            $redo = isset($_GET['redo']);
                            $streak = 0;
                            for ($i = $tm ? 0 : 1; isset($ml[date('Y-m-d', strtotime("-$i day"))]); $i++) $streak++; ?>
            <div class="mood<?= $tm ? ' t-' . $MO[$tm['m']] : '' ?>" id=moodcard>
                <div class=mc>
                    <div class=eyebrow><?= icon('spark', 17) ?>Daily check-in</div>
                    <?php if ($tm && !$redo) {
                        $k = $MO[$tm['m']]; ?>
                        <div class=mdone><img class=mface src="img/mood/<?= $k ?>-on.svg" alt="<?= esc($tm['m']) ?>">
                            <div>
                                <p class=mmsg><?php if (($tm['g'] ?? '') !== '') {
                                                    echo str_replace('{g}', esc($tm['g'] ?? ''), $MP[$tm['m']][2]);
                                                } else echo 'Thanks for checking in. You’re feeling <b>' . esc($tm['m']) . '</b> today.'; ?></p><a class="btn sm wh" href="?p=home&amp;redo=1">Change today’s mood</a>
                            </div>
                        </div>
                    <?php } else { ?>
                        <div>
                            <h2 class=hand>How are you feeling?</h2>
                            <p id=mhint data-def="Tap a face, then log it."><?= esc($mp0[0] ?? 'Tap a face, then log it.') ?></p>
                        </div>
                        <form method=post class=mform id=mform><input type=hidden name=a value=mood><input type=hidden name=m id=mval value="<?= esc($tm['m'] ?? '') ?>">
                            <div class=mpick><?php foreach ($MO as $n => $k) {
                                                    $on = ($tm['m'] ?? '') == $n;
                                                    echo "<button type=button class='mo" . ($on ? ' on' : '') . "' data-m=$n data-k=$k data-hint=\"" . esc($MP[$n][0]) . "\" data-ph=\"" . esc($MP[$n][1]) . "\" aria-pressed=" . ($on ? 'true' : 'false') . "><img src=img/mood/$k" . ($on ? '-on' : '') . ".svg alt=''><span>$n</span></button>";
                                                } ?></div>
                            <div class=mrow><label class=gin><?= icon('heart', 17) ?><input name=g maxlength=80 id=gtxt placeholder="<?= esc($mp0[1] ?? 'How are you feeling, in a few words?') ?>" value="<?= esc($tm['g'] ?? '') ?>" aria-label="Tell us more about your mood"></label><button class="btn mlog" id=mlog<?= $tm ? '' : ' disabled' ?>>Log mood <?= icon('plusc', 17) ?></button></div>
                        </form>
                    <?php } ?>
                </div><img class=reach src=img/hand.png alt="">
            </div>
            <div class="card rl">
                <div class=between>
                    <div>
                        <h2 class=hand>Recent letters</h2><small class=mut>Your words stay private, always.</small>
                    </div><a href="?p=unsent"><b class=sm>View all <?= icon('arrow', 14) ?></b></a>
                </div><?php if (!$L) echo empty_state();
                        letter_rows(array_slice($L, 0, 3), true); ?>
            </div>
        </div>
        <div class=hside>
            <div class=card>
                <div class=between><i class="ic hot"><?= icon('flame') ?></i><span class=wkr><small class=mut>This week · <?= array_sum(array_map(fn($i) => isset($ml[date("Y-m-d", strtotime("+$i day", strtotime("monday this week")))]) ? 1 : 0, range(0, 6))) ?>/7</small><a class=mhist href="?p=mood">View mood history</a></span></div>
                <div class=streak><?= $streak ?> day<?= $streak == 1 ? '' : 's' ?></div><small class=mut style="font-size:12px"><?= $streak ? 'You made room for your thoughts.' : 'Log a mood to start your streak.' ?></small>
                <div class=week><?php $mon = strtotime('monday this week');
                                $wk = 0;
                                $dt = '';
                                foreach (range(0, 6) as $i) {
                                    $ts = strtotime("+$i day", $mon);
                                    $k = date('Y-m-d', $ts);
                                    $x = $ml[$k] ?? null;
                                    $fut = $k > $today;
                                    if ($x) $wk++;
                                    $t = ($k == $today ? 'Today' : date('D j M', $ts)) . (!empty($x['at']) ? ', ' . date('H:i', strtotime($x['at'])) : '') . ($x ? ' · ' . $x['m'] . (($x['g'] ?? '') !== '' ? ' · ' . $MP[$x['m']][3] . $x['g'] : '') : ($fut ? ' · still ahead' : ' · nothing logged'));
                                    if ($k == $today) $dt = $t;
                                    echo '<button type=button class="wd' . ($k == $today ? ' td' : '') . ($fut ? ' fut' : '') . '" data-t="' . esc($t) . '" aria-label="' . esc($t) . '" aria-pressed=' . ($k == $today ? 'true' : 'false') . '><span class="' . ($x ? 'log' : '') . '">' . ($x ? '<img src=img/mood/' . $MO[$x['m']] . '-on.svg alt="">' : '') . '</span><small>' . substr(date('D', $ts), 0, 1) . '</small></button>';
                                } ?></div><small class="mut wdet" id=wdet aria-live=polite><?= esc($dt) ?></small>
            </div>
            <div class="card dark">
                <div class=between><?= icon('quote') ?></div><div class=mail3d data-3d=mail aria-hidden=true></div>
                <h2 class=hand>What would you say if you knew you’d be understood?</h2><a class="btn wh" href="?p=write"><?= icon('arrow', 17) ?> Start with this</a>
            </div>
            <div class="green"><?= icon('lock', 19) ?><div><b>Private by design</b><br><small>Your letters are visible only to you.</small></div>
            </div>
        </div>
    </div>
