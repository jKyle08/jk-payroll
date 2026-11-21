-- ==============================================================================
-- PAYPULSE PHASE 1.1.1 — STAGING STRUCTURAL VERIFICATION (READ-ONLY)
-- Run against the Supabase STAGING database AFTER applying
--   20261121000014_security_corrections_phase1_1_1.sql
-- as the `postgres` role (SQL editor or psql). Makes no changes.
--
-- EXPECTED RESULT: every row has ok = true. Any `false` row = deployment is NOT verified.
-- (The same query is executed against embedded PGlite in tests/integration; passing there
--  does NOT substitute for running it on staging.)
-- ==============================================================================
WITH checks AS (
    -- ---- A. Effective EXECUTE privileges --------------------------------------
    SELECT 'A1 get_user_effective_permissions: anon has no EXECUTE' AS check_name,
           NOT has_function_privilege('anon', 'public.get_user_effective_permissions(uuid,uuid)', 'EXECUTE') AS ok
    UNION ALL SELECT 'A2 get_user_effective_permissions: authenticated has no EXECUTE',
           NOT has_function_privilege('authenticated', 'public.get_user_effective_permissions(uuid,uuid)', 'EXECUTE')
    UNION ALL SELECT 'A3 get_user_effective_permissions: service_role has EXECUTE',
           has_function_privilege('service_role', 'public.get_user_effective_permissions(uuid,uuid)', 'EXECUTE')
    UNION ALL SELECT 'A4 get_user_effective_permissions: no PUBLIC grant (proacl has no "=X" entry)',
           NOT EXISTS (
               SELECT 1 FROM pg_proc p, LATERAL unnest(COALESCE(p.proacl, ARRAY[]::aclitem[])) a
               WHERE p.oid = 'public.get_user_effective_permissions(uuid,uuid)'::regprocedure
                 AND a::text LIKE '=%')
    UNION ALL SELECT 'A5 custom_access_token_hook: anon/authenticated have no EXECUTE',
           NOT has_function_privilege('anon', 'public.custom_access_token_hook(jsonb)', 'EXECUTE')
       AND NOT has_function_privilege('authenticated', 'public.custom_access_token_hook(jsonb)', 'EXECUTE')
    UNION ALL SELECT 'A6 custom_access_token_hook: supabase_auth_admin has EXECUTE',
           has_function_privilege('supabase_auth_admin', 'public.custom_access_token_hook(jsonb)', 'EXECUTE')

    -- ---- B. SECURITY DEFINER / INVOKER configuration --------------------------
    UNION ALL SELECT 'B1 fn_enforce_profile_security_fields is SECURITY INVOKER (prosecdef = false)',
           NOT p.prosecdef
      FROM pg_proc p WHERE p.oid = 'public.fn_enforce_profile_security_fields()'::regprocedure
    UNION ALL SELECT 'B2 ' || p.proname || ' is SECURITY DEFINER with pinned search_path',
           p.prosecdef AND COALESCE(array_to_string(p.proconfig, ',') LIKE '%search_path=%', false)
      FROM pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace
       AND p.proname IN ('is_super_admin','is_organization_admin','is_organization_member',
                         'current_user_organization_id','get_user_effective_permissions','custom_access_token_hook')
    UNION ALL SELECT 'B3 owner of ' || p.proname || ' is not a client role',
           pg_get_userbyid(p.proowner) NOT IN ('anon','authenticated','service_role','authenticator')
      FROM pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace
       AND p.proname IN ('is_super_admin','is_organization_admin','is_organization_member',
                         'current_user_organization_id','get_user_effective_permissions',
                         'custom_access_token_hook','fn_enforce_profile_security_fields')

    -- ---- B4. SECURITY INVOKER trigger needs the caller to be able to read the JWT helpers
    UNION ALL SELECT 'B4 authenticated has USAGE on schema auth and EXECUTE on auth.uid()',
           has_schema_privilege('authenticated', 'auth', 'USAGE') AND has_function_privilege('authenticated', 'auth.uid()', 'EXECUTE')

    -- ---- C. Triggers / constraints -------------------------------------------
    UNION ALL SELECT 'C1 trg_enforce_profile_security_fields enabled BEFORE UPDATE ROW on profiles',
           EXISTS (SELECT 1 FROM pg_trigger t
                    WHERE t.tgrelid = 'public.profiles'::regclass
                      AND t.tgname = 'trg_enforce_profile_security_fields'
                      AND t.tgenabled = 'O'
                      AND (t.tgtype & 1) = 1      -- ROW
                      AND (t.tgtype & 2) = 2      -- BEFORE
                      AND (t.tgtype & 16) = 16)   -- UPDATE
    UNION ALL SELECT 'C2 trg_sync_organization_active_status enabled on organizations',
           EXISTS (SELECT 1 FROM pg_trigger t
                    WHERE t.tgrelid = 'public.organizations'::regclass
                      AND t.tgname = 'trg_sync_organization_active_status' AND t.tgenabled = 'O')
    UNION ALL SELECT 'C3 chk_organizations_status_active_sync exists and is validated',
           EXISTS (SELECT 1 FROM pg_constraint c
                    WHERE c.conrelid = 'public.organizations'::regclass
                      AND c.conname = 'chk_organizations_status_active_sync' AND c.convalidated)

    -- ---- D. RLS / policies on affected tables ----------------------------------
    UNION ALL SELECT 'D1 RLS enabled on ' || c.relname, c.relrowsecurity
      FROM pg_class c
     WHERE c.relnamespace = 'public'::regnamespace
       AND c.relname IN ('profiles','organization_members','organizations','user_roles',
                         'user_permissions','role_permissions','roles','departments')
    UNION ALL SELECT 'D2 no catch-all FOR ALL policy on ' || t.tbl,
           NOT EXISTS (SELECT 1 FROM pg_policies pp
                        WHERE pp.schemaname = 'public' AND pp.tablename = t.tbl AND pp.cmd = 'ALL')
      FROM (VALUES ('profiles'),('organization_members'),('organizations')) AS t(tbl)
    UNION ALL SELECT 'D3 profiles_insert_policy requires unassigned self-registration',
           EXISTS (SELECT 1 FROM pg_policies pp
                    WHERE pp.tablename = 'profiles' AND pp.policyname = 'profiles_insert_policy'
                      AND pp.cmd = 'INSERT' AND pp.with_check LIKE '%organization_id IS NULL%'
                      AND pp.with_check LIKE '%department_id IS NULL%')
    UNION ALL SELECT 'D4 profiles_update_policy exists (UPDATE)',
           EXISTS (SELECT 1 FROM pg_policies pp
                    WHERE pp.tablename = 'profiles' AND pp.policyname = 'profiles_update_policy' AND pp.cmd = 'UPDATE')
    UNION ALL SELECT 'D5 anon has no write privilege on profiles/organization_members',
           NOT has_table_privilege('anon', 'public.profiles', 'INSERT,UPDATE,DELETE')
       AND NOT has_table_privilege('anon', 'public.organization_members', 'INSERT,UPDATE,DELETE')

    -- ---- E. Function bodies (guard against stale definitions) --------------------
    UNION ALL SELECT 'E1 effective-permissions is additive (UNION of role and direct actions)',
           pg_get_functiondef('public.get_user_effective_permissions(uuid,uuid)'::regprocedure) ~* 'role_user_actions\s+UNION\s+SELECT'
       AND pg_get_functiondef('public.get_user_effective_permissions(uuid,uuid)'::regprocedure) !~* 'NOT EXISTS \(SELECT 1 FROM direct_user_actions\)'
    UNION ALL SELECT 'E2 effective-permissions never reads profiles.department_id',
           pg_get_functiondef('public.get_user_effective_permissions(uuid,uuid)'::regprocedure) !~* 'p\.department_id'
    UNION ALL SELECT 'E3 is_super_admin does not read JWT claims',
           pg_get_functiondef('public.is_super_admin()'::regprocedure) !~* 'jwt'
    UNION ALL SELECT 'E4 is_organization_member does not use profiles as membership',
           pg_get_functiondef('public.is_organization_member(uuid)'::regprocedure) !~* 'public\.profiles'
    UNION ALL SELECT 'E5 current_user_organization_id does not read profiles',
           pg_get_functiondef('public.current_user_organization_id()'::regprocedure) !~* 'public\.profiles'
    UNION ALL SELECT 'E6 is_organization_admin never matches role display names',
           pg_get_functiondef('public.is_organization_admin(uuid)'::regprocedure) !~* 'r\.name'
    UNION ALL SELECT 'E7 token hook never derives organization from profiles',
           pg_get_functiondef('public.custom_access_token_hook(jsonb)'::regprocedure) !~* 'organization_id\s+INTO\s+v_org_id\s+FROM\s+public\.profiles'
)
SELECT check_name, ok FROM checks ORDER BY check_name;

