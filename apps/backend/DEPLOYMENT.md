# AWS Deployment Guide — @mohallamitr/backend

This guide covers deploying the standalone Node.js backend on AWS using
**MongoDB Atlas** for app data + **Amazon S3** for object storage +
**AWS ECS / EC2 / App Runner** for the API service.

> For local development, see `README.md`. For the original migration rationale
> and feature parity notes, see `/BACKEND_FLOW_DOCUMENTATION.md` at the repo
> root.

## 1. Target architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        AWS Cloud                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │ Route 53     │───>│ CloudFront   │───>│ ALB / API GW │   │
│  └──────────────┘    └──────────────┘    └──────┬───────┘   │
│                                                 │            │
│                          ┌──────────────────────┘            │
│                          ▼                                   │
│                   ┌─────────────┐                           │
│                   │ ECS Service │  (Fargate or EC2)          │
│                   │   (Node)    │  Docker image from ECR    │
│                   └──────┬──────┘                           │
│                          │                                   │
│        ┌─────────────────┼─────────────────┐                 │
│        ▼                 ▼                 ▼                 │
│  ┌────────────┐   ┌────────────┐   ┌──────────────────┐    │
│  │ MongoDB    │   │ S3         │   │ OneSignal        │    │
│  │ Atlas      │   │ Images     │   │ Push             │    │
│  └────────────┘   └────────────┘   └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## 2. Required services & rough costs

| Service | Purpose | Free-tier / rough starting cost |
|---|---|---|
| **MongoDB Atlas M0** | Primary database | Free forever tier (512 MB, shared CPU) |
| **Amazon S3** | Product images, delivery proofs, banners | Pay per GB + requests; usually <$5/mo at low volume |
| **Amazon ECR** | Store the Docker image | ~$0.10/GB/mo |
| **Amazon ECS Fargate** or **App Runner** | Run the Node API | Fargate ~$18/mo for 1 vCPU/2GB; App Runner ~$15/mo |
| **Application Load Balancer** (if not using App Runner) | HTTPS ingress | ~$18/mo + LCU charges |
| **AWS Secrets Manager** | Store DB password / JWT secrets / S3 keys | ~$0.40/secret/mo |
| **CloudWatch** | Logs, metrics, alarms | ~$0.50/GB log ingestion |
| **ACM** | Free TLS certificate | Free when used with CloudFront/ALB |
| **S3 static bucket** (optional) | Privacy Policy / Terms pages | ~$0.50/mo |

Budget starting point for a single-AZ, low-traffic deployment: **$40–70/mo**.

## 3. Pre-deployment prerequisites

1. **AWS CLI** installed and configured (`aws configure`).
2. **Docker** installed locally.
3. **Domain** (optional but recommended) with DNS managed in Route 53.
4. **OneSignal app** + REST API key (push notifications).
5. A working `.env` file (copy from `.env.example` and fill all values).

## 4. MongoDB Atlas M0 setup

### 4.1 Create the cluster

1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) and sign in.
2. Create a new project called `mohallamitr`.
3. Build a cluster:
   - **Cluster tier**: `M0 Sandbox` (free forever)
   - **Cloud provider**: `AWS`
   - **Region**: `Mumbai (ap-south-1)` (or closest to your users)
4. Wait for the cluster to provision.

### 4.2 Database access

1. **Database Access → Add New Database User**
   - Authentication: `Username and Password`
   - Username: `mohallamitr_app`
   - Password: generate a strong password
   - Built-in role: `readWriteAnyDatabase`
2. Save the password in **AWS Secrets Manager** or your CI/CD secrets.

### 4.3 Network access

1. **Network Access → Add IP Address**
2. M0 clusters **do not support VPC peering**. For production-grade private
   networking, upgrade to `M10` or higher.
