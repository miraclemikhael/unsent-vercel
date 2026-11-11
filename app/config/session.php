<?php
defined('ROOT') || exit;
/* Sessions in MySQL (table app_sessions).
   Why: on Vercel each request can run on a different machine with a read-only disk, so PHP's normal
   file sessions would log people out at random. Same login, same CSRF token, just stored in the database. */
const SESSION_TTL = 604800; /* a session lives 7 days after its last use */

final class DbSessionHandler implements SessionHandlerInterface, SessionUpdateTimestampHandlerInterface
{
    /* run one query; if the table is missing, make it and try once more */
    private function run(string $sql, array $args = []): PDOStatement
    {
        $pdo = db_connect();
        try {
            $st = $pdo->prepare($sql);
            $st->execute($args);
        } catch (PDOException $e) {
            if (($e->errorInfo[1] ?? 0) != 1146) throw $e; /* 1146 = table doesn't exist */
            $pdo->exec('CREATE TABLE IF NOT EXISTS app_sessions(id VARCHAR(128) NOT NULL PRIMARY KEY, data MEDIUMBLOB NOT NULL, ts INT UNSIGNED NOT NULL, KEY ts(ts))');
            $st = $pdo->prepare($sql);
            $st->execute($args);
        }
        return $st;
    }
    public function open(string $path, string $name): bool { return true; }
    public function close(): bool { return true; }
    public function read(string $id): string|false
    {
        $row = $this->run('SELECT data FROM app_sessions WHERE id = ? AND ts > ?', [$id, time() - SESSION_TTL])->fetch();
        return $row ? (string)$row['data'] : '';
    }
    public function write(string $id, string $data): bool
    {
        $this->run('INSERT INTO app_sessions(id, data, ts) VALUES(?,?,?) ON DUPLICATE KEY UPDATE data = VALUES(data), ts = VALUES(ts)', [$id, $data, time()]);
        return true;
    }
    public function destroy(string $id): bool
    {
        $this->run('DELETE FROM app_sessions WHERE id = ?', [$id]);
        return true;
    }
    public function gc(int $max_lifetime): int|false
    {
        return $this->run('DELETE FROM app_sessions WHERE ts < ?', [time() - SESSION_TTL])->rowCount();
    }
    /* strict mode: an unknown session id from a browser is thrown away and a fresh one is made */
    public function validateId(string $id): bool
    {
        return (bool)$this->run('SELECT 1 FROM app_sessions WHERE id = ? AND ts > ?', [$id, time() - SESSION_TTL])->fetch();
    }
    /* lazy write: when nothing changed PHP only calls this, so a slow polling request can never
       overwrite a newer login/logout made by another request at the same time */
    public function updateTimestamp(string $id, string $data): bool
    {
        $this->run('UPDATE app_sessions SET ts = ? WHERE id = ?', [time(), $id]);
        return true;
    }
}
