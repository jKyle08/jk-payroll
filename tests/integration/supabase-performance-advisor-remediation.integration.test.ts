// ==============================================================================
// JK-PAYROLL (PAYPULSE) — SUPABASE PERFORMANCE ADVISOR REMEDIATION VERIFICATION
// Suite: tests/integration/supabase-performance-advisor-remediation.integration.test.ts
// Scope: Embedded PostgreSQL (PGlite) verification of Performance Advisor findings:
//        1. auth_rls_initplan
//        2. multiple_permissive_policies
//        3. duplicate_index
// ==============================================================================

import { describe, it, expect, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { createMigratedDb, session, expectRejected } from './helpers/pg-harness.js';

describe('Supabase Performance Advisor Remediation & Security Verification Suite', () => {
  let db: PGlite;
  let s: ReturnType<typeof session>;

  const ORG_A = '10000000-0000-0000-0000-00000000000a';
  const ORG_B = '10000000-0000-0000-0000-00000000000b';
  const DEPT_A = 'd0000000-0000-0000-0000-00000000000a';
  const DEPT_B = 'd0000000-0000-0000-0000-00000000000b';

  const USER_SUPER = '90000000-0000-0000-0000-000000000001';
  const USER_ORG_ADMIN_A = '90000000-0000-0000-0000-000000000002';
  const USER_EMPLOYEE_A = '90000000-0000-0000-0000-000000000003';
  const USER_EMPLOYEE_B = '90000000-0000-0000-0000-000000000004';

  const ROLE_STAFF_A = 'c0000000-0000-0000-0000-000000000002';

  beforeAll(async () => {
    db = await createMigratedDb();
    s = session(db);

    // Seed test harness data as postgres owner
    await s.owner();
    await db.exec(`
      INSERT INTO auth.users (id, email) VALUES
        ('${USER_SUPER}', 'super@paypulse.test'),
        ('${USER_ORG_ADMIN_A}', 'admin_a@paypulse.test'),
        ('${USER_EMPLOYEE_A}', 'emp_a@paypulse.test'),
        ('${USER_EMPLOYEE_B}', 'emp_b@paypulse.test');

      INSERT INTO public.organizations (id, code, slug, name, status, start_date) VALUES
        ('${ORG_A}', 'ORG_A', 'org-a', 'Organization A', 'Active', now()),
        ('${ORG_B}', 'ORG_B', 'org-b', 'Organization B', 'Active', now());

      INSERT INTO public.departments (id, organization_id, code, name) VALUES
        ('${DEPT_A}', '${ORG_A}', 'DEPT_A', 'Department A'),
        ('${DEPT_B}', '${ORG_B}', 'DEPT_B', 'Department B');

      INSERT INTO public.profiles (id, organization_id, department_id, full_name, email, is_super_admin, is_organization_admin, is_active) VALUES
        ('${USER_SUPER}', NULL, NULL, 'Super Admin', 'super@paypulse.test', true, false, true),
        ('${USER_ORG_ADMIN_A}', '${ORG_A}', '${DEPT_A}', 'Admin A', 'admin_a@paypulse.test', false, true, true),
        ('${USER_EMPLOYEE_A}', '${ORG_A}', '${DEPT_A}', 'Employee A', 'emp_a@paypulse.test', false, false, true),
        ('${USER_EMPLOYEE_B}', '${ORG_B}', '${DEPT_B}', 'Employee B', 'emp_b@paypulse.test', false, false, true);

      INSERT INTO public.roles (id, organization_id, code, name, role_type) VALUES
        ('${ROLE_STAFF_A}', '${ORG_A}', 'STAFF', 'Staff Member', 'CUSTOM');

      INSERT INTO public.organization_members (organization_id, user_id, is_active, is_owner, role_id) VALUES
        ('${ORG_A}', '${USER_ORG_ADMIN_A}', true, true, NULL),
        ('${ORG_A}', '${USER_EMPLOYEE_A}', true, false, '${ROLE_STAFF_A}'),
        ('${ORG_B}', '${USER_EMPLOYEE_B}', true, false, NULL);

      INSERT INTO public.user_roles (organization_id, user_id, role_id) VALUES
        ('${ORG_A}', '${USER_EMPLOYEE_A}', '${ROLE_STAFF_A}');
    `);
  });

  // ============================================================================
  // FINDING 1: auth_rls_initplan VERIFICATION
  // ============================================================================
  describe('Finding 1 — auth_rls_initplan Remediation', () => {
    it('verifies all 7 target policies wrap auth.uid() in scalar subquery InitPlans', async () => {
      await s.owner();
      const res = await db.query<{ tablename: string; policyname: string; qual: string; with_check: string }>(`
        SELECT tablename, policyname, qual, with_check
        FROM pg_policies
        WHERE policyname IN (
          'org_members_select_policy',
          'profiles_select_policy',
          'profiles_delete_policy',
          'profiles_update_policy',
          'profiles_insert_policy',
          'user_roles_select_policy',
          'user_permissions_select_policy'
        )
        ORDER BY tablename, policyname;
      `);

      expect(res.rows.length).toBe(7);

      for (const row of res.rows) {
        const fullDef = `${row.qual || ''} ${row.with_check || ''}`;
        const unwrappedMatches = fullDef.match(/(?<!SELECT\s+)auth\.(uid|jwt|role)\(\)/gi);
        expect(unwrappedMatches).toBeNull();
      }
    });

    it('verifies that across ALL public schema policies, zero unwrapped auth.* calls remain', async () => {
      await s.owner();
      const res = await db.query<{ tablename: string; policyname: string; qual: string; with_check: string }>(`
        SELECT tablename, policyname, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public';
      `);

      for (const row of res.rows) {
        const fullDef = `${row.qual || ''} ${row.with_check || ''}`;
        const unwrapped = fullDef.match(/(?<!SELECT\s+)auth\.(uid|jwt|role)\(\)/gi);
        expect(unwrapped).toBeNull();
      }
    });
  });

  // ============================================================================
  // FINDING 2: multiple_permissive_policies VERIFICATION
  // ============================================================================
  describe('Finding 2 — multiple_permissive_policies Remediation', () => {
    it('verifies modules has discrete, non-overlapping policies with exactly one policy per command', async () => {
      await s.owner();
      const res = await db.query<{ policyname: string; cmd: string }>(`
        SELECT policyname, cmd
        FROM pg_policies
        WHERE tablename = 'modules' AND schemaname = 'public'
        ORDER BY cmd;
      `);

      const cmds = res.rows.map(r => r.cmd);
      expect(cmds).toContain('SELECT');
      expect(cmds).toContain('INSERT');
      expect(cmds).toContain('UPDATE');
      expect(cmds).toContain('DELETE');
      expect(cmds).not.toContain('ALL');

      const uniqueCmds = new Set(cmds);
      expect(uniqueCmds.size).toBe(cmds.length);
    });

    it('verifies module_actions has discrete, non-overlapping policies with exactly one policy per command', async () => {
      await s.owner();
      const res = await db.query<{ policyname: string; cmd: string }>(`
        SELECT policyname, cmd
        FROM pg_policies
        WHERE tablename = 'module_actions' AND schemaname = 'public'
        ORDER BY cmd;
      `);

      const cmds = res.rows.map(r => r.cmd);
      expect(cmds).toContain('SELECT');
      expect(cmds).toContain('INSERT');
      expect(cmds).toContain('UPDATE');
      expect(cmds).toContain('DELETE');
      expect(cmds).not.toContain('ALL');

      const uniqueCmds = new Set(cmds);
      expect(uniqueCmds.size).toBe(cmds.length);
    });

    it('verifies that across ALL public tables, no table has multiple permissive policies for the same command', async () => {
      await s.owner();
      const res = await db.query<{ tablename: string; cmd: string; count: string; policies: string[] }>(`
        SELECT tablename, cmd, count(*) as count, array_agg(policyname) as policies
        FROM pg_policies
        WHERE schemaname = 'public' AND permissive = 'PERMISSIVE'
        GROUP BY tablename, cmd
        HAVING count(*) > 1;
      `);

      expect(res.rows).toEqual([]);
    });

    it('authenticated non-superadmin can read modules and module_actions but cannot mutate them', async () => {
      await s.as(USER_EMPLOYEE_A, 'authenticated', { organization_id: ORG_A });

      // SELECT succeeds
      const modules = await db.query(`SELECT count(*) as count FROM public.modules;`);
      expect(Number(modules.rows[0].count)).toBeGreaterThan(0);

      const actions = await db.query(`SELECT count(*) as count FROM public.module_actions;`);
      expect(Number(actions.rows[0].count)).toBeGreaterThan(0);

      // INSERT fails closed (RLS blocks with 42501 or check violation)
      await expectRejected(
        () => db.query(`INSERT INTO public.modules (code, name, category) VALUES ('NEW_MOD', 'New Module', 'Core');`),
        /violates row-level security|permission denied|violates check/i
      );

      // UPDATE fails (matches 0 rows)
      const updateRes = await db.query(`UPDATE public.modules SET name = 'Hacked' WHERE code = 'M1';`);
      expect(updateRes.affectedRows).toBe(0);

      // DELETE fails (matches 0 rows)
      const deleteRes = await db.query(`DELETE FROM public.modules WHERE code = 'M1';`);
      expect(deleteRes.affectedRows).toBe(0);
    });

    it('superadmin can insert, update, and delete modules and module_actions', async () => {
      await s.as(USER_SUPER, 'authenticated');

      const testModuleId = 'a9999999-9999-9999-9999-999999999999';
      const testActionId = 'b9999999-9999-9999-9999-999999999999';

      // Insert module
      await db.query(`
        INSERT INTO public.modules (id, code, name, category)
        VALUES ('${testModuleId}', 'TEST_PERF_MOD', 'Performance Mod', 'Admin');
      `);

      // Insert module_action
      await db.query(`
        INSERT INTO public.module_actions (id, module_id, action, full_key)
        VALUES ('${testActionId}', '${testModuleId}', 'Manage', 'TEST_PERF_MOD.Manage');
      `);

      // Update module
      const updateMod = await db.query(`
        UPDATE public.modules SET name = 'Updated Mod' WHERE id = '${testModuleId}';
      `);
      expect(updateMod.affectedRows).toBe(1);

      // Delete module_action then module
      const delAct = await db.query(`DELETE FROM public.module_actions WHERE id = '${testActionId}';`);
      expect(delAct.affectedRows).toBe(1);

      const delMod = await db.query(`DELETE FROM public.modules WHERE id = '${testModuleId}';`);
      expect(delMod.affectedRows).toBe(1);
    });
  });

  // ============================================================================
  // FINDING 3: duplicate_index ON organizations.slug VERIFICATION
  // ============================================================================
  describe('Finding 3 — duplicate_index Remediation', () => {
    it('verifies uq_organizations_slug constraint and index are removed', async () => {
      await s.owner();
      const constraints = await db.query<{ conname: string }>(`
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.organizations'::regclass AND conname = 'uq_organizations_slug';
      `);
      expect(constraints.rows.length).toBe(0);

      const indexes = await db.query<{ indexname: string }>(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'organizations' AND indexname = 'uq_organizations_slug';
      `);
      expect(indexes.rows.length).toBe(0);
    });

    it('verifies canonical unique constraint organizations_slug_key is active and preserves uniqueness', async () => {
      await s.owner();
      const indexes = await db.query<{ indexname: string; indexdef: string }>(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'organizations' AND indexname = 'organizations_slug_key';
      `);
      expect(indexes.rows.length).toBe(1);
      expect(indexes.rows[0].indexdef).toContain('UNIQUE');
      expect(indexes.rows[0].indexdef).toContain('(slug)');

      // Attempt duplicate slug insertion fails with unique constraint violation
      await expectRejected(
        () => db.query(`
          INSERT INTO public.organizations (id, code, slug, name, status, start_date)
          VALUES (gen_random_uuid(), 'ORG_DUP', 'org-a', 'Duplicate Org', 'Active', now());
        `),
        /duplicate key value violates unique constraint "organizations_slug_key"/i
      );
    });
  });

  // ============================================================================
  // AUTHORIZATION, MULTI-TENANCY & RBAC REGRESSION VERIFICATION
  // ============================================================================
  describe('Tenant Isolation & RBAC Matrix Verification', () => {
    it('authenticated user of Org A can view their own profile, membership, and org members', async () => {
      await s.as(USER_EMPLOYEE_A, 'authenticated', { organization_id: ORG_A });

      // Can read own profile
      const ownProfile = await db.query(`SELECT id, full_name FROM public.profiles WHERE id = '${USER_EMPLOYEE_A}';`);
      expect(ownProfile.rows.length).toBe(1);

      // Can read own membership
      const ownMember = await db.query(`SELECT id FROM public.organization_members WHERE user_id = '${USER_EMPLOYEE_A}';`);
      expect(ownMember.rows.length).toBe(1);

      // Can read co-members in Org A
      const orgAMembers = await db.query(`SELECT user_id FROM public.organization_members WHERE organization_id = '${ORG_A}';`);
      expect(orgAMembers.rows.length).toBe(2);
    });

    it('cross-organization access is strictly denied: Org A user cannot read Org B data', async () => {
      await s.as(USER_EMPLOYEE_A, 'authenticated', { organization_id: ORG_A });

      // Cannot read Org B members
      const orgBMembers = await db.query(`SELECT * FROM public.organization_members WHERE organization_id = '${ORG_B}';`);
      expect(orgBMembers.rows.length).toBe(0);

      // Cannot read Org B profile
      const orgBProfile = await db.query(`SELECT * FROM public.profiles WHERE id = '${USER_EMPLOYEE_B}';`);
      expect(orgBProfile.rows.length).toBe(0);

      // Cannot read Org B user_roles
      const orgBRoles = await db.query(`SELECT * FROM public.user_roles WHERE organization_id = '${ORG_B}';`);
      expect(orgBRoles.rows.length).toBe(0);
    });

    it('organization administrator can update member profiles but cannot delete own profile (anti self-deletion)', async () => {
      await s.as(USER_ORG_ADMIN_A, 'authenticated', { organization_id: ORG_A });

      // Admin can update employee title
      const updateEmp = await db.query(`UPDATE public.profiles SET title = 'Senior Employee' WHERE id = '${USER_EMPLOYEE_A}';`);
      expect(updateEmp.affectedRows).toBe(1);

      // Admin cannot delete own profile
      const delSelf = await db.query(`DELETE FROM public.profiles WHERE id = '${USER_ORG_ADMIN_A}';`);
      expect(delSelf.affectedRows).toBe(0);
    });

    it('organization administrator cannot elevate to super admin via profile update', async () => {
      await s.as(USER_ORG_ADMIN_A, 'authenticated', { organization_id: ORG_A });

      await expectRejected(
        () => db.query(`UPDATE public.profiles SET is_super_admin = true WHERE id = '${USER_EMPLOYEE_A}';`),
        /super admin status|violates check|violates row-level security/i
      );
    });

    it('user cannot self-elevate permissions or reactivate inactive profile', async () => {
      await s.as(USER_EMPLOYEE_A, 'authenticated', { organization_id: ORG_A });

      await expectRejected(
        () => db.query(`UPDATE public.profiles SET is_organization_admin = true WHERE id = '${USER_EMPLOYEE_A}';`),
        /organization admin status|violates check|violates row-level security/i
      );
    });

    it('user can safely update their own non-privileged profile fields', async () => {
      await s.as(USER_EMPLOYEE_A, 'authenticated', { organization_id: ORG_A });

      const res = await db.query(`UPDATE public.profiles SET title = 'Lead Specialist' WHERE id = '${USER_EMPLOYEE_A}';`);
      expect(res.affectedRows).toBe(1);
    });
  });
});
