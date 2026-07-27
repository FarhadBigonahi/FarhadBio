# farhadbio-api — operations runbook

The backend for **farhad.bio**: blog content + first-party analytics.
Frontend stays on Vercel; this service holds the data.

```
                    ┌──────────────────────────────────────────┐
   visitor ────────▶│  farhad.bio            (Vercel, Next.js) │
                    │  · blog pages (ISR, 5 min)               │
                    │  · /admin dashboard                      │
                    │  · /api/admin/* = thin BFF proxy         │
                    └───────────┬──────────────────────────────┘
                                │ server-to-server, Bearer token
   visitor beacon ──────────────┼──────────────┐
   (direct, no Vercel hop)      ▼              ▼
                    ┌──────────────────────────────────────────┐
                    │  api.farhad.bio   (Cloudflare, proxied)  │
                    │      ↓                                   │
                    │  nginx :443  →  127.0.0.1:3010           │
                    │      ↓                                   │
                    │  pm2 · farhadbio-api · Fastify           │
                    │      ↓                                   │
                    │  SQLite  shared/data/farhadbio.db        │
                    └──────────────────────────────────────────┘
```

**Host:** `46.245.81.89` (Ubuntu 22.04, Node 20). Shares the box with ProMall —
this service uses its own port (3010), its own pm2 app, its own nginx zones and
its own app root. Nothing here touches ProMall's config.

---

## Layout on the server

```
/home/deploy/apps/farhadbio-api/
├── current -> releases/<release-id>     # atomic pointer
├── releases/<release-id>/               # last 5 kept
├── shared/
│   ├── .env                             # the ONLY host-specific file (600)
│   └── data/farhadbio.db                # the database (dir 700)
├── backups/                             # nightly VACUUM INTO snapshots
└── ecosystem.config.js                  # pm2 definition
```

Everything irreplaceable lives in `shared/`. Releases are disposable.

---

## Deploying

**Normal path — push to `main` with changes under `server/`:**
GitHub Actions typechecks, rsyncs the source, then runs `server-deploy.sh` on
the box: `npm ci` → `npm run build` → `npm run migrate` → flip `current` →
`pm2 reload` → health-check `/health/ready` → **auto-rollback on failure**.

Install, build and migrate all happen *before* the running process is touched,
so a broken commit cannot take the API down.

**Manual deploy** (no GitHub):

```bash
REL="$(date -u +%Y%m%d%H%M%S)-manual"
cd server
tar czf - --exclude=node_modules --exclude=dist --exclude=data --exclude=.env . \
  | ssh deploy@46.245.81.89 "mkdir -p ~/apps/farhadbio-api/releases/$REL && tar xzf - -C ~/apps/farhadbio-api/releases/$REL"
ssh deploy@46.245.81.89 "~/farhadbio-deploy.sh $REL"
```

**Rollback to the previous release:**

```bash
ssh deploy@46.245.81.89
ls -1dt ~/apps/farhadbio-api/releases/*/     # pick the one you want
ln -sfn ~/apps/farhadbio-api/releases/<id> ~/apps/farhadbio-api/current
pm2 reload farhadbio-api --update-env && pm2 save --force
curl -fsS localhost:3010/health/ready
```

---

## One-time host setup

```bash
scp -r server/deploy root@<host>:/root/farhadbio-deploy
ssh root@<host> 'bash /root/farhadbio-deploy/provision.sh'
```

Creates the app root, generates `shared/.env` with fresh secrets, installs the
pm2 file, the nightly backup cron, and the nginx configs. Idempotent.

It will **not** enable the nginx vhost until the TLS certificate exists —
enabling it without one would make nginx fail to start and take the other site
on the box down with it.

### TLS

`api.farhad.bio` is **proxied** through Cloudflare (orange cloud), so the
origin certificate only ever has to satisfy Cloudflare — not browsers.

Certificate lives at:
```
/etc/ssl/farhadbio/api.crt   (644)
/etc/ssl/farhadbio/api.key   (600, root only)
```
`provision.sh` enables the vhost as soon as both exist.

**Two constraints make this awkward, and both come from the host being in Iran:**

| Method | Why it does / doesn't work |
|---|---|
| HTTP-01 on the box | ✗ The record is proxied — Let's Encrypt would validate against Cloudflare, not the origin |
| DNS-01 **on the box** | ✗ The Cloudflare API is geo-blocked from this server's IP (error 9109) |
| DNS-01 from a **non-Iran host** | ✓ What is in use today — see `renew-cert.sh` |
| Cloudflare **Origin CA** cert | ✓ Best long-term option: 15-year validity, zero renewal |

**Currently installed:** a Let's Encrypt certificate obtained by DNS-01 from
the ops box (`65.109.81.148`), which is outside Iran and can reach the
Cloudflare API. **It expires every 90 days** — run `deploy/renew-cert.sh` from
that host, or set it on a schedule.

