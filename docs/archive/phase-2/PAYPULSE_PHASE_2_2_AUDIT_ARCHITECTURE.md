# PayPulse Phase 2.2 — Audit Architecture, Retention Integrity, and Redaction Specification

**Status:** Implementation-Ready Architecture Specification  
**Date:** 2026-11-22  
**System:** PayPulse (JK Payroll) — Compliance & Audit Subsystem  
**Document Reference:** `PAYPULSE_PHASE_2_2_AUDIT_ARCHITECTURE.md`  

---

## 1. Executive Summary & Inventory of Existing Audit State

In PayPulse, compliance tracking is established via `public.audit_logs`. The existing implementation spans three primary migrations:
- **Migration 3 (`20261104000003_audit_logs.sql`):** Created `public.audit_logs`, defined `record_audit_log()` as `SECURITY DEFINER`, added immutability trigger `enforce_audit_log_immutability()`, and revoked `UPDATE, DELETE, TRUNCATE` from `PUBLIC, anon, authenticated`.
- **Migration 4 (`20261104000004_attach_audit_triggers.sql`):** Attached generic `AFTER INSERT OR UPDATE OR DELETE` row-level triggers to `organizations`, `departments`, `roles`, `user_roles`, and `profiles`.
- **Migration 11 (`20261119000011_harden_audit_attribution_and_integrity.sql`):** Added `actor_type` column (`'USER'`, `'ADMIN'`, `'SUPER_ADMIN'`, `'SYSTEM'`), altered `organization_id DROP NOT NULL`, and added GUC session-actor fallback (`app.current_actor_id`).

### Critical Deficiencies Identified:
1. **Destructive Foreign Key Cascade:** In Migration 3, `public.audit_logs.organization_id` was declared with `REFERENCES public.organizations(id) ON DELETE CASCADE`. If an organization is deleted, PostgreSQL cascades and physically deletes all historical audit logs for that tenant, violating SOC 2, HIPAA, and statutory tax compliance retention mandates.
2. **Duplicate & Conflicting Audit Events:** When an audited RPC executes an operation (e.g. updating a role and inserting an explicit audit log), the attached row-level triggers in Migration 4 simultaneously fire, resulting in two duplicate, differently formatted audit entries for the same mutation.
3. **Session-GUC Spoofing Risk:** Migration 11's trigger function accepts `current_setting('app.current_actor_id', true)`. In connection pooling environments (such as Supabase transaction pooling or PgBouncer), session variables can bleed across transactions or be set by an untrusted SQL caller.
4. **Broad Row Dumps:** Existing triggers capture full rows (`to_jsonb(NEW)`), creating risks of capturing sensitive session data, password tokens, or unredacted personal identifiers.

---

## 2. Resolution of the 12 Core Audit Architecture Decisions

### 1. Single Canonical Audit Ledger
**Decision:** **YES.** `public.audit_logs` remains the sole, unified audit ledger for all business, security, and administrative events. No second "authorization-only" ledger will be introduced.

### 2. Explicit RPC Events vs. Generic Row Triggers
**Decision:** **Explicit RPC Audit Events for Authorization Mutations.**
- Generic triggers are suitable for broad transactional domain entities where mutations occur via direct SQL (e.g., department hierarchy modifications).
- For all sensitive authorization mutations (role assignments, permission grants, mode changes, onboarding, and recovery), the database RPC must write an explicit, structured audit event.
- **Trigger Suppression:** Generic row triggers on authorization tables (`roles`, `user_roles`, `role_permissions`, `user_permissions`) must be dropped or suppressed during RPC execution via a session flag to prevent double-logging.

### 3. Duplicate Audit Event Prevention
**Decision:**
In Phase 3, row-level audit triggers on authorization tables will be replaced by explicit RPC-driven insertion:
- `user_roles`: Trigger `trg_audit_user_roles` will be retired; `assign_user_role()` RPC directly writes the single canonical audit row.
- `role_permissions`: No generic row trigger exists currently; RPC handles explicit batch diff logging.

