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

## 1. You need a MySQL host that accepts outside connections

Your old host (`sql202.byetcluster.com`, InfinityFree / ByetHost) only accepts connections from its own web servers, so Vercel cannot reach it. Use any MySQL 8 / MariaDB host that allows remote access (Aiven, Railway, Clever Cloud, a VPS, ...). Make an empty database and a user.

Then either:
- **fresh start:** run `app/config/schema.sql` on it (HeidiSQL: *File → Run SQL file*), or
- **keep old data:** export the old database from phpMyAdmin / HeidiSQL, import it into the new host, then run the old pictures import (step 2).

## 2. (Only if you keep old data) move old pictures into MySQL

The old `uploads/` files are in `legacy-uploads/`. On your computer, with PHP installed:

```
DB_HOST=... DB_PORT=3306 DB_NAME=... DB_USER=... DB_PASS=... DB_SSL=1 php tools/import-legacy-uploads.php
```

## 3. Put the project on GitHub and import it in Vercel

- Push this folder to a GitHub repo (`.env` is ignored, good).
- Vercel → *Add New Project* → pick the repo.
- Framework Preset: **Other**. Leave Build Command and Output Directory empty (`vercel.json` handles it).
- Add the Environment Variables from `.env.example` (at least `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`, and `DB_SSL=1` if your host needs TLS).
- Deploy.

Or with the CLI: `npm i -g vercel`, then `vercel` in this folder.

## 4. After the first deploy

- Open the site, **Create account**.
- Make yourself admin (run in HeidiSQL): `UPDATE users SET role='admin' WHERE email='you@example.com';`
- Google sign-in: add your Vercel URL (e.g. `https://yourapp.vercel.app`) to *Authorized JavaScript origins* in Google Cloud Console.
- Gmail codes / email letter: set `GMAIL_USER` and `GMAIL_APP_PASSWORD` (see `SETUP-EMAIL.md` in the old project).

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