-- ==============================================================================
-- INFORMATIONAL (data-dependent; review manually, expected values in the report)
-- ==============================================================================
-- I1. Function owners and security mode
SELECT p.proname, pg_get_userbyid(p.proowner) AS owner, p.prosecdef AS security_definer,
       array_to_string(p.proconfig, ',') AS config, p.proacl::text AS acl
  FROM pg_proc p
 WHERE p.pronamespace = 'public'::regnamespace
   AND p.proname IN ('is_super_admin','is_organization_admin','is_organization_member',
                     'current_user_organization_id','get_user_effective_permissions',
                     'custom_access_token_hook','fn_enforce_profile_security_fields')
 ORDER BY p.proname;

-- I2. All policies on affected tables (compare with the migration history)
SELECT tablename, policyname, cmd, roles, qual, with_check
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('profiles','organization_members','organizations','user_roles',
                     'user_permissions','role_permissions','roles','departments')
 ORDER BY tablename, policyname;

-- I3. Custom roles that carried an admin-looking code (lose admin authority in 1.1.1). Expected: review each.
SELECT id, organization_id, code, name, role_type, is_active
  FROM public.roles
 WHERE organization_id IS NOT NULL AND UPPER(code) IN ('ADMIN','ORGANIZATION_ADMIN','ORG_ADMIN','TENANT_ADMIN');

