<?php
defined('ROOT') || exit;
/**
 * @var mixed $a
 * @var mixed $d
 * @var mixed $me
 * @var mixed $mi
 */
if ($a == 'logout') {
    if ($me) {
        $d['users'][$mi]['last_logout'] = date('Y-m-d H:i:s');
        save_data($d);
    }
    session_destroy();
    redirect_to_page('signin');
}
