# PayPulse (JK Payroll) — Production Deployment Guide

This guide establishes the canonical deployment architecture, environment configurations, migration procedures, database security testing, and release runbook for PayPulse (JK Payroll).

Security phase status and release evidence live in [the master tracker](security/SECURITY_REMEDIATION_MASTER_TRACKER.md) and [production readiness record](security/SECURITY_PRODUCTION_READINESS.md). This runbook is not a phase tracker or production security approval.

---

## 1. Required Tools & Prerequisites

- **Node.js**: v20.x or v22.x LTS (ESM enabled).
- **Package Manager**: `npm` v10+ (or `pnpm`).
- **Supabase CLI**: v3.2.0+ (invoked via `npx supabase` or standalone binary).
- **TypeScript**: v5.7+ (`tsc`).
- **Vite**: v6+ (`vite build`).
- **Git**: v2.40+.

---

## 2. Required Supabase Account & Project Access

Before deploying database infrastructure, verify your account possesses appropriate administrative role privileges in the target Supabase organization:
- **Role Permissions Required:**
  - `database_write`: Execute DDL/migrations on remote PostgreSQL.
  - `database_pooling_config_read`: Connect through PgBouncer / Supavisor connection pooler.
  - `projects_read`: Inspect project references and metadata.
  - `branching_production_read`: Validate production branch state.
- **Protected Credentials:**
  - Database password (or pooler credentials).
  - Supabase CLI Personal Access Token (PAT) configured locally via `supabase login`.
  - Service-Role Secret (`SUPABASE_SERVICE_ROLE_KEY`) restricted strictly to the backend server.
  - Public Anon Key (`SUPABASE_ANON_KEY`) for browser and unauthenticated ingress.

---

## 3. Local Environment Setup

1. **Clone repository and install dependencies:**
   ```bash
   git clone <repo-url> jk-payroll
   cd jk-payroll
   npm install
   ```

2. **Configure local environment file (`.env`):**
   ```bash
   cp .env.example .env
   ```
   Populate values for local development:
   ```env
   PORT=3000
   NODE_ENV=development
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
   TRUST_PROXY=false
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ALLOW_LOCAL_JWT=true
   JWT_SECRET=your-minimum-32-character-jwt-secret-key-here
   JWT_ISSUER=jk-payroll
   JWT_AUDIENCE=jk-payroll-api
   ```

3. **Verify local build and tests:**
   ```bash
   npm run build
   npm run build:client
   npm test
   ```

---

## 4. Staging Project Setup

For staging deployments:
1. Create a dedicated Staging Supabase project (e.g. `jk-payroll-staging`).
2. Record its Project Reference ID (e.g. `staging-project-ref`).
3. Set staging environment variables matching the staging backend and frontend domains.

---

## 5. Production Project Setup

For production deployments:
1. Identify the designated Production Supabase project:
   - Target project: `fsnfqnbixitmmjmeogml` (`jKyle08's Project`).
2. Verify production compute tier, compute add-ons, and automated Point-in-Time Recovery (PITR) are active.
3. Confirm network restrictions, allowed IP ranges, and SSL enforcement.

---

## 6. Supabase CLI Authentication

Authenticate the CLI without embedding tokens in source files or shell histories:
```bash
npx supabase login
```
The CLI opens an interactive browser session to authenticate and stores access tokens securely in `~/.supabase/access-token`.

---

## 7. Project Linking

Link the repository to the designated target Supabase project:
```bash
# For Staging:
npx supabase link --project-ref <STAGING_PROJECT_REF>

# For Production (after confirmation):
npx supabase link --project-ref fsnfqnbixitmmjmeogml
```
This updates local state in `supabase/.temp/` and binds CLI commands to the remote project.

---

## 8. Migration Inspection & Pre-Deployment Dry-Run

Always inspect the difference between local migrations in `supabase/migrations/` and remote migration state:

```bash
# 1. List status of all migrations
npx supabase migration list --remote

# 2. Execute dry-run to preview exact DDL operations without committing
npx supabase db push --dry-run --remote
```

Expected Pending Sequence:
- `20261104000008_align_organizations_schema.sql`: Harmonizes organization status, tier, slug, and contact.
- `20261104000009_expand_organizations_sector_settings.sql`: Adds sector, settings JSONB, and `payroll_runs` table.
- `20261119000010_remediate_database_rls.sql`: Applies PostgreSQL RLS on all operational and catalog tables.
- `20261119000011_harden_audit_attribution_and_integrity.sql`: Enforces audit attribution triggers and immutability guard.

---

## 9. Migration Deployment

Execute migration deployment to push pending DDL statements:
```bash
npx supabase db push --remote
```

*Rules:*
- Never use `supabase db reset --linked` against staging or production.
- If a migration statement fails, do not manually edit remote migration history. Capture the error, inspect schema state, and resolve idempotently.

---

## 10. Migration Verification

Confirm that all migrations are marked as applied in the remote database:
```bash
npx supabase migration list --remote
```
All migration versions must report both local and remote identifiers matching identically.

---

## 11. Real PostgreSQL Security Testing

Execute automated security verification against the live Supabase PostgreSQL database:
```bash
npx vitest run tests/integration/security-postgres.integration.test.ts
```
This suite verifies:
1. `anon` role cannot read protected tenant records (returns 0 rows).
2. `anon` role INSERT is blocked with SQLSTATE `42501` (`insufficient_privilege`).
3. `service_role` operations bypass RLS as designed by architecture.
4. Express API acts as the primary security barrier around service-role data operations.
5. `audit_logs` table enforces multi-tenant organization isolation and tamper-resistance.

