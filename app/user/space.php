<?php
defined('ROOT') || exit;
/**
 * @var mixed $me
 * @var mixed $d
 * @var mixed $L
 */
/* "Me" page: your own space. Choose a color + vibe (the whole page changes), make the account public or private,
   and make each letter public or private. ?u=username shows someone else's PUBLIC space (public letters only). */
$who = $me;
$mine = true;
if (isset($_GET['u']) && strcasecmp($_GET['u'], $me['username']) != 0) {
    $who = null;
    foreach ($d['users'] as $u) if (strcasecmp($u['username'] ?? '', (string)$_GET['u']) == 0) $who = $u;
    $mine = false;
}
page_head($mine ? 'Me' : 'Space');
page_start('space');
echo '<style id=spvars>:root{' . space_vars($who ?: $me) . '}</style>';
if (!$who || (!$mine && empty($who['s_public']))) {
    echo '<div class="card spw c" data-vibe=cozy><i class=ic>' . icon('lock') . '</i><h2 class=hand>This space is private</h2><p class=mut>They haven’t opened it to others.</p><a class="btn" href="?p=space">Back to my space</a></div>';
    return;
}
$pub = !empty($who['s_public']);
$vibe = $who['s_vibe'] ?? 'cozy';
$ac = $who['s_accent'] ?? '#ffec85';
$WL = array_values(array_filter($d['letters'], fn($l) => is_owner($l, $who['email']) && ($mine || !empty($l['pub']))));
usort($WL, fn($a, $b) => strtotime($b['date']) <=> strtotime($a['date']));
$np = count(array_filter($WL, fn($l) => !empty($l['pub'])));
$MO = ['Heavy' => 'heavy', 'Low' => 'low', 'Okay' => 'okay', 'Good' => 'good', 'Bright' => 'bright'];
$tm = ($who['moods'] ?? [])[date('Y-m-d')] ?? null;
$wm = $who['moods'] ?? [];
$sk = 0;
for ($i = isset($wm[date('Y-m-d')]) ? 0 : 1; isset($wm[date('Y-m-d', strtotime("-$i day"))]); $i++) $sk++; ?>
<div class=spw data-vibe="<?= esc($vibe) ?>" id=spw>
    <?php $bn = upload_path($who['banner'] ?? ''); ?>
    <section class="sp-hero card">
        <div class="sp-banner<?= $bn ? ' has' : '' ?>" id=spbn data-orig="<?= esc(upload_path($who['banner_src'] ?? '')) ?>"<?= $bn ? ' style="background-image:url(' . esc($bn) . ')"' : '' ?>>
            <?php if ($mine) { ?><div class=bn-act><button type=button class=bn-b id=bnb><?= icon('camera', 16) ?><span id=bnt><?= $bn ? 'Change banner' : 'Add banner' ?></span></button><button type=button class=bn-b id=bna aria-label="Move and resize banner" <?= $bn ? '' : 'hidden' ?>><?= icon('sliders', 16) ?><span>Adjust</span></button><button type=button class=bn-b id=bnx aria-label="Remove banner" <?= $bn ? '' : 'hidden' ?>><?= icon('trash', 16) ?></button><input type=file id=bnf accept="image/png,image/jpeg,image/webp" hidden></div><?php } ?>
        </div>
        <?php if ($mine) { $av = upload_path($who['avatar'] ?? ''); ?>
            <span class=av-w><?= avatar_html($who, 'big') ?><button type=button class=av-edit id=ave aria-label="Edit profile photo" data-src="<?= esc($av) ?>" data-orig="<?= esc(upload_path($who['avatar_src'] ?? '')) ?>"><?= icon('camera', 15) ?></button></span>
        <?php } else echo avatar_html($who, 'big'); ?>
        <div class=sp-id>
            <h1><?= esc($who['name']) ?></h1>
            <p class=mut>@<?= esc($who['username']) ?> · <span id=sppill class="sp-pill <?= $pub ? 'pub' : '' ?>"><?= icon($pub ? 'users' : 'lock', 13) ?> <span><?= $pub ? 'Public' : 'Private' ?></span></span></p>
            <?php if ($mine) { ?><input id=spbio class=sp-bio maxlength=140 placeholder="Write a short line about your space…" value="<?= esc($who['s_bio'] ?? '') ?>" aria-label="Bio">
            <?php } elseif (!empty($who['s_bio'])) echo '<p class=sp-bio-t>' . esc($who['s_bio']) . '</p>'; ?>
        </div>
    </section>
    <?php if ($mine) { ?>
        <div class=sp-tools><a class="btn sm wh" href="?p=profile"><?= icon('sliders', 16) ?> Settings</a><button type=button class="btn sm wh" id=spcz aria-expanded=false aria-controls=spcust><?= icon('palette', 16) ?> Customize</button><a class="btn sm wh" href="?p=unsent"><?= icon('mail', 16) ?> Unsent drafts</a><form method=post class=sp-lo><input type=hidden name=a value=logout><button class="btn sm wh out"><?= icon('out', 16) ?> Log out</button></form></div>
    <?php } ?>
    <?php if ($tm) echo '<section class="sp-today t-' . $MO[$tm['m']] . '"><img src="img/mood/' . $MO[$tm['m']] . '-on.svg" alt=""><span><small>Today</small><b>Feeling ' . esc(strtolower($tm['m'])) . '</b></span>' . ($mine ? '<a class=sp-go href="?p=mood" aria-label="Open mood journal">' . icon('arrow', 16) . '</a>' : '') . '</section>'; ?>
    <section class=sp-stats>
        <div><b><?= count($WL) ?></b><small><?= $mine ? 'letters' : 'shared' ?></small></div>
        <div><b><?= $np ?></b><small>public</small></div>
        <div><b><?= count($wm) ?></b><small>check-ins</small></div>
        <div><b><?= $sk ?></b><small>day streak</small></div>
    </section>
    <?php if ($mine) { ?>
        <div id=spcust hidden>
        <section class=card id=splook>
            <h3 class=hand>Make it yours</h3><small class=mut>Pick a vibe and a color. The whole page changes with it.</small>
            <div class=sp-row><b>Vibe</b>
                <div class=sp-vibes><?php foreach (SPACE_VIBES as $k => $v) echo '<button type=button class="sp-v' . ($k == $vibe ? ' on' : '') . '" data-vibe="' . $k . '" data-bg="' . $v[1] . '" data-ink="' . $v[2] . '" data-card="' . $v[3] . '" aria-pressed="' . ($k == $vibe ? 'true' : 'false') . '"><i style="background:' . $v[1] . ';color:' . $v[2] . '">Aa</i>' . $v[0] . '</button>'; ?></div>
            </div>
            <div class=sp-row><b>Color</b>
                <div class=sp-colwrap>
                    <div class=sp-cols><?php $inList = false; foreach (SPACE_ACCENTS as $c) { if (strcasecmp($c, $ac) == 0) $inList = true; echo '<button type=button class="sp-c' . (strcasecmp($c, $ac) == 0 ? ' on' : '') . '" data-c="' . $c . '" style="background:' . $c . '" aria-label="Color ' . $c . '"></button>'; } ?>
                        <button type=button class="sp-c sp-custom<?= $inList ? '' : ' on' ?>" id=spwb title="Color wheel: any color" aria-label="Open color wheel" aria-expanded=false aria-controls=spwheel><?= icon('palette', 16) ?></button></div>
                    <div id=spwheel class=sp-wheel hidden>
                        <label class=sp-hex><span>Hex</span><input id=sphex maxlength=7 spellcheck=false autocomplete=off autocapitalize=off value="<?= esc($ac) ?>"></label>
                        <label class=sp-lite><span>Light</span><input type=range id=splite min=8 max=92 value=60 aria-label="Lightness"></label>
                    </div>
                </div>
            </div>
            <div class=sp-row><b>Account</b>
                <div class=sp-acct><span><b id=spat><?= $pub ? 'Public account' : 'Private account' ?></b><br><small class=mut id=spas><?= $pub ? 'Others can see this page and the letters you made public.' : 'Only you can see this page.' ?></small></span>
                    <label class=sw><input type=checkbox id=spacct <?= $pub ? 'checked' : '' ?>><i></i></label></div>
            </div>
            <div class=sp-act><button type=button class=btn id=spsave><?= icon('check', 16) ?> Save look</button><button type=button class="btn wh" id=pwaI hidden><?= icon('download', 16) ?> Install app</button></div>
        </section>
        <section class=card id=notif>
            <h3 class=hand>Alerts</h3><small class=mut id=pusht>Get a nudge for new messages and calls.</small>
            <div class=sp-act><button type=button class=btn id=pushb><?= icon('bell', 16) ?> Turn on alerts</button><button type=button class="btn wh" id=pushoff hidden>Turn off</button></div>
        </section>
        </div>
    <?php } ?>
    <section class=card id=view>
        <div class=between><h3 class=hand><?= $mine ? 'Your letters' : 'Public letters' ?></h3></div>
        <?php if (!$WL) echo '<p class=mut>' . ($mine ? 'No letters yet. Write one and come back to choose who sees it.' : 'Nothing shared yet.') . '</p>';
        $RX = react_counts(array_column($WL, 'id'), (int)($me['_id'] ?? 0));
        echo '<div class=sp-board>';
        foreach ($WL as $l) { $rx = $RX[$l['id']] ?? [0, 0, 0]; ?>
            <div class="sp-l<?= !empty($l['pub']) ? ' pub' : '' ?>" data-id="<?= esc($l['id']) ?>">
                <?= space_card($l) ?>
                <span class=sp-lt<?= $mine ? '' : ' data-open role=button tabindex=0 aria-label="Read and comment: ' . esc($l['title']) . '"' ?>><small class=mut>To <?= esc($l['to'] ?: 'you') ?> · <?= esc($l['date']) ?></small>
                    <span class=rx>
                        <?php if ($mine) { ?><span class="rx-b ro" title="Likes"><?= icon('heart', 16) ?><i data-n=likes><?= $rx[0] ?></i></span>
                        <?php } else { ?><button type=button class="rx-b<?= $rx[2] ? ' on' : '' ?>" data-like aria-pressed="<?= $rx[2] ? 'true' : 'false' ?>" aria-label="Like"><?= icon('heart', 16) ?><i data-n=likes><?= $rx[0] ?></i></button><?php } ?>
                        <button type=button class=rx-b data-open aria-label="Comments"><?= icon('chat', 16) ?><i data-n=comments><?= $rx[1] ?></i></button>
                    </span></span>
                <?php if ($mine) echo '<label class="sw sp-sw" title="Make this letter public"><input type=checkbox ' . (!empty($l['pub']) ? 'checked' : '') . ' aria-label="Public: ' . esc($l['title']) . '"><i></i></label><small class=sp-st>' . (!empty($l['pub']) ? 'Public' : 'Private') . '</small>'; ?>
            </div>
        <?php } echo '</div>'; ?>
        <?php if ($mine) echo '<small class="mut sp-foot">Public letters show only if your account is public too.</small>'; ?>
    </section>
</div>
