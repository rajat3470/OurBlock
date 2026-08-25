# syntax=docker/dockerfile:1

# ---------------------------------------------------------------
# Production Dockerfile for @mohallamitr/backend
# Intended for AWS ECS / EKS / EC2 (Docker) / App Runner
# Database: MongoDB Atlas (Mongoose ODM)
# Storage: AWS S3-compatible object storage
# ---------------------------------------------------------------

FROM node:20-alpine AS base

# dumb-init for proper signal handling
RUN apk add --no-cache dumb-init && \
    corepack enable && corepack prepare yarn@1.22.22 --activate

WORKDIR /app

# 1. Install prod deps only
FROM base AS deps
COPY package.json yarn.lock ./
COPY apps/backend/package.json ./apps/backend/package.json
RUN yarn install --production --frozen-lockfile --ignore-engines --ignore-scripts

# 2. Build stage
FROM base AS builder
COPY package.json yarn.lock ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/backend/tsconfig.json ./apps/backend/tsconfig.json
COPY apps/backend/src ./apps/backend/src

# Install dev deps (typescript) needed for build
RUN yarn install --frozen-lockfile --ignore-engines

RUN yarn workspace @mohallamitr/backend build

# 3. Production runtime image
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=5001
WORKDIR /app

# Don't run as root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 backend

# Copy runtime artifacts
COPY --from=deps --chown=backend:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=backend:nodejs /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder --chown=backend:nodejs /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=backend:nodejs /app/apps/backend/package.json ./apps/backend/package.json

USER backend
EXPOSE 5001

# MongoDB Atlas is schema-less; no migration step required at startup.
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "cd apps/backend && node dist/index.js"]
