#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# mohallaMitr — EC2 bootstrap script (Amazon Linux 2023 / Ubuntu 22.04 compatible)
#
# Run this as root (or with sudo) on a fresh EC2 instance to install dependencies,
# clone the repo, build the apps, and start all services.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/<your-org>/OurBlock/main/apps/backend/deployment/ec2/setup.sh | bash
# Or copy this file to the EC2 instance and run:
#   chmod +x setup.sh && ./setup.sh
# =============================================================================

REPO_URL="${REPO_URL:-https://github.com/rajatverma/OurBlock.git}"
BRANCH="${BRANCH:-main}"
APP_DIR="${APP_DIR:-/var/www/mohallamitr}"
DOMAIN="${DOMAIN:-}"            # e.g. mohallamitr.example.com
EMAIL="${EMAIL:-}"              # for Let's Encrypt notifications
INSTALL_NODE="${INSTALL_NODE:-true}"
INSTALL_YARN="${INSTALL_YARN:-true}"

log() { echo "[setup] $*"; }

# -----------------------------------------------------------------------------
# Detect OS
# -----------------------------------------------------------------------------
if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    OS=$ID
else
    log "Cannot detect OS. Exiting."
    exit 1
fi

log "Detected OS: $OS"

# -----------------------------------------------------------------------------
# Update system
# -----------------------------------------------------------------------------
if [[ "$OS" == "amzn" || "$OS" == "rhel" || "$OS" == "centos" ]]; then
    yum update -y
    yum install -y git curl wget jq nginx cronie
