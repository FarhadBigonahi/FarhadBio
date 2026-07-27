#!/usr/bin/env bash
# Renew the TLS certificate for api.farhad.bio and install it on the API host.
#
# RUN THIS FROM A NON-IRAN HOST — currently the ops box 65.109.81.148.
# The API server itself cannot do this: Cloudflare's API is geo-blocked from
# its IP (error 9109), and HTTP-01 is impossible while the record is proxied.
#
# Uses a throwaway certbot container so nothing has to be installed on the
# machine running it. Requires: docker, ssh access to the API host as root.
#
#   ./renew-cert.sh
#
# Let's Encrypt certificates last 90 days. Schedule this monthly, or replace
# the whole thing with a Cloudflare Origin CA certificate (15 years, no
# renewal) — see README.md, "TLS".
set -Eeuo pipefail

DOMAIN="api.farhad.bio"
EMAIL="business@farhad.bio"
API_HOST="${API_HOST:-46.245.81.89}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/promall-prod/promall_key}"
WORK_DIR="${WORK_DIR:-$HOME/.farhadbio-certs}"

# Cloudflare token with Zone:DNS:Edit on farhad.bio. Read from the environment
# so the secret is never written into this file.
: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN (needs Zone:DNS:Edit on farhad.bio)}"

log() { printf '[renew-cert] %s\n' "$*"; }

mkdir -p "${WORK_DIR}"/{le,lework,cf}
printf 'dns_cloudflare_api_token = %s\n' "${CLOUDFLARE_API_TOKEN}" > "${WORK_DIR}/cf/cloudflare.ini"
chmod 600 "${WORK_DIR}/cf/cloudflare.ini"

log "requesting/renewing certificate for ${DOMAIN} via DNS-01"
MSYS_NO_PATHCONV=1 docker run --rm \
  -v "${WORK_DIR}/le:/etc/letsencrypt" \
  -v "${WORK_DIR}/lework:/var/lib/letsencrypt" \
  -v "${WORK_DIR}/cf:/cf" \
  certbot/dns-cloudflare:latest certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials /cf/cloudflare.ini \
    --dns-cloudflare-propagation-seconds 25 \
    -d "${DOMAIN}" \
    --non-interactive --agree-tos -m "${EMAIL}" \
    --key-type rsa --keep-until-expiring

# certbot writes symlinks under live/; on a Windows host those are unreadable,
# so read the real files out of archive/ and take the highest-numbered set.
ARCHIVE="${WORK_DIR}/le/archive/${DOMAIN}"
LATEST="$(ls -1 "${ARCHIVE}"/fullchain*.pem | sed 's/.*fullchain\([0-9]*\)\.pem/\1/' | sort -n | tail -1)"
CRT="${ARCHIVE}/fullchain${LATEST}.pem"
KEY="${ARCHIVE}/privkey${LATEST}.pem"

log "installing $(openssl x509 -in "${CRT}" -noout -enddate) onto ${API_HOST}"

# Stage into /tmp first, then move into place — so a failed upload can never
# leave nginx pointing at a half-written certificate.
scp -i "${SSH_KEY}" -q "${CRT}" "root@${API_HOST}:/tmp/api.crt.new"
scp -i "${SSH_KEY}" -q "${KEY}" "root@${API_HOST}:/tmp/api.key.new"

ssh -i "${SSH_KEY}" "root@${API_HOST}" bash -s <<'REMOTE'
set -Eeuo pipefail
install -d -m 755 /etc/ssl/farhadbio
mv /tmp/api.crt.new /etc/ssl/farhadbio/api.crt
mv /tmp/api.key.new /etc/ssl/farhadbio/api.key
chown root:root /etc/ssl/farhadbio/api.crt /etc/ssl/farhadbio/api.key
chmod 644 /etc/ssl/farhadbio/api.crt
chmod 600 /etc/ssl/farhadbio/api.key
nginx -t
systemctl reload nginx
echo "[renew-cert] nginx reloaded with $(openssl x509 -in /etc/ssl/farhadbio/api.crt -noout -enddate)"
REMOTE

log "verifying public endpoint"
curl -fsS --max-time 20 "https://${DOMAIN}/health/ready" && echo
log "done"
