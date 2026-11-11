<?php
defined('ROOT') || exit;
/* ring card + call screen. Shared by the Friends list and the chat page (js/call.js looks for #call). */
?>
<div id=ring class=ringcard role=alertdialog aria-labelledby=rn aria-describedby=rk hidden>
    <span class=ring-av><i class="av" id=rav>?</i></span>
    <span class=ring-tx><b id=rn class=hand></b><small id=rk></small></span>
    <span class=ring-btns>
        <button type=button class="rb no" id=rno aria-label="Decline call"><?= icon('phone', 22) ?></button>
        <button type=button class="rb yes" id=ryes aria-label="Accept call"><?= icon('phone', 22) ?></button>
    </span>
</div>
<div id=call class=callui hidden role=dialog aria-modal=true aria-label="Call" data-state=calling>
    <div class=call-bg aria-hidden=true><i></i><i></i><i></i></div>
    <video id=rv autoplay playsinline></video>
    <div class=call-shade aria-hidden=true></div>
    <header class=call-top>
        <span class=cpill><i class=dot></i><b id=cnm2></b><time id=ctm>0:00</time></span>
        <span class=csec><?= icon('lock', 13) ?>Private call</span>
    </header>
    <section class=call-id aria-live=polite>
        <div class=call-av>
            <div class=call3d data-3d=orbit data-w=340 data-h=340 aria-hidden=true></div>
            <span class=call-ring></span><span class=call-ring></span>
            <i class="av" id=cav>?</i>
        </div>
        <h2 class=hand id=cnm>Someone</h2>
        <p class=callmsg id=cmsg role=status>Calling…</p>
    </section>
    <div class=call-hint id=chint role=status hidden><span><?= icon('rotate', 16) ?></span><b>Turn your phone sideways to see the whole screen</b><small>Pinch to zoom · double tap to zoom in</small></div>
    <video id=lv autoplay playsinline muted hidden></video>
    <div class=ctl role=group aria-label="Call controls">
        <button type=button class=cb id=kM aria-pressed=false><span class=cbi><span class=i-on><?= icon('mic', 24) ?></span><span class=i-off><?= icon('micoff', 24) ?></span></span><small>Mute</small></button>
        <button type=button class="cb off" id=kC aria-pressed=false><span class=cbi><span class=i-on><?= icon('video', 24) ?></span><span class=i-off><?= icon('videooff', 24) ?></span></span><small>Camera</small></button>
        <button type=button class=cb id=kF hidden aria-pressed=false aria-label="Full screen"><span class=cbi><span class=i-on><?= icon('expand', 24) ?></span><span class=i-off><?= icon('shrink', 24) ?></span></span><small>Full</small></button>
        <button type=button class=cb id=kS><span class=cbi><?= icon('screen', 24) ?></span><small>Share</small></button>
        <button type=button class="cb end" id=kE aria-label="Hang up"><span class=cbi><?= icon('phone', 26) ?></span><small>End</small></button>
    </div>
</div>
