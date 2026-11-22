// ==============================================================================
// JK-PAYROLL (PAYPULSE) — FUNCTION SECURITY HARDENING INTEGRATION SUITE
// Suite: tests/integration/database-function-security-hardening.integration.test.ts
// Scope: Embedded PostgreSQL (PGlite) verification of Function Security Hardening:
//        1. Mutable search_path remediation
//        2. Anonymous execution lockdown
//        3. Authenticated execution least-privilege boundary
//        4. Trigger & internal helper non-callability
//        5. Operational integrity of RLS, Triggers, Audit, and Provisioning
// ==============================================================================

import { describe, it, expect, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { createMigratedDb, session, expectRejected } from './helpers/pg-harness.js';

describe('Database Function Security Hardening & Privilege Hardening Suite', () => {
  let db: PGlite;
  let s: ReturnType<typeof session>;

  const ORG_A = '10000000-0000-0000-0000-00000000000a';
  const ORG_B = '10000000-0000-0000-0000-00000000000b';
  const DEPT_A1 = 'd0000000-0000-0000-0000-000000000001';
  const DEPT_A2 = 'd0000000-0000-0000-0000-000000000002';

  const USER_SUPER = '90000000-0000-0000-0000-000000000001';
  const USER_ADMIN_A = '90000000-0000-0000-0000-000000000002';
  const USER_STAFF_A = '90000000-0000-0000-0000-000000000003';
  const USER_STAFF_B = '90000000-0000-0000-0000-000000000004';

  const ROLE_STAFF_A = 'c0000000-0000-0000-0000-000000000002';

  beforeAll(async () => {
    db = await createMigratedDb();
    s = session(db);

    await s.owner();
    await db.exec(`
      INSERT INTO auth.users (id, email) VALUES
        ('${USER_SUPER}', 'super@paypulse.test'),
        ('${USER_ADMIN_A}', 'admin_a@paypulse.test'),
        ('${USER_STAFF_A}', 'staff_a@paypulse.test'),
        ('${USER_STAFF_B}', 'staff_b@paypulse.test');

      INSERT INTO public.organizations (id, code, slug, name, status, start_date) VALUES
        ('${ORG_A}', 'ORG_A', 'org-a', 'Organization A', 'Active', now()),
        ('${ORG_B}', 'ORG_B', 'org-b', 'Organization B', 'Active', now());

      INSERT INTO public.departments (id, organization_id, code, name) VALUES
        ('${DEPT_A1}', '${ORG_A}', 'ROOT', 'Root Department');

      INSERT INTO public.profiles (id, organization_id, department_id, full_name, email, is_super_admin, is_organization_admin, is_active) VALUES
        ('${USER_SUPER}', NULL, NULL, 'Super Admin', 'super@paypulse.test', true, false, true),
        ('${USER_ADMIN_A}', '${ORG_A}', '${DEPT_A1}', 'Admin A', 'admin_a@paypulse.test', false, true, true),
        ('${USER_STAFF_A}', '${ORG_A}', '${DEPT_A1}', 'Staff A', 'staff_a@paypulse.test', false, false, true),
        ('${USER_STAFF_B}', '${ORG_B}', NULL, 'Staff B', 'staff_b@paypulse.test', false, false, true);

      INSERT INTO public.roles (id, organization_id, code, name, role_type) VALUES
        ('${ROLE_STAFF_A}', '${ORG_A}', 'STAFF', 'Staff Member', 'CUSTOM');

      INSERT INTO public.organization_members (organization_id, user_id, is_active, is_owner, role_id) VALUES
        ('${ORG_A}', '${USER_ADMIN_A}', true, true, NULL),
        ('${ORG_A}', '${USER_STAFF_A}', true, false, '${ROLE_STAFF_A}'),
        ('${ORG_B}', '${USER_STAFF_B}', true, false, NULL);

      INSERT INTO public.user_roles (organization_id, user_id, role_id) VALUES
        ('${ORG_A}', '${USER_STAFF_A}', '${ROLE_STAFF_A}');
    `);
  });

  // ============================================================================
  // 1. MUTABLE SEARCH PATH VERIFICATION
  // ============================================================================
  describe('1. Explicit Search Path Verification', () => {
    it('verifies safe_cast_uuid and fn_sync_department_hierarchy have explicit search_paths configured', async () => {
      await s.owner();
      const res = await db.query<{ proname: string; proconfig: string[] }>(`
        SELECT p.proname, p.proconfig
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN ('safe_cast_uuid', 'fn_sync_department_hierarchy');
      `);

      expect(res.rows.length).toBe(2);
      for (const row of res.rows) {
        expect(row.proconfig).toBeDefined();
        expect(row.proconfig.length).toBeGreaterThan(0);
        expect(row.proconfig.some(c => c.startsWith('search_path='))).toBe(true);
      }
    });

    it('verifies that zero public functions have a null search_path', async () => {
      await s.owner();
      const res = await db.query<{ proname: string }>(`
        SELECT p.proname
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proconfig IS NULL;
      `);

      expect(res.rows).toEqual([]);
    });
  });

  // ============================================================================
  // 2. ANONYMOUS EXECUTION LOCKDOWN
  // ============================================================================
  describe('2. Anonymous Role Least-Privilege Lockdown', () => {
    it('anonymous role cannot execute any security definer functions', async () => {
      await s.as(null, 'anon');

      // Helper function execution rejected
      await expectRejected(
        () => db.query(`SELECT public.is_super_admin();`),
        /permission denied for function is_super_admin/i
      );

      await expectRejected(
        () => db.query(`SELECT public.is_organization_member('${ORG_A}');`),
        /permission denied for function is_organization_member/i
      );

      await expectRejected(
        () => db.query(`SELECT public.current_user_organization_id();`),
        /permission denied for function current_user_organization_id/i
      );

      await expectRejected(
        () => db.query(`SELECT public.is_organization_admin('${ORG_A}');`),
        /permission denied for function is_organization_admin/i
      );

      await expectRejected(
        () => db.query(`SELECT * FROM public.get_ancestor_department_ids('${ORG_A}', '${DEPT_A1}');`),
        /permission denied for function get_ancestor_department_ids/i
      );
    });
  });

  // ============================================================================
  // 3. AUTHENTICATED INTERNAL & TRIGGER FUNCTION LOCKDOWN
  // ============================================================================
  describe('3. Internal & Trigger Function Lockdown for Authenticated Role', () => {
    it('authenticated user cannot call trigger functions directly', async () => {
      await s.as(USER_STAFF_A, 'authenticated', { organization_id: ORG_A });

      await expectRejected(
        () => db.query(`SELECT public.enforce_audit_log_immutability();`),
        /permission denied for function enforce_audit_log_immutability/i
      );

      await expectRejected(
        () => db.query(`SELECT public.fn_sync_department_hierarchy();`),
        /permission denied for function fn_sync_department_hierarchy/i
      );

      await expectRejected(
        () => db.query(`SELECT public.fn_sync_organization_active_status();`),
        /permission denied for function fn_sync_organization_active_status/i
      );

      await expectRejected(
        () => db.query(`SELECT public.record_audit_log();`),
        /permission denied for function record_audit_log/i
      );
    });

    it('authenticated user cannot execute internal department traversal helpers', async () => {
      await s.as(USER_STAFF_A, 'authenticated', { organization_id: ORG_A });

      await expectRejected(
        () => db.query(`SELECT * FROM public.get_ancestor_department_ids('${ORG_A}', '${DEPT_A1}');`),
        /permission denied for function get_ancestor_department_ids/i
      );

      await expectRejected(
        () => db.query(`SELECT * FROM public.get_sub_department_ids('${ORG_A}', '${DEPT_A1}');`),
        /permission denied for function get_sub_department_ids/i
      );
    });
  });

  // ============================================================================
  // 4. RLS HELPER AVAILABILITY & FUNCTIONALITY FOR AUTHENTICATED USERS
  // ============================================================================
  describe('4. RLS Helper Operational Integrity for Authenticated Users', () => {
    it('authenticated user can successfully execute RLS helper functions for own context', async () => {
      await s.as(USER_STAFF_A, 'authenticated', { organization_id: ORG_A });

      const superCheck = await db.query(`SELECT public.is_super_admin() as result;`);
      expect(superCheck.rows[0].result).toBe(false);

      const memberCheck = await db.query(`SELECT public.is_organization_member('${ORG_A}') as result;`);
      expect(memberCheck.rows[0].result).toBe(true);

      const crossMemberCheck = await db.query(`SELECT public.is_organization_member('${ORG_B}') as result;`);
      expect(crossMemberCheck.rows[0].result).toBe(false);

      const orgIdCheck = await db.query(`SELECT public.current_user_organization_id() as result;`);
      expect(orgIdCheck.rows[0].result).toBe(ORG_A);

      const adminCheck = await db.query(`SELECT public.is_organization_admin('${ORG_A}') as result;`);
      expect(adminCheck.rows[0].result).toBe(false);
    });

    it('SuperAdmin correctly resolves true on is_super_admin()', async () => {
      await s.as(USER_SUPER, 'authenticated');

      const superCheck = await db.query(`SELECT public.is_super_admin() as result;`);
      expect(superCheck.rows[0].result).toBe(true);
    });

    it('Organization Administrator correctly resolves true on is_organization_admin()', async () => {
      await s.as(USER_ADMIN_A, 'authenticated', { organization_id: ORG_A });

      const adminCheck = await db.query(`SELECT public.is_organization_admin('${ORG_A}') as result;`);
      expect(adminCheck.rows[0].result).toBe(true);
    });
  });

  // ============================================================================
  // 5. TRIGGER OPERATIONAL INTEGRITY
  // ============================================================================
  describe('5. Trigger Integrity Under Least-Privilege Execution', () => {
    it('department hierarchy trigger automatically computes tree_path and depth on insert', async () => {
      await s.as(USER_ADMIN_A, 'authenticated', { organization_id: ORG_A });

      await db.query(`
        INSERT INTO public.departments (id, organization_id, parent_department_id, code, name)
        VALUES ('${DEPT_A2}', '${ORG_A}', '${DEPT_A1}', 'CHILD', 'Child Department');
      `);

      const res = await db.query<{ depth: number; tree_path: string }>(`
        SELECT depth, tree_path FROM public.departments WHERE id = '${DEPT_A2}';
      `);

      expect(res.rows.length).toBe(1);
      expect(res.rows[0].depth).toBe(1);
      expect(res.rows[0].tree_path).toBe('root/child');
    });

    it('organization status synchronization trigger automatically updates is_active', async () => {
      await s.owner();

      const testOrgId = '10000000-0000-0000-0000-00000000000c';
      await db.query(`
        INSERT INTO public.organizations (id, code, slug, name, status, start_date)
        VALUES ('${testOrgId}', 'ORG_C', 'org-c', 'Organization C', 'Suspended', now());
      `);

      const res = await db.query<{ is_active: boolean }>(`
        SELECT is_active FROM public.organizations WHERE id = '${testOrgId}';
      `);
      expect(res.rows[0].is_active).toBe(false);

      await db.query(`UPDATE public.organizations SET status = 'Active' WHERE id = '${testOrgId}';`);
      const resActive = await db.query<{ is_active: boolean }>(`
        SELECT is_active FROM public.organizations WHERE id = '${testOrgId}';
      `);
      expect(resActive.rows[0].is_active).toBe(true);
    });

    it('audit log immutability trigger blocks DELETE and UPDATE on audit records', async () => {
      await s.owner();
      const auditId = 'e0000000-0000-0000-0000-000000000001';
      await db.query(`
        INSERT INTO public.audit_logs (id, organization_id, module_id, entity_type, entity_id, action)
        VALUES ('${auditId}', '${ORG_A}', 'CORE', 'test', 'test-1', 'CREATE');
      `);

      await expectRejected(
        () => db.query(`UPDATE public.audit_logs SET entity_id = 'hack' WHERE id = '${auditId}';`),
        /Audit logs are immutable/i
      );

      await expectRejected(
        () => db.query(`DELETE FROM public.audit_logs WHERE id = '${auditId}';`),
        /Audit logs are immutable/i
      );
    });
  });
});