elif [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
    apt-get update
    apt-get install -y git curl wget jq nginx cron
else
    log "Unsupported OS: $OS"
    exit 1
fi

# -----------------------------------------------------------------------------
# Install Node.js 20
# -----------------------------------------------------------------------------
if [[ "$INSTALL_NODE" == "true" ]]; then
    log "Installing Node.js 20..."
    if ! command -v node &>/dev/null || [[ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" != "20" ]]; then
        curl -fsSL https://nodejs.org/dist/v20.15.1/node-v20.15.1-linux-x64.tar.xz -o /tmp/node.tar.xz
        tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1
        rm /tmp/node.tar.xz
    fi
fi

# Verify node version
NODE_MAJOR=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [[ "$NODE_MAJOR" -lt 18 ]]; then
    log "Node.js 18+ is required. Found: $(node -v)"
    exit 1
fi
log "Node.js: $(node -v)"

# -----------------------------------------------------------------------------
# Install Yarn
# -----------------------------------------------------------------------------
if [[ "$INSTALL_YARN" == "true" ]] && ! command -v yarn &>/dev/null; then
    log "Installing Yarn..."
    corepack enable
    corepack prepare yarn@1.22.22 --activate
fi
log "Yarn: $(yarn -v)"

# -----------------------------------------------------------------------------
# Install PM2 globally
# -----------------------------------------------------------------------------
if ! command -v pm2 &>/dev/null; then
    log "Installing PM2..."
    npm install -g pm2
fi
log "PM2: $(pm2 -v)"

# -----------------------------------------------------------------------------
# Install Docker & Docker Compose
# -----------------------------------------------------------------------------
if ! command -v docker &>/dev/null; then
    log "Installing Docker..."
    if [[ "$OS" == "amzn" || "$OS" == "rhel" || "$OS" == "centos" ]]; then
        yum install -y docker
        service docker start
        usermod -aG docker ec2-user || true
    elif [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        apt-get install -y ca-certificates curl gnupg
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
        apt-get update
        apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        systemctl start docker
        usermod -aG docker ubuntu || true
        usermod -aG docker ec2-user || true
    fi
fi

# Ensure docker daemon is running
systemctl enable docker || true
systemctl start docker || service docker start || true
log "Docker: $(docker --version)"
log "Docker Compose: $(docker compose version || docker-compose version)"

# -----------------------------------------------------------------------------
# Create application directory and clone repo
# -----------------------------------------------------------------------------
log "Cloning repository to $APP_DIR..."
mkdir -p "$APP_DIR"
if [[ -d "$APP_DIR/.git" ]]; then
    cd "$APP_DIR"
    git fetch origin "$BRANCH"
    git reset --hard "origin/$BRANCH"
else
    git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# -----------------------------------------------------------------------------
# Install dependencies and build shared + backend + web
# -----------------------------------------------------------------------------
log "Installing dependencies..."
yarn install --frozen-lockfile --ignore-engines

log "Building shared package..."
yarn workspace @mohallamitr/shared build

log "Building backend..."
yarn workspace @mohallamitr/backend build

log "Building web admin (static export)..."
cd "$APP_DIR/apps/web"
# Copy production env if it exists, otherwise warn user to create one.
if [[ -f "$APP_DIR/apps/web/.env.production" ]]; then
    cp "$APP_DIR/apps/web/.env.production" "$APP_DIR/apps/web/.env.local"
fi
yarn build

cd "$APP_DIR"

# -----------------------------------------------------------------------------
# Environment configuration
# -----------------------------------------------------------------------------
BACKEND_ENV="$APP_DIR/apps/backend/.env"
if [[ ! -f "$BACKEND_ENV" ]]; then
    log "Creating backend .env from example. PLEASE EDIT THIS FILE BEFORE STARTING SERVICES."
    cp "$APP_DIR/apps/backend/deployment/ec2/.env.production.example" "$BACKEND_ENV"
fi

# -----------------------------------------------------------------------------
# Start infrastructure services (MongoDB + MinIO)
# -----------------------------------------------------------------------------
log "Starting MongoDB and MinIO via Docker Compose..."
cd "$APP_DIR/apps/backend/deployment/ec2"
docker compose -f docker-compose.infra.yml up -d

# Wait for MongoDB to be ready
log "Waiting for MongoDB to accept connections..."
for i in {1..30}; do
    if docker compose -f docker-compose.infra.yml exec -T mongo mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
        log "MongoDB is ready."
        break
    fi
    sleep 2
done

# Create MinIO bucket if using local MinIO
if grep -q 'S3_ENDPOINT=http://127.0.0.1:9000' "$BACKEND_ENV" || grep -q 'S3_ENDPOINT=http://localhost:9000' "$BACKEND_ENV"; then
    log "Creating MinIO bucket 'mohallamitr'..."
    docker compose -f docker-compose.infra.yml exec -T minio mc alias set local http://localhost:9000 minioadmin "$(grep MINIO_ROOT_PASSWORD docker-compose.infra.yml | cut -d: -f2 | xargs)" || true
    docker compose -f docker-compose.infra.yml exec -T minio mc mb local/mohallamitr || true
    docker compose -f docker-compose.infra.yml exec -T minio mc anonymous set download local/mohallamitr || true
fi

# -----------------------------------------------------------------------------
# Configure Nginx
# -----------------------------------------------------------------------------
log "Configuring Nginx..."
NGINX_CONF="/etc/nginx/conf.d/mohallamitr.conf"
cp "$APP_DIR/apps/backend/deployment/ec2/nginx.conf" "$NGINX_CONF"
sed -i "s/YOUR_DOMAIN/${DOMAIN:-_}/g" "$NGINX_CONF"

# Remove default server block to avoid conflicts
if [[ -f /etc/nginx/sites-enabled/default ]]; then
    rm /etc/nginx/sites-enabled/default
fi

nginx -t && systemctl restart nginx || service nginx restart

# -----------------------------------------------------------------------------
# Start applications with PM2
# -----------------------------------------------------------------------------
log "Starting Node applications with PM2..."
mkdir -p /var/log/pm2
pm2 start "$APP_DIR/apps/backend/deployment/ec2/ecosystem.config.cjs" --env production
pm2 save
pm2 startup systemd -u "$(logname 2>/dev/null || echo root)" --hp "${HOME}" || true

# -----------------------------------------------------------------------------
# SSL with Let's Encrypt (optional)
# -----------------------------------------------------------------------------
if [[ -n "$DOMAIN" && -n "$EMAIL" ]]; then
    log "Setting up SSL for $DOMAIN..."
    if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        apt-get install -y certbot python3-certbot-nginx
    else
        # Amazon Linux / RHEL
        yum install -y certbot python3-certbot-nginx || yum install -y certbot
    fi
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" || true
fi

# -----------------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------------
log "Setup complete."
log "Backend env file: $BACKEND_ENV (edit secrets before relying on this instance)"
log "PM2 status: pm2 status"
log "Nginx status: systemctl status nginx"
log "MongoDB/MinIO status: docker compose -f $APP_DIR/apps/backend/deployment/ec2/docker-compose.infra.yml ps"
