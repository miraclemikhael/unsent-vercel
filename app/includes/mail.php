<?php
defined('ROOT') || exit;
/* tiny Gmail SMTP client (STARTTLS + app password). No composer needed.
   When something goes wrong, the reason is left in $GLOBALS['MAIL_ERR'] (shown to the user + in mail-test.php). */
function mail_ready()
{
    return GMAIL_USER !== '' && GMAIL_APP_PASSWORD !== '';
}
function mail_fail($why)
{
    $GLOBALS['MAIL_ERR'] = $why;
    return false;
}
/* a friendly line for the last mail error */
function mail_why()
{
    return $GLOBALS['MAIL_ERR'] ?? 'unknown error';
}
/* send an HTML email. $imgs = list of file paths shown inline as cid:i0, cid:i1 ... Returns true when Gmail accepted it. */
function mail_send($to, $subject, $html, $imgs = [])
{
    $GLOBALS['MAIL_ERR'] = '';
    if (!mail_ready()) return mail_fail('GMAIL_USER / GMAIL_APP_PASSWORD are empty. Fill them in config/secrets.php.');
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) return mail_fail('That is not a valid email address.');
    /* Google shows the app password as 4 groups with spaces: spaces are not part of it */
    $user = trim(GMAIL_USER);
    $pass = preg_replace('/\s+/', '', GMAIL_APP_PASSWORD);
    /* Laragon/Windows often has no CA list for PHP. If one is configured use it, else still encrypt but do not verify (local dev only). */
    $ca = ini_get('openssl.cafile') ?: ini_get('curl.cainfo');
    $ssl = ['peer_name' => 'smtp.gmail.com', 'SNI_enabled' => true];
    if ($ca && is_file($ca)) $ssl['cafile'] = $ca;
    else {
        $ssl['verify_peer'] = false;
        $ssl['verify_peer_name'] = false;
    }
    $ctx = stream_context_create(['ssl' => $ssl]);
    $s = @stream_socket_client('tcp://smtp.gmail.com:587', $en, $es, 15, STREAM_CLIENT_CONNECT, $ctx);
    if (!$s) return mail_fail("Cannot reach smtp.gmail.com:587 ($es). Firewall, antivirus or no internet?");
    stream_set_timeout($s, 20);
    $rd = function () use ($s) {
        $o = '';
        while (($l = fgets($s, 515)) !== false) {
            $o .= $l;
            if (($l[3] ?? ' ') === ' ') break;
        }
        return $o;
    };
    $cmd = function ($c) use ($s, $rd) {
        fwrite($s, $c . "\r\n");
        return $rd();
    };
    /* every step must get the answer we expect, or we stop and say which step failed */
    $need = function ($resp, $code, $step) use ($s) {
        if (str_starts_with($resp, $code)) return true;
        @fwrite($s, "QUIT\r\n");
        @fclose($s);
        return mail_fail("$step failed: " . trim(preg_replace('/\s+/', ' ', $resp)));
    };
    if (!$need($rd(), '220', 'Greeting')) return false;
    if (!$need($cmd('EHLO localhost'), '250', 'EHLO')) return false;
    if (!$need($cmd('STARTTLS'), '220', 'STARTTLS')) return false;
    if (!@stream_socket_enable_crypto($s, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
        @fclose($s);
        return mail_fail('Secure connection (TLS) to Gmail failed. Check the PHP openssl extension is enabled.');
    }
    if (!$need($cmd('EHLO localhost'), '250', 'EHLO (secure)')) return false;
    if (!$need($cmd('AUTH LOGIN'), '334', 'AUTH')) return false;
    if (!$need($cmd(base64_encode($user)), '334', 'Username')) return false;
    $auth = $cmd(base64_encode($pass));
    if (!str_starts_with($auth, '235')) {
        @fclose($s);
        return mail_fail('Gmail refused the login. Use a 16-letter App Password (not your normal password), made with 2-Step Verification ON. Gmail said: ' . trim(preg_replace('/\s+/', ' ', $auth)));
    }
    if (!$need($cmd('MAIL FROM:<' . $user . '>'), '250', 'MAIL FROM')) return false;
    if (!$need($cmd("RCPT TO:<$to>"), '250', 'RCPT TO')) return false;
    if (!$need($cmd('DATA'), '354', 'DATA')) return false;
    $b = 'u' . bin2hex(random_bytes(8));
    $subject = str_replace(["\r", "\n"], ' ', $subject);
    $m = 'From: Unsent <' . $user . ">\r\nTo: <$to>\r\nSubject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\nDate: " . date('r') . "\r\nMIME-Version: 1.0\r\nContent-Type: multipart/related; boundary=$b\r\n\r\n"
        . "--$b\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html)) . "\r\n";
    foreach ($imgs as $i => $f) {
        if (!is_file($f)) continue;
        $m .= "--$b\r\nContent-Type: " . mime_content_type($f) . "\r\nContent-Transfer-Encoding: base64\r\nContent-ID: <i$i>\r\nContent-Disposition: inline\r\n\r\n" . chunk_split(base64_encode(file_get_contents($f))) . "\r\n";
    }
    $m = preg_replace('/^\./m', '..', $m . "--$b--");
    fwrite($s, $m . "\r\n.\r\n");
    $fin = $rd();
    $cmd('QUIT');
    @fclose($s);
    if (!str_starts_with($fin, '250')) return mail_fail('Gmail did not accept the message: ' . trim(preg_replace('/\s+/', ' ', $fin)));
    return true;
}

