# Deploy Unsent on Vercel

Vercel has no PHP of its own, so this project uses the community runtime `vercel-php` (set in `vercel.json`).

## What is different from the original

| Before | Now |
|---|---|
| css / js / img in project root | in `public/` (Vercel serves these directly) |
| PHP files in project root | in `app/` (never downloadable) |
| `.htaccess` | `api/index.php` router: only the real pages are reachable |
| DB password written in `config/database.php` | Environment Variables |
| PHP file sessions | sessions in MySQL (table `app_sessions`) |
| pictures + voice notes saved in `uploads/` | saved in MySQL (table `files`), served at `/uploads/<name>` |
| `config/vapid.json` | push keys kept in MySQL (table `app_kv`) |
| demo user `miracle@gmail.com` created on empty DB | only if `SEED_DEMO=1` |

Why MySQL for files and sessions: a Vercel function runs on a fresh machine with a read-only disk, so anything written to disk is lost.

## 1. You need a MySQL host that accepts connections from the internet

**Your current host cannot work.** `ftpupload.net` is the FTP/server hostname of the free InfinityFree
(ByetHost / iFastNet) account, and its port 3306 is blocked from outside. InfinityFree's own docs say it
plainly: *"You cannot connect to a free hosting MySQL database from outside your hosting account."*
A Vercel function is "outside", so no password or setting will ever make that combination connect.
Two more problems in the same credentials: the MySQL host is a name like `sql301.infinityfree.com`
(not `ftpupload.net`), and the database and user are prefixed, e.g. user `b7_43391155` and database
`b7_43391155_unsent`.

So pick one of these:

| Option | Cost | Notes |
|---|---|---|
| **TiDB Cloud Starter** (MySQL protocol) | free tier | Public endpoint, TLS on port **4000**, `DB_SSL=1`. Copy host/user/database from the console; it comes with a database called `test`. |
| **filess.io** | small free MySQL | Public endpoint with TLS. Tiny storage, fine for this app. |
| **Aiven / PlanetScale / Railway** | paid (Aiven MySQL Developer is $5/mo) | Aiven's *free* MySQL tier stopped accepting new services on 6 Nov 2026 and is deleted on 21 Dec 2026, so only the paid plan is left. |
| **Stay on the shared host** | free | Upload this PHP app to InfinityFree itself instead of Vercel. PHP and MySQL sit on the same machine, so nothing is blocked. |

Avoid free hosts that only publish a MySQL socket to *their own* web server (InfinityFree, ByetHost,
000webhost and friends). No Vercel settings can reach those.

### The free option that works: TiDB Cloud Starter (10 minutes)

1. Open <https://tidbcloud.com> and sign in with GitHub or Google.
2. **Create Cluster** → plan **Starter** (the MySQL-compatible one), name it `unsent`.
   Cloud **AWS**, region **us-east-1 (N. Virginia)** if your visitors are in Europe/Africa/Americas —
   Vercel runs functions in `iad1` (Washington) by default, so the database is next door.
   For Indonesia/Asia pick **ap-southeast-1 (Singapore)** and also add `"regions": ["sin1"]`
   next to `"functions"` in `vercel.json`.
3. Wait about a minute for the instance to be ready.
4. Click **Connect** → Connection Type **Public** → Connect With **General**. Copy:
   - host, e.g. `gateway01.us-east-1.prod.aws.tidbcloud.com`
   - port `4000`
   - user, e.g. `3pTAoNNegb47Uc8.root` (the prefix is required and is part of the username)
   - click **Generate Password** and save it - it is shown only once.
5. It starts with one database called `test`. Either keep it or make your own in the **SQL Editor**:
   `CREATE DATABASE unsent;`
6. Leave the firewall alone: **Settings → Networking** has `Allow_all_public_connections` by default.
   Keep it - Vercel functions get a new IP for almost every request, so an IP allowlist cannot work.
7. Fill in `.env` on your computer (TLS is mandatory there, so `DB_SSL=1`), then run `php tools/db-setup.php`.
   That one command connects, creates the database if needed, runs `schema.sql`, and tells you what is
   still missing. Fix anything it complains about before touching Vercel.
8. Put the same six values in Vercel (step 3), redeploy, and check `/db-check.php?key=...` (step 5).

TiDB's free plan gives 5 GiB of row storage and a monthly Request Unit quota. Pictures and voice notes
live in MySQL in this app, so they count against that. It only throttles - it does not bill you.

