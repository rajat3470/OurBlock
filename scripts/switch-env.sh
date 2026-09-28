#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# ─── Colors ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

usage() {
  echo -e "${BOLD}Usage:${NC} $0 <local|int|prod>"
  echo ""
  echo -e "  ${CYAN}local${NC}  Local development (localhost backend, local MongoDB/MinIO)"
  echo -e "  ${CYAN}int${NC}    Integration (Atlas DB + AWS S3, local backend)"
  echo -e "  ${CYAN}prod${NC}   Production (deployed backend at mohallamitr.in)"
  echo ""
  echo -e "Each app reads from: ${YELLOW}apps/<app>/envs/<env>.env${NC}"
  echo -e "First run? Fill in the ${CYAN}<placeholders>${NC} in each envs/*.env file with your real secrets."
  exit 1
}

if [[ $# -lt 1 ]]; then
  usage
fi

ENV="$1"

if [[ "$ENV" != "local" && "$ENV" != "int" && "$ENV" != "prod" ]]; then
  echo -e "${RED}Error:${NC} Unknown environment '${ENV}'"
  usage
fi

echo -e "${BOLD}Switching to ${CYAN}${ENV}${NC}${BOLD} environment...${NC}"
echo ""

FAIL=0

copy_env() {
  local app="$1"
  local source="$2"
  local target="$3"

  if [[ -f "$source" ]]; then
    cp "$source" "$target"
    echo -e "  ${GREEN}✓${NC} ${BOLD}${app}${NC} ← envs/${ENV}.env"
  else
    echo -e "  ${YELLOW}⚠${NC} ${BOLD}${app}${NC} — ${source##*/} not found, skipped"
    echo -e "    ${YELLOW}→${NC} Fill in apps/${app}/envs/${ENV}.env with your secrets"
    FAIL=1
  fi
}

# Backend: envs/<env>.env → .env
copy_env "backend" \
  "${ROOT_DIR}/apps/backend/envs/${ENV}.env" \
  "${ROOT_DIR}/apps/backend/.env"

# Mobile: envs/<env>.env → .env
copy_env "mobile" \
  "${ROOT_DIR}/apps/mobile/envs/${ENV}.env" \
  "${ROOT_DIR}/apps/mobile/.env"

# Web: envs/<env>.env → .env.local  (Next.js convention)
copy_env "web" \
  "${ROOT_DIR}/apps/web/envs/${ENV}.env" \
  "${ROOT_DIR}/apps/web/.env.local"

echo ""
if [[ $FAIL -eq 0 ]]; then
  echo -e "${GREEN}Done!${NC} All apps now point to ${BOLD}${ENV}${NC}."
else
  echo -e "${YELLOW}Partially done.${NC} Some env files are missing — see warnings above."
fi

if [[ "$ENV" == "local" || "$ENV" == "int" ]]; then
  # Auto-detect LAN IP and patch the mobile .env so it doesn't break when WiFi changes
  LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
  MOBILE_ENV="${ROOT_DIR}/apps/mobile/.env"
  if [[ -n "$LAN_IP" && -f "$MOBILE_ENV" ]]; then
    sed -i '' "s|http://[0-9.]*:5001|http://${LAN_IP}:5001|g" "$MOBILE_ENV"
    echo -e "  ${GREEN}✓${NC} Mobile API/Socket URLs updated to ${BOLD}${LAN_IP}${NC}"
  fi
fi

if [[ "$ENV" == "local" ]]; then
  echo -e "${CYAN}Tip:${NC} Make sure local MongoDB and MinIO are running."
elif [[ "$ENV" == "int" ]]; then
  echo -e "${CYAN}Tip:${NC} Integration uses Atlas DB + AWS S3 with local backend."
elif [[ "$ENV" == "prod" ]]; then
  echo -e "${YELLOW}Caution:${NC} Apps now point to production. Mock auth is disabled."
fi