3. Common options:
   - **Development**: allow access from anywhere (`0.0.0.0/0`)
   - **Production with static ECS/EC2 IP**: whitelist your NAT Gateway / Elastic IP
   - **Production with App Runner**: whitelist `0.0.0.0/0` (App Runner does not
     provide static egress IPs on M0; upgrade to M10 + VPC peering for strict
     network controls)

### 4.4 Connection string

1. **Overview → Connect → Drivers → Node.js**
2. Copy the `mongodb+srv://` URI.
3. Replace `<password>` with the app user's password.
4. Append the database name: `mongodb+srv://...mongodb.net/mohallamitr?retryWrites=true&w=majority`
5. Set it as `MONGODB_URI` in your environment.

### 4.5 Indexes

The backend creates Mongoose schema indexes automatically on startup via
`Model.syncIndexes()`. To avoid index-build stalls on a large collection,
create the following indexes manually in Atlas after the first connection
(these match `src/models/index.ts`):

```js
db.users.createIndex({ societyId: 1, role: 1 });
db.businesses.createIndex({ societyId: 1, status: 1 });
db.businesses.createIndex({ category: 1 });
db.products.createIndex({ businessId: 1, status: 1 });
db.products.createIndex({ businessId: 1, category: 1 });
db.orders.createIndex({ businessId: 1, status: 1, createdAt: -1 });
db.orders.createIndex({ businessId: 1, createdAt: -1 });
db.orders.createIndex({ userId: 1, createdAt: -1 });
db.orders.createIndex({ status: 1, createdAt: -1 });
db.orders.createIndex({ status: 1, autoRejectAt: 1 });
db.coupons.createIndex({ businessId: 1 });
db.coupons.createIndex({ forUserId: 1 });
db.reviews.createIndex({ businessId: 1 });
db.reviews.createIndex({ productId: 1 });
db.reviews.createIndex({ orderId: 1 });
db.notifications.createIndex({ userId: 1 });
db.chatSessions.createIndex({ businessId: 1, userId: 1 }, { unique: true });
db.messages.createIndex({ chatSessionId: 1 });
db.ad_reward_claims.createIndex({ userId: 1, date: 1 }, { unique: true });
```

## 5. S3 bucket for images / delivery proofs

### 5.1 Create bucket

```bash
aws s3 mb s3://mohallamitr-prod-uploads --region ap-south-1
aws s3api put-public-access-block \
  --bucket mohallamitr-prod-uploads \
  --public-access-block-configuration BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false
```

### 5.2 CORS (required if mobile app ever uploads directly to S3)

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["https://your-domain.com"],
    "MaxAgeSeconds": 3000
  }
]
```

### 5.3 Bucket policy for public reads

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::mohallamitr-prod-uploads/*"
    }
  ]
}
```

### 5.4 IAM user / role for the backend

