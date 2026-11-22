# PayPulse (JK Payroll) — Production Release Readiness Checklist

Use this checklist prior to authorizing and triggering production deployment. Every item must be verified and checked off.

Security phase status and the security release decision are maintained in [SECURITY_REMEDIATION_MASTER_TRACKER.md](security/SECURITY_REMEDIATION_MASTER_TRACKER.md) and [SECURITY_PRODUCTION_READINESS.md](security/SECURITY_PRODUCTION_READINESS.md). This checklist is operational and does not itself grant security approval. Last reviewed: 2026-11-21 (Asia/Manila).

---

## 1. Pre-Deployment Infrastructure & Database
- [ ] **Supabase CLI Authentication:** Verified active session (`npx supabase login`).
- [ ] **Target Project Reference Confirmed:** Linked to designated production project (`<PRODUCTION_PROJECT_REF>`). Note: `fsnfqnbixitmmjmeogml` is repurposed as development.
- [ ] **Pending Migrations Audited:**
  - [ ] Review the repository migration sequence, including migrations `20261121000012` through `20261121000019`.
  - [ ] Compare repository files with the target database migration ledger; repository presence does not mean a migration was applied.
- [ ] **Migration Dry-Run Succeeded:** `npx supabase db push --dry-run --remote` exited with code 0.
- [ ] **Database Backup Verified:** PITR active or manual backup taken (`npx supabase db dump`).
- [ ] **Real PostgreSQL Security Tests:** Executed against a disposable staging database; preserve exact output and distinguish it from PGlite evidence.

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
- [ ] **Automated Test Suite:** Current complete test suite passes (`npm test`); record current file and test totals. At the last review, 478/482 passed and four legacy behavior expectations failed.

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
| Database Architect |  | Pending evidence review |  |
| Application Security Engineer |  | Pending evidence review |  |
| DevOps & Release Lead |  | Pending evidence review |  |
| Lead Developer / Product Owner |  | Pending explicit release approval |  |
