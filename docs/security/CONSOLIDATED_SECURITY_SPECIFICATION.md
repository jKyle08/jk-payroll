# PayPulse: Consolidated Security & Access Control Specification

**Document Version:** 3.0.0 (Authoritative Security Specification)  
**Status:** Implemented, Deployed, and Verified across Live Supabase PostgreSQL and Express API  
**Scope:** Authentication, Session Lifecycle, Multi-Tenancy, 3-Tier RBAC, Privilege Escalation Protection, and Audit Immutability

---

## 1. Multi-Layer Defense-in-Depth Model

PayPulse enforces security across five distinct architectural boundaries:

```mermaid
graph TD
    A["Layer 1: Network & CORS Boundary<br/>(Allowed Origins, Trust Proxy, Rate Limiting)"] --> B["Layer 2: Authentication & Token Verification<br/>(Supabase Auth JWT, Strict Algorithm & Claims)"]
    B --> C["Layer 3: Express Middleware & Tenant Scoping<br/>(Active Context, Expiration Check, Fail-Closed)"]
    C --> D["Layer 4: 3-Tier Cascading RBAC Guard<br/>(requirePermission, Module Gating, CTE Evaluation)"]
    D --> E["Layer 5: PostgreSQL Database Engine<br/>(RLS, Composite FKs, Immutability Triggers)"]
```

---

## 2. Authentication & Identity Architecture

### 2.1 Identity Provider (Supabase Auth)
- Production authentication relies exclusively on Supabase Auth (`auth.users`).
- Plaintext passwords and private key material are never stored in the application database.
- Deprecated backdoor credentials and automatic provisioning routines (identified in SEC-FIND-02) have been permanently removed.

### 2.2 JWT Verification Standards
1. **Algorithm Enforcement:** Strictly allows only configured algorithms (`HS256` or `RS256`). Tokens with `alg: none` are rejected.
2. **Issuer & Audience Validation:**
   - Issuer (`iss`) must match `jk-payroll` or Supabase project URL.
   - Audience (`aud`) must match `jk-payroll-api` or `authenticated`.
3. **Expiration:** Tokens past their `exp` timestamp fail with `401 Unauthorized`.
4. **Production Configuration Guard:**
   - `ALLOW_LOCAL_JWT` is prohibited in production. Startup fails immediately if `ALLOW_LOCAL_JWT=true` when `NODE_ENV=production`.
   - Missing Supabase keys (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) halt server startup.

---

## 3. Organization Lifecycle & Expiration Enforcement

1. **Active Status Verification:** Inactive organizations (`status != 'Active'` or `is_active = false`) deny access to all tenant users.
2. **Subscription Expiration:** If an organization has an `end_date` in the past, logins for all users under that organization are blocked immediately:
   ```typescript
   if (!profile.is_super_admin && tenantRecord?.endDate) {
     if (new Date(tenantRecord.endDate).getTime() < Date.now()) {
       throw new Error('Organization subscription or access period has expired. Users under this company cannot log in.');
     }
   }
   ```
3. **SuperAdmin Exemption:** Platform SuperAdmins have null expiration dates and retain administrative access to manage or unblock expired tenants.

---

## 4. Cascading RBAC Authorization & Policy Enforcement

### 4.1 3-Tier Cascading Formula
An action grant is effective if and only if all three tiers are satisfied:
$$\text{Access Granted} \iff \text{Action} \in \text{Role Grants} \land \text{Module} \in \text{Dept Modules} \land \text{Module} \in \text{Org Modules}$$

### 4.2 Fail-Closed Guarantee
- If the permission resolution RPC (`get_user_effective_permissions`) throws an error or fails, the application returns an empty permission set `[]`.
- Access is denied by default (`403 Forbidden`). Fallback grants or default permissions are strictly prohibited.

### 4.3 SuperAdmin Privilege Escalation Protection
1. **Database Trigger:** `trg_enforce_organization_role_assignment` intercepts all writes to `public.user_roles`:
   - Assignment of global SuperAdmin role (`f0000000-0000-0000-0000-000000000001`) is rejected with code `42501`.
   - Creation or assignment of protected role codes (`SUPERADMIN`, `SUPER_ADMIN`) is blocked.
2. **Client-Controlled Flags Rejected:** The onboarding API and client forms cannot set `is_super_admin` or `is_organization_admin` on profile rows. Only server-side database RPCs control administrative state.

---

## 5. PostgreSQL Row Level Security (RLS) Isolation

Every operational table has Row Level Security enabled (`ENABLE ROW LEVEL SECURITY`) and enforced (`FORCE ROW LEVEL SECURITY`):

| Database Table | Anonymous Access | Authenticated Member Access | Service-Role Access |
| :--- | :---: | :---: | :---: |
| `public.organizations` | **DENIED (0 rows)** | Read own organization only | Full access (Bypass RLS) |
| `public.departments` | **DENIED (0 rows)** | Read/write own organization departments | Full access (Bypass RLS) |
| `public.profiles` | **DENIED (0 rows)** | Read own organization profiles | Full access (Bypass RLS) |
| `public.roles` | **DENIED (0 rows)** | Read own organization roles | Full access (Bypass RLS) |
| `public.role_permissions` | **DENIED (0 rows)** | Read own organization role permissions | Full access (Bypass RLS) |
| `public.user_roles` | **DENIED (0 rows)** | Read own organization role assignments | Full access (Bypass RLS) |
| `public.organization_modules` | **DENIED (0 rows)** | Read own organization modules | Full access (Bypass RLS) |
| `public.department_modules` | **DENIED (0 rows)** | Read own organization department modules | Full access (Bypass RLS) |
| `public.audit_logs` | **DENIED (0 rows)** | Read own organization audit logs (SuperAdmin/TenantAdmin) | Full access (Append-only) |

---

## 6. Audit Trail Immutability & Forensics

1. **Immutability Enforcement:** The trigger `trg_audit_log_immutability` executes before `UPDATE`, `DELETE`, or `TRUNCATE` on `public.audit_logs`:
   ```sql
   CREATE OR REPLACE FUNCTION public.check_audit_log_immutability()
   RETURNS trigger AS $$
   BEGIN
       RAISE EXCEPTION 'Audit logs are immutable and cannot be updated, deleted, or truncated' USING ERRCODE = '42501';
   END;
   $$ LANGUAGE plpgsql;
   ```
2. **Actor Attribution:** Every mutation captures `auth.uid()`, client IP, user agent, before/after JSONB state, and PostgreSQL `clock_timestamp()`.
3. **Retention Independence:** Deleting an operational department or role does not alter historical audit log entries.
