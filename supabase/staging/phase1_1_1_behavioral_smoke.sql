-- ==============================================================================
-- PAYPULSE PHASE 1.1.1 — STAGING BEHAVIOURAL SMOKE TEST (SELF-CLEANING)
-- Run on STAGING ONLY, as `postgres`, AFTER migration 20261121000014 and after the structural
-- verification file. Everything happens inside one transaction that ends with ROLLBACK, so no
-- fixture data survives. Any failed assertion RAISES EXCEPTION and aborts the script
-- ("ASSERT FAILED: ..."). Reaching the final NOTICE 'ALL BEHAVIOURAL CHECKS PASSED' = success.
-- Fixture ids use the prefix ffffffff- to avoid collisions with real data.
-- ==============================================================================
BEGIN;

-- ---------- fixtures (owner context) ------------------------------------------
INSERT INTO auth.users (id, email) VALUES
  ('ffffffff-0000-0000-0000-0000000000a1', 'smoke-ordinary@example.invalid'),
  ('ffffffff-0000-0000-0000-0000000000a2', 'smoke-orgadmin@example.invalid'),
  ('ffffffff-0000-0000-0000-0000000000a3', 'smoke-both@example.invalid'),
  ('ffffffff-0000-0000-0000-0000000000a4', 'smoke-multi@example.invalid'),
  ('ffffffff-0000-0000-0000-0000000000a5', 'smoke-profileonly@example.invalid'),
  ('ffffffff-0000-0000-0000-0000000000a6', 'smoke-newcomer@example.invalid');

INSERT INTO public.organizations (id, code, slug, name) VALUES
  ('ffffffff-0000-0000-0001-000000000001', 'SMOKE_A', 'smoke-a', 'Smoke A'),
  ('ffffffff-0000-0000-0001-000000000002', 'SMOKE_B', 'smoke-b', 'Smoke B');

INSERT INTO public.departments (id, organization_id, code, name) VALUES
  ('ffffffff-0000-0000-0002-000000000001', 'ffffffff-0000-0000-0001-000000000001', 'A1', 'A dept'),
  ('ffffffff-0000-0000-0002-000000000002', 'ffffffff-0000-0000-0001-000000000002', 'B1', 'B dept');

INSERT INTO public.profiles (id, organization_id, department_id, full_name, email, is_organization_admin) VALUES
  ('ffffffff-0000-0000-0000-0000000000a1', 'ffffffff-0000-0000-0001-000000000001', 'ffffffff-0000-0000-0002-000000000001', 'Ordinary', 'smoke-ordinary@example.invalid', false),
  ('ffffffff-0000-0000-0000-0000000000a2', 'ffffffff-0000-0000-0001-000000000001', 'ffffffff-0000-0000-0002-000000000001', 'OrgAdmin',  'smoke-orgadmin@example.invalid', true),
  ('ffffffff-0000-0000-0000-0000000000a3', 'ffffffff-0000-0000-0001-000000000001', 'ffffffff-0000-0000-0002-000000000001', 'Both',      'smoke-both@example.invalid', false),
  ('ffffffff-0000-0000-0000-0000000000a4', 'ffffffff-0000-0000-0001-000000000001', 'ffffffff-0000-0000-0002-000000000001', 'Multi',     'smoke-multi@example.invalid', false),
  ('ffffffff-0000-0000-0000-0000000000a5', 'ffffffff-0000-0000-0001-000000000001', 'ffffffff-0000-0000-0002-000000000001', 'ProfileOnly','smoke-profileonly@example.invalid', false);

INSERT INTO public.organization_members (organization_id, user_id, department_id, is_owner) VALUES
  ('ffffffff-0000-0000-0001-000000000001', 'ffffffff-0000-0000-0000-0000000000a1', 'ffffffff-0000-0000-0002-000000000001', false),
  ('ffffffff-0000-0000-0001-000000000001', 'ffffffff-0000-0000-0000-0000000000a2', 'ffffffff-0000-0000-0002-000000000001', true),
  ('ffffffff-0000-0000-0001-000000000001', 'ffffffff-0000-0000-0000-0000000000a3', 'ffffffff-0000-0000-0002-000000000001', false),
  ('ffffffff-0000-0000-0001-000000000001', 'ffffffff-0000-0000-0000-0000000000a4', 'ffffffff-0000-0000-0002-000000000001', false),
  ('ffffffff-0000-0000-0001-000000000002', 'ffffffff-0000-0000-0000-0000000000a4', 'ffffffff-0000-0000-0002-000000000002', false);
-- a5 (ProfileOnly) deliberately has NO membership.

INSERT INTO public.modules (id, code, name, category) VALUES
  ('ffffffff-0000-0000-0003-000000000001', 'SMOKE_M1', 'M1', 'Smoke'),
  ('ffffffff-0000-0000-0003-000000000002', 'SMOKE_M2', 'M2', 'Smoke');
