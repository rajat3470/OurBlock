#!/usr/bin/env bash
set -euo pipefail

# ─── Configuration ─────────────────────────────────────────────────────────────
SSH_USER="ec2-user"
SSH_HOST="3.110.176.122"
SSH_KEY="$HOME/Documents/mohallamitr-prod.pem"
WEB_ROOT="/var/www/mohallamitr/apps/web/out"   # nginx root (see deployment/ec2/nginx.conf)
# ───────────────────────────────────────────────────────────────────────────────

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WEB_DIR="$ROOT_DIR/apps/web"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}━━━ Deploying web admin to ${SSH_USER}@${SSH_HOST}:${WEB_ROOT} ━━━${NC}"
echo ""

# Save current env so we can restore it after build
SAVED_ENV=""
if [[ -f "$WEB_DIR/.env.local" ]]; then
  SAVED_ENV=$(cat "$WEB_DIR/.env.local")
fi

# 1. Switch to production env
echo -e "${YELLOW}[1/3] Setting production env and building...${NC}"
cp "$WEB_DIR/envs/prod.env" "$WEB_DIR/.env.local"

# 2. Build the static export locally
cd "$WEB_DIR"
yarn build
cd "$ROOT_DIR"

# Restore previous env
if [[ -n "$SAVED_ENV" ]]; then
  echo "$SAVED_ENV" > "$WEB_DIR/.env.local"
  echo -e "${CYAN}Restored previous .env.local${NC}"
fi

# 3. Upload out/ to the server and reload nginx
echo -e "${YELLOW}[2/3] Uploading to server...${NC}"
ssh -i "$SSH_KEY" "${SSH_USER}@${SSH_HOST}" "sudo mkdir -p $WEB_ROOT && sudo chown -R ${SSH_USER}:${SSH_USER} /var/www/mohallamitr"
rsync -avz --delete -e "ssh -i $SSH_KEY" "$WEB_DIR/out/" "${SSH_USER}@${SSH_HOST}:${WEB_ROOT}/"

echo -e "${YELLOW}[3/3] Reloading Nginx...${NC}"
ssh -i "$SSH_KEY" "${SSH_USER}@${SSH_HOST}" "sudo systemctl reload nginx"

echo ""
echo -e "${GREEN}Web deployed successfully.${NC}"
echo -e "${CYAN}━━━ Done ━━━${NC}"