### 4. Actor Identity Derivation
**Decision:**
- For user-facing transactions, `actor_id` is derived **strictly from `auth.uid()`**.
- Reliance on caller-settable GUCs (`app.current_actor_id`) is deprecated for user operations.
- `actor_name` and `actor_email` are resolved directly from `public.profiles` where `id = auth.uid()`.

### 5. Representation of System and Background Actors
**Decision:**
- When background cron jobs or workload workers execute maintenance:
  - `actor_id` = `NULL` (or dedicated system UUID `00000000-0000-0000-0000-000000000000`).
  - `actor_type` = `'SYSTEM'`.
  - `actor_name` = `'PayPulse Background Worker'`.
  - `actor_role_name` = `'WORKLOAD_SERVICE'`.

### 6 & 7. Data Minimization, Secret Redaction, and Sensitive Field Omission
**Decision:** Full-row JSON serialization is prohibited for sensitive tables. Audit payloads in `old_values` and `new_values` must conform to strict allowlists:
- **Strictly Excluded / Redacted:** Password hashes, recovery tokens, invitation token secrets (`token_secret`), raw bearer JWTs, bank account numbers, statutory tax secrets.
- **Explicit Authorization Allowlists:**
  - Roles: `['id', 'name', 'code', 'role_type', 'is_active']`.
  - Grants: `['role_id', 'module_action_id', 'full_key', 'action']`.
  - User Settings: `['user_id', 'permission_mode', 'assigned_role_id']`.
  - Organization Lifecycle: `['id', 'code', 'status', 'tier', 'end_date']`.

### 8. Organization Deletion & Retention-Safe Foreign Key Strategy
**Decision:** **ELIMINATE `ON DELETE CASCADE`.**
In Phase 3, a forward migration will alter `public.audit_logs`:
```sql
ALTER TABLE public.audit_logs 
    DROP CONSTRAINT audit_logs_organization_id_fkey,
    ADD CONSTRAINT audit_logs_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
    ON DELETE RESTRICT;
```
If an organization is ever marked for deletion:
- The system enforces soft deletion: `organizations.status = 'Archived'`, `organizations.is_active = false`.
- If an enterprise customer formally exercises a GDPR "Right to be Forgotten" or a hard tenant purge is legally approved: audit records are exported to write-once-read-many (WORM) immutable cloud archive storage (AWS S3 Object Lock / Google Cloud Storage Bucket Lock) before database records can be purged under dual-operator signoff.

### 9. Secure Querying of Audit Logs
**Decision:**
- **Ordinary Organization Access:** Protected by RLS policy. Accessible only to active organization members holding the explicit permission `PERMISSIONS.USER_PERMISSION.VIEW` or dedicated `AuditLogs.View`. Queries are strictly scoped to `organization_id = (SELECT organization_id FROM current_user_memberships)`.
- **Platform SuperAdmin Access:** SuperAdmins can query across all organizations for support and incident investigation via a dedicated platform route (`/api/admin/audit-logs`) guarded by `profiles.is_super_admin = true`.

### 10. Atomic Mutation Rollback on Audit Failure
**Decision:**
The audit log insertion occurs **within the exact same database transaction** as the authorization mutation. If the audit insert fails (due to constraint violations, disk quotas, or trigger errors), the entire transaction immediately aborts. Under no circumstances may an authorization mutation commit without its accompanying audit record.

### 11. Retention Periods & Archival Strategy
**Decision:**
- **Hot Storage (PostgreSQL):** Minimum 12 months of active audit records retained in `public.audit_logs` for real-time compliance reporting in the SPA.
- **Cold Storage (Immutable WORM):** At 12 months, partition-based archival exports logs to parquet/JSON lines on immutable cloud storage with a 7-year retention policy.
- **Legal Non-Repudiation Disclaimer:** Application-level append-only triggers and RLS policies prevent tampering by application users, tenant admins, and compromised Express servers. However, they do NOT provide cryptographic immutability against a PostgreSQL superuser or compromised infrastructure operator. Full non-repudiation is achieved exclusively via external WORM storage replication.

