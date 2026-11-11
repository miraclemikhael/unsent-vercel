<?php
/* Copies the pictures / voice notes from legacy-uploads/ into the MySQL table `files`.
   Run ONCE on your own computer, after you imported your old database into the new MySQL host:

     DB_HOST=... DB_PORT=3306 DB_NAME=... DB_USER=... DB_PASS=... DB_SSL=1 php tools/import-legacy-uploads.php

   (Windows PowerShell:  $env:DB_HOST="..."; $env:DB_NAME="..."; ... ; php tools/import-legacy-uploads.php)
   Safe to run again: files that are already there are skipped. */
define('ROOT', dirname(__DIR__) . '/app');
require ROOT . '/config/database.php';
$pdo = db_connect();
$pdo->exec('CREATE TABLE IF NOT EXISTS files(name VARCHAR(80) NOT NULL PRIMARY KEY, mime VARCHAR(80) NOT NULL, data LONGBLOB NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)');
$audio = ['webm' => 'audio/webm', 'm4a' => 'audio/mp4', 'ogg' => 'audio/ogg', 'mp3' => 'audio/mpeg'];
$n = 0;
foreach (glob(dirname(__DIR__) . '/legacy-uploads/*/*') as $f) {
    if (!is_file($f) || str_starts_with(basename($f), '.')) continue;
    $name = basename($f);
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    $mime = $audio[$ext] ?? (mime_content_type($f) ?: 'application/octet-stream');
    $st = $pdo->prepare('INSERT IGNORE INTO files(name, mime, data) VALUES(?,?,?)');
    $st->bindValue(1, $name);
    $st->bindValue(2, $mime);
    $st->bindValue(3, file_get_contents($f), PDO::PARAM_LOB);
    $st->execute();
    $n += $st->rowCount();
    echo ($st->rowCount() ? 'added   ' : 'skipped ') . $name . "\n";
}
echo "Done. $n new file(s) stored.\n";
