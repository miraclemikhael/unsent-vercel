<?php
defined('ROOT') || exit;
/* true if this letter belongs to this email */
function is_owner($l, $em)
{
    return strcasecmp((string)($l['owner'] ?? ''), (string)$em) === 0;
}
/* true if password has 8+ chars, a letter and a number */
function password_ok($p)
{
    return strlen($p) >= 8 && preg_match('/[A-Za-z]/', $p) && preg_match('/\d/', $p);
}
/* make text safe to print in HTML (stops code injection) */
function esc($s)
{
    return htmlspecialchars((string)$s, ENT_QUOTES);
}
/* ---- uploaded files (pictures, voice notes) live in the MySQL table `files`: Vercel has no writable disk ---- */
function files_table()
{
    db_connect()->exec('CREATE TABLE IF NOT EXISTS files(name VARCHAR(80) NOT NULL PRIMARY KEY, mime VARCHAR(80) NOT NULL, data LONGBLOB NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)');
}
/* names of all stored files: one cheap query per request, then cached. $op 'add' / 'drop' keeps the cache right. */
function upload_names($op = null, $name = '')
{
    static $names = null;
    if ($names === null) {
        try {
            $names = array_flip(db_connect()->query('SELECT name FROM files')->fetchAll(PDO::FETCH_COLUMN));
        } catch (Throwable $e) {
            files_table();
            $names = [];
        }
    }
    if ($op === 'add') $names[$name] = 1;
    elseif ($op === 'drop') unset($names[$name]);
    return $names;
}
/* check an upload file name is safe and exists; return its url path (uploads/<name>) or empty text.
   Old letters may still say img/uploads/<name>: same file name, same table. */
function upload_path($f)
{
    if (!preg_match('~^(?:uploads|img/uploads)/([\w.\-]+)$~', (string)$f, $m)) return '';
    return isset(upload_names()[$m[1]]) ? 'uploads/' . $m[1] : '';
}
/* delete an uploaded file */
function delete_upload($f)
{
    if (!($f = upload_path($f))) return;
    db_connect()->prepare('DELETE FROM files WHERE name = ?')->execute([basename($f)]);
    upload_names('drop', basename($f));
}
/* put one uploaded file (already checked) into MySQL. Returns the new file name. */
function store_upload($tmp, $mime, $ext, $bytes = 8)
{
    $name = bin2hex(random_bytes($bytes)) . '.' . $ext;
    $data = file_get_contents($tmp);
    $put = function () use ($name, $mime, $data) {
        $st = db_connect()->prepare('INSERT INTO files(name, mime, data) VALUES(?,?,?)'); /* a missing table fails here, at prepare() */
        $st->bindValue(1, $name);
        $st->bindValue(2, $mime);
        $st->bindValue(3, $data, PDO::PARAM_LOB);
        $st->execute();
    };
    try {
        $put();
    } catch (PDOException $e) {
        files_table();
        $put();
    }
    upload_names('add', $name);
    return $name;
}
/* a real file on disk (in /tmp) for code that needs a path, like email attachments. '' if the upload is gone. */
function upload_local_file($f)
{
    if (!($f = upload_path($f))) return '';
    $tmp = sys_get_temp_dir() . '/unsent_' . basename($f);
    if (!is_file($tmp)) {
        $st = db_connect()->prepare('SELECT data FROM files WHERE name = ?');
        $st->execute([basename($f)]);
        $row = $st->fetch();
        if (!$row || @file_put_contents($tmp, $row['data']) === false) return '';
    }
    return $tmp;
}
/* save one uploaded picture (PNG / JPG / WebP, up to $max bytes). Returns its path (uploads/<name>), or '' if it is not allowed. */
function take_upload($f, $max)
{
    if (!$f || ($f['error'] ?? 1) !== 0 || $f['size'] > $max || !($im = @getimagesize($f['tmp_name'])) || !in_array($im[2], [IMAGETYPE_PNG, IMAGETYPE_JPEG, IMAGETYPE_WEBP])) return '';
    $x = [IMAGETYPE_PNG => 'png', IMAGETYPE_JPEG => 'jpg', IMAGETYPE_WEBP => 'webp'][$im[2]];
    return 'uploads/' . store_upload($f['tmp_name'], image_type_to_mime_type($im[2]), $x);
}
/* make the round profile picture (or first letter) HTML */
function avatar_html($u, $c = '')
{
    $a = upload_path($u['avatar'] ?? '');
    $n = mb_strtoupper(mb_substr(trim($u['name'] ?? '') ?: '?', 0, 1));
    return '<i class="av ' . $c . ($a ? ' has' : '') . '"' . ($a ? ' style="background-image:url(' . esc($a) . ')"' : '') . '>' . ($a ? '' : esc($n)) . '</i>';
}
/* HTML shown when there are no letters yet */
function empty_state()
{
    return '<div class=empty><img class=lt src=img/empty.png alt=""><img class=dk src=img/empty-dark.png alt=""></div>';
}
/* keep only safe HTML tags in a letter body */
function clean_body($h)
{
    $h = strip_tags((string)$h, '<b><i><u><br><div><p><ul><ol><li><strong><em><span>');
    /* opening tags keep nothing but our own class names (no onclick=, style=, href= ...) */
    return preg_replace_callback('/<(b|i|u|br|div|p|ul|ol|li|strong|em|span)\b([^>]*)>/i', function ($m) {
        preg_match('/class\s*=\s*"([^"]*)"/i', $m[2], $c);
        $k = array_filter(preg_split('/\s+/', $c[1] ?? ''), fn($x) => preg_match('/^(script|sm|hd|ta-[lcr]|f-(caveat|kalam|dancing|lora|elite|manrope)|s-(12|14|16|18|20|24|28|32|40|48))$/', $x));
        return '<' . strtolower($m[1]) . ($k ? ' class="' . implode(' ', $k) . '"' : '') . '>';
    }, $h);
}
/* send the browser to index.php?p=PAGE and stop */
function redirect_to_page($p)
{
    header("Location: index.php?p=$p");
    exit;
}
/* ---- admin: role comes from the saved user record, never from the browser ---- */
function is_admin()
{
    global $me;
    return ($me['role'] ?? '') === 'admin';
}