-- I4. Memberships still without a department although the legacy profile has one. Expected: 0 rows.
SELECT om.organization_id, om.user_id
  FROM public.organization_members om
  JOIN public.profiles p ON p.id = om.user_id AND p.organization_id = om.organization_id
 WHERE om.department_id IS NULL AND p.department_id IS NOT NULL;

-- I5. Memberships whose department belongs to ANOTHER organization. Expected: 0 rows (otherwise permissions fail closed).
SELECT om.organization_id, om.user_id, om.department_id
  FROM public.organization_members om
  JOIN public.departments d ON d.id = om.department_id
 WHERE d.organization_id <> om.organization_id;

-- I6. Profiles that claim an organization without any active membership. Expected: review (these users lose access).
SELECT p.id, p.organization_id
  FROM public.profiles p
 WHERE p.organization_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.organization_members om
                    WHERE om.user_id = p.id AND om.organization_id = p.organization_id AND om.is_active);

-- I7. Admin authority sources per organization-admin user (transitional-source inventory)
SELECT om.organization_id, om.user_id,
       om.is_owner                                  AS via_owner_flag,
       EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
                WHERE ur.user_id = om.user_id AND ur.organization_id = om.organization_id
                  AND r.role_type = 'SYSTEM' AND r.is_active
                  AND UPPER(r.code) IN ('TENANT_ADMIN','ORGANIZATION_ADMIN','ORG_ADMIN','ADMIN')) AS via_user_roles,
       EXISTS (SELECT 1 FROM public.roles r WHERE r.id = om.role_id AND r.role_type = 'SYSTEM' AND r.is_active
                  AND UPPER(r.code) IN ('TENANT_ADMIN','ORGANIZATION_ADMIN','ORG_ADMIN','ADMIN')) AS via_member_role_id,
       EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = om.user_id
                  AND p.organization_id = om.organization_id AND p.is_organization_admin) AS via_profile_flag
  FROM public.organization_members om
 WHERE om.is_active;
