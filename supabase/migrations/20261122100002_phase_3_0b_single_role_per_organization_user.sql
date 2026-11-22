-- ==============================================================================
-- JK-PAYROLL: PHASE 3.0B FORWARD MIGRATION (REMEDIATED)
-- Migration: 20261122100002_phase_3_0b_single_role_per_organization_user.sql
-- Target: Single Role Per Organization User & Composite Organization-Role FKs
-- Remediation Reference: PAYPULSE_PHASE_3_0B_REMEDIATION_REPORT.md
-- Resolves Findings: F-30B-01 (Trigger Collision), F-30B-02 (Concurrency Locking),
--                    F-30B-03 (Decoupled Governance), F-30B-04 (Mirror Asymmetry)
-- Preconditions: Migration 20261122100001 (Phase 3.0A) applied;
--                Zero multi-role users; Zero cross-org roles; Zero SYSTEM roles in tenant assignments.
-- Safety: Fully transactional; Fails closed on any data violation; Zero silent deletions.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 0. CONCURRENCY PROTECTION & LOCKING PROTOCOL (Resolves Finding F-30B-02)
-- ------------------------------------------------------------------------------
-- Fail fast if existing locks cannot be obtained within 10 seconds.
-- This prevents long lock-wait queues that would degrade production traffic.
SET LOCAL lock_timeout = '10s';

-- Acquire ACCESS EXCLUSIVE locks immediately following BEGIN, in consistent
-- order: user_roles, organization_members, roles (Resolves F-30B-08).
-- This guarantees:
-- 1. No concurrent transaction can insert a conflicting multi-role row between
--    precondition assertion checks and primary key constraint application.
-- 2. Lock acquisition order matches runtime trigger acquisition hierarchy,
--    preventing inverse lock ordering deadlock cycles (40P01).
-- 3. Concurrent writes to these relations are blocked while checks and DDL run.
LOCK TABLE public.user_roles, public.organization_members, public.roles 
    IN ACCESS EXCLUSIVE MODE;

-- ------------------------------------------------------------------------------
-- 1. PREFLIGHT SCHEMA EXISTENCE ASSERTIONS
-- Verify that required core tables, referenced columns, and baseline constraints exist.
-- Prevents indiscriminate execution against an unexpected or drifted schema.
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    -- Verify required tables exist
    IF to_regclass('public.roles') IS NULL THEN
        RAISE EXCEPTION 'Phase 3.0B Preflight Failed: public.roles does not exist' USING ERRCODE = '42P01';
    END IF;
    IF to_regclass('public.user_roles') IS NULL THEN
        RAISE EXCEPTION 'Phase 3.0B Preflight Failed: public.user_roles does not exist' USING ERRCODE = '42P01';
    END IF;
    IF to_regclass('public.organization_members') IS NULL THEN
        RAISE EXCEPTION 'Phase 3.0B Preflight Failed: public.organization_members does not exist' USING ERRCODE = '42P01';
    END IF;
    IF to_regclass('public.organization_permissions') IS NULL THEN
        RAISE EXCEPTION 'Phase 3.0B Preflight Failed: public.organization_permissions does not exist (Phase 3.0A prerequisite missing)'
            USING ERRCODE = '42P01';
    END IF;

    -- Verify user_roles baseline primary key exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public' AND t.relname = 'user_roles' AND c.contype = 'p'
    ) THEN
        RAISE EXCEPTION 'Phase 3.0B Preflight Failed: Baseline primary key constraint on public.user_roles is missing'
            USING ERRCODE = '42P01';
    END IF;

    -- Validate every column referenced later, so schema drift fails with a clear message.
    IF EXISTS (
        SELECT 1
        FROM (VALUES
            ('roles', 'id'), ('roles', 'organization_id'), ('roles', 'role_type'),
            ('user_roles', 'organization_id'), ('user_roles', 'user_id'),
            ('user_roles', 'role_id'), ('user_roles', 'assigned_at'),
            ('organization_members', 'organization_id'), ('organization_members', 'user_id'),
            ('organization_members', 'role_id')
        ) AS required(table_name, column_name)
        LEFT JOIN information_schema.columns c
          ON c.table_schema = 'public'
         AND c.table_name = required.table_name
         AND c.column_name = required.column_name
        WHERE c.column_name IS NULL
    ) THEN
        RAISE EXCEPTION 'Phase 3.0B Preflight Failed: One or more required columns are missing from public.roles, public.user_roles, or public.organization_members'
            USING ERRCODE = '42703';
    END IF;

    RAISE NOTICE 'Phase 3.0B Preflight Schema Assertions Passed.';
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. PRECONDITION ASSERTION: MULTI-ROLE DETECTION (user_roles)
-- Abort immediately if any user currently holds >1 role in any organization.
-- Fails closed: Never silently discards or arbitrates conflicting roles.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_conflict_count INTEGER;
    v_sample_conflict TEXT;