### 12. Monotonic Audit Event Ordering
**Decision:**
- Clock timestamps (`clock_timestamp()`) can suffer from microscopic drift or non-linear ordering across distributed nodes.
- Ordering is guaranteed by combining:
  1. Primary Key: Monotonically increasing sequence or UUIDv7.
  2. Transaction Timestamp: `transaction_timestamp()` (fixed commit timestamp for all statements in the transaction).
  3. Incremental Sequence: `audit_sequence BIGSERIAL NOT NULL`.

---

## 3. Implementation Specification: Hardened Audit Functions

### Forward Migration Specification:

```sql
-- 1. Remove Cascade Delete on Audit Logs
ALTER TABLE public.audit_logs 
    DROP CONSTRAINT IF EXISTS audit_logs_organization_id_fkey;

ALTER TABLE public.audit_logs 
    ADD CONSTRAINT audit_logs_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
    ON DELETE RESTRICT;

-- 2. Add Monotonic Sequence for Strict Event Ordering
ALTER TABLE public.audit_logs 
    ADD COLUMN IF NOT EXISTS audit_seq BIGSERIAL NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_seq_order 
    ON public.audit_logs (organization_id, audit_seq DESC);

-- 3. Dedicated Atomic Audit Emitter for Authorization RPCs
CREATE OR REPLACE FUNCTION public.emit_authorization_audit_event(
    p_organization_id UUID,
    p_module_id TEXT,
    p_entity_type TEXT,
    p_entity_id TEXT,
    p_action public.audit_action,
    p_old_values JSONB,
    p_new_values JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_name TEXT;
    v_actor_email TEXT;
    v_actor_role TEXT;
    v_actor_type TEXT := 'USER';
    v_log_id UUID;
BEGIN
    -- Derive Actor Identity
    IF v_actor_id IS NOT NULL THEN
        SELECT full_name, email, 
               CASE WHEN is_super_admin THEN 'SUPER_ADMIN' ELSE 'USER' END
        INTO v_actor_name, v_actor_email, v_actor_type
        FROM public.profiles
        WHERE id = v_actor_id;
    ELSE
        v_actor_type := 'SYSTEM';
        v_actor_name := 'PayPulse Workload Worker';
    END IF;

    -- Redact Sensitive Fields
    p_old_values := p_old_values - ARRAY['password', 'encrypted_password', 'token', 'token_hash', 'secret'];
    p_new_values := p_new_values - ARRAY['password', 'encrypted_password', 'token', 'token_hash', 'secret'];

    -- Insert Audit Event
    INSERT INTO public.audit_logs (
        organization_id,
        actor_id,
        actor_name,
        actor_email,
        actor_type,
        module_id,
        entity_type,
        entity_id,
        action,
        old_values,
        new_values,
        created_at
    ) VALUES (
        p_organization_id,
        v_actor_id,
        v_actor_name,
        v_actor_email,
        v_actor_type,
        p_module_id,
        p_entity_type,
        p_entity_id,
        p_action,
        p_old_values,
        p_new_values,
        clock_timestamp()
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

REVOKE ALL ON FUNCTION public.emit_authorization_audit_event(UUID, TEXT, TEXT, TEXT, public.audit_action, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.emit_authorization_audit_event(UUID, TEXT, TEXT, TEXT, public.audit_action, JSONB, JSONB) TO authenticated, service_role;
```

---

## 4. Hardened Audit Log RLS Policies

```sql
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_read_policy ON public.audit_logs;

CREATE POLICY audit_logs_read_policy ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        -- Condition 1: Platform SuperAdmin can view all audit logs
        public.is_super_admin()
        OR
        -- Condition 2: Active Member with explicit audit view permission
        (
            organization_id = public.current_user_organization_id()
            AND public.is_organization_member(organization_id)
            AND (
                -- Evaluates via effective permissions
                'UserPermission.View' = ANY(public.get_user_effective_permissions(organization_id))
                OR
                'RolePermission.View' = ANY(public.get_user_effective_permissions(organization_id))
            )
        )
    );

-- Strictly Prevent INSERT, UPDATE, DELETE via direct Data API
DROP POLICY IF EXISTS audit_logs_mutate_policy ON public.audit_logs;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM PUBLIC, anon, authenticated;
```

This closes the Audit Architecture and Data Retention specification.