/* ---- letter -> email ----
   Text styles become inline styles (mail apps ignore our CSS). Pictures keep the size they have on the note (% of the text width),
   sit left / center / right like they do on the note, and appear next to the paragraph they were placed beside. */
function email_body($h)
{
    $font = ['caveat' => "'Caveat','Segoe Script','Bradley Hand',cursive", 'kalam' => "'Kalam','Segoe Print','Bradley Hand',cursive", 'dancing' => "'Dancing Script','Brush Script MT',cursive", 'lora' => 'Lora,Georgia,serif', 'elite' => "'Special Elite','Courier New',monospace", 'manrope' => 'Manrope,Arial,sans-serif'];
    $base = ['p' => 'margin:0 0 12px;', 'div' => 'margin:0 0 12px;', 'ul' => 'margin:0 0 12px;padding-left:22px;', 'ol' => 'margin:0 0 12px;padding-left:22px;', 'li' => 'margin:0 0 4px;'];
    return preg_replace_callback('/<(p|div|ul|ol|li|span|b|i|u|strong|em)(?: class="([^"]*)")?>/i', function ($m) use ($font, $base) {
        $t = strtolower($m[1]);
        $st = $base[$t] ?? '';
        foreach (preg_split('/\s+/', $m[2] ?? '') as $c) {
            if ($c === 'ta-c') $st .= 'text-align:center;';
            elseif ($c === 'ta-r') $st .= 'text-align:right;';
            elseif ($c === 'ta-l') $st .= 'text-align:left;';
            elseif ($c === 'hd') $st .= "font-family:{$font['caveat']};font-size:34px;line-height:1.2;font-weight:700;";
            elseif ($c === 'script') $st .= "font-family:{$font['caveat']};font-size:26px;line-height:1.25;font-weight:700;";
            elseif ($c === 'sm') $st .= 'font-size:22px;';
            elseif (str_starts_with($c, 'f-') && isset($font[substr($c, 2)])) $st .= 'font-family:' . $font[substr($c, 2)] . ';';
            elseif (preg_match('/^s-(\d+)$/', $c, $z)) $st .= "font-size:{$z[1]}px;line-height:1.35;";
        }
        return "<$t" . ($st ? " style=\"$st\"" : '') . '>';
    }, clean_body($h));
}
/* the letter's text with its pictures placed in it. $imgs gets the picture files (cid:i0, cid:i1 ... in the same order). */
function email_content($l, &$imgs)
{
    $body = email_body($l['body'] ?? '');
    $st = [];
    foreach (array_values($l['stickers'] ?? []) as $s) if (upload_local_file($s['src'] ?? '')) $st[] = $s;
    usort($st, fn($a, $b) => [$a['p'] ?? 9999, $a['y'] ?? 0] <=> [$b['p'] ?? 9999, $b['y'] ?? 0]);
    $pic = function ($s) use (&$imgs) {
        $imgs[] = upload_local_file($s['src']);
        $w = max(8, min(100, (float)($s['w'] ?? 34)));
        $px = (int)round(500 * $w / 100);
        $cx = (float)($s['x'] ?? 50) + $w / 2;
        $al = $cx < 38 ? 'left' : ($cx > 62 ? 'right' : 'center');
        return "<div style=\"text-align:$al;margin:14px 0\"><img src=\"cid:i" . (count($imgs) - 1) . "\" alt=\"\" width=\"$px\" style=\"display:inline-block;width:{$px}px;max-width:100%;height:auto;border:0;border-radius:8px\"></div>";
    };
    if (!class_exists('DOMDocument') || !$st) return $body . implode('', array_map($pic, $st));
    $dom = new DOMDocument();
    libxml_use_internal_errors(true);
    $dom->loadHTML('<?xml encoding="utf-8"?><div>' . $body . '</div>');
    $root = $dom->getElementsByTagName('div')->item(0);
    $out = '';
    $k = 0;
    $at = fn($i) => implode('', array_map($pic, array_filter($st, fn($s) => isset($s['p']) && (int)$s['p'] === $i)));
    $out .= $at(0);
    foreach ($root->childNodes as $n) {
        if ($n->nodeType === XML_ELEMENT_NODE) {
            $out .= $dom->saveHTML($n);
            $out .= $at(++$k);
        } elseif (trim($n->textContent) !== '') $out .= htmlspecialchars($n->textContent);
    }
    /* pictures placed lower than the last paragraph, or saved before positions were kept, go at the end */
    $out .= implode('', array_map($pic, array_filter($st, fn($s) => !isset($s['p']) || (int)$s['p'] > $k)));
    return $out;
}
function email_letter_html($l, $me, $note = '')
{
    $imgs = [];
    $note = $note !== '' ? '<p style="margin:0 0 18px;font-size:16px;line-height:1.6">' . nl2br(esc($note)) . '</p>' : '';
    $to = ($l['to'] ?? '') !== '' ? '<div style="font-size:13px;color:#7d766f;margin:0 0 16px">A letter to ' . esc($l['to']) . '</div>' : '';
    $content = email_content($l, $imgs);
    $html = '<div style="background:#f3ece5;padding:24px 10px"><div style="font-family:Georgia,serif;max-width:560px;margin:auto">'
        . '<div style="font-family:\'Caveat\',\'Segoe Script\',cursive;font-size:30px;font-weight:700;color:#2a2a2a;padding:0 6px 12px">Unsent</div>'
        . '<div style="background:#fffdf7;padding:28px 32px;border:1px solid #e6dcd3;border-radius:16px;color:#26292b">'
        . $note . '<h1 style="margin:0 0 4px;font-family:\'Caveat\',\'Segoe Script\',cursive;font-size:36px;line-height:1.1;color:#2a2a2a">' . esc($l['title'] ?? '') . '</h1>' . $to
        . '<div style="font-size:17px;line-height:1.65">' . $content . '</div></div>'
        . '<div style="font:12px/1.5 Arial,sans-serif;color:#7d766f;padding:14px 6px 0">' . esc($me['name']) . ' sent you this from Unsent, a private space for unsent words.</div>'
        . '</div></div>';
    return [$html, $imgs];
}
