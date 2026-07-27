#!/usr/bin/env bash
# ONE-TIME host setup for farhadbio-api. Run as root on the target server.
#
#   scp -r server/deploy root@<host>:/root/farhadbio-deploy
#   ssh root@<host> 'bash /root/farhadbio-deploy/provision.sh'
#
# Idempotent — safe to re-run after editing an nginx config.
#
# It installs NOTHING new: the box already has node, npm, pm2 (as the `deploy`
# user) and nginx. This script only creates directories, config and a cron job.
#
# TLS is NOT handled here. Install the Cloudflare Origin CA certificate at
# /etc/ssl/cloudflare/farhadbio-origin.{crt,key} before enabling the vhost
# (see README.md — the Cloudflare API is geo-blocked from this server, so the
# certificate has to be minted in the dashboard or from a non-Iran host).
set -Eeuo pipefail

APP_NAME="farhadbio-api"
DEPLOY_USER="deploy"
APP_ROOT="/home/${DEPLOY_USER}/apps/${APP_NAME}"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT="/etc/ssl/cloudflare/farhadbio-origin.crt"
KEY="/etc/ssl/cloudflare/farhadbio-origin.key"

log() { printf '[provision] %s\n' "$*"; }

[[ "${EUID}" -eq 0 ]] || { echo "must run as root" >&2; exit 1; }
id "${DEPLOY_USER}" >/dev/null 2>&1 || { echo "user ${DEPLOY_USER} missing" >&2; exit 1; }

# --------------------------------------------------------------- directories
log "creating ${APP_ROOT}"
install -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" -m 755 \
  "${APP_ROOT}" "${APP_ROOT}/releases" "${APP_ROOT}/shared"
# The database and the env file are the only irreplaceable things on this box.
install -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" -m 700 \
  "${APP_ROOT}/shared/data" "${APP_ROOT}/backups"

# ---------------------------------------------------------------------- env
if [[ ! -f "${APP_ROOT}/shared/.env" ]]; then
  log "generating ${APP_ROOT}/shared/.env with fresh secrets"
  ADMIN_PW="$(head -c 18 /dev/urandom | base64 | tr -d '/+=' | head -c 20)"
  AUTH_SECRET="$(head -c 48 /dev/urandom | base64 | tr -d '/+=' | head -c 48)"
  cat > "${APP_ROOT}/shared/.env" <<EOF
NODE_ENV=production
HOST=127.0.0.1
PORT=3010
LOG_LEVEL=info

DATABASE_URL=file:farhadbio.db
DATA_DIR=${APP_ROOT}/shared/data

ADMIN_PASSWORD=${ADMIN_PW}
AUTH_SECRET=${AUTH_SECRET}
SESSION_DAYS=7

CORS_ORIGINS=https://farhad.bio,https://www.farhad.bio
TRUST_PROXY=true
EVENT_RETENTION_DAYS=0
EOF
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_ROOT}/shared/.env"
  chmod 600 "${APP_ROOT}/shared/.env"
  log "ADMIN_PASSWORD generated — read it with: sudo cat ${APP_ROOT}/shared/.env"
else
  log "shared/.env already exists — leaving it alone"
fi

# ------------------------------------------------------------------ pm2 file
log "installing ecosystem.config.js"
install -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" -m 644 \
  "${SRC_DIR}/pm2/ecosystem.config.js" "${APP_ROOT}/ecosystem.config.js"

# ------------------------------------------------------------------- backups
log "installing backup.sh + nightly cron (03:30 UTC)"
install -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" -m 700 \
  "${SRC_DIR}/backup.sh" "/home/${DEPLOY_USER}/farhadbio-backup.sh"
cat > /etc/cron.d/farhadbio-backup <<EOF
# farhadbio-api SQLite snapshot
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
30 3 * * * ${DEPLOY_USER} /home/${DEPLOY_USER}/farhadbio-backup.sh >> /var/log/farhadbio-backup.log 2>&1
EOF
chmod 644 /etc/cron.d/farhadbio-backup
touch /var/log/farhadbio-backup.log
chown "${DEPLOY_USER}:${DEPLOY_USER}" /var/log/farhadbio-backup.log

# --------------------------------------------------------------------- nginx
log "installing nginx rate-limit zones + proxy snippet"
install -m 644 "${SRC_DIR}/nginx/farhadbio-zones.conf" /etc/nginx/conf.d/farhadbio-zones.conf
install -m 644 "${SRC_DIR}/nginx/farhadbio-proxy.conf" /etc/nginx/snippets/farhadbio-proxy.conf
install -m 644 "${SRC_DIR}/nginx/api.farhad.bio.conf" /etc/nginx/sites-available/api.farhad.bio.conf

# conf.d/ is loaded by EVERY nginx reload, including reloads triggered by the
# other site on this box. A syntax error here would take that site down the
# next time anyone touched it, so validate immediately and back the file out
# if it does not parse.
if ! nginx -t 2>/dev/null; then
  log "ERROR: nginx config invalid after installing farhadbio-zones.conf — removing it"
  rm -f /etc/nginx/conf.d/farhadbio-zones.conf
  nginx -t
  exit 1
fi

if [[ -f "${CERT}" && -f "${KEY}" ]]; then
  log "origin certificate present — enabling the vhost"
  ln -sfn /etc/nginx/sites-available/api.farhad.bio.conf \
          /etc/nginx/sites-enabled/api.farhad.bio.conf
  nginx -t
  systemctl reload nginx
  log "nginx reloaded — https://api.farhad.bio is live once DNS points here"
else
  log "WARNING: ${CERT} / ${KEY} not found."
  log "         vhost is installed but NOT enabled (nginx would fail to start)."
  log "         Install the Cloudflare Origin cert, then re-run this script."
fi

log "done. Next: rsync a release and run server-deploy.sh <release-id>."
