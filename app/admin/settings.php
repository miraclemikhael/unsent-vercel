<?php
defined('ROOT') || exit;
/**
 * @var mixed $d
 * @var mixed $me
 */
echo '<form method=post class=card><input type=hidden name=a value=adm_set><input type=hidden name=t value="' . esc($_SESSION['csrf']) . '"><input type=hidden name=v value=settings><h3>Workspace</h3><div class="between prow"><span><b>Allow new sign-ups</b><br><small class=mut>Turn off to pause new accounts. People who already have one can still sign in.</small></span><label class=sw><input type=checkbox name=signups ' . (($d['settings']['signups'] ?? 1) ? 'checked' : '') . '><i></i></label></div><button class="btn sm">Save changes</button></form>';
echo '<div class=card style="margin-top:20px"><h3>Your admin account</h3><div class="between prow"><span><b>' . esc($me['name']) . '</b><br><small class=mut>' . esc($me['email']) . '</small></span><span class="rb adm">Administrator</span></div></div>';