BEGIN
    SELECT count(*), string_agg(ur.user_id::text || '@' || ur.organization_id::text, ', ')
    INTO v_conflict_count, v_sample_conflict
    FROM (
        SELECT organization_id, user_id
        FROM public.user_roles
        GROUP BY organization_id, user_id
        HAVING count(*) > 1
        LIMIT 5
    ) ur;

    IF v_conflict_count > 0 THEN
        RAISE EXCEPTION 'Phase 3.0B Precondition Failed: At least % multi-role user conflict(s) found in user_roles (up to 5 samples: %). Manual reconciliation required before applying single-role constraint.',
            v_conflict_count, v_sample_conflict
            USING ERRCODE = '23505';
    END IF;

    RAISE NOTICE 'Phase 3.0B Precondition Passed: Zero multi-role users in user_roles.';
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. PRECONDITION ASSERTION: CROSS-ORGANIZATION ROLE ASSIGNMENT (user_roles)
-- Abort immediately if any assignment references a role owned by another org.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_cross_count INTEGER;
    v_sample_cross TEXT;
BEGIN
    SELECT count(*), string_agg(ur.user_id::text || '@' || ur.organization_id::text || '->role_org:' || ur.role_org_id::text, ', ')
    INTO v_cross_count, v_sample_cross
    FROM (
        SELECT ur.organization_id, ur.user_id, r.organization_id AS role_org_id
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE r.organization_id IS NOT NULL 
          AND r.organization_id <> ur.organization_id
        LIMIT 5
    ) ur;

    IF v_cross_count > 0 THEN
        RAISE EXCEPTION 'Phase 3.0B Precondition Failed: At least % cross-organization role assignment(s) found in user_roles (up to 5 samples: %). Cross-tenant role contamination must be remediated.',
            v_cross_count, v_sample_cross
            USING ERRCODE = '23514';
    END IF;

    RAISE NOTICE 'Phase 3.0B Precondition Passed: Zero cross-organization roles in user_roles.';
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. PRECONDITION ASSERTION: SYSTEM ROLE ASSIGNMENT IN USER_ROLES (Resolves F-30B-03)
-- In accordance with Architectural Consensus ADR-04 and ADR-05, tenant user roles
-- must be strictly organization-scoped CUSTOM roles.
-- If legacy SYSTEM roles (e.g. TENANT_ADMIN) exist in user_roles, this migration
-- FAILS CLOSED rather than performing premature, unauthorized data mutation.
-- A separately approved, audited role reconciliation migration must precede this DDL.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_sys_count INTEGER;
    v_sample_sys TEXT;
BEGIN
    SELECT count(*), string_agg(ur.user_id::text || '@' || ur.organization_id::text || '->role:' || ur.role_id::text, ', ')
    INTO v_sys_count, v_sample_sys
    FROM (
        SELECT ur.organization_id, ur.user_id, ur.role_id
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE r.role_type = 'SYSTEM' OR r.organization_id IS NULL
        LIMIT 5
    ) ur;

    IF v_sys_count > 0 THEN
        RAISE EXCEPTION 'Phase 3.0B Precondition Failed: At least % legacy SYSTEM role assignment(s) found in user_roles (up to 5 samples: %). Composite foreign key requires role_id to be organization-scoped. Execute approved role reconciliation migration before applying Phase 3.0B.',
            v_sys_count, v_sample_sys
            USING ERRCODE = '23514';
    END IF;

    RAISE NOTICE 'Phase 3.0B Precondition Passed: Zero SYSTEM role assignments in user_roles.';
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. PRECONDITION ASSERTION: CROSS-ORGANIZATION ROLE ASSIGNMENT (organization_members)
-- Verify referential integrity of mirror table public.organization_members.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_om_cross_count INTEGER;
    v_sample_om_cross TEXT;
