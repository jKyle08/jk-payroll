-- ==============================================================================
-- JK-PAYROLL: AUDIT LOG ATTRIBUTION & ADMINISTRATIVE MUTATION INTEGRITY
-- Migration: 20261119000011_harden_audit_attribution_and_integrity.sql
-- Findings Remediated:
--   - SEC-FIND-17: Audit log attribution for service-role mutations
--   - SEC-FIND-09: Audit log query authorization
--   - SEC-FIND-18: Point-in-time audit integrity and tamper resistance
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SCHEMA HARDENING & ACTOR ATTRIBUTION COLUMNS
-- ------------------------------------------------------------------------------

-- Add actor_type column to support trusted role classification
ALTER TABLE public.audit_logs 
    ADD COLUMN IF NOT EXISTS actor_type TEXT DEFAULT 'USER';

-- Enforce valid actor classification domain
DO $$ BEGIN
    ALTER TABLE public.audit_logs 
    ADD CONSTRAINT chk_audit_logs_actor_type 
    CHECK (actor_type IN ('USER', 'ADMIN', 'SUPER_ADMIN', 'SYSTEM'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Allow platform-level audit records to have nullable organization_id
ALTER TABLE public.audit_logs 
    ALTER COLUMN organization_id DROP NOT NULL;

-- Temporarily drop immutability trigger for safe backfill of historical audit records
DROP TRIGGER IF EXISTS trg_audit_logs_immutability ON public.audit_logs;

-- Safe backfill of historical audit records without fabricating human actors
UPDATE public.audit_logs
SET actor_type = 'SYSTEM'
WHERE (actor_name = 'System / Automated' OR actor_id IS NULL)
  AND (actor_type = 'USER' OR actor_type IS NULL);

UPDATE public.audit_logs
SET actor_type = 'SUPER_ADMIN'
WHERE (actor_role_name ILIKE '%super%')
  AND (actor_type = 'USER' OR actor_type IS NULL);

-- Performance & Retrieval Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_actor_type 
    ON public.audit_logs (organization_id, actor_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created_at 
    ON public.audit_logs (actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_desc 
    ON public.audit_logs (created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. HARDENED TRIGGER FUNCTION WITH TRANSACTION SESSION CONTEXT SUPPORT
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_module_id TEXT;
    v_action public.audit_action;
    v_entity_id TEXT;
    v_org_id UUID;
    v_row_json JSONB;
    v_old_values JSONB := NULL;
    v_new_values JSONB := NULL;
    v_jwt JSONB;
    v_actor_id UUID := NULL;
    v_actor_name TEXT := NULL;
    v_actor_email TEXT := NULL;
    v_actor_type TEXT := 'USER';
    v_actor_role_name TEXT := NULL;
    v_actor_department_name TEXT := NULL;
    v_ip INET := NULL;
    v_user_agent TEXT := NULL;
    v_session_actor_id TEXT;
    v_session_actor_type TEXT;
    v_session_actor_name TEXT;
    v_session_actor_email TEXT;
BEGIN
    -- Determine module identifier from TG_ARGV[0] or default to table name
    IF TG_NARGS > 0 AND TG_ARGV[0] IS NOT NULL AND TG_ARGV[0] <> '' THEN
        v_module_id := TG_ARGV[0];
    ELSE
        v_module_id := TG_TABLE_NAME::TEXT;
    END IF;

    -- Map TG_OP to action and extract serialized records
    IF TG_OP = 'INSERT' THEN
        v_action := 'CREATE'::public.audit_action;
        v_row_json := to_jsonb(NEW);
        v_new_values := v_row_json;
        v_old_values := NULL;
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'DELETE'::public.audit_action;
        v_row_json := to_jsonb(OLD);
        v_new_values := NULL;
        v_old_values := v_row_json;
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'UPDATE'::public.audit_action;
        v_row_json := to_jsonb(NEW);

        -- Field-level diff computation using jsonb_object_agg
        SELECT 
            jsonb_object_agg(old_entry.key, old_entry.value),
            jsonb_object_agg(new_entry.key, new_entry.value)
        INTO v_old_values, v_new_values
        FROM jsonb_each(to_jsonb(OLD)) old_entry
        JOIN jsonb_each(to_jsonb(NEW)) new_entry ON old_entry.key = new_entry.key
        WHERE old_entry.value IS DISTINCT FROM new_entry.value;

        -- If no columns actually changed, bypass logging completely to conserve IOPS
        IF v_new_values IS NULL OR v_new_values = '{}'::jsonb THEN
            RETURN NEW;
        END IF;
    END IF;

    -- Resolve primary entity_id
    v_entity_id := COALESCE(
        v_row_json->>'id',
        CONCAT_WS(':', v_row_json->>'organization_id', v_row_json->>'user_id', v_row_json->>'role_id'),
        'UNKNOWN'
    );

    -- Resolve organization_id (direct column, self-table, or context)
    v_org_id := COALESCE(
        (v_row_json->>'organization_id')::UUID,
        CASE WHEN TG_TABLE_NAME = 'organizations' THEN (v_row_json->>'id')::UUID ELSE NULL END,
        (auth.jwt()->'app_metadata'->>'organization_id')::UUID
    );

    -- --------------------------------------------------------------------------
    -- 1. SESSION-LOCAL CONTEXT (Transaction-local parameter support)
    -- --------------------------------------------------------------------------
    BEGIN
        v_session_actor_id := NULLIF(current_setting('app.current_actor_id', true), '');
        v_session_actor_type := NULLIF(current_setting('app.current_actor_type', true), '');
        v_session_actor_name := NULLIF(current_setting('app.current_actor_name', true), '');
        v_session_actor_email := NULLIF(current_setting('app.current_actor_email', true), '');
    EXCEPTION WHEN OTHERS THEN
        v_session_actor_id := NULL;
    END;

    IF v_session_actor_id IS NOT NULL THEN
        v_actor_id := v_session_actor_id::UUID;
        v_actor_name := v_session_actor_name;
        v_actor_email := v_session_actor_email;
        v_actor_type := COALESCE(v_session_actor_type, 'USER');
    END IF;

    -- --------------------------------------------------------------------------
    -- 2. JWT CLAIMS FAST PATH
    -- --------------------------------------------------------------------------
    IF v_actor_id IS NULL THEN
        v_jwt := auth.jwt();
        IF v_jwt IS NOT NULL THEN
            v_actor_id := NULLIF(v_jwt->>'sub', '')::UUID;
            v_actor_email := v_jwt->>'email';
            v_actor_name := COALESCE(
                v_jwt->'user_metadata'->>'full_name',
                v_jwt->'user_metadata'->>'name',
                v_jwt->'user_metadata'->>'display_name',
                split_part(v_jwt->>'email', '@', 1)
            );
            v_actor_role_name := v_jwt->'app_metadata'->>'role_name';
            v_actor_department_name := v_jwt->'app_metadata'->>'department_name';

            IF (v_jwt->'app_metadata'->>'role' = 'SUPER_ADMIN') OR (v_jwt->'app_metadata'->>'role_name' = 'SUPER_ADMIN') THEN
                v_actor_type := 'SUPER_ADMIN';
            ELSIF (v_jwt->'app_metadata'->>'role' = 'ADMIN') OR (v_jwt->'app_metadata'->>'role_name' = 'ADMIN') THEN
                v_actor_type := 'ADMIN';
            END IF;
        END IF;
    END IF;

    -- --------------------------------------------------------------------------
    -- 3. RELATIONAL LOOKUP FALLBACK
    -- --------------------------------------------------------------------------
    IF v_actor_id IS NULL AND auth.uid() IS NOT NULL THEN
        v_actor_id := auth.uid();
        SELECT 
            COALESCE(p.full_name, split_part(u.email, '@', 1)),
            COALESCE(p.email, u.email),
            COALESCE(r.name, CASE WHEN p.is_super_admin THEN 'Super Admin' WHEN p.is_organization_admin THEN 'Admin' ELSE 'Member' END),
            COALESCE(d.name, 'General'),
            CASE 
                WHEN p.is_super_admin THEN 'SUPER_ADMIN'
                WHEN p.is_organization_admin THEN 'ADMIN'
                ELSE 'USER'
            END
        INTO 
            v_actor_name,
            v_actor_email,
            v_actor_role_name,
            v_actor_department_name,
            v_actor_type
        FROM auth.users u
        LEFT JOIN public.profiles p ON p.id = u.id
        LEFT JOIN public.roles r ON p.id = r.id
        LEFT JOIN public.departments d ON d.id = p.department_id
        WHERE u.id = auth.uid()
        LIMIT 1;
    END IF;

    -- --------------------------------------------------------------------------
    -- 4. SYSTEM / AUTOMATED DEFAULT FALLBACK
    -- --------------------------------------------------------------------------
    IF v_actor_id IS NULL THEN
        v_actor_name := COALESCE(v_actor_name, 'System / Automated');
        v_actor_role_name := COALESCE(v_actor_role_name, 'System / Automated');
        v_actor_department_name := COALESCE(v_actor_department_name, 'System / Automated');
        v_actor_type := 'SYSTEM';
    END IF;

    -- Resolve request network context safely
    BEGIN
        v_ip := split_part(nullif(current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1)::inet;
    EXCEPTION WHEN OTHERS THEN
        v_ip := NULL;
    END;

    BEGIN
        v_user_agent := current_setting('request.headers', true)::json->>'user-agent';
    EXCEPTION WHEN OTHERS THEN
        v_user_agent := NULL;
    END;

    -- Insert audit log record
    INSERT INTO public.audit_logs (
        organization_id,
        actor_id,
        actor_name,
        actor_email,
        actor_type,
        actor_role_name,
        actor_department_name,
        module_id,
        entity_type,
        entity_id,
        action,
        old_values,
        new_values,
        ip_address,
        user_agent,
        created_at
    ) VALUES (
        v_org_id,
        v_actor_id,
        v_actor_name,
        v_actor_email,
        v_actor_type,
        v_actor_role_name,
        v_actor_department_name,
        v_module_id,
        TG_TABLE_NAME::TEXT,
        v_entity_id,
        v_action,
        v_old_values,
        v_new_values,
        v_ip,
        v_user_agent,
        timezone('utc'::text, now())
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. SEC-FIND-09: HARDENED ROW-LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Ensure RLS is active
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- SELECT POLICY: Strictly restricts queries to Super Admins and authorized Organization Admins
DROP POLICY IF EXISTS audit_logs_select_policy ON public.audit_logs;
CREATE POLICY audit_logs_select_policy ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        -- 1. Super Admin can inspect audit logs across ALL organizations
        public.is_super_admin()

        -- 2. Organization Administrators can ONLY inspect audit logs of their own authorized organization
        OR (
            organization_id IS NOT NULL
            AND public.is_organization_admin(organization_id)
        )
    );

-- INSERT POLICY: Controlled insertion only for authorized organization context or Super Admin
DROP POLICY IF EXISTS audit_logs_insert_policy ON public.audit_logs;
CREATE POLICY audit_logs_insert_policy ON public.audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR (
            organization_id IS NOT NULL
            AND organization_id = public.current_user_organization_id()
        )
    );

-- ------------------------------------------------------------------------------
-- 4. SEC-FIND-18: AUDIT INTEGRITY & TAMPER RESISTANCE (IMMUTABILITY GUARD)
-- ------------------------------------------------------------------------------

-- Ensure immutability trigger function exists and raises SQLSTATE 55000
CREATE OR REPLACE FUNCTION public.enforce_audit_log_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable, append-only records. Updates and deletions are strictly prohibited.'
        USING ERRCODE = '55000';
END;
$$;

-- Attach BEFORE UPDATE OR DELETE trigger
DROP TRIGGER IF EXISTS trg_audit_logs_immutability ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutability
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_audit_log_immutability();

-- Revoke mutation privileges at PostgreSQL privilege level
REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role, postgres;
