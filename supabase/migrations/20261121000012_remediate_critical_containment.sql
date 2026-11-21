-- ==============================================================================
-- JK-PAYROLL: PHASE 1 IMMEDIATE SECURITY CONTAINMENT & SCHEMA HARMONIZATION
-- Migration: 20261121000012_remediate_critical_containment.sql
-- Findings Remediated:
--   - ADD-01: Schema harmonization for organizations.is_active vs status
--   - CRITICAL-01: Restrict profiles_update_policy against org admin promotion
--   - CRITICAL-02: Restrict profiles_insert_policy against self-elevation to org admin
--   - CRITICAL-03: Restrict org_members_insert_policy against owner injection
--   - CRITICAL-05: Eliminate SuperAdmin grant from role display names
--   - CRITICAL-06: Fix boolean evaluation in authorization helper functions (eliminate COALESCE defect)
--   - HIGH-03: Deterministic context resolution in current_user_organization_id
--   - HIGH-04: Verify organization lifecycle eligibility in is_organization_member
--   - HIGH-13: Revoke unauthenticated / public execution on get_user_effective_permissions
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SCHEMA HARMONIZATION: ORGANIZATIONS.IS_ACTIVE & SYNCHRONIZATION TRIGGER (ADD-01)
-- ------------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'organizations' 
          AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.organizations ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- Synchronize initial values based on authoritative status
UPDATE public.organizations 
SET is_active = (status = 'Active')
WHERE is_active IS DISTINCT FROM (status = 'Active');

-- Maintain automatic synchronization between status and is_active
CREATE OR REPLACE FUNCTION public.fn_sync_organization_active_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.is_active := (NEW.status = 'Active');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_organization_active_status ON public.organizations;
CREATE TRIGGER trg_sync_organization_active_status
    BEFORE INSERT OR UPDATE OF status ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_organization_active_status();

-- ------------------------------------------------------------------------------
-- 2. HARDENED AUTHORIZATION HELPER FUNCTIONS (CRITICAL-05, CRITICAL-06, HIGH-03, HIGH-04)
-- ------------------------------------------------------------------------------

-- 2.1 Deterministic Current User Organization ID (HIGH-03)
CREATE OR REPLACE FUNCTION public.current_user_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        -- 1. Verified JWT tenant context claim if caller has an active membership
        (
            SELECT om.organization_id 
            FROM public.organization_members om 
            WHERE om.user_id = auth.uid() 
              AND om.organization_id = NULLIF(auth.jwt()->'app_metadata'->>'organization_id', '')::UUID 
              AND om.is_active = true
            LIMIT 1
        ),
        -- 2. First active owned/primary membership (deterministic ordering)
        (
            SELECT om.organization_id 
            FROM public.organization_members om 
            WHERE om.user_id = auth.uid() 
              AND om.is_active = true 
            ORDER BY om.is_owner DESC, om.created_at ASC 
            LIMIT 1
        ),
        -- 3. Profile organization fallback
        (
            SELECT p.organization_id 
            FROM public.profiles p 
            WHERE p.id = auth.uid() 
              AND p.is_active = true 
            LIMIT 1
        )
    );
$$;

-- 2.2 Hardened is_super_admin() (CRITICAL-05, CRITICAL-06)
-- Eliminates COALESCE defect and removes display name role checks
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (
        -- Profile-based platform admin check
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
              AND is_super_admin = true 
              AND is_active = true
        )
        -- Trusted platform claim in JWT app_metadata (never role display name)
        OR (auth.jwt()->'app_metadata'->>'role' = 'SUPER_ADMIN')
    );
$$;

-- 2.3 Hardened is_organization_admin() (CRITICAL-06)
-- Replaces broken COALESCE with boolean OR evaluation
CREATE OR REPLACE FUNCTION public.is_organization_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (
        -- Platform Super Admin universal authority
        public.is_super_admin()
        -- Profile organization_admin flag scoped strictly to target organization
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
              AND organization_id = p_org_id 
              AND is_organization_admin = true 
              AND is_active = true
        )
        -- Organization membership: Owner or designated admin role
        OR EXISTS (
            SELECT 1 FROM public.organization_members om
            LEFT JOIN public.roles r ON om.role_id = r.id
            WHERE om.user_id = auth.uid()
              AND om.organization_id = p_org_id
              AND om.is_active = true
              AND (
                  om.is_owner = true 
                  OR UPPER(r.code) IN ('ADMIN', 'ORGANIZATION_ADMIN', 'ORG_ADMIN')
                  OR UPPER(r.name) IN ('ADMIN', 'ORGANIZATION ADMINISTRATOR', 'ORGANIZATION ADMIN')
              )
        )
    );
$$;

-- 2.4 Hardened is_organization_member() (CRITICAL-06, HIGH-04)
-- Enforces active organization lifecycle status alongside membership
CREATE OR REPLACE FUNCTION public.is_organization_member(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (
        -- Super Admin universal authority
        public.is_super_admin()
        -- Must be an active organization (not suspended or expired)
        OR (
            EXISTS (
                SELECT 1 FROM public.organizations o 
                WHERE o.id = p_org_id 
                  AND o.status = 'Active'
                  AND (o.end_date IS NULL OR o.end_date >= clock_timestamp())
            )
            AND (
                -- Active profile in target organization
                EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid()
                      AND p.organization_id = p_org_id
                      AND p.is_active = true
                )
                -- Active membership in organization_members
                OR EXISTS (
                    SELECT 1 FROM public.organization_members om
                    WHERE om.user_id = auth.uid()
                      AND om.organization_id = p_org_id
                      AND om.is_active = true
                )
            )
        )
    );
