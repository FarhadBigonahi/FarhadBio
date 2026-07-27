#!/usr/bin/env bash
# Nightly SQLite backup for farhadbio-api. Installed by provision.sh as a cron
# job running as the `deploy` user at 03:30 UTC (ProMall's MySQL dump runs at
# 03:00 — staggered so they never compete for the same disk).
#
# Uses `VACUUM INTO`, not `cp`: copying a live SQLite file in WAL mode can
# capture a torn database. VACUUM INTO produces a consistent, compacted
# snapshot while the API keeps serving.
set -Eeuo pipefail

APP_ROOT="/home/deploy/apps/farhadbio-api"
DB_FILE="${APP_ROOT}/shared/data/farhadbio.db"
BACKUP_DIR="${APP_ROOT}/backups"
KEEP_DAYS=30
STAMP="$(date -u '+%Y%m%d_%H%M%S')"
TARGET="${BACKUP_DIR}/farhadbio_${STAMP}.db"

log() { printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"; }

[[ -f "${DB_FILE}" ]] || { log "ERROR: ${DB_FILE} not found"; exit 1; }
mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

log "snapshotting ${DB_FILE} -> ${TARGET}"

# Prefer the sqlite3 CLI; fall back to the app's own libsql client, which is
# always present because it is what runs the API.
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "${DB_FILE}" "VACUUM INTO '${TARGET}'"
else
  node -e "
    const { createClient } = require('${APP_ROOT}/current/node_modules/@libsql/client');
    const c = createClient({ url: 'file:${DB_FILE}' });
    c.execute(\"VACUUM INTO '${TARGET}'\")
      .then(() => c.close())
      .catch((e) => { console.error(e); process.exit(1); });
  "
fi

gzip -f "${TARGET}"
log "wrote ${TARGET}.gz ($(du -h "${TARGET}.gz" | cut -f1))"

log "pruning backups older than ${KEEP_DAYS} days"
find "${BACKUP_DIR}" -name 'farhadbio_*.db.gz' -mtime "+${KEEP_DAYS}" -delete

log "done"
