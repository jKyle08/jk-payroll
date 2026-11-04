-- ==============================================================================
-- JK-PAYROLL: ULTRA-LOW-LATENCY ZERO-JOIN POINT-IN-TIME AUDIT LOGGING SYSTEM
-- Migration: 20261104000003_audit_logs.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENUMS & CORE SCHEMA
-- ------------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE public.audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'LOGIN', 'EXPORT');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Bridge/Membership table to support explicit tenant membership, owner flag, and role assignment
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    is_owner BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_organization_members_org_user UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);

-- Populate organization_members from existing profiles and user_roles
INSERT INTO public.organization_members (organization_id, user_id, role_id, department_id, is_owner, is_active)
SELECT 
    p.organization_id,
    p.id AS user_id,
    ur.role_id,
    p.department_id,
    (p.is_organization_admin OR p.is_super_admin) AS is_owner,
    p.is_active
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id AND ur.organization_id = p.organization_id
WHERE p.organization_id IS NOT NULL
ON CONFLICT (organization_id, user_id) DO UPDATE SET
    role_id = COALESCE(EXCLUDED.role_id, public.organization_members.role_id),
    department_id = COALESCE(EXCLUDED.department_id, public.organization_members.department_id),
    is_owner = EXCLUDED.is_owner,
    is_active = EXCLUDED.is_active;