$$;

-- ------------------------------------------------------------------------------
-- 3. HARDENED RLS POLICIES (CRITICAL-01, CRITICAL-02, CRITICAL-03)
-- Atomic deployment ensures helper fixes do not expose unpatched policy branches
-- ------------------------------------------------------------------------------

-- 3.1 Lock Down Profiles Insert Policy (CRITICAL-02)
-- Prohibits self-elevation to is_organization_admin or is_super_admin
DROP POLICY IF EXISTS profiles_insert_policy ON public.profiles;
CREATE POLICY profiles_insert_policy ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        -- Self-registration: basic profile only, NO administrative privilege injection
        OR (
            id = auth.uid() 
            AND is_super_admin = false 
            AND is_organization_admin = false
        )
        -- Org Admin creation: cannot create super admins or other org admins via raw insert
        OR (
            organization_id = public.current_user_organization_id() 
            AND public.is_organization_admin(organization_id) 
            AND is_super_admin = false
            AND is_organization_admin = false
        )
    );

-- 3.2 Lock Down Profiles Update Policy (CRITICAL-01)
-- Org admins cannot promote users to is_organization_admin via profile update
DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;
CREATE POLICY profiles_update_policy ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR id = auth.uid()
        OR (organization_id = public.current_user_organization_id() AND public.is_organization_admin(organization_id))
    )
    WITH CHECK (
        public.is_super_admin()
        -- Self-update: cannot escalate privileges or mutate organization_id
        OR (
            id = auth.uid()
            AND is_super_admin = (SELECT p.is_super_admin FROM public.profiles p WHERE p.id = auth.uid())
            AND is_organization_admin = (SELECT p.is_organization_admin FROM public.profiles p WHERE p.id = auth.uid())
            AND (organization_id IS NOT DISTINCT FROM (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()))
        )
        -- Org admin update: cannot escalate to super admin and CANNOT elevate to is_organization_admin
        OR (
            organization_id = public.current_user_organization_id()
            AND public.is_organization_admin(organization_id)
            AND is_super_admin = false
            AND is_organization_admin = (SELECT p.is_organization_admin FROM public.profiles p WHERE p.id = public.profiles.id)
        )
    );

-- 3.3 Lock Down Organization Members Insert Policy (CRITICAL-03)
-- Org admins cannot create owner memberships via raw insert
DROP POLICY IF EXISTS org_members_insert_policy ON public.organization_members;
CREATE POLICY org_members_insert_policy ON public.organization_members
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        -- Org admin may invite/add members, but NEVER as owner
        OR (
            organization_id = public.current_user_organization_id() 
            AND public.is_organization_admin(organization_id)
            AND is_owner = false
        )
    );

-- ------------------------------------------------------------------------------
-- 4. HARDEN TOKEN HOOK (CRITICAL-05)
-- Remove display name reflection into app_metadata.role_name
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
    v_role_code TEXT;
    v_department_name TEXT;
    v_org_id UUID;
    v_is_super BOOLEAN;
BEGIN
    v_user_id := (event->>'user_id')::UUID;
    v_claims := COALESCE(event->'claims', '{}'::jsonb);

    -- Check if user is an authentic platform super admin
    SELECT is_super_admin INTO v_is_super
    FROM public.profiles
    WHERE id = v_user_id AND is_active = true;

    IF v_is_super = true THEN
        v_claims := jsonb_set(v_claims, '{app_metadata,role}', to_jsonb('SUPER_ADMIN'::text), true);
    END IF;

    -- Fetch active tenant role code (NOT arbitrary display name) and department from organization_members
    SELECT 
        r.code,
        d.name,
        om.organization_id
    INTO 
        v_role_code,
        v_department_name,
        v_org_id
    FROM public.organization_members om
    LEFT JOIN public.roles r ON om.role_id = r.id
    LEFT JOIN public.departments d ON om.department_id = d.id
    WHERE om.user_id = v_user_id
      AND om.is_active = true
    ORDER BY om.is_owner DESC, om.created_at ASC
    LIMIT 1;

    -- Fallback to profile primary organization if no explicit membership
    IF v_org_id IS NULL THEN
        SELECT organization_id INTO v_org_id
        FROM public.profiles
        WHERE id = v_user_id AND is_active = true
        LIMIT 1;
    END IF;

    -- Inject verified role code and organization into claims safely
    IF v_role_code IS NOT NULL AND v_role_code <> 'SUPER_ADMIN' THEN
        v_claims := jsonb_set(v_claims, '{app_metadata,role_code}', to_jsonb(v_role_code), true);
    END IF;

    IF v_department_name IS NOT NULL THEN
        v_claims := jsonb_set(v_claims, '{app_metadata,department_name}', to_jsonb(v_department_name), true);
    END IF;

    IF v_org_id IS NOT NULL THEN
        v_claims := jsonb_set(v_claims, '{app_metadata,organization_id}', to_jsonb(v_org_id), true);
    END IF;

    event := jsonb_set(event, '{claims}', v_claims, true);
    RETURN event;
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. FUNCTION EXECUTION PERMISSION HARDENING (HIGH-13)
-- ------------------------------------------------------------------------------

-- Revoke dangerous public execution from get_user_effective_permissions
REVOKE ALL ON FUNCTION public.get_user_effective_permissions(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_effective_permissions(UUID, UUID) TO authenticated, service_role;
