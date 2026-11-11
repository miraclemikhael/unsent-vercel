<?php
defined('ROOT') || exit;
/* print a list of letters (as links when $link is true) */
function letter_rows($L, $link = false)
{
    foreach ($L as $l) {
        $t = plain_text($l['body']);
        $tg = $link ? 'a' : 'div';
        $at = $link ? ' href="?p=unsent&open=' . urlencode($l['id']) . '" aria-label="Open letter: ' . esc($l['title']) . '"' : ' tabindex=0 role=button';
        echo '<' . $tg . $at . ' class=row data-k="' . esc($l['kind']) . '" data-t="' . esc($l['title']) . '" data-b="' . esc($t) . '" data-d="' . esc($l['date'] . (!empty($l['at']) ? ' · ' . date('H:i', strtotime($l['at'])) : '')) . ' · ' . str_word_count($t) . ' words" data-st="' . esc(json_encode(array_values(array_filter(array_map(fn($x) => upload_path($x['src'] ?? ''), $l['stickers'] ?? []))))) . '" data-id="' . esc($l['id']) . '" data-tag="' . esc(KL[$l['kind']] ?? '') . '" data-pc="' . (upload_path($l['front'] ?? '') ?: (str_starts_with($l['paper'], 'img:') && is_file(PUB . '/img/postcards/' . substr($l['paper'], 4) . '-front.jpg') ? 'img/postcards/' . substr($l['paper'], 4) . '-front.jpg' : '')) . '"><img src="' . (upload_path($l['front'] ?? '') ?: (str_starts_with($l['paper'], 'img:') && is_file(PUB . '/img/postcards/' . substr($l['paper'], 4) . '-front.jpg') ? 'img/postcards/' . substr($l['paper'], 4) . '-front.jpg' : 'img/thumb.png')) . '" alt="" class="' . (str_starts_with($l['paper'], 'img:') || upload_path($l['front'] ?? '') ? 'pcthumb' : '') . '"><b>' . esc($l['title']) . '</b><span class="tag ' . esc($l['kind']) . '">' . esc(KL[$l['kind']] ?? '') . '</span><small class=to>To ' . esc($l['to'] ?: 'you') . ',</small><small class=ex>“' . esc(mb_substr($t, 0, 62)) . '”</small><small class=dt>' . esc($l['date']) . '</small>' . ($link ? '' : '<button type=button class=rmail data-mail="' . esc($l['id']) . '" aria-label="Email this letter" title="Email this letter">' . icon('mailsend', 16) . '</button>') . '</' . $tg . '>';
    }
}
/* print the big page title, subtitle and optional button */
function page_title($h, $s, $btn = '')
{
    echo "<header class=top><div><h1>$h</h1><p class=mut>$s</p></div>$btn</header>";
}
