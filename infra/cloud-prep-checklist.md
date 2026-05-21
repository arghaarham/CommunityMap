# Cloud Integration Preparation Checklist

This checklist follows the deployment plan outlined in `deploy.md`. Use it to track progress before and during the move from local development to AWS + Supabase.

---

## Phase 0 — AWS Account & IAM

- [ ] AWS account active with billing configured.
- [ ] Decide on target region (default in `.env.example` is `ap-southeast-3`).
- [ ] Create an IAM User/Role for deployment with scoped permissions:
  - **S3:** `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` (limit to the target bucket)
  - **RDS:** `rds:DescribeDBInstances` (read-only for CI/CD health checks)
  - **EC2:** `ec2:DescribeInstances`, `ec2:AuthorizeSecurityGroupIngress` (if automating security group rules)
  - **Amplify:** `amplify:*` (or scoped to the specific app)
- [ ] Install and configure the **AWS CLI** locally (`aws configure`) for testing presigned URLs and bucket policies.

---

## Phase 1 — AWS S3 (File Uploads)

- [ ] Create an S3 bucket in the chosen region.
- [ ] **Block all public access** on the bucket.
- [ ] Configure CORS to allow `PUT` and `GET` from your frontend origin(s):
  ```xml
  <CORSConfiguration>
    <CORSRule>
      <AllowedOrigin>http://localhost:3000</AllowedOrigin>
      <AllowedOrigin>https://your-amplify-domain.com</AllowedOrigin>
      <AllowedMethod>PUT</AllowedMethod>
      <AllowedMethod>GET</AllowedMethod>
      <AllowedHeader>*</AllowedHeader>
    </CORSRule>
  </CORSConfiguration>
  ```
- [ ] Add bucket credentials to `.env`:
  - `AWS_REGION`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_S3_BUCKET`
- [ ] Add backend dependency: `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
- [ ] Implement `POST /api/upload/presign` (or similar) that returns a presigned `PUT` URL.
- [ ] Update frontend report form to:
  1. Select a file via `<input type="file" accept="image/*">`.
  2. Request a presigned URL from the backend.
  3. `PUT` the file directly to S3.
  4. Submit the report with the returned `imageUrl` / `storageKey`.
- [ ] Update `next.config.ts` to allow remote images from your S3 domain (for `next/image` optimization).

---

## Phase 2 — Supabase Realtime

- [ ] Create a Supabase project.
- [ ] Copy credentials into `.env`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (backend only — keep secret)
- [ ] Install Supabase client packages:
  - Frontend: `@supabase/supabase-js`
  - Backend: `@supabase/supabase-js` (for broadcasting from server)
- [ ] Enable **Realtime** on the `reports` table (or configure a Broadcast channel).
- [ ] Backend: broadcast a message when `updateReportStatus` is called by an admin.
- [ ] Frontend: subscribe to realtime updates in `public-map.tsx` and `admin-dashboard.tsx` so status changes and new reports appear without a refresh.

---

## Phase 3 — AWS RDS (Production Database)

- [ ] Launch an RDS PostgreSQL 16 instance in the same region.
- [ ] Create database `communitymap` and user `communitymap` with a strong password.
- [ ] **Security Group:** open inbound TCP `5432` only to:
  - Your EC2 instance security group.
  - Your local IP (temporary, for manual schema verification).
- [ ] **Do NOT** expose `5432` to `0.0.0.0/0` in production.
- [ ] Run `database/schema.sql` against the RDS instance to create tables and indexes.
- [ ] Optionally run `database/seed.sql` for staging/demo data (skip for production).
- [ ] Update production `DATABASE_URL` to the RDS endpoint:
  ```
  postgres://communitymap:<password>@<rds-endpoint>:5432/communitymap
  ```
- [ ] Ensure the backend disables or warns loudly when `pg-mem` fallback is triggered in production.
- [ ] (Optional but recommended) Add a migration tool such as `node-pg-migrate` instead of relying on the JS bootstrapper for schema changes.

---

