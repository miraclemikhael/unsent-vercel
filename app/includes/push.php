<?php
defined('ROOT') || exit;
/* Web push (message + call alerts). "Empty" push: the push service only wakes the phone,
   then sw.js asks api/push.php?a=pull for what to show. No payload encryption needed.
   Keys are made once and saved in MySQL (table app_kv), or taken from env vars. */
function b64u($s)
{
    return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
}
function push_tables()
{
    if (!empty($_SESSION['push_tables'])) return;
    $pdo = db_connect();
    $pdo->exec('CREATE TABLE IF NOT EXISTS push_subs(
      id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, endpoint_hash CHAR(64) NOT NULL, endpoint TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY ep(endpoint_hash), KEY usr(user_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS push_msgs(
      id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, title VARCHAR(80) NOT NULL, body VARCHAR(200) NOT NULL,
      url VARCHAR(120) NOT NULL, tag VARCHAR(40) NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, KEY usr(user_id))');
    $_SESSION['push_tables'] = 1;
}
function vapid_keys()
{
    static $k = null;
    if ($k) return $k;
    /* 1) Vercel env vars VAPID_PRIVATE_PEM (use \n for new lines) + VAPID_PUBLIC_KEY, 2) MySQL table app_kv, 3) make new keys and save them there */
    $pem = str_replace('\n', "\n", (string)getenv('VAPID_PRIVATE_PEM'));
    $pub = trim((string)getenv('VAPID_PUBLIC_KEY'));
    if ($pem !== '' && $pub !== '') return $k = ['pem' => $pem, 'pub' => $pub];
    $pdo = db_connect();
    $pdo->exec('CREATE TABLE IF NOT EXISTS app_kv(name VARCHAR(60) NOT NULL PRIMARY KEY, value MEDIUMTEXT NOT NULL)');
    $get = function () use ($pdo) {
        $row = $pdo->query("SELECT value FROM app_kv WHERE name = 'vapid'")->fetch();
        $j = $row ? json_decode($row['value'], true) : null;
        return ($j && !empty($j['pem'])) ? $j : null;
    };
    if ($j = $get()) return $k = $j;
    $key = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
    openssl_pkey_export($key, $pem);
    $ec = openssl_pkey_get_details($key)['ec'];
    $pub = "\x04" . str_pad($ec['x'], 32, "\0", STR_PAD_LEFT) . str_pad($ec['y'], 32, "\0", STR_PAD_LEFT);
    $pdo->prepare("INSERT IGNORE INTO app_kv(name, value) VALUES('vapid', ?)")->execute([json_encode(['pem' => $pem, 'pub' => b64u($pub)])]);
    return $k = $get() ?: ['pem' => $pem, 'pub' => b64u($pub)];
}
/* ES256 token for one push service (aud = its origin) */
function vapid_jwt($aud)
{
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $sub = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' . $host : 'mailto:admin@' . preg_replace('/:\d+$/', '', $host);
    $in = b64u(json_encode(['typ' => 'JWT', 'alg' => 'ES256'])) . '.' . b64u(json_encode(['aud' => $aud, 'exp' => time() + 43200, 'sub' => $sub]));
    openssl_sign($in, $der, vapid_keys()['pem'], OPENSSL_ALGO_SHA256);
    /* DER (r,s) -> raw 64 bytes */
    $o = 3;
    $rl = ord($der[$o]);
    $r = substr($der, $o + 1, $rl);
    $o += $rl + 2;
    $sl = ord($der[$o]);
    $s = substr($der, $o + 1, $sl);
    $raw = str_pad(ltrim($r, "\0"), 32, "\0", STR_PAD_LEFT) . str_pad(ltrim($s, "\0"), 32, "\0", STR_PAD_LEFT);
    return $in . '.' . b64u($raw);
}
/* wake one device; returns the http code */
function push_wake($endpoint)
{
    $u = parse_url($endpoint);
    $aud = $u['scheme'] . '://' . $u['host'] . (isset($u['port']) ? ':' . $u['port'] : '');
    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => '', CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 4, CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_HTTPHEADER => ['Authorization: vapid t=' . vapid_jwt($aud) . ', k=' . vapid_keys()['pub'], 'TTL: 120', 'Urgency: high', 'Content-Length: 0']]);
    curl_exec($ch);
    $c = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return $c;
}
/* queue one alert for a user and wake all their devices (after the page answered, so chat stays fast) */
function push_notify($to, $title, $body, $url, $tag = '')
{
    try {
        push_tables();
        q('INSERT INTO push_msgs(user_id,title,body,url,tag) VALUES(?,?,?,?,?)', [(int)$to, mb_substr($title, 0, 80), mb_substr($body, 0, 200), mb_substr($url, 0, 120), mb_substr($tag, 0, 40)]);
        register_shutdown_function(function () use ($to) {
            if (function_exists('fastcgi_finish_request')) fastcgi_finish_request();
            try {
                foreach (q('SELECT id,endpoint FROM push_subs WHERE user_id=?', [(int)$to])->fetchAll() as $s) {
                    $c = push_wake($s['endpoint']);
                    if ($c === 404 || $c === 410) q('DELETE FROM push_subs WHERE id=?', [$s['id']]);
                }
            } catch (Throwable $e) {
            }
        });
    } catch (Throwable $e) {
    }
}
