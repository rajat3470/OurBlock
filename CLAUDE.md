# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

mohallaMitr is a local society marketplace platform — residents discover nearby businesses, order products, and get them delivered within their housing society/mohalla. It has three user roles: **Resident** (customer), **Business Owner**, and **Delivery Partner**, plus a **Super Admin** web dashboard.

## Monorepo Structure

Yarn workspaces monorepo with four apps and one shared package:

- **apps/mobile** — Expo/React Native app (Expo SDK 55, React Native 0.83, Expo Router with file-based routing). Single codebase serves three app targets via `EXPO_PUBLIC_APP_TARGET`: `user`, `businessOwner`, `deliveryPartner`. Routes live in `app/(user)/`, `app/(business-owner)/`, `app/(delivery-partner)/`.
- **apps/backend** — Express + Mongoose REST API (TypeScript, compiled with `tsc`). Uses a Prisma-compatible proxy over Mongoose (`src/lib/prismaProxy.ts`) — route code uses Prisma-style syntax (`prisma.user.findUnique`) but it's Mongoose underneath. All models defined in `src/models/index.ts`.
- **apps/web** — Next.js 14 Super Admin dashboard (`output: 'export'` — static site). `NEXT_PUBLIC_*` env vars are baked at build time.
- **packages/shared** — Shared TypeScript types/utilities used across apps. Must be built (`yarn workspace @mohallamitr/shared build`) before other apps.

## Common Commands

```bash
# Environment switching (copies envs/<env>.env → .env for each app)
yarn env:local          # Local dev (localhost backend)
yarn env:int            # Integration (Atlas DB, local backend)
yarn env:prod           # Production (mohallamitr.in API)

# Start all services for an environment
yarn dev:local          # Switches env + starts backend, web, mobile
yarn dev:int
yarn dev:prod           # Note: backend will fail without prod DB URI locally — only use for mobile/web against live API

# Individual services
yarn backend:dev        # tsx watch src/index.ts (port 5001)
yarn web                # next dev (port 3000)
yarn mobile             # expo start
yarn mobile:customer    # expo start with user target
yarn mobile:business    # expo start with businessOwner target
yarn mobile:delivery    # expo start with deliveryPartner target

# Build
yarn backend:build      # tsc → apps/backend/dist/
yarn workspace @mohallamitr/web build  # next build → apps/web/out/

# Type checking
yarn type-check         # All workspaces
yarn workspace @mohallamitr/mobile type-check
yarn workspace @mohallamitr/backend type-check

# Deployment
bash scripts/deploy-web.sh       # Build locally + rsync to EC2
# Server-side: ssh in → git pull → ./apps/backend/deployment/ec2/deploy.sh
```

## Environment Configuration

Each app has `envs/` directory with `local.env`, `int.env`, `prod.env`. The `switch-env.sh` script copies the selected env to each app's active location:
- Backend: `apps/backend/.env`
- Mobile: `apps/mobile/.env` (only `EXPO_PUBLIC_*` vars are bundled)
- Web: `apps/web/.env.local` (only `NEXT_PUBLIC_*` vars are baked at build time)

**Critical**: Web is a static export — env vars are embedded in JS bundles during `yarn build`, not read at runtime. Changing `.env.local` requires a rebuild.

## Architecture Details

### Backend (apps/backend)

- **Database**: MongoDB Atlas via Mongoose. Despite file names referencing "prisma", there is no actual Prisma — `src/lib/prismaProxy.ts` wraps Mongoose models with Prisma-compatible API syntax.
- **Auth**: JWT-based (access + refresh tokens). `src/middleware/auth.ts` extracts `uid` and `role`. Mock auth available in dev via `ENABLE_MOCK_AUTH=true`. Super admin routes (`src/routes/admin.ts`) use `requireSuperAdmin` middleware.
- **Storage**: AWS S3 for file uploads (`src/lib/storage.ts`).
- **Real-time**: Socket.IO for live order updates (`src/lib/socket.ts`).
- **Notifications**: OneSignal push notifications (`src/lib/notifications.ts`).
- **Feature flags**: Stored in MongoDB `PlatformConfig` singleton, served at `GET /feature-flags` (public) and managed at `GET/PUT /admin/platform-config` (admin-only).
- **Deployment**: EC2 with PM2 (backend) + Nginx (reverse proxy + static web). Docker Compose for MongoDB + MinIO. Config at `apps/backend/deployment/ec2/`.

### Mobile (apps/mobile)

- **Routing**: Expo Router (file-based). Auth guard in `app/_layout.tsx` redirects based on role.
- **State**: Redux Toolkit (`src/store/`). Slices: `auth`, `userApp`, `businessOwner`, `cart`, `featureFlags`, `society`, `superAdmin`.
- **API client**: Axios with JWT auto-refresh (`src/services/apiClient.ts`). Base URL from `EXPO_PUBLIC_API_BASE_URL`.
- **Content/i18n**: Static JSON files in `src/content/` (e.g., `cart.json`, `home.json`). UI strings are not hardcoded.
- **Ads**: Google AdMob via `react-native-google-mobile-ads`. Rewarded video, native, banner ads controlled by feature flags. Ad unit IDs in `src/services/adService.ts`.
- **Feature flags**: Fetched from backend on app launch and on foreground resume. Stored in Redux. Dev drawer on profile screen allows local overrides (only in `__DEV__`).

### Web (apps/web)

- **Framework**: Next.js 14 with `output: 'export'` (static HTML/JS). No SSR.
- **API client**: `src/lib/api.ts` — fetch-based with JWT auth and auto-refresh.
- **Served via Nginx** on the EC2 instance from `/var/www/mohallamitr/apps/web/out/`.

### Nginx Routing (production)

- `/api/*` → Backend (port 5001, `/api` prefix stripped)
- `/socket.io/*` → Backend WebSocket
- `/*` → Static web files from `apps/web/out/`

## Gotchas

- `patch-package` patches exist in `/patches/` for several Expo packages — `yarn install` runs `postinstall` to apply them.
- The mobile app IP in `.env` (`EXPO_PUBLIC_API_BASE_URL`) must match your machine's current local IP for physical device testing. Simulators can use `127.0.0.1`.
- Running `dev:prod` starts the backend locally too, but it will fail without the production MongoDB URI. For testing against prod API, just run mobile/web individually after `yarn env:prod`.
