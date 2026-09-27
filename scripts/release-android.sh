#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE_DIR="${ROOT_DIR}/apps/mobile"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}${CYAN}━━━ Android Release Build ━━━${NC}"
echo ""

# 1. Switch mobile to prod env (baked into APK at build time)
echo -e "${YELLOW}[1/3] Switching mobile to prod env...${NC}"
bash "${ROOT_DIR}/scripts/switch-env.sh" prod

echo ""
echo -e "${YELLOW}[2/3] Building release APK...${NC}"

# 2. Build
cd "${MOBILE_DIR}"
./android/gradlew assembleRelease -p android

APK="${MOBILE_DIR}/android/app/build/outputs/apk/release/app-release.apk"

echo ""
echo -e "${GREEN}[3/3] Build complete!${NC}"
echo -e "  APK → ${BOLD}${APK}${NC}"
echo -e "  Size: $(du -sh "$APK" | cut -f1)"

# 3. Restore local env so dev work isn't disrupted
echo ""
echo -e "${YELLOW}Restoring local env for development...${NC}"
bash "${ROOT_DIR}/scripts/switch-env.sh" local
echo ""
echo -e "${GREEN}Done.${NC} APK is signed with prod env. Local env restored for dev."
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
