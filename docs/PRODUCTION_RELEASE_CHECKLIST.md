# PayPulse (JK Payroll) — Production Release Readiness Checklist

Use this checklist prior to authorizing and triggering production deployment. Every item must be verified and checked off.

---

## 1. Pre-Deployment Infrastructure & Database
- [ ] **Supabase CLI Authentication:** Verified active session (`npx supabase login`).
- [ ] **Target Project Reference Confirmed:** Linked to designated production project (`fsnfqnbixitmmjmeogml`).
- [ ] **Pending Migrations Audited:**
  - [ ] `20261104000008_align_organizations_schema.sql`
  - [ ] `20261104000009_expand_organizations_sector_settings.sql`
  - [ ] `20261119000010_remediate_database_rls.sql`
  - [ ] `20261119000011_harden_audit_attribution_and_integrity.sql`
- [ ] **Migration Dry-Run Succeeded:** `npx supabase db push --dry-run --remote` exited with code 0.
- [ ] **Database Backup Verified:** PITR active or manual backup taken (`npx supabase db dump`).
- [ ] **Real PostgreSQL Security Tests:** Executed against live database (`tests/integration/security-postgres.integration.test.ts`).

---

## 2. Environment & Secrets Management
- [ ] **No Secrets in Source:** Git status clean; `.env` excluded from version control.
- [ ] **Service Role Key Isolated:** `SUPABASE_SERVICE_ROLE_KEY` is present **only** on backend hosting environment.
- [ ] **No Client Leaks:** Verified no frontend files reference `SERVICE_ROLE_KEY` or expose sensitive variables.
- [ ] **Local JWT Disabled:** `ALLOW_LOCAL_JWT` is omitted or set to `false` in production.
- [ ] **JWT Configuration:** `JWT_ISSUER=jk-payroll` and `JWT_AUDIENCE=jk-payroll-api` configured.
- [ ] **Fail-Fast Validation:** Verified startup fails immediately if required credentials or `ALLOWED_ORIGINS` are missing.

---

## 3. Express Production Hardening
- [ ] **CORS Policy:** `ALLOWED_ORIGINS` whitelist configured with exact production frontend domains.
- [ ] **CORS Localhost Rejection:** Verified requests from `localhost` receive HTTP 403 in production.
- [ ] **Preflight Caching:** 24-hour preflight cache header (`Max-Age: 86400`) verified.
- [ ] **Reverse Proxy Trust:** `TRUST_PROXY=true` configured for hosting behind ALB / Cloudflare.
- [ ] **Security Headers:** Verified `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `HSTS`.
- [ ] **Body Limit:** Request payload restricted to `1mb`.
- [ ] **Error Sanitization:** Verified internal 500 error messages and stack traces are suppressed in production.
- [ ] **Health Monitoring:** Verified `/health` and `/api/health` return status 200.
- [ ] **Graceful Shutdown:** `SIGTERM` and `SIGINT` signals handled cleanly with 10-second drain.

---

## 4. Build & Compilation Verification
- [ ] **TypeScript Build:** `npm run build` (`tsc`) compiled with 0 errors.
- [ ] **Vite Client Build:** `npm run build:client` compiled successfully with static assets in `dist/client/`.
- [ ] **Automated Test Suite:** All 18 test suites and 285 tests passed (`npm test`).

---

## 5. Post-Deployment Smoke Verification
- [ ] **Backend Health Probe:** `curl -s -f https://api.paypulse.io/health` returns status `healthy`.
- [ ] **Frontend Loading:** Web application renders without console errors or missing bundle chunks.
- [ ] **Authentication Smoke Test:** Valid login succeeds; invalid credentials fail closed.
- [ ] **Tenant Isolation Probe:** Direct cross-tenant access returns HTTP 403 / 404.
- [ ] **Audit Attribution Smoke Test:** Administrative mutations record valid actor ID and IP in `audit_logs`.
- [ ] **Audit Immutability Guard:** Direct attempts to update or delete `audit_logs` fail with SQLSTATE 55000.

---

## Sign-Off & Approvals

| Role | Name | Status | Timestamp |
|---|---|---|---|
| Database Architect | AI Lead Architect | Verified | 2026-11-19 |
| Application Security Engineer | AppSec Lead | Verified | 2026-11-19 |
| DevOps & Release Lead | DevOps Lead | Verified | 2026-11-19 |
| Lead Developer / Product Owner | [Awaiting User Confirmation] | Pending Final Push Approval | Pending |