BEGIN
    SELECT count(*), string_agg(om.user_id::text || '@' || om.organization_id::text || '->role_org:' || om.role_org_id::text, ', ')
    INTO v_om_cross_count, v_sample_om_cross
    FROM (
        SELECT om.organization_id, om.user_id, r.organization_id AS role_org_id
        FROM public.organization_members om
        JOIN public.roles r ON r.id = om.role_id
        WHERE om.role_id IS NOT NULL
          AND r.organization_id IS NOT NULL 
          AND r.organization_id <> om.organization_id
        LIMIT 5
    ) om;

    IF v_om_cross_count > 0 THEN
        RAISE EXCEPTION 'Phase 3.0B Precondition Failed: At least % cross-organization role assignment(s) found in organization_members (up to 5 samples: %).',
            v_om_cross_count, v_sample_om_cross
            USING ERRCODE = '23514';
    END IF;

    RAISE NOTICE 'Phase 3.0B Precondition Passed: Zero cross-organization roles in organization_members.';
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. PRECONDITION ASSERTION: SYSTEM ROLE ASSIGNMENT IN ORGANIZATION_MEMBERS
-- Verify that mirror table public.organization_members contains zero SYSTEM roles.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_om_sys_count INTEGER;
    v_sample_om_sys TEXT;
BEGIN
    SELECT count(*), string_agg(om.user_id::text || '@' || om.organization_id::text || '->role:' || om.role_id::text, ', ')
    INTO v_om_sys_count, v_sample_om_sys
    FROM (
        SELECT om.organization_id, om.user_id, om.role_id
        FROM public.organization_members om
        JOIN public.roles r ON r.id = om.role_id
        WHERE om.role_id IS NOT NULL
          AND (r.role_type = 'SYSTEM' OR r.organization_id IS NULL)
        LIMIT 5
    ) om;

    IF v_om_sys_count > 0 THEN
        RAISE EXCEPTION 'Phase 3.0B Precondition Failed: At least % legacy SYSTEM role assignment(s) found in organization_members (up to 5 samples: %). Execute approved role reconciliation migration before applying Phase 3.0B.',
            v_om_sys_count, v_sample_om_sys
            USING ERRCODE = '23514';
    END IF;

    RAISE NOTICE 'Phase 3.0B Precondition Passed: Zero SYSTEM role assignments in organization_members.';
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. ENFORCE COMPOSITE UNIQUE CONSTRAINT ON ROLES TABLE
-- Establishes (organization_id, id) unique constraint with NULLS NOT DISTINCT.
-- This serves as the referenced candidate key for composite foreign keys,
-- mathematically guaranteeing that tenant role assignments match the tenant organization.
-- ------------------------------------------------------------------------------
ALTER TABLE public.roles 
    DROP CONSTRAINT IF EXISTS uq_roles_org_id;

ALTER TABLE public.roles 
    ADD CONSTRAINT uq_roles_org_id UNIQUE NULLS NOT DISTINCT (organization_id, id);

DO $$ BEGIN
    RAISE NOTICE 'Constraint uq_roles_org_id successfully applied to public.roles.';
END $$;

-- ------------------------------------------------------------------------------
-- 8. RECONCILE USER_ROLES PRIMARY KEY & COMPOSITE FOREIGN KEY
-- 1. Drop old 3-column primary key (organization_id, user_id, role_id).
-- 2. Apply new 2-column primary key (organization_id, user_id) -> SINGLE ROLE ENFORCEMENT.
-- 3. Drop legacy simple foreign key on role_id (user_roles_role_id_fkey).
-- 4. Apply composite foreign key (organization_id, role_id) REFERENCES roles(organization_id, id).
--    ON DELETE RESTRICT guarantees assigned roles cannot be deleted while assigned.
-- 5. Drop redundant index idx_user_roles_org_user (now covered by primary key).
-- ------------------------------------------------------------------------------
ALTER TABLE public.user_roles 
    DROP CONSTRAINT IF EXISTS user_roles_role_id_fkey;

ALTER TABLE public.user_roles 
    DROP CONSTRAINT IF EXISTS user_roles_pkey;

ALTER TABLE public.user_roles 
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (organization_id, user_id);