-- ------------------------------------------------------------------------------
-- 2. AUDIT LOGS UNIFIED TABLE
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_name TEXT,
    actor_email TEXT,
    actor_role_name TEXT,
    actor_department_name TEXT,
    module_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action public.audit_action NOT NULL,
    old_values JSONB DEFAULT NULL,
    new_values JSONB DEFAULT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Core High-Performance Composite Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created_at 
    ON public.audit_logs (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_entity 
    ON public.audit_logs (organization_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_actor 
    ON public.audit_logs (organization_id, actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_module 
    ON public.audit_logs (organization_id, module_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 3. SUPABASE AUTH CUSTOM ACCESS TOKEN HOOK
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_claims JSONB;
    v_role_name TEXT;
    v_department_name TEXT;
    v_org_id UUID;
BEGIN
    -- Extract user_id and current claims from hook event payload
    v_user_id := (event->>'user_id')::UUID;
    v_claims := COALESCE(event->'claims', '{}'::jsonb);

    -- Fetch active tenant role and department from organization_members joined with roles and departments
    SELECT 
        r.name,
        d.name,
        om.organization_id
    INTO 
        v_role_name,
        v_department_name,
        v_org_id
    FROM public.organization_members om
    LEFT JOIN public.roles r ON om.role_id = r.id
    LEFT JOIN public.departments d ON om.department_id = d.id
    WHERE om.user_id = v_user_id
      AND om.is_active = true
    ORDER BY om.is_owner DESC, om.created_at ASC
    LIMIT 1;

    -- Secondary fallback to profiles / user_roles if organization_members record was absent
    IF v_role_name IS NULL AND v_department_name IS NULL THEN
        SELECT 
            COALESCE(r.name, CASE WHEN p.is_super_admin THEN 'Super Admin' WHEN p.is_organization_admin THEN 'Admin' ELSE 'Member' END),
            d.name,
            p.organization_id
        INTO 
            v_role_name,
            v_department_name,
            v_org_id
        FROM public.profiles p
        LEFT JOIN public.user_roles ur ON ur.user_id = p.id AND ur.organization_id = p.organization_id
        LEFT JOIN public.roles r ON r.id = ur.role_id
        LEFT JOIN public.departments d ON d.id = p.department_id
        WHERE p.id = v_user_id
          AND p.is_active = true
        LIMIT 1;
    END IF;

    -- Inject point-in-time claims into app_metadata for zero-overhead in-memory JWT trigger reads
    IF v_role_name IS NOT NULL THEN
        v_claims := jsonb_set(v_claims, '{app_metadata,role_name}', to_jsonb(v_role_name), true);
    END IF;

    IF v_department_name IS NOT NULL THEN
        v_claims := jsonb_set(v_claims, '{app_metadata,department_name}', to_jsonb(v_department_name), true);
    END IF;

    IF v_org_id IS NOT NULL THEN
        v_claims := jsonb_set(v_claims, '{app_metadata,organization_id}', to_jsonb(v_org_id), true);
    END IF;

    -- Re-attach claims to hook event
    event := jsonb_set(event, '{claims}', v_claims, true);
    RETURN event;
END;
$$;

-- Secure Hook Permissions
REVOKE ALL ON FUNCTION public.custom_access_token_hook(JSONB) FROM PUBLIC, anon, authenticated;

DO $$ BEGIN
    GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
    GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(JSONB) TO supabase_auth_admin;
    GRANT SELECT ON TABLE public.organization_members TO supabase_auth_admin;
    GRANT SELECT ON TABLE public.roles TO supabase_auth_admin;
    GRANT SELECT ON TABLE public.departments TO supabase_auth_admin;
    GRANT SELECT ON TABLE public.profiles TO supabase_auth_admin;
    GRANT SELECT ON TABLE public.user_roles TO supabase_auth_admin;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 4. ULTRA-LOW-LATENCY AUDIT LOG TRIGGER FUNCTION
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
    v_actor_role_name TEXT := NULL;
    v_actor_department_name TEXT := NULL;
    v_ip INET := NULL;
    v_user_agent TEXT := NULL;
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
    -- ACTOR RESOLUTION: FAST PATH (< 0.1ms In-Memory JWT Claims)
    -- --------------------------------------------------------------------------
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
    END IF;

    -- --------------------------------------------------------------------------
    -- ACTOR RESOLUTION: FALLBACK PATH (Explicit Relational Lookup)
    -- --------------------------------------------------------------------------
    IF (v_actor_role_name IS NULL OR v_actor_department_name IS NULL) AND auth.uid() IS NOT NULL THEN
        v_actor_id := auth.uid();

        -- Fallback query from organization_members
        SELECT 
            COALESCE(v_actor_name, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
            COALESCE(v_actor_email, u.email),
            COALESCE(v_actor_role_name, r.name, CASE WHEN om.is_owner THEN 'Admin' ELSE 'Member' END),
            COALESCE(v_actor_department_name, d.name, 'General')
        INTO 
            v_actor_name,
            v_actor_email,
            v_actor_role_name,
            v_actor_department_name
        FROM auth.users u
        LEFT JOIN public.organization_members om ON om.user_id = u.id AND (v_org_id IS NULL OR om.organization_id = v_org_id)
        LEFT JOIN public.roles r ON om.role_id = r.id
        LEFT JOIN public.departments d ON om.department_id = d.id
        WHERE u.id = auth.uid()
        LIMIT 1;

        -- Fallback to profiles / user_roles if organization_members had no record
        IF v_actor_role_name IS NULL OR v_actor_department_name IS NULL THEN
            SELECT 
                COALESCE(v_actor_name, p.full_name, split_part(u.email, '@', 1)),
                COALESCE(v_actor_email, p.email, u.email),
                COALESCE(v_actor_role_name, r.name, CASE WHEN p.is_super_admin THEN 'Super Admin' WHEN p.is_organization_admin THEN 'Admin' ELSE 'Member' END),
                COALESCE(v_actor_department_name, d.name, 'General'),
                COALESCE(v_org_id, p.organization_id)
            INTO 
                v_actor_name,
                v_actor_email,
                v_actor_role_name,
                v_actor_department_name,
                v_org_id
            FROM auth.users u
            LEFT JOIN public.profiles p ON p.id = u.id
            LEFT JOIN public.user_roles ur ON ur.user_id = u.id AND (v_org_id IS NULL OR ur.organization_id = v_org_id)
            LEFT JOIN public.roles r ON ur.role_id = r.id
            LEFT JOIN public.departments d ON d.id = p.department_id
            WHERE u.id = auth.uid()
            LIMIT 1;
        END IF;
    END IF;

    -- Background Worker / Cron / System Default Fallback
    v_actor_name := COALESCE(v_actor_name, 'System / Automated');
    v_actor_role_name := COALESCE(v_actor_role_name, 'System / Automated');
    v_actor_department_name := COALESCE(v_actor_department_name, 'System / Automated');

    -- Resolve request network context safely without throwing exceptions
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

    -- Ensure an organization_id exists before inserting audit log record
    IF v_org_id IS NOT NULL THEN
        INSERT INTO public.audit_logs (
            organization_id,
            actor_id,
            actor_name,
            actor_email,
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
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. IMMUTABILITY ENFORCEMENT & ROW-LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------

-- Immutability Guard: Strictly block any UPDATE or DELETE operations
CREATE OR REPLACE FUNCTION public.enforce_audit_log_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable, append-only records. Updates and deletions are strictly prohibited.'
        USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_immutability ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutability
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_audit_log_immutability();

-- Revoke mutation privileges at PostgreSQL privilege level
REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM PUBLIC, anon, authenticated;

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Strict isolation; only organization admins, owners, or security auditors can read
DROP POLICY IF EXISTS audit_logs_select_policy ON public.audit_logs;
CREATE POLICY audit_logs_select_policy ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        -- User must be a member of the organization
        (
            organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid() AND p.is_active = true)
            OR (auth.jwt()->'app_metadata'->>'organization_id')::UUID = organization_id
        )
        AND (
            -- Super Admin or Organization Admin flag
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND (p.is_super_admin = true OR p.is_organization_admin = true)
            )
            -- Or membership record with is_owner = true or administrative role
            OR EXISTS (
                SELECT 1 
                FROM public.organization_members om
                LEFT JOIN public.roles r ON om.role_id = r.id
                WHERE om.user_id = auth.uid()
                  AND om.organization_id = public.audit_logs.organization_id
                  AND om.is_active = true
                  AND (
                      om.is_owner = true
                      OR UPPER(r.code) IN ('ADMIN', 'SECURITY_AUDITOR', 'ORGANIZATION_ADMIN')
                      OR UPPER(r.name) IN ('ADMIN', 'SECURITY AUDITOR', 'ORGANIZATION ADMINISTRATOR')
                  )
            )
        )
    );

-- INSERT Policy: Allow authenticated users to insert rows scoped to their organization
DROP POLICY IF EXISTS audit_logs_insert_policy ON public.audit_logs;
CREATE POLICY audit_logs_insert_policy ON public.audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid() AND p.is_active = true)
        OR (auth.jwt()->'app_metadata'->>'organization_id')::UUID = organization_id
        OR EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true
        )
    );