**Recommended:** replace it with a Cloudflare Origin CA certificate and stop
thinking about renewal:

1. Cloudflare dashboard → **SSL/TLS → Origin Server → Create Certificate**
   (hostnames `farhad.bio, *.farhad.bio`, 15 years).
2. Write the cert and key to the two paths above.
3. `systemctl reload nginx`.

Nothing else changes — same paths, same vhost.

> The zone is currently on SSL mode **Full**, not Full (strict). That is why a
> mismatched certificate was accepted before this vhost existed. Once the
> origin certificate is correct, switch the zone to **Full (strict)** so
> Cloudflare actually verifies the origin.

---

## Environment

`shared/.env` is the only file that ties this service to this machine. Full
reference in `server/.env.example`. The ones that matter:

| Variable | Meaning |
|---|---|
| `PORT` / `HOST` | `3010` on `127.0.0.1` — nginx is the only public entrance |
| `DATABASE_URL` | `file:farhadbio.db`, resolved against `DATA_DIR` |
| `DATA_DIR` | Absolute path to `shared/data` — **must** be outside the release dir |
| `ADMIN_PASSWORD` | The `/admin` login password |
| `AUTH_SECRET` | Signs session tokens. Changing it logs every admin session out |
| `CORS_ORIGINS` | Exact browser origins allowed. The site origin **must** be listed or the analytics beacon is blocked |
| `EVENT_RETENTION_DAYS` | `0` = keep pageviews forever; `400` = auto-prune daily |

After editing: `pm2 reload farhadbio-api --update-env`.

---

## Backups

Nightly at 03:30 UTC → `shared/../backups/farhadbio_<stamp>.db.gz`, 30 days kept.
Uses `VACUUM INTO`, not `cp` — copying a live WAL-mode SQLite file can capture a
torn database.

```bash
ssh deploy@46.245.81.89 '~/farhadbio-backup.sh'          # run one now
scp deploy@46.245.81.89:~/apps/farhadbio-api/backups/farhadbio_*.db.gz .   # pull off-box
```

**Restore:**
```bash
pm2 stop farhadbio-api
gunzip -c backups/farhadbio_<stamp>.db.gz > shared/data/farhadbio.db
rm -f shared/data/farhadbio.db-wal shared/data/farhadbio.db-shm
pm2 start farhadbio-api
```

---

## Moving to another server

This was a design goal, so it is deliberately short. The service depends on
nothing but Node 20 and a writable directory — no Docker, no database server,
no cloud APIs, no Vercel-specific code.

1. **Provision the new host** — it needs Node ≥ 20.11, nginx, pm2, a `deploy`
   user. Then `scp -r server/deploy` and run `provision.sh`.
2. **Carry the state across** — two files:
   ```bash
   ssh deploy@OLD '~/farhadbio-backup.sh'
   scp deploy@OLD:~/apps/farhadbio-api/backups/farhadbio_<latest>.db.gz .
   scp deploy@OLD:~/apps/farhadbio-api/shared/.env .

   gunzip -c farhadbio_<latest>.db.gz | ssh deploy@NEW 'cat > ~/apps/farhadbio-api/shared/data/farhadbio.db'
   scp .env deploy@NEW:~/apps/farhadbio-api/shared/.env
   ```
   Keeping the same `AUTH_SECRET` means nobody gets logged out by the move.
3. **Deploy a release** to the new host (manual command above, or point the
   `DEPLOY_HOST` GitHub secret at it).
4. **Verify before cutting over**, using the origin directly:
   ```bash
   curl -H 'Host: api.farhad.bio' --resolve api.farhad.bio:443:NEW_IP \
        https://api.farhad.bio/health/ready
   ```
5. **Flip DNS** — point `api.farhad.bio` at the new IP. Nothing on Vercel
   changes, because Vercel only ever knew the hostname.
6. **Decommission** the old box once traffic has drained.

To move to a **managed database** instead (e.g. Turso) there is no code change
either: set `DATABASE_URL=libsql://…` and `DATABASE_AUTH_TOKEN=…`. The client
speaks both.

---

## Diagnostics

```bash
pm2 logs farhadbio-api --lines 100      # app logs (JSON, pino)
pm2 describe farhadbio-api              # restarts, memory, uptime
curl -s localhost:3010/health/ready     # process + database
tail -f /var/log/nginx/farhadbio-api.error.log
```

| Symptom | Likely cause |
|---|---|
| Blog empty, admin 502 | API down → `pm2 describe farhadbio-api`, check restart count |
| `/health/ready` 503 | Process up, database unreachable → check `shared/data` permissions |
| Beacon requests fail in the browser console | Site origin missing from `CORS_ORIGINS` |
| Login works, admin calls 401 | `AUTH_SECRET` changed → sign in again |
| Deploy failed and rolled back | Read the Actions log; the previous release is still serving |
