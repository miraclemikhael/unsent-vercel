<?php
defined('ROOT') || exit;
/**
 * @var mixed $err
 */
    page_head('Sign in');
    $new = isset($_GET['new']); ?>
    <div class=split>
        <section class=left><img class=slogo src=img/logo.png alt=Unsent>
            <div class=tl><small class=red>YOUR QUIET WRITING SPACE</small>
                <h2 class=hand>Write what you can’t say. Keep what you’re not ready to send.</h2>
                <p class=mut>A private place to name the feeling, write the letter, and let the words become a little lighter.</p>
            </div><img class=art src=img/signin.png alt=""><small class="mut ico-line"><?= icon('lock', 14) ?> Private by design. Your letters stay yours.</small>
        </section>
        <section class=right>
            <div class=hl><small class=mut>Need a little help?</small><b class=ico-line><?= icon('help', 16) ?> Support</b></div>
            <form method=post class=box><input type=hidden name=a value=<?= $new ? 'register' : 'login' ?>>
                <h1><?= $new ? 'Create your space.' : 'Welcome back,<br>You’ve been missed.' ?></h1>
                <p class=mut>Sign in to return to your letters and your private space.</p>
                <?php if ($err) echo "<p class=err>$err</p>";
                if ($new) echo '<label>Your name<input name=name value="' . esc($_POST['name'] ?? '') . '" required></label>'; ?>
                <label>Email or username<input name=id value="<?= esc($_POST['id'] ?? '') ?>" autocomplete=username autocapitalize=off spellcheck=false required></label><label>Password<input type=password name=pw autocomplete="<?= $new ? 'new-password' : 'current-password' ?>" required></label>
                <?php if ($new) echo '<label>Confirm password<input type=password name=pw2 required></label>';
                if (!$new) echo '<div class=between><label class=chk><input type=checkbox checked> Remember me</label><a href="?p=recover"><b>Forgot password?</b></a></div>'; ?>
                <button class=btn><?= icon('arrow', 17) ?> <?= $new ? 'Create account' : 'Sign in' ?></button>
                <div class=or><span>or</span></div>
                <div id=gbtn class=gwrap data-id="<?= esc(GOOGLE_CLIENT_ID) ?>"><button type=button class="btn wh gfall" id=gfall><svg width=18 height=18 viewBox="0 0 48 48" aria-hidden=true><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-5 2.3-8.2 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg> Continue with Google</button></div>
                
                <p class="mut c"><?= $new ? 'Have an account? <a href="?p=signin"><b>Sign in</b></a>' : 'No account yet? <a href="?p=signin&new=1"><b>Create one</b></a>' ?></p>
            </form><small class="foot mut">By continuing, you agree to the Terms and Privacy Policy.</small>
        </section>
    </div>
    <script>window.GID = <?= json_encode(GOOGLE_CLIENT_ID) ?>;</script>
    <?php if (GOOGLE_CLIENT_ID !== '') echo '<script src="https://accounts.google.com/gsi/client" async defer></script>'; ?>
