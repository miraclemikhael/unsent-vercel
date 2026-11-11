<?php
defined('ROOT') || exit;
/**
 * @var mixed $d
 */
echo '<div class=card><h3>Admin audit log</h3><small class=mut>The most recent 200 admin actions.</small><div class=tw><table class=at><thead><tr><th>When<th>Admin<th>Action<th>Account</tr></thead><tbody>';
foreach (array_reverse($d['audit'] ?? []) as $x) echo '<tr><td>' . esc(admin_time_ago($x['t'])) . '<td>' . esc($x['by']) . '<td>' . esc($x['a']) . '<td>' . esc($x['on']) . '</tr>';
if (empty($d['audit'])) echo '<tr><td colspan=4>No admin actions yet. Suspending, promoting or deleting an account will show up here.</tr>';
echo '</tbody></table></div></div>';
