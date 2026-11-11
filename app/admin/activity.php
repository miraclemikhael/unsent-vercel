<?php
defined('ROOT') || exit;
/**
 * @var mixed $days
 * @var mixed $ev
 * @var mixed $k
 * @var mixed $lc
 * @var mixed $mc
 * @var mixed $t0
 */
echo '<div class=card><h3>Daily activity</h3><small class=mut>Totals for ' . date('F Y', $t0) . '. Nothing here is tied to a person or a letter.</small><div class=tw><table class=at><thead><tr><th>Date<th>Active users<th>Letters created<th>Check-ins</tr></thead><tbody>';
foreach (array_reverse($days) as $k) if ($k <= date('Y-m-d')) echo '<tr><td>' . esc(admin_date($k)) . '<td>' . count($ev[$k] ?? []) . '<td>' . ($lc[$k] ?? 0) . '<td>' . ($mc[$k] ?? 0) . '</tr>';
echo '</tbody></table></div></div>';