## Phase 4 — EC2 (Backend Deployment)

- [ ] Launch an EC2 instance (Ubuntu or Amazon Linux 2) in the same VPC as RDS.
- [ ] Install Node.js 20+ on the instance.
- [ ] Clone or transfer the repository to the server.
- [ ] Install backend dependencies: `cd backend && npm install --production`.
- [ ] Install a process manager (PM2 or Systemd) to keep the app alive:
  ```bash
  pm2 start backend/src/index.js --name communitymap-api
  pm2 startup
  pm2 save
  ```
- [ ] Install and configure a reverse proxy:
  - **Nginx** or **Caddy** recommended.
  - Proxy `https://api.yourdomain.com` → `http://localhost:4000`.
  - Terminate TLS with a free **Let’s Encrypt** certificate.
- [ ] Lock CORS origins in `backend/src/config/env.js`:
  - Remove wildcard localhost allowances in production.
  - Whitelist your Amplify domain and any custom domains.
- [ ] Set a strong `JWT_SECRET` (generate with `openssl rand -base64 32`).
- [ ] Ensure the Node app binds to `0.0.0.0` (Express does this by default) and the EC2 security group only allows `80`/`443` from the internet.

---

## Phase 5 — AWS Amplify (Frontend Deployment)

- [ ] Create an Amplify app and connect it to your Git repository.
- [ ] Configure build settings:
  - Root directory: `frontend` (if Amplify supports monorepo builds) or build from root with a custom `amplify.yml`.
  - Node version: `20`.
- [ ] Add environment variables in the Amplify console:
  - `NEXT_PUBLIC_API_BASE_URL=https://<your-ec2-domain>/api`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_MAP_STYLE_URL` (if using a custom MapLibre style)
- [ ] Add the S3 image domain to `next.config.ts` under `images.remotePatterns` if you want `next/image` optimization for uploaded photos.
- [ ] Verify the build succeeds and SSR pages (`/`, `/map`, `/admin`) render correctly.
- [ ] Enable branch previews if you want staging environments.

---

## Phase 6 — Production Hardening

- [ ] **Secrets:** move all secrets out of code and Git. Use Amplify env vars + EC2 `.env` files with strict permissions (`chmod 600`).
- [ ] **HTTPS:** enforce HTTPS on both EC2 (via proxy) and Amplify (enabled by default).
- [ ] **Rate Limiting:** add rate limiting to sensitive endpoints (`/api/auth/login`, `/api/auth/register`, `/api/reports`).
- [ ] **Input Validation:** review `reports.service.js` and `auth.routes.js` for SQL injection vectors (currently parameterized queries are used — verify this stays true).
- [ ] **Health Checks:** ensure `/api/health` is used by EC2/ELB health checks.
- [ ] **Logging:** configure centralized logging (CloudWatch, or a simple log stream) on the EC2 instance.
- [ ] **Database Backups:** enable automated RDS snapshots.
- [ ] **S3 Lifecycle:** add a lifecycle rule to move old report images to cheaper storage classes (e.g., Glacier) if retention policy requires it.
- [ ] **Monitoring:** set up basic alarms for:
  - EC2 CPU / memory
  - RDS storage / connection count
  - Amplify build failures

---

## Rollback Plan

- [ ] Keep the Docker Compose local stack functional (`docker-compose.yml`).
- [ ] Maintain a working `.env` file for local development so the team can fall back to the in-memory or Docker Postgres stack instantly.
- [ ] Tag releases in Git before deploying so you can revert the backend quickly on EC2.

---

## Quick Reference — Target Architecture

| Component | Service |
|-----------|---------|
| Frontend | AWS Amplify |
| Backend | AWS EC2 + Nginx/Caddy |
| Database | AWS RDS PostgreSQL |
| File Storage | AWS S3 |
| Realtime | Supabase Realtime |
| DNS / TLS | Route 53 + Let’s Encrypt |

---

> **Tip:** Do not try to do all phases at once. The recommended order is **S3 → Realtime → RDS → EC2 → Amplify → Hardening**.