Create an IAM user `mohallamitr-backend-s3` with this inline policy (attach only the bucket ARN):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::mohallamitr-prod-uploads/*"
    }
  ]
}
```

Generate access keys and put them in the backend environment.

## 6. Legal pages (Privacy Policy / Terms)

### Option A — Free generator + S3 static bucket (recommended)

1. Generate pages with one of:
   - [TermsFeed](https://www.termsfeed.com/)
   - [FreePrivacyPolicy](https://www.freeprivacypolicy.com/)
   - [Iubenda](https://www.iubenda.com/)
2. Download the generated HTML files.
3. Create an S3 bucket `mohallamitr-legal` and enable static website hosting.
4. Upload `privacy.html`, `terms.html`, `refund.html`.
5. Make the objects public and set the bucket policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::mohallamitr-legal/*"
    }
  ]
}
```

6. Point your domain:
   - `https://legal.yourdomain.com/privacy.html`
   - `https://legal.yourdomain.com/terms.html`

### Option B — CloudFront + S3 (custom domain + HTTPS)

1. Create a CloudFront distribution with origin `mohallamitr-legal.s3.ap-south-1.amazonaws.com`.
2. Attach an ACM certificate for `legal.yourdomain.com`.
3. Create a Route 53 A-record alias to CloudFront.

### Option C — GitHub Pages / Netlify

Upload the generated HTML files to a public GitHub repo with Pages enabled, or
host them on Netlify. Both are free and give you HTTPS.

## 7. Container build & push (ECR)

### 7.1 Create repository

```bash
aws ecr create-repository --repository-name mohallamitr/backend --region ap-south-1
```

### 7.2 Build & push from repo root

```bash
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com

# From repo root
IMAGE_URI=<AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/mohallamitr/backend:latest

docker build -t $IMAGE_URI -f apps/backend/Dockerfile .
docker push $IMAGE_URI
```

## 8. Run the service

Pick one of the three managed options.

### Option A — AWS App Runner (quickest, HTTPS built-in)

1. Create an App Runner service.
2. Source: ECR image `mohallamitr/backend:latest`.
3. Environment variables (inline or via Secrets Manager ARNs):
   - `MONGODB_URI`
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
   - `S3_ENDPOINT=`**leave blank** to use AWS S3 default
   - `S3_REGION=ap-south-1`
   - `S3_BUCKET=mohallamitr-prod-uploads`
   - `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
   - `S3_FORCE_PATH_STYLE=false`
   - `S3_PUBLIC_BASE_URL=https://mohallamitr-prod-uploads.s3.ap-south-1.amazonaws.com`
   - `ONESIGNAL_APP_ID`, `ONESIGNAL_API_KEY`
   - `CORS_ORIGIN=https://your-domain.com`
   - `NODE_ENV=production`
   - `ENABLE_MOCK_AUTH=false`
4. Instance: 1 vCPU / 2 GB RAM, auto-scaling 1–2 instances.
5. Custom domain via Route 53 → App Runner.

### Option B — ECS Fargate with ALB (more control)

1. Create a VPC with public + private subnets (or use the default VPC).
2. Create an ECS cluster.
3. Create a task definition:
   - Container image: the ECR URI.
   - Port mapping: `5001`.
   - CPU/memory: `256/512` minimum for dev, `512/1024` recommended.
   - Environment variables from Secrets Manager or inline.
   - Health check `/health`.
4. Create a service with target group and an Application Load Balancer.
5. Attach an ACM certificate to the ALB HTTPS listener.
6. Auto-scaling: target tracking on CPU 70%.

### Option C — EC2 single instance (cheapest, but manual)

1. Launch an Amazon Linux 2023 t3.small.
2. Install Docker: `sudo yum install -y docker && sudo service docker start && sudo usermod -aG docker ec2-user`.
3. Pull the ECR image (configure `aws configure` and Docker login).
4. Run: `docker run -d --restart always -p 80:5001 --env-file .env <IMAGE_URI>`.
5. Put ALB or CloudFront in front for HTTPS; do not terminate TLS at the container.

## 9. Required production environment variables

```text
NODE_ENV=production
PORT=5001

# MongoDB Atlas
MONGODB_URI=mongodb+srv://mohallamitr_app:<PASS>@cluster0.xxxxx.mongodb.net/mohallamitr?retryWrites=true&w=majority

# JWT — generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=<64-byte-hex>
JWT_REFRESH_SECRET=<64-byte-hex>
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=30d

# Super-admin allowlist
SUPER_ADMIN_EMAILS=ankushrishi5@gmail.com,admin@yourdomain.com

# Disable Firebase-style mock auth in production
ENABLE_MOCK_AUTH=false

# S3 on AWS
S3_ENDPOINT=                           # leave empty for AWS S3
S3_REGION=ap-south-1
S3_BUCKET=mohallamitr-prod-uploads
S3_ACCESS_KEY_ID=AKIA...
S3_SECRET_ACCESS_KEY=...
S3_FORCE_PATH_STYLE=false
S3_PUBLIC_BASE_URL=https://mohallamitr-prod-uploads.s3.ap-south-1.amazonaws.com

# OneSignal
ONESIGNAL_APP_ID=...
ONESIGNAL_API_KEY=...

# CORS — lock to your mobile/web domains
CORS_ORIGIN=https://your-domain.com
```

## 10. Health checks & monitoring

- **ALB target group health check**: `GET /health` on port 5001.
- **CloudWatch alarms**:
  - CPU > 80% for 5 min
  - Memory > 80% for 5 min
  - ALB 5xx count > 10/min
- **Logs**: container logs to stdout; collected by CloudWatch Logs.
- **Structured logging**: currently uses `console.log/error`. For production,
  consider adding `pino` with CloudWatch agent parsing.
- **MongoDB Atlas alerts**: enable email/SMS alerts for connections, disk, op
  log, and query-targeting ratios.

## 11. Security checklist

- [ ] `ENABLE_MOCK_AUTH=false` in production.
- [ ] MongoDB user uses a strong password, role limited to `readWriteAnyDatabase`.
- [ ] Atlas network access restricted to backend IP(s) where possible; otherwise plan M10 upgrade for VPC peering.
- [ ] JWT secrets generated with `crypto.randomBytes(64)` and stored in Secrets Manager.
- [ ] S3 bucket does **not** allow public `PutObject`; only `GetObject`.
- [ ] IAM keys have least-privilege access (only the one S3 bucket).
- [ ] HTTPS only (ACM + ALB or App Runner default domain).
- [ ] Enable Atlas backup snapshots (manual exports on M0, automated on M10+).
- [ ] Enable CloudTrail for API auditing.
- [ ] Keep the base image (`node:20-alpine`) updated; scan with Amazon Inspector.

## 12. Backup & disaster recovery

- **MongoDB Atlas M0**: no automated backups; schedule `mongodump` exports to
  S3 (e.g., weekly). For automated snapshots, upgrade to `M10`.
- **S3**: enable versioning on the uploads bucket; consider cross-region
  replication for critical media.
- **Container image**: tag by Git SHA in ECR, not just `latest`.

## 13. Scaling considerations

Current bottlenecks to watch:

- **Order auto-reject cron** runs in every container instance. With >1 replica,
  multiple nodes will race to auto-reject expired orders. MongoDB document-level
  locks keep this safe but add DB load. For high scale, move the sweeper to a
  single scheduled ECS task or AWS EventBridge + Lambda.
- **OneSignal fan-out**: synchronous pushes inside route handlers. If OneSignal
  is slow, requests slow down. Consider an SQS queue or AWS EventBridge for async
  notification delivery at high scale.
- **Image uploads**: currently base64-in-JSON. For large catalogs, switch to
  presigned S3 PUT URLs from the mobile app.
- **MongoDB M0 limits**: 512 MB storage, max 500 connections, no VPC peering,
  no automated backups. Plan an `M10` upgrade before production load.

## 14. Migration from Firestore to MongoDB Atlas

This is not automated yet. When ready:

1. Export Firestore collections to JSON (`firebase firestore:export` or a script using `firebase-admin`).
2. Run a one-off migration script that reads the JSON and inserts documents using
   the exported `src/models` Mongoose models, in dependency order:
   `Society` → `User` → `Business` → `Product` → `Order` → `Coupon` → `Review` →
   `Refund` → `ChatSession`/`Message` → `Notification`.
3. Firestore document IDs can be reused as MongoDB `_id` values (both are strings).
4. Convert Firestore Timestamp fields to JavaScript `Date` objects before insertion.
5. Passwords: existing users have no password hash (Firebase Auth stored them
   internally). Force a password-reset flow post-migration.
6. Validate counts and spot-check order totals before switching the mobile app
   base URL to the new AWS backend.

## 15. Useful commands

```bash
# Tail ECS service logs
aws logs tail /ecs/mohallamitr-backend --follow

# Force new ECS deployment
aws ecs update-service --cluster mohallamitr --service backend --force-new-deployment

# Test MongoDB connection from local machine
mongosh "$MONGODB_URI" --eval "db.adminCommand('ping')"
```
