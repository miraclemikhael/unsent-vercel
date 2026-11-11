<?php
defined('ROOT') || exit;
/* Create-account view. Same template as login.php, which reads ?new=1. */
$_GET['new'] = 1;
require ROOT . '/login.php';
