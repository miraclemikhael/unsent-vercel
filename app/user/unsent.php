<?php
defined('ROOT') || exit;
/**
 * @var mixed $L
 */
    page_head('Unsent drafts');
    page_start('unsent');
    $m = date('M Y');
    page_title('Unsent drafts', 'Every letter you kept, held safely in one place.', '<a class="btn sm" href="?p=write">+ New letter</a>'); ?>
    <div class=stats><?php foreach ([['mail', count($L), 'All letters'], ['calendar', count(array_filter($L, fn($l) => date('M Y', strtotime($l['date'])) == $m)), 'This month'], ['heart', count(array_filter($L, fn($l) => $l['kind'] == 'someone')), 'For someone'], ['pen', number_format(array_sum(array_map(fn($l) => str_word_count(plain_text($l['body'])), $L))), 'Words written']] as $x) echo "<div class=card><i class=ic>" . icon($x[0], 20) . "</i><span><big>{$x[1]}</big><small class=mut>{$x[2]}</small></span></div>"; ?></div>
    <div class=between style="margin:20px 0"><input id=q class=search placeholder="Search your letters">
        <div class=moods style="margin:0"><button class="chip on" data-f=all>All</button><button class=chip data-f=someone>Someone</button><button class=chip data-f=myself>Myself</button><button class=chip data-f=past>My past</button></div>
    </div>
    <form id=ca method=post data-title="Delete all your letters?" data-confirm="Every unsent letter you’ve kept will be removed. You can’t undo this." data-yes="Yes, delete all" data-no="Keep them"><input type=hidden name=a value=clearall></form>
    <div class=lib<?= $L ? '' : ' style="grid-template-columns:1fr"' ?>>
        <div class="card list">
            <div class=between><small><b><?= count($L) ?> letters</b></small><?php if ($L) { ?><button type=submit form=ca class="btn sm wh">Clear all</button><?php } ?></div><?php if (!$L) echo empty_state();
                                                                                                                                                                                letter_rows($L); ?>
        </div>
        <?php if ($L) { ?><div class="card beige side">
                <div class=between><span class=tag id=stag></span><span>
                        <form method=post id=sf style="display:inline" data-title="Delete this letter?" data-confirm="This letter will be gone for good. You can’t undo this." data-yes="Delete letter" data-no="Keep it"><input type=hidden name=a value=del><input type=hidden name=id id=sid><a class="sq" id=se aria-label="Edit letter"><?= icon('pen', 16) ?></a> <button type=button class=sq id=sm aria-label="Email this letter"><?= icon('mailsend', 16) ?></button> <button class=sq aria-label="Delete letter"><?= icon('trash', 16) ?></button></form>
                    </span></div>
                <h2 class=hand id=st>Select a letter</h2><small class=mut id=sd></small>
                <hr>
                <p id=sb></p><div id=spics class=spics hidden></div><img id=spic src=img/bottle.png alt="">
                <div class=priv><?= icon('lock', 14) ?> Kept private. Nothing was sent.</div>
            </div><?php } ?>
    </div>
    <script>window.MAILOK = <?= json_encode(mail_ready()) ?>;</script>
