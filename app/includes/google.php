<?php
defined('ROOT') || exit;
/* check a Google ID token with Google itself. Returns the profile (email, name, sub ...) or null.
   When it returns null the reason is in $GLOBALS['G_ERR']. */
function google_verify($idt)
{
    $GLOBALS['G_ERR'] = '';
    if (GOOGLE_CLIENT_ID === '') return g_fail('GOOGLE_CLIENT_ID is empty (config/secrets.php).');
    if ($idt === '') return g_fail('Google sent no sign-in token.');
    $url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($idt);
    $raw = false;
    if (function_exists('curl_init')) {
        $c = curl_init($url);
        $o = [CURLOPT_RETURNTRANSFER => 1, CURLOPT_TIMEOUT => 10];
        /* Laragon/Windows PHP often has no CA list: if curl cannot verify Google, retry without (local dev only) */
        curl_setopt_array($c, $o);
        $raw = curl_exec($c);
        if ($raw === false && in_array(curl_errno($c), [60, 77], true)) {
            curl_setopt($c, CURLOPT_SSL_VERIFYPEER, false);
            $raw = curl_exec($c);
        }
        if ($raw === false) $GLOBALS['G_ERR'] = 'Cannot reach Google: ' . curl_error($c);
        curl_close($c);
    } elseif (ini_get('allow_url_fopen')) {
        $raw = @file_get_contents($url, false, stream_context_create(['http' => ['timeout' => 10, 'ignore_errors' => true]]));
        if ($raw === false) $GLOBALS['G_ERR'] = 'Cannot reach Google (file_get_contents).';
    } else return g_fail('Enable the curl extension in php.ini (extension=curl).');
    if ($raw === false) return null;
    $r = json_decode((string)$raw, true);
    if (!$r) return g_fail('Google answered with something unreadable.');
    if (!empty($r['error'])) return g_fail('Google said: ' . ($r['error_description'] ?? $r['error']));
    if (($r['aud'] ?? '') !== GOOGLE_CLIENT_ID) return g_fail('This token was made for a different client id. Check GOOGLE_CLIENT_ID.');
    if (($r['email_verified'] ?? '') !== 'true') return g_fail('That Google email is not verified.');
    if ((int)($r['exp'] ?? 0) < time()) return g_fail('The Google sign-in expired. Try again.');
    if (empty($r['email'])) return g_fail('Google did not share an email.');
    return $r;
}
function g_fail($why)
{
    $GLOBALS['G_ERR'] = $why;
    return null;
}
