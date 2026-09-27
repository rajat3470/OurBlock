#!/usr/bin/env bash
set -euo pipefail

# ─── Configuration (edit these) ────────────────────────────────────────────────
SSH_USER="ubuntu"
SSH_HOST=""                          # e.g. 54.123.45.67 or mohallamitr.in
SSH_KEY=""                           # e.g. ~/.ssh/mohallamitr.pem  (leave empty if using ssh-agent)
REMOTE_DIR="/home/ubuntu/OurBlock"   # path to the repo on the server
PM2_APP_NAME="backend"               # pm2 process name (run `pm2 list` on server to check)
BRANCH="main"                        # branch to deploy
# ───────────────────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

if [[ -z "$SSH_HOST" ]]; then
  echo -e "${RED}ERROR: SSH_HOST is not set. Edit scripts/deploy-backend.sh first.${NC}"
  exit 1
fi

SSH_CMD="ssh"
if [[ -n "$SSH_KEY" ]]; then
  SSH_CMD="ssh -i $SSH_KEY"
fi
SSH_TARGET="$SSH_USER@$SSH_HOST"

echo -e "${CYAN}━━━ Deploying backend to ${SSH_TARGET}:${REMOTE_DIR} ━━━${NC}"
echo ""

# 1. Push local commits first
echo -e "${YELLOW}[1/4] Pushing local changes to origin/${BRANCH}...${NC}"
git push origin "$BRANCH" 2>&1 || {
  echo -e "${RED}Git push failed. Commit and push your changes first.${NC}"
  exit 1
}

# 2. SSH into server and pull + build + restart
echo -e "${YELLOW}[2/4] Pulling latest on server...${NC}"
$SSH_CMD "$SSH_TARGET" bash -s <<REMOTE_SCRIPT
set -euo pipefail
cd "$REMOTE_DIR"

echo "── git pull ──"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "── install dependencies ──"
yarn install --frozen-lockfile 2>/dev/null || yarn install

echo "── build backend ──"
cd apps/backend
yarn build

echo "── restart pm2 ──"
pm2 restart "$PM2_APP_NAME" --update-env
pm2 save

echo ""
echo "✓ Deploy complete"
pm2 show "$PM2_APP_NAME" | head -20
REMOTE_SCRIPT

echo ""
echo -e "${GREEN}[4/4] Backend deployed and PM2 restarted successfully.${NC}"
echo -e "${CYAN}━━━ Done ━━━${NC}"