INSERT INTO public.module_actions (id, module_id, action, full_key) VALUES
  ('ffffffff-0000-0000-0004-000000000011', 'ffffffff-0000-0000-0003-000000000001', 'View', 'SmokeM1.View'),
  ('ffffffff-0000-0000-0004-000000000012', 'ffffffff-0000-0000-0003-000000000001', 'Edit', 'SmokeM1.Edit'),
  ('ffffffff-0000-0000-0004-000000000021', 'ffffffff-0000-0000-0003-000000000002', 'View', 'SmokeM2.View'),
  ('ffffffff-0000-0000-0004-000000000022', 'ffffffff-0000-0000-0003-000000000002', 'Add',  'SmokeM2.Add');
INSERT INTO public.organization_modules (organization_id, module_id) VALUES
  ('ffffffff-0000-0000-0001-000000000001', 'ffffffff-0000-0000-0003-000000000001'),
  ('ffffffff-0000-0000-0001-000000000001', 'ffffffff-0000-0000-0003-000000000002'),
  ('ffffffff-0000-0000-0001-000000000002', 'ffffffff-0000-0000-0003-000000000001');
INSERT INTO public.department_modules (organization_id, department_id, module_id) VALUES
  ('ffffffff-0000-0000-0001-000000000001', 'ffffffff-0000-0000-0002-000000000001', 'ffffffff-0000-0000-0003-000000000001'),
  ('ffffffff-0000-0000-0001-000000000001', 'ffffffff-0000-0000-0002-000000000001', 'ffffffff-0000-0000-0003-000000000002'),
  ('ffffffff-0000-0000-0001-000000000002', 'ffffffff-0000-0000-0002-000000000002', 'ffffffff-0000-0000-0003-000000000001');

INSERT INTO public.roles (id, organization_id, code, name, role_type) VALUES
  ('ffffffff-0000-0000-0005-000000000001', 'ffffffff-0000-0000-0001-000000000001', 'SMOKE_EDITOR', 'Smoke Editor', 'CUSTOM');
INSERT INTO public.role_permissions (organization_id, role_id, module_action_id) VALUES
  ('ffffffff-0000-0000-0001-000000000001', 'ffffffff-0000-0000-0005-000000000001', 'ffffffff-0000-0000-0004-000000000012');
-- a3: role grants SmokeM1.Edit; direct grants SmokeM2.Add  (additive => both families)
INSERT INTO public.user_roles (organization_id, user_id, role_id) VALUES
  ('ffffffff-0000-0000-0001-000000000001', 'ffffffff-0000-0000-0000-0000000000a3', 'ffffffff-0000-0000-0005-000000000001');
INSERT INTO public.user_permissions (organization_id, user_id, module_action_id) VALUES
  ('ffffffff-0000-0000-0001-000000000001', 'ffffffff-0000-0000-0000-0000000000a3', 'ffffffff-0000-0000-0004-000000000022'),
  -- a4 direct perms: M2.Add (eligible in A only) and M1.Edit (eligible in A and B)
  ('ffffffff-0000-0000-0001-000000000001', 'ffffffff-0000-0000-0000-0000000000a4', 'ffffffff-0000-0000-0004-000000000022'),
  ('ffffffff-0000-0000-0001-000000000002', 'ffffffff-0000-0000-0000-0000000000a4', 'ffffffff-0000-0000-0004-000000000012'),
  ('ffffffff-0000-0000-0001-000000000002', 'ffffffff-0000-0000-0000-0000000000a4', 'ffffffff-0000-0000-0004-000000000022');

-- ---------- assertions ------------------------------------------------------------
-- 1. additive role + direct
DO $$
DECLARE v TEXT[];
BEGIN
  v := public.get_user_effective_permissions('ffffffff-0000-0000-0001-000000000001', 'ffffffff-0000-0000-0000-0000000000a3');
  IF NOT (v @> ARRAY['SmokeM1.Edit','SmokeM1.View','SmokeM2.Add','SmokeM2.View'] AND cardinality(v) = 4) THEN
    RAISE EXCEPTION 'ASSERT FAILED: additive role+direct permissions, got %', v;
  END IF;
END $$;

-- 2. multi-organization user: department comes from the membership of the REQUESTED org
DO $$
DECLARE va TEXT[]; vb TEXT[];
BEGIN
  va := public.get_user_effective_permissions('ffffffff-0000-0000-0001-000000000001', 'ffffffff-0000-0000-0000-0000000000a4');
  vb := public.get_user_effective_permissions('ffffffff-0000-0000-0001-000000000002', 'ffffffff-0000-0000-0000-0000000000a4');
  IF NOT (va @> ARRAY['SmokeM2.Add','SmokeM2.View'] AND cardinality(va) = 2) THEN
    RAISE EXCEPTION 'ASSERT FAILED: org A permissions for multi-org user, got %', va;
  END IF;
  IF NOT (vb @> ARRAY['SmokeM1.Edit','SmokeM1.View'] AND cardinality(vb) = 2) THEN
    RAISE EXCEPTION 'ASSERT FAILED: org B permissions for multi-org user (M2 must be ineligible), got %', vb;
  END IF;
