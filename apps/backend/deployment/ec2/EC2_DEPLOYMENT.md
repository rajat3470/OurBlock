# AWS EC2 Deployment Guide — mohallaMitr (Full Stack, PM2 + Nginx)

Deploys the entire mohallaMitr stack on a single **AWS EC2** instance:

| Component | Runtime | Port | Notes |
|---|---|---|---|
| Node.js/Express backend | PM2 | `5001` | Proxied by Nginx at `/api/*` |
| Next.js web admin (static export) | PM2 (`serve`) + Nginx | `3000` / `80` | Served by Nginx; PM2 runs `serve` |
| MongoDB | Docker Compose | `27017` (localhost only) | Persistent volume |
| MinIO (S3-compatible storage) | Docker Compose | `9000` (localhost only) | Persistent volume |

> This is the cheapest way to get a self-contained production-like environment on AWS. For managed/high-availability, use the existing [DEPLOYMENT.md](../DEPLOYMENT.md) (MongoDB Atlas + S3 + ECS/App Runner).

---

## Prerequisites

1. An AWS account.
2. An SSH key pair downloaded locally.
3. A registered domain (strongly recommended for HTTPS via Let's Encrypt).
4. Basic familiarity with the AWS Console or AWS CLI.

---

## 1. Launch the EC2 instance

1. Open the AWS Console → **EC2** → **Launch Instance**.
2. Name: `mohallamitr-prod`.
3. OS: **Amazon Linux 2023** or **Ubuntu Server 22.04 LTS**.
4. Instance type: start with `t3.small` or `t3.medium` (2 vCPU / 2–4 GB RAM).
   - For demos or very low traffic, `t3.micro` works but may struggle during builds.
5. Key pair: select your existing key pair or create a new one.
6. Network:
   - **Create security group** (or select existing).
   - Allow inbound:
     - SSH `22` from your IP (`0.0.0.0/0` only temporarily)
     - HTTP `80` from anywhere
     - HTTPS `443` from anywhere
     - (Optional) Custom TCP `5001` from your IP only for direct testing
7. Storage: at least **30 GB gp3** (MongoDB + MinIO data grows).
8. Advanced details → **User data** (optional): paste the bootstrap script contents from `setup.sh`, or run it manually after SSH.
9. Launch and note the **public IPv4 address**.

---

## 2. Configure DNS

In your DNS provider (Route 53, Cloudflare, etc.):

- Create an **A record** pointing your domain/subdomain to the EC2 public IP.
  - Recommended: `mohallamitr.yourdomain.com`
  - Optional: `api.mohallamitr.yourdomain.com` if you prefer subdomain-based routing

Wait for DNS propagation:

```bash
nslookup mohallamitr.yourdomain.com
```

---

## 3. Connect to the instance

```bash
ssh -i ~/.ssh/your-key.pem ec2-user@YOUR_EC2_IP   # Amazon Linux
# or
ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_EC2_IP     # Ubuntu
```

---

## 4. Run the bootstrap script

Copy this folder to the instance or run the script directly:

```bash
# On your local machine, copy the deployment folder
scp -i ~/.ssh/your-key.pem -r apps/backend/deployment/ec2 ec2-user@YOUR_EC2_IP:/home/ec2-user/

# On the EC2 instance
chmod +x /home/ec2-user/ec2/setup.sh
sudo DOMAIN=mohallamitr.yourdomain.com EMAIL=you@example.com /home/ec2-user/ec2/setup.sh
```

Or run it via the GitHub raw URL (if your repo is public):

```bash
export REPO_URL=https://github.com/rajat3470/OurBlock.git
export DOMAIN=mohallamitr.in
export EMAIL=rajat.verma@mohallamitr.in
curl -fsSL https://raw.githubusercontent.com/rajat3470/OurBlock/main/apps/backend/deployment/ec2/setup.sh | sudo -E bash
```

The script will:

- Install Node.js 20, Yarn, PM2, Nginx, Docker, Docker Compose.
- Clone your repo to `/var/www/mohallamitr`.
- Build `packages/shared`, `apps/backend`, and `apps/web`.
- Start MongoDB and MinIO via Docker Compose.
- Configure Nginx reverse proxy.
- Start backend and web with PM2.
- Optionally provision a free Let's Encrypt SSL certificate.

---

## 5. Configure environment secrets

The bootstrap creates `.env` from an example file. **Edit it with real secrets before using the app in production.**

```bash
sudo nano /var/www/mohallamitr/apps/backend/.env
```

Minimum required values:

| Variable | How to set |
|---|---|
| `JWT_ACCESS_SECRET` | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | same as above, different value |
| `SUPER_ADMIN_EMAILS` | comma-separated admin emails |
| `ONESIGNAL_APP_ID` | OneSignal dashboard → Settings → Keys & IDs |
| `ONESIGNAL_API_KEY` | OneSignal REST API key |
| `CORS_ORIGIN` | `https://mohallamitr.yourdomain.com` |

If using the self-contained MongoDB/MinIO stack, defaults are already correct. If you prefer managed services, swap the `MONGODB_URI` and `S3_*` values to MongoDB Atlas and AWS S3 (see [DEPLOYMENT.md](../DEPLOYMENT.md) sections 4–5).

Also configure the web admin env:

```bash
sudo nano /var/www/mohallamitr/apps/web/.env.production
```

Set:

```env
NEXT_PUBLIC_API_BASE_URL=https://mohallamitr.yourdomain.com/api
```

Then rebuild and restart:

```bash
cd /var/www/mohallamitr
sudo ./apps/backend/deployment/ec2/deploy.sh
```

---

## 6. Verify the deployment

| Check | Command/URL |
|---|---|
| Backend health | `curl -f http://YOUR_EC2_IP/health` |
| API test | `curl -f http://YOUR_EC2_IP/api/health` |
| Web admin | `https://mohallamitr.yourdomain.com/login` |
| PM2 status | `pm2 status` |
| Nginx logs | `sudo tail -f /var/log/nginx/mohallamitr-error.log` |
| Backend logs | `pm2 logs mohallamitr-backend` |
| MongoDB | `docker ps` → container `mohallamitr-mongo` |
| MinIO console | `http://YOUR_EC2_IP:9001` (not exposed to internet by default) |

---

## 7. Re-deploy after code changes

After pushing new code to GitHub:

```bash
ssh -i ~/.ssh/your-key.pem ec2-user@YOUR_EC2_IP
cd /var/www/mohallamitr
./apps/backend/deployment/ec2/deploy.sh
```

The script pulls the latest code, installs dependencies, rebuilds everything, restarts Docker containers, reloads Nginx, and reloads PM2 apps without dropping MongoDB/MinIO data.

---

## 8. Useful commands

```bash
# PM2
pm2 status
pm2 logs
pm2 restart mohallamitr-backend
pm2 reload all

# Nginx
sudo nginx -t
sudo systemctl reload nginx

# MongoDB (inside container)
docker exec -it mohallamitr-mongo mongosh -u mongo -p mongo --authenticationDatabase admin mohallamitr

# MinIO (inside container)
docker exec -it mohallamitr-minio mc alias set local http://localhost:9000 minioadmin <MINIO_ROOT_PASSWORD>

# Docker infrastructure
cd /var/www/mohallamitr/apps/backend/deployment/ec2
docker compose -f docker-compose.infra.yml ps
docker compose -f docker-compose.infra.yml logs -f

# Update all packages (Amazon Linux)
sudo yum update -y && sudo reboot
# Update all packages (Ubuntu)
sudo apt update && sudo apt upgrade -y && sudo reboot
```

---

## 9. Security hardening checklist

- [ ] Change the MongoDB root password in `docker-compose.infra.yml` and in `mongo-init.js`.
- [ ] Change the MinIO root password in `docker-compose.infra.yml`.
- [ ] Regenerate `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` with `crypto.randomBytes(64)`.
- [ ] Set `ENABLE_MOCK_AUTH=false` in production.
- [ ] Restrict EC2 security group SSH access to your IP only.
- [ ] Disable password-based SSH; use key pairs only.
- [ ] Keep the OS and Docker images updated.
- [ ] Enable automated backups of the MongoDB data volume and/or use MongoDB Atlas for critical data.
- [ ] Use AWS S3 instead of MinIO for uploads if you expect heavy traffic.
- [ ] Consider CloudFront in front of the EC2 instance for DDoS protection and caching.

---

## 10. Estimated monthly cost

| Component | Approximate cost (us-east-1 / ap-south-1) |
|---|---|
| EC2 t3.small | ~$15/mo |
| 30 GB gp3 EBS | ~$3/mo |
| Data transfer | variable, usually <$5 at low volume |
| Route 53 hosted zone | $0.50/mo |
| **Total** | **~$20–25/mo** |

This is significantly cheaper than the managed stack in [DEPLOYMENT.md](../DEPLOYMENT.md) (~$40–70/mo) but requires more operational maintenance.

---

## Troubleshooting

### Port 5001 connection refused

- Check PM2: `pm2 logs mohallamitr-backend`
- Check env file exists and has correct `MONGODB_URI`.

### Nginx shows 502 Bad Gateway

- Verify backend is running: `pm2 status`
- Check Nginx error log: `sudo tail /var/log/nginx/mohallamitr-error.log`

### MinIO uploads fail

- Verify MinIO is running: `docker ps`
- Check `S3_*` env values match `docker-compose.infra.yml`.
- Ensure the `mohallamitr` bucket was created by `setup.sh`.

### SSL certificate not created

- Ensure DNS points to the EC2 IP before running `setup.sh`.
- Re-run certbot manually:
  ```bash
  sudo certbot --nginx -d mohallamitr.yourdomain.com --non-interactive --agree-tos -m you@example.com
  ```

### Static web admin returns 404 on client navigation

- Next.js static export requires `try_files` fallback to `index.html`. The provided `nginx.conf` already handles this.
