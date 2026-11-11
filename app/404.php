<?php
defined('ROOT') || exit;
http_response_code(404);
page_head('Not found');
page_start('');
page_title('Page not found', 'That page isn’t here.', '<a class="btn" href="?p=home">' . icon('home', 17) . 'Back home</a>');