END $$;

-- 3. profile organization is not membership
DO $$
DECLARE v TEXT[];
BEGIN
  v := public.get_user_effective_permissions('ffffffff-0000-0000-0001-000000000001', 'ffffffff-0000-0000-0000-0000000000a5');
  IF cardinality(v) <> 0 THEN RAISE EXCEPTION 'ASSERT FAILED: profile-only user must have no permissions, got %', v; END IF;
END $$;

-- 4. authenticated cannot call the permission RPC (Model B)
DO $$
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', 'ffffffff-0000-0000-0000-0000000000a1', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  BEGIN
    PERFORM public.get_user_effective_permissions('ffffffff-0000-0000-0001-000000000001', 'ffffffff-0000-0000-0000-0000000000a2');
    RESET ROLE;
    RAISE EXCEPTION 'ASSERT FAILED: authenticated executed get_user_effective_permissions';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
  END;
END $$;

-- 5. self-promotion / org reassignment / cross-tenant visibility as an ordinary authenticated user
DO $$
DECLARE n INTEGER; v_ok BOOLEAN;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', 'ffffffff-0000-0000-0000-0000000000a1', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"ffffffff-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

  -- self-promotion must fail (RLS WITH CHECK and/or trigger)
  v_ok := false;
  BEGIN
    UPDATE public.profiles SET is_super_admin = true WHERE id = 'ffffffff-0000-0000-0000-0000000000a1';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n = 0 THEN v_ok := true; END IF;
  EXCEPTION WHEN OTHERS THEN v_ok := true;
  END;
  IF NOT v_ok THEN RESET ROLE; RAISE EXCEPTION 'ASSERT FAILED: ordinary user self-promoted to super admin'; END IF;

  -- org reassignment must fail
  v_ok := false;
  BEGIN
    UPDATE public.profiles SET organization_id = 'ffffffff-0000-0000-0001-000000000002' WHERE id = 'ffffffff-0000-0000-0000-0000000000a1';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n = 0 THEN v_ok := true; END IF;
  EXCEPTION WHEN OTHERS THEN v_ok := true;
  END;
  IF NOT v_ok THEN RESET ROLE; RAISE EXCEPTION 'ASSERT FAILED: ordinary user reassigned own organization'; END IF;

  -- cannot see organization B members
  SELECT COUNT(*) INTO n FROM public.organization_members WHERE organization_id = 'ffffffff-0000-0000-0001-000000000002';
  RESET ROLE;
  IF n <> 0 THEN RAISE EXCEPTION 'ASSERT FAILED: cross-tenant membership rows visible (%)', n; END IF;
END $$;

-- 6. profile-only user is not an organization member / admin
DO $$
DECLARE m BOOLEAN; a BOOLEAN;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', 'ffffffff-0000-0000-0000-0000000000a5', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"ffffffff-0000-0000-0000-0000000000a5","role":"authenticated"}', true);
  m := public.is_organization_member('ffffffff-0000-0000-0001-000000000001');
  a := public.is_organization_admin('ffffffff-0000-0000-0001-000000000001');
  RESET ROLE;
  IF m OR a THEN RAISE EXCEPTION 'ASSERT FAILED: profile-only user treated as member (%) / admin (%)', m, a; END IF;
END $$;

-- 7. strict self-registration: assigned profile insert is rejected; unassigned is allowed
DO $$
DECLARE v_ok BOOLEAN;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', 'ffffffff-0000-0000-0000-0000000000a6', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"ffffffff-0000-0000-0000-0000000000a6","role":"authenticated"}', true);
  v_ok := false;
  BEGIN
    INSERT INTO public.profiles (id, organization_id, full_name, email)
    VALUES ('ffffffff-0000-0000-0000-0000000000a6', 'ffffffff-0000-0000-0001-000000000001', 'x', 'smoke-newcomer@example.invalid');
  EXCEPTION WHEN OTHERS THEN v_ok := true;
  END;
  IF NOT v_ok THEN RESET ROLE; RAISE EXCEPTION 'ASSERT FAILED: self-registration with organization_id succeeded'; END IF;
  INSERT INTO public.profiles (id, full_name, email)
  VALUES ('ffffffff-0000-0000-0000-0000000000a6', 'x', 'smoke-newcomer@example.invalid');
  RESET ROLE;
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL BEHAVIOURAL CHECKS PASSED'; END $$;
ROLLBACK;