ALTER TABLE public.user_roles 
    DROP CONSTRAINT IF EXISTS fk_user_roles_org_role;

ALTER TABLE public.user_roles 
    ADD CONSTRAINT fk_user_roles_org_role 
    FOREIGN KEY (organization_id, role_id) 
    REFERENCES public.roles(organization_id, id) 
    ON DELETE NO ACTION;

-- Redundant index cleanup: user_roles_pkey now provides leading (organization_id, user_id) index
DROP INDEX IF EXISTS public.idx_user_roles_org_user;

DO $$ BEGIN
    RAISE NOTICE 'Primary key and composite foreign key fk_user_roles_org_role successfully applied to public.user_roles.';
END $$;

-- ------------------------------------------------------------------------------
-- 9. RECONCILE ORGANIZATION_MEMBERS COMPOSITE FOREIGN KEY (Resolves Finding F-30B-04)
-- Enforce matching composite foreign key on mirror table organization_members.
-- Note: role_id remains nullable in organization_members (for members without assigned roles).
-- Under PostgreSQL MATCH SIMPLE, (organization_id, role_id) where role_id IS NULL is valid.
-- When role_id IS NOT NULL, it MUST reference an active role owned by that exact organization.
-- SYSTEM roles (where roles.organization_id IS NULL) are mathematically blocked.
-- ------------------------------------------------------------------------------
ALTER TABLE public.organization_members 
    DROP CONSTRAINT IF EXISTS organization_members_role_id_fkey;

ALTER TABLE public.organization_members 
    DROP CONSTRAINT IF EXISTS fk_organization_members_org_role;

ALTER TABLE public.organization_members 
    ADD CONSTRAINT fk_organization_members_org_role 
    FOREIGN KEY (organization_id, role_id) 
    REFERENCES public.roles(organization_id, id) 
    ON DELETE NO ACTION;

DO $$ BEGIN
    RAISE NOTICE 'Composite foreign key fk_organization_members_org_role successfully applied to public.organization_members.';
END $$;

-- ------------------------------------------------------------------------------
-- 10. PERFORMANCE & COVERING INDEXES
-- Index assigned_at for audit queries and composite (organization_id, role_id) for joins.
-- Explicit drop-and-create pattern is used instead of IF NOT EXISTS to prevent
-- silently preserving an existing index that carries an incorrect or drifted column definition.
-- Prunes redundant single-column index on organization_members(organization_id).
-- ------------------------------------------------------------------------------
-- Audit timeline index for user_roles
DROP INDEX IF EXISTS public.idx_user_roles_assigned_at;
CREATE INDEX idx_user_roles_assigned_at 
    ON public.user_roles (assigned_at DESC);

-- Composite referencing FK index for user_roles
DROP INDEX IF EXISTS public.idx_user_roles_org_role;
CREATE INDEX idx_user_roles_org_role 
    ON public.user_roles (organization_id, role_id);

-- Prune redundant single-column organization index on organization_members
-- (fully superseded by uq_organization_members_org_user and idx_org_members_org_role)
DROP INDEX IF EXISTS public.idx_org_members_org;

-- Composite referencing FK index for organization_members
DROP INDEX IF EXISTS public.idx_org_members_org_role;
CREATE INDEX idx_org_members_org_role 
    ON public.organization_members (organization_id, role_id);

DO $$ BEGIN
    RAISE NOTICE 'Performance indexes successfully verified and created.';
END $$;

COMMIT;