const KL = ['someone' => 'Someone', 'past' => 'My Past', 'other' => 'Other', 'myself' => 'Myself'];
/* turn letter HTML into plain text */
function plain_text($h)
{
    return trim(html_entity_decode(strip_tags(str_replace(['<br>', '</div>', '</p>'], "\n", $h))));
}

/* "Me" page looks. accent colours + vibes (page background / text / card). Used by user/space.php and js/space.js */
const SPACE_ACCENTS = ['#ffec85', '#ffb347', '#ff8a80', '#ff9ecb', '#f6b8c4', '#d4c2ff', '#a78bfa', '#a9d6ff', '#5b9bff', '#5ed3c8', '#b5e8c3', '#c4e86b', '#ffc9a0', '#e3cfa8', '#8b95a7', '#2a2a2a'];
const SPACE_VIBES = [
    'cozy'   => ['Cozy', '#fff6e6', '#2a2a2a', '#ffffff'],
    'paper'  => ['Paper', '#f3ead8', '#3a3126', '#fbf6ea'],
    'rose'   => ['Rose', '#fde8ec', '#4a1f2a', '#fff6f8'],
    'sunset' => ['Sunset', '#ffe7d6', '#4a2514', '#fff5ee'],
    'garden' => ['Garden', '#e8f3e4', '#24331f', '#f6fbf3'],
    'ocean'  => ['Ocean', '#e1f0fb', '#12324a', '#f5fbff'],
    'dusk'   => ['Dusk', '#e9e4f7', '#2b2542', '#f7f4ff'],
    'mono'   => ['Mono', '#ececec', '#111111', '#ffffff'],
    'forest' => ['Forest', '#16241c', '#e6f2e6', '#223529'],
    'plum'   => ['Plum', '#2a1a30', '#f6e8fa', '#3a2542'],
    'night'  => ['Night', '#1e1c2a', '#f3efe9', '#2b293b'],
];
/* mix two #rrggbb colours: $t = how much of $b (0..1) */
function space_mix($a, $b, $t)
{
    $x = hexdec(substr($a, 1));
    $y = hexdec(substr($b, 1));
    $o = '#';
    foreach ([16, 8, 0] as $sh) $o .= str_pad(dechex((int)round((($x >> $sh) & 255) * (1 - $t) + (($y >> $sh) & 255) * $t)), 2, '0', STR_PAD_LEFT);
    return $o;
}
function space_dark_vibe($v)
{
    $n = hexdec(substr($v[1], 1));
    if ((($n >> 16) & 255) * 0.299 + (($n >> 8) & 255) * 0.587 + ($n & 255) * 0.114 < 110) return [$v[1], $v[2], $v[3]];   /* already a dark vibe */
    return [space_mix('#131211', $v[1], 0.09), '#f4efe9', space_mix('#1f1d1b', $v[3], 0.07)];
}
/* CSS variables for one user's look. "-l" = used in light theme, "-d" = used in dark theme (css/space.css picks) */
function space_vars($u)
{
    $v = SPACE_VIBES[$u['s_vibe'] ?? 'cozy'] ?? SPACE_VIBES['cozy'];
    $ac = preg_match('/^#[0-9a-fA-F]{6}$/', $u['s_accent'] ?? '') ? $u['s_accent'] : '#ffec85';
    $n = hexdec(substr($ac, 1));
    $on = ((($n >> 16) & 255) * 0.299 + (($n >> 8) & 255) * 0.587 + ($n & 255) * 0.114) < 110 ? '#ffffff' : '#2a2a2a';
    $bn = hexdec(substr($v[1], 1));
    $dk = ((($bn >> 16) & 255) * 0.299 + (($bn >> 8) & 255) * 0.587 + ($bn & 255) * 0.114) < 110;
    $d = space_dark_vibe($v);
    return "--sa:$ac;--son:$on;--sbg-l:{$v[1]};--sink-l:{$v[2]};--scard-l:{$v[3]};--sbg-d:{$d[0]};--sink-d:{$d[1]};--scard-d:{$d[2]};--slogo-l:" . ($dk ? 'invert(1)' : 'none') . ';';
}

