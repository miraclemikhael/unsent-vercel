<?php
defined('ROOT') || exit;
/**
 * @var mixed $err
 */
    page_head('Recover');
    $s3 = isset($_SESSION['rec']);
    $live = mail_ready(); /* Gmail set up: real 6-digit code by email. Otherwise the old demo code. */
    $rc = $live ? ($_SESSION['rc'] ?? null) : null;
    if ($rc && $rc['exp'] < time()) $rc = null;
    $s1 = $live && !$s3 && !$rc; /* step 1: ask for the email */ ?>
    <div class=split style="grid-template-columns:500px 1fr">
        <section class="left yel"><img class=slogo src=img/logo.png alt=Unsent>
            <div class=tl style="margin:auto 0">
                <h2 class=hand style="width:auto;max-width:100%">Let’s get you back in, gently.</h2>
                <p>We’ll make sure it’s you, then help you choose a new password.</p>
                <div class=steps>
                    <div class="<?= $s1 ? 'cur' : '' ?>"><i class="<?= $s1 ? '' : 'dk' ?>"><?= $s1 ? 1 : icon('check', 14) ?></i><span><b>Email</b><small><?= $s1 ? 'Where should we send it?' : 'Address confirmed' ?></small></span></div>
                    <div class="<?= $s3 || $s1 ? '' : 'cur' ?>"><i><?= $s3 ? icon('check', 14) : 2 ?></i><span><b>Verify</b><small>Enter your code</small></span></div>
                    <div class="<?= $s3 ? 'cur' : '' ?>"><i>3</i><span><b>New password</b><small>Secure your account</small></span></div>
                </div>
            </div>
        </section>
        <section class=right><a class=back href="?p=signin"><?= icon('arrowl', 15) ?> Back to sign in</a>
            <form method=post class="box card">
                <div class=ico><?= icon('mail', 26) ?></div>
                <h1><?= $s1 ? 'Forgot your password?' : ($s3 ? 'New password' : 'Check your email') ?></h1>
                <?php if ($err) echo "<p class=err>$err</p>";
                if ($s3) { ?><input type=hidden name=a value=recover>
                    <p class=mut>Choose a new password for <b><?= esc($_SESSION['rec']) ?></b>.</p><label>New password<input type=password name=pw required></label><button class=btn><?= icon('arrow', 17) ?> Save password</button>
                <?php } elseif ($s1) { ?><input type=hidden name=a value=send>
                    <p class=mut>Enter the email on your account. We’ll send you a 6-digit code.</p>
                    <label>Email<input name=id type=email placeholder="you@example.com" value="<?= esc($_POST['id'] ?? '') ?>" autocomplete=email autocapitalize=off required></label>
                    <button class=btn><?= icon('arrow', 17) ?> Send code</button>
                    <div class=ok><?= icon('shield', 16) ?> Signed up with Google? You can set a password here too.</div>
                <?php } elseif ($live) { ?><input type=hidden name=a value=verify><input type=hidden name=code id=code>
                    <p class=mut>If <b><?= esc($rc['shown'] ?? '') ?></b> has an account, a 6-digit code is on its way. Enter it below.</p>
                    <div class=otp><?php for ($i = 0; $i < 6; $i++) echo '<input maxlength=1>'; ?></div><button class=btn><?= icon('arrow', 17) ?> Verify code</button>
                    <p class="mut c sm">Didn’t get it? <button class=lnk name=a value=resend formnovalidate>Send a new code</button></p>
                    <div class=ok><?= icon('shield', 16) ?> For your security, this code expires in 10 minutes.</div>
                <?php } else { ?><input type=hidden name=a value=verify><input type=hidden name=code id=code value=72550>
                    <p class=mut>We sent a 5-digit code to<br><input class=em name=id type=email placeholder="you@example.com" value="<?= esc($_POST['id'] ?? '') ?>" required>. Enter it below to continue.</p>
                    <div class=otp><?php foreach (str_split('72550') as $c) echo "<input maxlength=1 value=$c>"; ?></div><button class=btn><?= icon('arrow', 17) ?> Verify code</button>
                    <p class="mut c sm">Didn’t receive it? <b>Resend code</b> in 00:28</p>
                    <div class=ok><?= icon('shield', 16) ?> For your security, this code expires in 10 minutes.</div><?php } ?>
            </form><small class="foot mut">Still having trouble? Contact support</small>
        </section>
    </div>