-- ==============================================================================
-- DISASTER-RECOVERY ROLLBACK PLAYBOOK (MANUAL OPERATIONAL PROCEDURE ONLY)
-- ==============================================================================
-- ARCHITECTURAL NOTICE:
-- This rollback script is a MANUALLY REVIEWED DISASTER-RECOVERY PROCEDURE.
-- DO NOT execute this script automatically in unattended CI/CD down-migrations.
--
-- MANDATORY PRE-REQUISITES BEFORE EXECUTING THIS ROLLBACK:
-- 1. Application Quiescence: All client application traffic and background jobs
--    writing to user_roles and organization_members MUST be suspended.
-- 2. Application Binary Rollback: If application services have been deployed that
--    rely on the single-role invariant (e.g. INSERT ... ON CONFLICT (org_id, user_id)),
--    reverting the database schema without reverting application code will cause
--    runtime crashes (SQLSTATE 42P10).
-- 3. Data Integrity Audit: Confirm no multi-role records have been introduced while
--    the single-role constraint was active that could prevent clean rollback.
--
-- BEGIN;
-- SET LOCAL lock_timeout = '10s';
-- LOCK TABLE public.roles IN ACCESS EXCLUSIVE MODE;
-- LOCK TABLE public.user_roles IN ACCESS EXCLUSIVE MODE;
-- LOCK TABLE public.organization_members IN ACCESS EXCLUSIVE MODE;
--
-- -- PRE-ROLLBACK INTEGRITY PRECONDITIONS
-- DO $$
-- BEGIN
--     -- Verify no duplicate (organization_id, user_id, role_id) tuples exist
--     IF EXISTS (
--         SELECT 1 FROM public.user_roles
--         GROUP BY organization_id, user_id, role_id
--         HAVING COUNT(*) > 1
--     ) THEN
--         RAISE EXCEPTION 'Rollback Precondition Failed: Duplicate (organization_id, user_id, role_id) records detected in user_roles.'
--             USING ERRCODE = '23505';
--     END IF;
--
--     -- Verify all user_roles.role_id reference existing roles before restoring foreign key
--     IF EXISTS (
--         SELECT 1 FROM public.user_roles ur
--         LEFT JOIN public.roles r ON r.id = ur.role_id
--         WHERE r.id IS NULL
--     ) THEN
--         RAISE EXCEPTION 'Rollback Precondition Failed: Orphaned role_id in user_roles cannot satisfy original user_roles_role_id_fkey.'
--             USING ERRCODE = '23503';
--     END IF;
--
--     -- Verify all populated organization_members.role_id reference existing roles
--     IF EXISTS (
--         SELECT 1 FROM public.organization_members om
--         LEFT JOIN public.roles r ON r.id = om.role_id
--         WHERE om.role_id IS NOT NULL AND r.id IS NULL
--     ) THEN
--         RAISE EXCEPTION 'Rollback Precondition Failed: Orphaned role_id in organization_members cannot satisfy original organization_members_role_id_fkey.'
--             USING ERRCODE = '23503';
--     END IF;
-- END $$;
--
-- -- STEP 1: REVERT ORGANIZATION_MEMBERS CONSTRAINTS & INDEXES
-- ALTER TABLE public.organization_members 
--     DROP CONSTRAINT IF EXISTS fk_organization_members_org_role;
--
-- -- Restore exact baseline constraint from migration 20261104000003_audit_logs.sql
-- ALTER TABLE public.organization_members 
--     ADD CONSTRAINT organization_members_role_id_fkey
--     FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;
--
-- DROP INDEX IF EXISTS public.idx_org_members_org_role;
-- CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
--
-- -- STEP 2: REVERT USER_ROLES CONSTRAINTS & INDEXES
-- ALTER TABLE public.user_roles 
--     DROP CONSTRAINT IF EXISTS fk_user_roles_org_role;
--
-- ALTER TABLE public.user_roles 
--     DROP CONSTRAINT IF EXISTS user_roles_pkey;
--
-- -- Restore exact baseline primary key from migration 20261104000001_core_schema.sql
-- ALTER TABLE public.user_roles 
--     ADD CONSTRAINT user_roles_pkey PRIMARY KEY (organization_id, user_id, role_id);
--
-- -- Restore exact baseline foreign key from migration 20261104000001_core_schema.sql
-- ALTER TABLE public.user_roles 
--     ADD CONSTRAINT user_roles_role_id_fkey
--     FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;
--
-- -- Restore exact baseline index from migration 20261104000001_core_schema.sql
-- CREATE INDEX IF NOT EXISTS idx_user_roles_org_user ON public.user_roles(organization_id, user_id);
--
-- -- Drop added forward indexes
-- DROP INDEX IF EXISTS public.idx_user_roles_org_role;
-- DROP INDEX IF EXISTS public.idx_user_roles_assigned_at;
--
-- -- STEP 3: REVERT ROLES CANDIDATE UNIQUE CONSTRAINT (DROPPED LAST)
-- ALTER TABLE public.roles 
--     DROP CONSTRAINT IF EXISTS uq_roles_org_id;
--
-- COMMIT;
