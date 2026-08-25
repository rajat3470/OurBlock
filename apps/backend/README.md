# @mohallamitr/backend

Standalone Node.js/Express backend replacing the Firebase Cloud Functions +
Firestore + Firebase Auth + Firebase Storage stack (`apps/firebase/functions`).

- Full migration rationale, feature-by-feature parity notes, and known legacy
inconsistencies are documented in
[`/BACKEND_FLOW_DOCUMENTATION.md`](../../BACKEND_FLOW_DOCUMENTATION.md) at the
repo root — read that first if you're unsure why something is implemented a
certain way.
- Production AWS deployment (MongoDB Atlas + S3 + ECS/App Runner) is covered in
[`DEPLOYMENT.md`](./DEPLOYMENT.md).

## Stack

- **Runtime**: Node.js 18+, Express
- **Database**: MongoDB via Mongoose ODM (replaces Firestore); deploy target is MongoDB Atlas M0/M10
- **Auth**: JWT access tokens (1h) + opaque DB-backed refresh tokens (30d) + bcrypt password hashing (replaces Firebase Auth)
- **Storage**: S3-compatible object storage — AWS S3, Cloudflare R2, or local MinIO (replaces Firebase Storage)
- **Push notifications**: OneSignal (primary) + Expo Push (fallback). **FCM was dropped** since it requires a Firebase project; OneSignal's own SDK layer covers Android/iOS delivery client-side.
- **Scheduled jobs**: `node-cron` (replaces Pub/Sub scheduled Cloud Functions)
- **Validation**: zod

## Getting started

```bash
# from repo root, or from this directory
yarn install

cp apps/backend/.env.example apps/backend/.env
# edit .env: set MONGODB_URI, JWT secrets, S3 + OneSignal credentials

cd apps/backend
yarn dev                 # starts the API on PORT (default 5001)
```

### Local MongoDB (quick start via Docker)

```bash
docker run --name mohallamitr-mongo -p 27017:27017 -d mongo:7
```

### Local S3-compatible storage (MinIO, optional for dev)

```bash
docker run --name mohallamitr-minio -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin \
  -d minio/minio server /data --console-address ":9001"
```
Then create a bucket named `mohallamitr` via the MinIO console at `http://localhost:9001`.

## Project layout

```
src/
  models/index.ts         # Mongoose schemas (replaces Prisma schema)
  lib/prismaProxy.ts      # Prisma-compatible proxy over Mongoose models
  lib/prisma.ts           # backwards-compatible db entrypoint
  index.ts                # Express app entrypoint + cron bootstrap
  lib/                    # mongoose connection, jwt, S3 storage, notifications
  middleware/             # auth (JWT + dev mock-token bypass), super-admin gate
  shared/                 # constants + zod validation schemas
  services/               # orderExpiry, blacklist, coupons, orderEvents,
                           # demoCatalog, cascadeDelete — business logic ported
                           # from the Firestore triggers / shared helpers
  jobs/                   # node-cron scheduled jobs (auto-reject sweeper)
  routes/                 # one file per API route group (mirrors the legacy
                           # apps/firebase/functions/src/api/*.ts structure 1:1)
```

## Notable migration decisions (see BACKEND_FLOW_DOCUMENTATION.md §12 for full context)

- **Full replacement** was chosen over an incremental "keep Firestore" migration: MongoDB/Mongoose replaces Firestore, JWT+bcrypt replaces Firebase Auth, S3-compatible storage replaces Firebase Storage.
- **Dev mock-token bypass preserved** (`ENABLE_MOCK_AUTH=true` by default) so the mobile app's dev/demo login flow keeps working unchanged. Set `ENABLE_MOCK_AUTH=false` in production.
- **Firestore triggers became inline service calls** at the same code point as the corresponding write (e.g. `onOrderCreated`/`onOrderStatusChanged` in `services/orderEvents.ts`), since there's no separate Cloud Functions trigger runtime in a standalone Express server.
- **The redundant society-delete Firestore trigger was consolidated** into the single `services/cascadeDelete.ts` implementation, called directly from the `DELETE /societies/:id` route.
- **Coupon type `"fixed"` bug fixed**: the legacy `computeCouponDiscount` only handled `percentage`/`flat`, so ad-reward coupons (issued with `type:"fixed"`) always discounted ₹0. The new engine treats `fixed` the same as `flat`.
- **Legacy gaps preserved, not silently fixed**: `businesses.ts`/`products.ts`/`users.ts` list/CRUD routes intentionally have no auth middleware (matches the original Firebase code) — flagged in `BACKEND_FLOW_DOCUMENTATION.md §9.1` for a future decision, not fixed here without sign-off.

## Data migration from Firestore

This scaffold does **not** include a live-data migration script (exporting
existing Firestore documents into MongoDB) since that requires production
Firebase credentials and a decision on downtime/cutover strategy. When ready:

1. Export each Firestore collection to JSON (`firebase firestore:export` or a script using `firebase-admin`).
2. Write a one-off Node script that reads the JSON and inserts documents per collection using the exported `src/models` Mongoose models, in dependency order: `Society` → `User` → `Business` → `Product` → `Order` → the rest.
3. Firestore document IDs can be reused as MongoDB `_id` values (both are strings) to preserve foreign keys without a remapping pass.
4. Passwords: existing users have no password hash (Firebase Auth stored these internally) — you'll need a forced password-reset flow for existing accounts post-migration.
