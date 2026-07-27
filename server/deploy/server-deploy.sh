#!/usr/bin/env bash
# Atomic release deploy for farhadbio-api. Runs ON the server as the `deploy`
# user, invoked over SSH by .github/workflows/deploy-api.yml (or by hand).
#
# The source must already be rsynced into
#   /home/deploy/apps/farhadbio-api/releases/<release-id>/
#
# Guarantees:
#   - install, build and migrate all happen BEFORE the running process is
#     touched, so a broken commit never takes the API down;
#   - the `current` symlink flip is the only cutover moment;
#   - a failed health check rolls straight back to the previous release.
#
# Usage: server-deploy.sh <release-id>
set -Eeuo pipefail

RELEASE="${1:?Usage: server-deploy.sh <release-id>}"

APP_NAME="farhadbio-api"
APP_ROOT="/home/deploy/apps/${APP_NAME}"
RELEASE_DIR="${APP_ROOT}/releases/${RELEASE}"
SHARED_ENV="${APP_ROOT}/shared/.env"
CURRENT_LINK="${APP_ROOT}/current"
ECOSYSTEM_FILE="${APP_ROOT}/ecosystem.config.js"
HEALTH_URL="http://127.0.0.1:3010/health/ready"
KEEP_RELEASES=5
PREVIOUS_RELEASE=""

log() { printf '[%s] [%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "${APP_NAME}" "$*"; }

log "=== deploy starting: ${RELEASE} ==="

[[ -d "${RELEASE_DIR}" ]] || { log "ERROR: ${RELEASE_DIR} missing — was anything rsynced?"; exit 1; }
[[ -f "${SHARED_ENV}" ]]  || { log "ERROR: ${SHARED_ENV} missing — run provision.sh first."; exit 1; }
[[ -f "${ECOSYSTEM_FILE}" ]] || { log "ERROR: ${ECOSYSTEM_FILE} missing — run provision.sh first."; exit 1; }

if [[ -L "${CURRENT_LINK}" ]]; then
  PREVIOUS_RELEASE="$(readlink -f "${CURRENT_LINK}")"
  log "rollback target: ${PREVIOUS_RELEASE}"
fi

# The app reads .env from its cwd; shared/.env is the single real copy so the
# database credentials survive every release.
ln -sfn "${SHARED_ENV}" "${RELEASE_DIR}/.env"

log "installing dependencies (npm ci --omit=dev is NOT used — the build needs typescript)"
( cd "${RELEASE_DIR}" && npm ci --no-audit --no-fund )

log "building"
( cd "${RELEASE_DIR}" && npm run build )

# Migrations run against the SHARED database before the cutover. Forward-only
# and idempotent, so the old release keeps running happily against the new
# schema if we end up rolling back.
log "migrating database"
( cd "${RELEASE_DIR}" && npm run migrate )

log "flipping current -> releases/${RELEASE}"
ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"

log "reloading pm2"
if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
  pm2 reload "${APP_NAME}" --update-env
else
  log "process not registered yet — starting from the ecosystem file"
  pm2 start "${ECOSYSTEM_FILE}"
fi
pm2 save --force

# --------------------------------------------------------------------------
# Health gate. /health/ready proves the process can reach its database, not
# merely that it bound a port.
# --------------------------------------------------------------------------
log "health-checking ${HEALTH_URL}"
HEALTHY=0
for i in $(seq 1 10); do
  if curl -fsS --max-time 5 "${HEALTH_URL}" >/dev/null 2>&1; then HEALTHY=1; break; fi
  log "attempt ${i}/10 failed, retrying in 3s"
  sleep 3
done

if [[ "${HEALTHY}" -ne 1 ]]; then
  log "ERROR: health check FAILED on ${RELEASE}"
  if [[ -n "${PREVIOUS_RELEASE}" && -d "${PREVIOUS_RELEASE}" ]]; then
    log "ROLLING BACK to ${PREVIOUS_RELEASE}"
    ln -sfn "${PREVIOUS_RELEASE}" "${CURRENT_LINK}"
    pm2 reload "${APP_NAME}" --update-env || pm2 restart "${APP_NAME}"
    pm2 save --force
    log "rollback done — investigate ${RELEASE}, the previous release is serving."
  else
    log "no previous release to roll back to — manual intervention required."
  fi
  exit 1
fi

log "health OK — ${RELEASE} is live"

log "pruning old releases (keeping ${KEEP_RELEASES})"
ls -1dt "${APP_ROOT}"/releases/*/ 2>/dev/null | tail -n "+$((KEEP_RELEASES + 1))" | while read -r old; do
  # Never delete whatever `current` points at, even if the sort says it is old.
  [[ "$(readlink -f "${old}")" == "$(readlink -f "${CURRENT_LINK}")" ]] && continue
  log "removing ${old}"
  rm -rf "${old}"
done

log "=== deploy complete: ${RELEASE} ==="