---

## 12. Environment Variables Specification

| Variable | Environment | Required | Description |
|---|---|---|---|
| `PORT` | All | Yes | Server HTTP port (default `3000`). |
| `NODE_ENV` | All | Yes | Execution mode: `production`, `development`, or `test`. |
| `ALLOWED_ORIGINS` | Production / Staging | **Yes** | Whitelisted frontend domains (comma-separated). |
| `TRUST_PROXY` | Production | **Yes** | Set `true` or `1` behind reverse proxies (ALB/Cloudflare). |
| `SUPABASE_URL` | All | **Yes** | Remote Supabase project URL (`https://<ref>.supabase.co`). |
| `SUPABASE_ANON_KEY` | All | **Yes** | Public anonymous client key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend Only | **Yes** | Highly privileged service key (NEVER expose to frontend). |
| `ALLOW_LOCAL_JWT` | Development / Test | No | Strictly prohibited (`false`) in production. |
| `JWT_SECRET` | Development / Test | Conditional | Minimum 32 characters for local testing tokens. |
| `JWT_ISSUER` | All | Yes | Expected JWT issuer claim (`jk-payroll`). |
| `JWT_AUDIENCE` | All | Yes | Expected JWT audience claim (`jk-payroll-api`). |

---

## 13. Express Backend Hosting & Deployment

Target platforms: AWS ECS Fargate, Render, Railway, Fly.io, or Kubernetes.

1. **Build backend TypeScript:**
   ```bash
   npm run build
   ```
2. **Start production server:**
   ```bash
   npm start
   ```
3. **Containerization & Graceful Shutdown:**
   The Express bootstrap in `src/server/server.ts` intercepts `SIGTERM` and `SIGINT`, cleanly terminating in-flight requests within a 10-second drain window.

---

## 14. React Frontend Hosting & Deployment

Target platforms: Cloudflare Pages, Vercel, AWS S3 + CloudFront.

1. **Build Vite production bundle:**
   ```bash
   npm run build:client
   ```
   Outputs static assets to `dist/client/`.
2. **SPA Routing Configuration:**
   Configure single-page application fallback so all non-asset GET requests route to `index.html`.
3. **Environment Security:**
   Never prefix `SUPABASE_SERVICE_ROLE_KEY` with `VITE_`. Only public `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` may be built into client bundles.

---

## 15. CORS Whitelist Configuration

In production, Express requires `ALLOWED_ORIGINS`:
```env
ALLOWED_ORIGINS=https://app.paypulse.io,https://payroll.paypulse.io
```
- Trailing slashes and whitespace are automatically trimmed.
- Unapproved browser origins receive HTTP 403.
- Preflight `OPTIONS` requests receive 24-hour cache headers (`Max-Age: 86400`).

---

## 16. Reverse Proxy & Trust Proxy Configuration

When hosting behind AWS Application Load Balancer, Cloudflare, or NGINX:
```env
TRUST_PROXY=true
```
- Sets Express `trust proxy` to `1`.
- Ensures `req.ip` reflects the true client IP from `X-Forwarded-For` rather than the intermediate proxy socket.
- Prevents spoofed IP attribution in audit logs.

---

## 17. Health Checks & Uptime Monitoring

Configure platform load balancers and container health checks to poll:
- Endpoint: `GET /health` (or `GET /api/health`)
- Expected HTTP Status: `200 OK`
- Sample Response:
  ```json
  {
    "status": "healthy",
    "environment": "production",
    "timestamp": "2026-11-19T10:00:00.000Z",
    "uptime": 1420.5
  }
  ```

---

## 18. Rollback & Recovery Procedures

If a migration fails or unexpected production regressions occur:
1. **Immediate Ingress Protection:** Temporarily route traffic to maintenance mode via Cloudflare / CDN edge.
2. **Database Point-in-Time Recovery (PITR):**
   - In Supabase Dashboard: Navigate to **Database > Backups > Point in Time**.
   - Select a restore timestamp immediately preceding the deployment time.
3. **Zero Destructive Auto-Rollbacks:** Never run ad-hoc destructive `DROP TABLE` or `ALTER TABLE ... DROP COLUMN` scripts without verifying foreign key dependencies and data integrity.

---

## 19. Database Backup & Restore

1. **Scheduled Backups:** Supabase automatically captures daily snapshot backups.
2. **On-Demand Manual Logical Backup:**
   ```bash
   npx supabase db dump -f supabase/backups/backup_pre_deploy_$(date +%Y%m%d_%H%M%S).sql --remote
   ```
3. **Data Immutability Verification:** Audit logs are protected by database trigger `trg_audit_logs_immutability`, ensuring historical audit trails cannot be dropped during administrative operations.

---

## 20. Production Smoke Tests Checklist

Upon completing backend and frontend deployment:
1. `GET /health` returns HTTP 200 with `status: "healthy"`.
2. Login endpoint rejects invalid credentials without provisioning backdoor users.
3. Authorized Super Admin successfully logs in and receives verified session.
4. Tenant Admin can access their own organization data.
5. Cross-tenant access attempts return HTTP 403 / 404.
6. Mutation operation (e.g. creating a department) generates an immutable entry in `audit_logs` attributing the correct actor ID and IP.