With any other host: create an empty database and a user there, then either:
- **fresh start:** run `php tools/db-setup.php` on your computer (it runs `schema.sql` for you), or
- **keep old data:** export the old database from phpMyAdmin / HeidiSQL, import it into the new host, then run the old pictures import (step 2).

## 2. (Only if you keep old data) move old pictures into MySQL

The old `uploads/` files are in `legacy-uploads/`. On your computer, with PHP installed:

```
DB_HOST=... DB_PORT=3306 DB_NAME=... DB_USER=... DB_PASS=... DB_SSL=1 php tools/import-legacy-uploads.php
```

## 3. Put the project on GitHub and import it in Vercel

- Push this folder to a GitHub repo (`.env` is ignored, good).
- Run `php tools/db-setup.php` once on your computer first: same settings, same driver, and it creates
  the tables. If that command works, the deploy will connect too.
- Vercel → *Add New Project* → pick the repo.
- Framework Preset: **Other**. Leave Build Command and Output Directory empty (`vercel.json` handles it).
- Add the Environment Variables from `.env.example` (at least `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`, and `DB_SSL=1` if your host needs TLS).
- Deploy.
Or with the CLI: `npm i -g vercel`, then `vercel` in this folder.

## 4. After the first deploy

- Open the site, **Create account**.
- Make yourself admin (TiDB Cloud → **SQL Editor**, or any MySQL client):
  `UPDATE users SET role='admin' WHERE email='you@example.com';`
- Google sign-in: add your Vercel URL (e.g. `https://yourapp.vercel.app`) to *Authorized JavaScript origins* in Google Cloud Console.
- Gmail codes / email letter: set `GMAIL_USER` and `GMAIL_APP_PASSWORD` (see `SETUP-EMAIL.md` in the old project).

## 5. "Cannot connect to the database" — how to find out which value is wrong

1. Run `php tools/db-setup.php` on your own computer with the same `.env`. It prints the exact MySQL
   error, and if it works there, the values are right and only Vercel's copy of them can be wrong.
2. Add `DIAG_KEY` to the Vercel Environment Variables (any long random text), redeploy, then open
   `https://your-app.vercel.app/db-check.php?key=<that text>`. It prints exactly what the function
   sees (host, port, database, user, whether the password arrived), the DNS and TCP result, the real
   MySQL error, and which tables are missing. Remove `DIAG_KEY` when the site works.
3. Or set `DB_DEBUG=1` and reload the site: the error page then shows the raw MySQL message.
4. Or read the function log: Vercel → your project → Deployments → the deployment → *Logs*.
   The line starts with `MySQL connect failed:`.

The most common causes, in order:

| Message | Meaning |
|---|---|
| `getaddrinfo` / `Unknown MySQL server host` | `DB_HOST` is wrong (often the website or FTP name instead of the database name). |
| `[2002]` / `Connection refused` / timeout | Nothing listening there, or the host only allows its own web server. |
| `[1045] Access denied` | `DB_USER` / `DB_PASS` wrong, or the user is not allowed from that IP. |
| `[1049] Unknown database` | `DB_NAME` wrong — shared hosts prefix it. |
| TLS / certificate error | `DB_SSL=1` but the server has no TLS, TLS needs a different port (TiDB uses 4000), or PHP found no CA bundle — on Windows set `DB_SSL_CA` (step 1). |

Also: environment variables are copied into a deployment when it is built, so **changing them does
nothing until you redeploy**; and set them for *Production* (and *Preview* if you use preview URLs).

## Limits to know

- Vercel refuses any request body over **4.5 MB**, so pictures / voice notes above that fail (the old limit was 8 MB).
- Chat and calls use polling; each poll is one function call. Fine for small use; watch your Vercel usage if many people stay online.
- Calls on mobile data need a TURN server (`TURN_URL`, `TURN_USER`, `TURN_PASS`).
- Pictures in MySQL grow the database. Fine for a student / small project.

## Security: do this now

- The old zip contained your **database password** and a **push private key**. Change the DB password on the old host, and do not reuse it. Both are removed from this project.

## If the build fails on the PHP runtime

In `vercel.json` change `vercel-php@0.9.0` (PHP 8.5) to `vercel-php@0.7.4` (PHP 8.3). The app code works on both.

## Test PHP pages locally (optional)

```
DB_HOST=127.0.0.1 DB_NAME=unsent DB_USER=root DB_PASS= php -S localhost:8000 api/index.php
```
This runs the PHP pages and API only. The css / js / images in `public/` are served by Vercel itself, so they will not load with this command. Real look = deploy a Vercel preview.
