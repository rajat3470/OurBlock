#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# ─── Colors ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

usage() {
  echo -e "${BOLD}Usage:${NC} $0 <local|int|prod>"
  echo ""
  echo -e "  ${CYAN}local${NC}  Switch to local env + start backend, web & mobile"
  echo -e "  ${CYAN}int${NC}    Switch to integration env + start backend, web & mobile"
  echo -e "  ${CYAN}prod${NC}   Switch to production env + start backend, web & mobile"
  echo ""
  echo -e "  Press ${BOLD}Ctrl+C${NC} to stop all services."
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

# ─── Cleanup on exit ────────────────────────────────────────────────────────
PIDS=()
cleanup() {
  echo ""
  echo -e "${YELLOW}Stopping all services...${NC}"
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null
  echo -e "${GREEN}All services stopped.${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

# ─── Step 1: Switch environment ──────────────────────────────────────────────
bash "${ROOT_DIR}/scripts/switch-env.sh" "$ENV"
echo ""

# ─── Step 2: Start all services ─────────────────────────────────────────────
echo -e "${BOLD}Starting all services...${NC}"
echo ""

# Backend
(cd "${ROOT_DIR}" && yarn backend:dev 2>&1 | sed "s/^/[${CYAN}backend${NC}] /") &
PIDS+=($!)

# Web
(cd "${ROOT_DIR}" && yarn web 2>&1 | sed "s/^/[${MAGENTA}web${NC}] /") &
PIDS+=($!)

# Mobile
(cd "${ROOT_DIR}" && yarn mobile 2>&1 | sed "s/^/[${GREEN}mobile${NC}] /") &
PIDS+=($!)

echo -e "  ${GREEN}▶${NC} ${CYAN}backend${NC}  → http://localhost:5001"
echo -e "  ${GREEN}▶${NC} ${MAGENTA}web${NC}      → http://localhost:3000"
echo -e "  ${GREEN}▶${NC} ${GREEN}mobile${NC}   → Expo DevTools"
echo ""
echo -e "  Press ${BOLD}Ctrl+C${NC} to stop all."
echo ""

# Wait for any process to exit
wait
