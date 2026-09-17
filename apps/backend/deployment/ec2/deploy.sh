#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# mohallaMitr — EC2 re-deploy script
#
# Run this on the EC2 instance after pushing new code to pull, build, and restart
# all services. Keeps MongoDB/MinIO data intact.
#
# Usage:
#   ssh ec2-user@YOUR_INSTANCE_IP
#   cd /var/www/mohallamitr
#   ./apps/backend/deployment/ec2/deploy.sh
# =============================================================================

APP_DIR="${APP_DIR:-/var/www/mohallamitr}"
BRANCH="${BRANCH:-main}"
INFRA_DIR="$APP_DIR/apps/backend/deployment/ec2"
BACKEND_ENV="$APP_DIR/apps/backend/.env"
WEB_ENV="$APP_DIR/apps/web/.env.local"

log() { echo "[deploy] $*"; }

log "Deploying mohallaMitr from branch: $BRANCH"
cd "$APP_DIR"

# -----------------------------------------------------------------------------
# Pull latest code
# -----------------------------------------------------------------------------
log "Pulling latest code..."
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

# -----------------------------------------------------------------------------
# Install dependencies
# -----------------------------------------------------------------------------
log "Installing dependencies..."
yarn install --frozen-lockfile --ignore-engines

# -----------------------------------------------------------------------------
# Build shared, backend, and web
# -----------------------------------------------------------------------------
log "Building shared package..."
yarn workspace @mohallamitr/shared build

log "Building backend..."
yarn workspace @mohallamitr/backend build

log "Building web admin (static export)..."
if [[ -f "$APP_DIR/apps/web/.env.production" ]]; then
    cp "$APP_DIR/apps/web/.env.production" "$WEB_ENV"
fi
cd "$APP_DIR/apps/web"
timeout 300s env \
    NEXT_IGNORE_INCORRECT_LOCKFILE=1 \
    NEXT_SKIP_BUILD_CHECKS=1 \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS=--max-old-space-size=1024 \
    yarn build

cd "$APP_DIR"

# -----------------------------------------------------------------------------
# Ensure backend env exists
# -----------------------------------------------------------------------------
if [[ ! -f "$BACKEND_ENV" ]]; then
    log "WARNING: $BACKEND_ENV not found. Copying from example."
    cp "$INFRA_DIR/.env.production.example" "$BACKEND_ENV"
fi

# -----------------------------------------------------------------------------
# Rebuild/pull infrastructure containers if compose file changed
# -----------------------------------------------------------------------------
log "Restarting infrastructure containers (MongoDB + MinIO)..."
cd "$INFRA_DIR"
docker compose -f docker-compose.infra.yml pull || true
docker compose -f docker-compose.infra.yml up -d --build

# Create MinIO bucket if it doesn't exist (safe to run repeatedly)
if grep -q 'S3_ENDPOINT=http://127.0.0.1:9000' "$BACKEND_ENV" || grep -q 'S3_ENDPOINT=http://localhost:9000' "$BACKEND_ENV"; then
    log "Ensuring MinIO bucket 'mohallamitr' exists..."
    MINIO_PASSWORD=$(grep MINIO_ROOT_PASSWORD docker-compose.infra.yml | cut -d: -f2 | xargs)
    docker compose -f docker-compose.infra.yml exec -T minio mc alias set local http://localhost:9000 minioadmin "$MINIO_PASSWORD" || true
    docker compose -f docker-compose.infra.yml exec -T minio mc mb local/mohallamitr || true
    docker compose -f docker-compose.infra.yml exec -T minio mc anonymous set download local/mohallamitr || true
fi

cd "$APP_DIR"

# -----------------------------------------------------------------------------
# Reload Nginx config
# -----------------------------------------------------------------------------
log "Reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx || sudo service nginx reload

# -----------------------------------------------------------------------------
# Restart PM2 apps
# -----------------------------------------------------------------------------
log "Restarting PM2 apps..."
if pm2 describe mohallamitr-backend &>/dev/null; then
    pm2 reload "$INFRA_DIR/ecosystem.config.cjs" --env production
else
    pm2 start "$INFRA_DIR/ecosystem.config.cjs" --env production
fi
pm2 save

log "Deployment complete."
log "Health check: curl -f http://localhost:5001/health"