/* Postcards on the Me / space page. msg = where the words go on the back (x, y, w, h in %), addr = (x, w, y) of the "To:" line, ink colour.
   Same numbers as the Write page uses (user/write.php). */
const SPACE_PC = [
    'birds'    => [[8, 11, 39, 79], [52, 44, 46], '#2a4a8c'],
    'seal'     => [[4, 33, 43, 58], [56, 38, 62], '#34445c'],
    'park'     => [[9, 21, 36, 69], [52, 40, 46], '#2f6b45'],
    'corfu'    => [[16, 31, 34, 46], [56, 40, 54], '#7a2f2f'],
    'military' => [[8, 19, 39, 71], [53, 40, 47], '#3f5a48'],
];
const SPACE_PF = ['caveat' => 'Caveat,cursive', 'kalam' => 'Kalam,cursive', 'dancing' => "'Dancing Script',cursive", 'lora' => 'Lora,Georgia,serif', 'elite' => "'Special Elite','Courier New',monospace", 'manrope' => 'Manrope,sans-serif'];
/* one letter as a flip-able postcard: picture on the front, the words on the back */
/* PUBLIC postmark: a round cancel mark with wavy lines, inked over the printed stamp on the back of the card.
   (It replaces the old red blob. It only shows when the letter is public.) The ink filter lives once per page. */
function public_postmark($date)
{
    static $d = false;
    $defs = $d ? '' : '<svg width=0 height=0 style="position:absolute" aria-hidden=true focusable=false><filter id="u-wear" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="3" result="w"/><feDisplacementMap in="SourceGraphic" in2="w" scale="3.2" xChannelSelector="R" yChannelSelector="G" result="r"/><feTurbulence type="fractalNoise" baseFrequency=".5" numOctaves="3" seed="11" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 12 0 0 0 -4.5" result="m"/><feComposite in="r" in2="m" operator="in"/></filter></svg>';
    $d = true;
    $t = strtoupper(preg_replace('/[^A-Za-z0-9 ]/', '', (string)$date));
    $wave = 'q7-6 14 0t14 0t14 0';
    return $defs . '<span class=spk-pm aria-hidden=true><svg viewBox="0 0 150 70" focusable=false>'
        . '<g filter="url(#u-wear)" fill=none stroke=currentColor stroke-width=2.2 stroke-linecap=round>'
        . '<circle cx=108 cy=35 r=31 /><circle cx=108 cy=35 r=26.5 stroke-width=1.1 />'
        . '<path d="M32 14' . $wave . '"/><path d="M32 26' . $wave . '"/><path d="M32 38' . $wave . '"/><path d="M32 50' . $wave . '"/></g>'
        . '<g filter="url(#u-wear)" fill=currentColor font-family="\'Special Elite\',\'Courier New\',monospace" text-anchor=middle>'
        . '<text x=108 y=33 font-size=11 font-weight=700 letter-spacing=.8>PUBLIC</text>'
        . '<text x=108 y=44 font-size=6 letter-spacing=.4>' . esc($t) . '</text></g></svg></span>';
}

function space_card($l)
{
    static $ar = [];
    $k = preg_match('/^img:(\w+)$/', (string)($l['paper'] ?? ''), $m) && isset(SPACE_PC[$m[1]]) ? $m[1] : 'birds';
    [$ms, $ad, $ink] = SPACE_PC[$k];
    if (!isset($ar[$k])) {
        $z = @getimagesize(PUB . "/img/postcards/$k-back.jpg");
        $ar[$k] = $z && $z[1] ? round($z[0] / $z[1], 4) : 1.5627;
    }
    $front = upload_path($l['front'] ?? '') ?: "img/postcards/$k-front.jpg";
    $pf = $l['pfont'] ?? '';
    $css = "--k-ar:{$ar[$k]};--ink:$ink;--k-x:{$ms[0]}%;--k-y:{$ms[1]}%;--k-w:{$ms[2]}%;--k-h:{$ms[3]}%;--k-ax:{$ad[0]}%;--k-aw:{$ad[1]}%;--k-ay:{$ad[2]}%";
    if (isset(SPACE_PF[$pf])) $css .= ';--tf:' . SPACE_PF[$pf];
    if (preg_match('/^#[0-9a-fA-F]{6}$/', $l['pcolor'] ?? '')) $css .= ';--tc:' . $l['pcolor'];
    return '<div class=spk-w><div class="spk' . (($l['ffit'] ?? '') === 'contain' ? ' contain' : '') . '" data-pf="' . esc($pf) . '" style="' . esc($css) . '" tabindex=0 role=button aria-pressed=false aria-label="Postcard: ' . esc($l['title']) . '. Press to turn it over.">'
        . '<div class=spk-in><i class="spk-e l"></i><i class="spk-e r"></i><i class="spk-e t"></i><i class="spk-e b"></i>'
        . '<div class="spk-f spk-front"><img src="' . esc($front) . '" alt="" loading=lazy><span class=spk-cap>' . esc($l['title']) . '</span></div>'
        . '<div class="spk-f spk-back"><img src="img/postcards/' . $k . '-back.jpg" alt="" loading=lazy>'
        . '<div class=spk-msg><div class=spk-text>' . clean_body($l['body'] ?? '') . '</div></div>'
        . '<div class=spk-to><span>To:</span> ' . esc($l['to'] ?: 'you') . '</div>'
        . '<div class=spk-mark><span>UNSENT</span><b>' . esc($l['date']) . '</b></div>' . public_postmark($l['date'])
        . '</div></div></div>'
        . '<span class=spk-hint aria-hidden=true>‹ swipe to see · tap twice to read ›</span><button type=button class=spk-more data-open hidden>Read the whole letter</button></div>';
}
