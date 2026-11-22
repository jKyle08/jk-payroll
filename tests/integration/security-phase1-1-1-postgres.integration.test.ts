// ==============================================================================
// PHASE 1.1.1 — REAL POSTGRESQL (EMBEDDED PGlite) SECURITY INTEGRATION TESTS
// These run SQL under real database roles against the actual migration files.
// They are EMBEDDED PostgreSQL verification — NOT verification of the Supabase staging database.
// ==============================================================================
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { createMigratedDb, session, expectRejected } from './helpers/pg-harness.js';

const ID = (n: string) => n;
// organizations
const ORG_A = '10000000-0000-0000-0000-00000000000a';
const ORG_B = '10000000-0000-0000-0000-00000000000b';
const ORG_EXPIRED = '10000000-0000-0000-0000-0000000000e0';
// departments
const DEPT_A = 'd0000000-0000-0000-0000-00000000000a';
const DEPT_B = 'd0000000-0000-0000-0000-00000000000b';
const DEPT_EXPIRED = 'd0000000-0000-0000-0000-0000000000e0';
// users
const U = {
  super: '90000000-0000-0000-0000-000000000001',
  ordinary: '90000000-0000-0000-0000-000000000002',
  profileAdmin: '90000000-0000-0000-0000-000000000003', // profile flag + active membership (transitional source D)
  owner: '90000000-0000-0000-0000-000000000004', // is_owner (source A)
  roleAdmin: '90000000-0000-0000-0000-000000000005', // user_roles SYSTEM TENANT_ADMIN (source B)
  customAdmin: '90000000-0000-0000-0000-000000000006', // custom role coded ADMIN (must NOT be admin)
  memberRoleAdmin: '90000000-0000-0000-0000-000000000007', // organization_members.role_id (source C)
  inactive: '90000000-0000-0000-0000-000000000008',
  profileOnly: '90000000-0000-0000-0000-000000000009', // profile.organization_id = A, no membership
  newcomer: '90000000-0000-0000-0000-00000000000a',
  multi: '90000000-0000-0000-0000-00000000000b', // member of A and B
  roleOnly: '90000000-0000-0000-0000-00000000000c',
  directOnly: '90000000-0000-0000-0000-00000000000d',
  both: '90000000-0000-0000-0000-00000000000e',
  dup: '90000000-0000-0000-0000-00000000000f',
  inelig: '90000000-0000-0000-0000-000000000010',
  crossDept: '90000000-0000-0000-0000-000000000011', // member of B but membership dept belongs to A
  noMemberDept: '90000000-0000-0000-0000-000000000012', // member of A, NULL membership dept, profile dept set
  expiredMember: '90000000-0000-0000-0000-000000000013',
  provisionTarget: '90000000-0000-0000-0000-000000000014', // member of A, no profile yet
};
// modules / actions
const M1 = 'a0000000-0000-0000-0000-000000000001';
const M2 = 'a0000000-0000-0000-0000-000000000002';
const M3 = 'a0000000-0000-0000-0000-000000000003'; // allocated to dept only (NOT licensed to org) => ineligible
const M4 = 'a0000000-0000-0000-0000-000000000004'; // licensed to org only (NOT allocated to dept) => ineligible
const A = {
  m1View: 'b0000000-0000-0000-0000-000000000011', m1Edit: 'b0000000-0000-0000-0000-000000000012',
  m2View: 'b0000000-0000-0000-0000-000000000021', m2Add: 'b0000000-0000-0000-0000-000000000022',
  m3View: 'b0000000-0000-0000-0000-000000000031',
  m4View: 'b0000000-0000-0000-0000-000000000041',
};
const ROLE_SYS_TENANT_ADMIN = 'f0000000-0000-0000-0000-000000000002'; // seeded by migration 5
const ROLE_CUSTOM_ADMIN = 'c0000000-0000-0000-0000-000000000001';
const ROLE_CUSTOM_EDITOR = 'c0000000-0000-0000-0000-000000000002';
const ROLE_CUSTOM_ADMIN_CODE_INACTIVE_SYSTEM = null;

async function seed(db: PGlite) {
  const s = session(db);
  await s.owner();
  const users = Object.values(U).map((id, i) => `('${id}','u${i}@example.invalid')`).join(',');
  await db.exec(`INSERT INTO auth.users (id,email) VALUES ${users};`);
  await db.exec(`
    INSERT INTO public.organizations (id,code,slug,name,status,start_date,end_date) VALUES
      ('${ORG_A}','ORG_A','org-a','Org A','Active',now(),NULL),
      ('${ORG_B}','ORG_B','org-b','Org B','Active',now(),NULL),
      ('${ORG_EXPIRED}','ORG_EXP','org-exp','Org Expired','Active',now()-interval '10 days',now()-interval '1 day');
    INSERT INTO public.departments (id,organization_id,code,name) VALUES
      ('${DEPT_A}','${ORG_A}','DA','Dept A'),('${DEPT_B}','${ORG_B}','DB','Dept B'),('${DEPT_EXPIRED}','${ORG_EXPIRED}','DE','Dept E');
    INSERT INTO public.modules (id,code,name,category) VALUES
      ('${M1}','M1','M1','T'),('${M2}','M2','M2','T'),('${M3}','M3','M3','T'),('${M4}','M4','M4','T');
    INSERT INTO public.module_actions (id,module_id,action,full_key) VALUES
      ('${A.m1View}','${M1}','View','M1.View'),('${A.m1Edit}','${M1}','Edit','M1.Edit'),
      ('${A.m2View}','${M2}','View','M2.View'),('${A.m2Add}','${M2}','Add','M2.Add'),
      ('${A.m3View}','${M3}','View','M3.View'),('${A.m4View}','${M4}','View','M4.View');
    INSERT INTO public.organization_modules (organization_id,module_id) VALUES
      ('${ORG_A}','${M1}'),('${ORG_A}','${M2}'),('${ORG_A}','${M4}'),('${ORG_B}','${M1}');
    INSERT INTO public.department_modules (organization_id,department_id,module_id) VALUES
      ('${ORG_A}','${DEPT_A}','${M1}'),('${ORG_A}','${DEPT_A}','${M2}'),('${ORG_A}','${DEPT_A}','${M3}'),
      ('${ORG_B}','${DEPT_B}','${M1}');
    INSERT INTO public.roles (id,organization_id,code,name,role_type) VALUES
      ('${ROLE_CUSTOM_ADMIN}','${ORG_A}','ADMIN','Organization Administrator','CUSTOM'),
      ('${ROLE_CUSTOM_EDITOR}','${ORG_A}','EDITOR','Editor','CUSTOM');
    INSERT INTO public.role_permissions (organization_id,role_id,module_action_id) VALUES
      ('${ORG_A}','${ROLE_CUSTOM_EDITOR}','${A.m1Edit}'),
      ('${ORG_A}','${ROLE_CUSTOM_EDITOR}','${A.m3View}'),
      ('${ORG_A}','${ROLE_CUSTOM_EDITOR}','${A.m4View}'),
      ('${ORG_A}','${ROLE_CUSTOM_EDITOR}','${A.m2View}');
  `);

  const prof = (id: string, org: string | null, dept: string | null, admin = false, sup = false, active = true) =>
    `('${id}',${org ? `'${org}'` : 'NULL'},${dept ? `'${dept}'` : 'NULL'},'n-${id.slice(-3)}','${id}@example.invalid',${admin},${sup},${active})`;
  await db.exec(`
    INSERT INTO public.profiles (id,organization_id,department_id,full_name,email,is_organization_admin,is_super_admin,is_active) VALUES
      ${[
        prof(U.super, null, null, false, true),
        prof(U.ordinary, ORG_A, DEPT_A),
        prof(U.profileAdmin, ORG_A, DEPT_A, true),
        prof(U.owner, ORG_A, DEPT_A),
        prof(U.roleAdmin, ORG_A, DEPT_A),
        prof(U.customAdmin, ORG_A, DEPT_A),
        prof(U.memberRoleAdmin, ORG_A, DEPT_A),
        prof(U.inactive, ORG_A, DEPT_A, false, false, false),
        prof(U.profileOnly, ORG_A, DEPT_A),
        prof(U.multi, ORG_A, DEPT_A),
        prof(U.roleOnly, ORG_A, DEPT_A),
        prof(U.directOnly, ORG_A, DEPT_A),
        prof(U.both, ORG_A, DEPT_A),
        prof(U.dup, ORG_A, DEPT_A),
        prof(U.inelig, ORG_A, DEPT_A),
        prof(U.crossDept, ORG_B, DEPT_B),
        prof(U.noMemberDept, ORG_A, DEPT_A),
        prof(U.expiredMember, ORG_EXPIRED, DEPT_EXPIRED),
      ].join(',')};
  `);

  const mem = (org: string, user: string, dept: string | null, owner = false, role: string | null = null, active = true) =>
    `('${org}','${user}',${dept ? `'${dept}'` : 'NULL'},${owner},${role ? `'${role}'` : 'NULL'},${active})`;
  await db.exec(`
    INSERT INTO public.organization_members (organization_id,user_id,department_id,is_owner,role_id,is_active) VALUES
      ${[
        mem(ORG_A, U.ordinary, DEPT_A),
        mem(ORG_A, U.profileAdmin, DEPT_A),
        mem(ORG_A, U.owner, DEPT_A, true),
        mem(ORG_A, U.roleAdmin, DEPT_A),
        mem(ORG_A, U.customAdmin, DEPT_A),
        mem(ORG_A, U.memberRoleAdmin, DEPT_A, false, ROLE_SYS_TENANT_ADMIN),
        mem(ORG_A, U.inactive, DEPT_A),
        mem(ORG_A, U.multi, DEPT_A),
        mem(ORG_B, U.multi, DEPT_B),
        mem(ORG_A, U.roleOnly, DEPT_A),
        mem(ORG_A, U.directOnly, DEPT_A),
        mem(ORG_A, U.both, DEPT_A),
        mem(ORG_A, U.dup, DEPT_A),
        mem(ORG_A, U.inelig, DEPT_A),
        mem(ORG_B, U.crossDept, DEPT_A), // department from ANOTHER org
        mem(ORG_A, U.noMemberDept, null), // profile has DEPT_A but membership has none
        mem(ORG_EXPIRED, U.expiredMember, DEPT_EXPIRED),
        mem(ORG_A, U.provisionTarget, null),
      ].join(',')};
    INSERT INTO public.user_roles (organization_id,user_id,role_id) VALUES
      ('${ORG_A}','${U.roleAdmin}','${ROLE_SYS_TENANT_ADMIN}'),
      ('${ORG_A}','${U.customAdmin}','${ROLE_CUSTOM_ADMIN}'),
      ('${ORG_A}','${U.roleOnly}','${ROLE_CUSTOM_EDITOR}'),
      ('${ORG_A}','${U.both}','${ROLE_CUSTOM_EDITOR}'),
      ('${ORG_A}','${U.dup}','${ROLE_CUSTOM_EDITOR}'),
      ('${ORG_A}','${U.inelig}','${ROLE_CUSTOM_EDITOR}');
    INSERT INTO public.user_permissions (organization_id,user_id,module_action_id) VALUES
      ('${ORG_A}','${U.directOnly}','${A.m2Add}'),
      ('${ORG_A}','${U.both}','${A.m2Add}'),
      ('${ORG_A}','${U.dup}','${A.m1Edit}'),
      ('${ORG_A}','${U.dup}','${A.m2Add}'),
      ('${ORG_A}','${U.inelig}','${A.m3View}'),
      ('${ORG_A}','${U.inelig}','${A.m4View}'),
      ('${ORG_A}','${U.multi}','${A.m2Add}'),
      ('${ORG_B}','${U.multi}','${A.m1Edit}'),
      ('${ORG_B}','${U.multi}','${A.m2Add}'),
      ('${ORG_B}','${U.crossDept}','${A.m1Edit}'),
      ('${ORG_A}','${U.noMemberDept}','${A.m2Add}'),
      ('${ORG_A}','${U.profileOnly}','${A.m2Add}');
  `);
}

describe('Phase 1.1.1 — PostgreSQL (embedded) security integration', () => {
  let db: PGlite;
  let s: ReturnType<typeof session>;

  const perms = async (org: string, user: string): Promise<string[]> => {
    await s.as(null, 'service_role');
    const r = await db.query(`SELECT public.get_user_effective_permissions('${org}','${user}') AS p;`);
    return [...((r.rows[0] as any).p as string[])].sort();
  };
  const scalar = async (sql: string) => ((await db.query(sql)).rows[0] as any);

  beforeAll(async () => {
    db = await createMigratedDb('20261121000019_authorized_member_invitations.sql');
    s = session(db);
    await seed(db);
  }, 120_000);

  // ===========================================================================
  // 1. TRIGGER (P111-01)
  // ===========================================================================
  describe('1. fn_enforce_profile_security_fields — SECURITY INVOKER; trusted-role logic', () => {
    beforeAll(async () => {
      // Isolate the TRIGGER from RLS so the trigger alone is what blocks the write.
      await s.owner();
      await db.exec(`ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;`);
    });
    afterAll(async () => {
      await s.owner();
      await db.exec(`ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`);
    });

    it('function is SECURITY INVOKER (not DEFINER) and the trigger is enabled', async () => {
      await s.owner();
      const r = await scalar(`SELECT prosecdef FROM pg_proc WHERE oid = 'public.fn_enforce_profile_security_fields()'::regprocedure`);
      expect(r.prosecdef).toBe(false);
      const t = await scalar(`SELECT tgenabled FROM pg_trigger WHERE tgname='trg_enforce_profile_security_fields'`);
      expect(t.tgenabled).toBe('O');
    });

    it.each([
      ['is_super_admin = true', `is_super_admin = true`, /super admin status/],
      ['is_organization_admin = true', `is_organization_admin = true`, /organization admin status/],
      ['organization_id reassignment', `organization_id = '${ORG_B}'`, /reassign their organization/],
      ['department_id reassignment', `department_id = '${DEPT_B}'`, /reassign their department/],
      ['is_active toggle', `is_active = false`, /active status/],
    ])('authenticated ORDINARY user cannot change own %s (trigger only, RLS off)', async (_n, setClause, re) => {
      await s.as(U.ordinary);
      await expectRejected(() => db.query(`UPDATE public.profiles SET ${setClause} WHERE id='${U.ordinary}'`), re);
    });

    it('ordinary user can still change a harmless field', async () => {
      await s.as(U.ordinary);
      await db.query(`UPDATE public.profiles SET title='Analyst' WHERE id='${U.ordinary}'`);
    });

    it('authenticated ORGANIZATION ADMIN cannot promote, reassign org, or alter super-admin of another profile', async () => {
      await s.as(U.profileAdmin);
      await expectRejected(() => db.query(`UPDATE public.profiles SET is_organization_admin = true WHERE id='${U.ordinary}'`), /organization admin status/);
      await expectRejected(() => db.query(`UPDATE public.profiles SET is_super_admin = true WHERE id='${U.ordinary}'`), /super admin status/);
      await expectRejected(() => db.query(`UPDATE public.profiles SET organization_id = '${ORG_B}' WHERE id='${U.ordinary}'`), /another organization/);
      await db.query(`UPDATE public.profiles SET title='Managed' WHERE id='${U.ordinary}'`); // legitimate admin edit
    });

    it('INACTIVE user cannot modify even a harmless field', async () => {
      await s.as(U.inactive);
      await expectRejected(() => db.query(`UPDATE public.profiles SET title='x' WHERE id='${U.inactive}'`), /inactive accounts/);
      await expectRejected(() => db.query(`UPDATE public.profiles SET is_active = true WHERE id='${U.inactive}'`), /inactive accounts/);
    });

    it('auth.uid() IS NULL under a client role is rejected (authenticated without sub, and anon)', async () => {
      await s.as(null, 'authenticated');
      await expectRejected(() => db.query(`UPDATE public.profiles SET title='x' WHERE id='${U.ordinary}'`), /authenticated caller/);
      await s.as(null, 'anon');
      await expectRejected(() => db.query(`UPDATE public.profiles SET title='x' WHERE id='${U.ordinary}'`), /authenticated caller|permission denied/);
    });

    it('ordinary caller CANNOT bypass by spoofing the role GUC (SET ROLE is not testable here: the embedded session user is a superuser; in Supabase PostgREST clients cannot issue SET ROLE)', async () => {
      await s.as(U.ordinary);
      await db.exec(`SET request.jwt.claim.role = 'service_role';`);
      await db.exec(`SET request.jwt.claims = '{"sub":"${U.ordinary}","role":"service_role"}';`);
      await expectRejected(() => db.query(`UPDATE public.profiles SET is_super_admin = true WHERE id='${U.ordinary}'`), /super admin status/);
    });

    it('SERVICE-ROLE execution is trusted (Express backend provisioning path)', async () => {
      await s.as(null, 'service_role');
      await db.query(`UPDATE public.profiles SET is_organization_admin = true WHERE id='${U.ordinary}'`);
      await db.query(`UPDATE public.profiles SET is_organization_admin = false WHERE id='${U.ordinary}'`);
    });

    it('MIGRATION / FUNCTION-OWNER execution is trusted, including a SECURITY DEFINER wrapper owned by the migration role', async () => {
      await s.owner();
      await db.query(`UPDATE public.profiles SET is_organization_admin = true WHERE id='${U.ordinary}'`);
      await db.query(`UPDATE public.profiles SET is_organization_admin = false WHERE id='${U.ordinary}'`);
      // Documented model: a DEFINER function owned by postgres acts with owner authority. None exists in the schema
      // that lets callers choose arbitrary profile fields; this wrapper exists only to PROVE the model.
      await db.exec(`
        CREATE OR REPLACE FUNCTION public.test_owner_wrapper(p_id UUID) RETURNS void
        LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
        AS $$ UPDATE public.profiles SET is_organization_admin = true WHERE id = p_id; $$;
        GRANT EXECUTE ON FUNCTION public.test_owner_wrapper(UUID) TO authenticated;
      `);
      await s.as(U.ordinary);
      await db.query(`SELECT public.test_owner_wrapper('${U.ordinary}')`);
      await s.owner();
      expect((await scalar(`SELECT is_organization_admin FROM public.profiles WHERE id='${U.ordinary}'`)).is_organization_admin).toBe(true);
      await db.query(`UPDATE public.profiles SET is_organization_admin = false WHERE id='${U.ordinary}'`);
      await db.exec(`DROP FUNCTION public.test_owner_wrapper(UUID);`);
    });
  });

  describe('1b. Baseline defect reproduction: migration 13 trigger never enforced anything', () => {
    let old: PGlite;
    beforeAll(async () => {
      old = await createMigratedDb('20261121000013_security_correction_phase1_1.sql');
      const so = session(old);
      await so.owner();
      await old.exec(`
        INSERT INTO auth.users (id,email) VALUES ('${U.ordinary}','o@example.invalid');
        INSERT INTO public.organizations (id,code,slug,name) VALUES ('${ORG_A}','OA','oa','OA');
        INSERT INTO public.profiles (id,organization_id,full_name,email) VALUES ('${U.ordinary}','${ORG_A}','o','o@example.invalid');
        ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
      `);
    }, 120_000);

    it('on migration 13 an ordinary authenticated user self-promotes through the trigger (DEFECT)', async () => {
      const so = session(old);
      await so.as(U.ordinary);
      await old.query(`UPDATE public.profiles SET is_super_admin = true WHERE id='${U.ordinary}'`); // must NOT throw on v13
      await so.owner();
      const r = (await old.query(`SELECT is_super_admin FROM public.profiles WHERE id='${U.ordinary}'`)).rows[0] as any;
      expect(r.is_super_admin).toBe(true);
    });
  });

  // ===========================================================================
  // 2. ADDITIVE PERMISSIONS (P111-02)
  // ===========================================================================
  describe('2. Effective permissions are RoleActions UNION DirectActions', () => {
    it('role-only user receives role permissions (+implied View), excluding ineligible modules', async () => {
      // role: M1.Edit, M3.View(dept-only, unlicensed), M4.View(licensed, not dept-allocated), M2.View
      expect(await perms(ORG_A, U.roleOnly)).toEqual(['M1.Edit', 'M1.View', 'M2.View']);
    });
    it('direct-only user receives direct permissions (+implied View)', async () => {
      expect(await perms(ORG_A, U.directOnly)).toEqual(['M2.Add', 'M2.View']);
    });
    it('user with BOTH sources receives the union (one direct row no longer erases role permissions)', async () => {
      expect(await perms(ORG_A, U.both)).toEqual(['M1.Edit', 'M1.View', 'M2.Add', 'M2.View']);
    });
    it('duplicate actions across sources yield no duplicate keys', async () => {
      const p = await perms(ORG_A, U.dup);
      expect(p).toEqual(['M1.Edit', 'M1.View', 'M2.Add', 'M2.View']);
      expect(new Set(p).size).toBe(p.length);
    });
    it('ineligible modules are excluded from BOTH sources (M3 not licensed to org; M4 not allocated to dept)', async () => {
      const p = await perms(ORG_A, U.inelig);
      expect(p).not.toContain('M3.View');
      expect(p).not.toContain('M4.View');
      expect(p).toEqual(['M1.Edit', 'M1.View', 'M2.View']); // only the eligible role-derived ones remain
    });
    it('inactive role grants nothing', async () => {
      await s.owner();
      await db.exec(`UPDATE public.roles SET is_active=false WHERE id='${ROLE_CUSTOM_EDITOR}'`);
      expect(await perms(ORG_A, U.roleOnly)).toEqual([]);
      expect(await perms(ORG_A, U.directOnly)).toEqual(['M2.Add', 'M2.View']);
      await s.owner();
      await db.exec(`UPDATE public.roles SET is_active=true WHERE id='${ROLE_CUSTOM_EDITOR}'`);
    });
  });

  // ===========================================================================
  // 3. DEPARTMENT VIA MEMBERSHIP (P111-03)
  // ===========================================================================
  describe('3. Department is resolved from the membership of the requested organization', () => {
    it('multi-organization user gets different effective permissions per organization', async () => {
      // A: dept DA (M1,M2 eligible): direct M2.Add -> M2.Add, M2.View
      expect(await perms(ORG_A, U.multi)).toEqual(['M2.Add', 'M2.View']);
      // B: dept DB (only M1 eligible): direct M1.Edit eligible, M2.Add ineligible
      expect(await perms(ORG_B, U.multi)).toEqual(['M1.Edit', 'M1.View']);
    });
    it('membership whose department belongs to ANOTHER organization fails closed', async () => {
      expect(await perms(ORG_B, U.crossDept)).toEqual([]);
    });
    it('profile department is NOT a fallback when the membership has no department', async () => {
      expect(await perms(ORG_A, U.noMemberDept)).toEqual([]);
    });
    it('profile.organization_id without a membership grants nothing', async () => {
      expect(await perms(ORG_A, U.profileOnly)).toEqual([]);
    });
    it('inactive membership, suspended and expired organizations grant nothing', async () => {
      await s.owner();
      await db.exec(`UPDATE public.organization_members SET is_active=false WHERE organization_id='${ORG_A}' AND user_id='${U.directOnly}'`);
      expect(await perms(ORG_A, U.directOnly)).toEqual([]);
      await s.owner();
      await db.exec(`UPDATE public.organization_members SET is_active=true WHERE organization_id='${ORG_A}' AND user_id='${U.directOnly}'`);
      await db.exec(`UPDATE public.organizations SET status='Suspended' WHERE id='${ORG_A}'`);
      expect(await perms(ORG_A, U.directOnly)).toEqual([]);
      await s.owner();
      await db.exec(`UPDATE public.organizations SET status='Active' WHERE id='${ORG_A}'`);
      expect(await perms(ORG_EXPIRED, U.expiredMember)).toEqual([]);
    });
    it('authenticated clients still cannot execute the RPC (Model B)', async () => {
      await s.as(U.ordinary);
      await expectRejected(() => db.query(`SELECT public.get_user_effective_permissions('${ORG_A}','${U.directOnly}')`), /permission denied/);
    });
  });

  // ===========================================================================
  // 4. STRICT SELF-REGISTRATION (P111-04)
  // ===========================================================================
  describe('4. Self-registration creates an unassigned profile only; profiles never manufacture membership', () => {
    const membersOf = async (user: string) =>
      Number((await scalar(`SELECT COUNT(*)::int AS n FROM public.organization_members WHERE user_id='${user}'`)).n);

    it('rejects self-insert with organization_id even if an active membership exists', async () => {
      await s.as(U.provisionTarget);
      await expectRejected(
        () => db.query(`INSERT INTO public.profiles (id,organization_id,full_name,email) VALUES ('${U.provisionTarget}','${ORG_A}','p','p@example.invalid')`),
        /row-level security/,
      );
    });
    it('rejects self-insert with department_id', async () => {
      await s.as(U.newcomer);
      await expectRejected(
        () => db.query(`INSERT INTO public.profiles (id,department_id,full_name,email) VALUES ('${U.newcomer}','${DEPT_A}','n','n@example.invalid')`),
        /row-level security/,
      );
    });
    it('rejects self-insert with any admin flag', async () => {
      await s.as(U.newcomer);
      await expectRejected(() => db.query(`INSERT INTO public.profiles (id,full_name,email,is_super_admin) VALUES ('${U.newcomer}','n','n@example.invalid',true)`), /row-level security/);
      await expectRejected(() => db.query(`INSERT INTO public.profiles (id,full_name,email,is_organization_admin) VALUES ('${U.newcomer}','n','n@example.invalid',true)`), /row-level security/);
    });
    it('allows an unassigned profile and creates NO membership', async () => {
      const before = await membersOf(U.newcomer);
      await s.as(U.newcomer);
      await db.query(`INSERT INTO public.profiles (id,full_name,email,is_active) VALUES ('${U.newcomer}','n','n@example.invalid',true)`);
      await s.owner();
      expect(await membersOf(U.newcomer)).toBe(before);
      const sel = await scalar(`SELECT organization_id, department_id, is_active FROM public.profiles WHERE id='${U.newcomer}'`);
      expect(sel).toEqual({ organization_id: null, department_id: null, is_active: false });
      await s.as(U.newcomer);
      expect((await scalar(`SELECT public.is_organization_member('${ORG_A}') AS m`)).m).toBe(false);
    });
    it('organization admin cannot insert a profile for a user WITHOUT an existing membership', async () => {
      await s.as(U.owner);
      await expectRejected(
        () => db.query(`INSERT INTO public.profiles (id,organization_id,full_name,email) VALUES ('${U.newcomer}','${ORG_A}','n','n2@example.invalid')`),
        /row-level security|duplicate key/,
      );
    });
    it('organization admin may insert a profile only for an already-added member, with no admin flags and a same-org department', async () => {
      await s.as(U.owner);
      await expectRejected(
        () => db.query(`INSERT INTO public.profiles (id,organization_id,full_name,email,is_organization_admin) VALUES ('${U.provisionTarget}','${ORG_A}','p','p@example.invalid',true)`),
        /row-level security/,
      );
      await expectRejected(
        () => db.query(`INSERT INTO public.profiles (id,organization_id,department_id,full_name,email) VALUES ('${U.provisionTarget}','${ORG_A}','${DEPT_B}','p','p@example.invalid')`),
        /row-level security/,
      );
      await db.query(`INSERT INTO public.profiles (id,organization_id,department_id,full_name,email,created_by,updated_by,created_at,updated_at) VALUES ('${U.provisionTarget}','${ORG_A}','${DEPT_A}','p','p@example.invalid','${U.owner}','${U.owner}','2000-01-01','2000-01-01')`);
      const audit = await scalar(`SELECT created_by,updated_by,created_at > '2000-01-01'::timestamptz AS fresh FROM public.profiles WHERE id='${U.provisionTarget}'`);
      expect(audit).toEqual({ created_by: null, updated_by: null, fresh: true });
    });
    it('organization admin cannot rewrite profile audit or provisioning actor fields', async () => {
      await s.as(U.owner);
      await expectRejected(
        () => db.query(`UPDATE public.profiles SET created_by='${U.owner}' WHERE id='${U.ordinary}'`),
        /audit fields are server controlled/,
      );
      await expectRejected(
        () => db.query(`UPDATE public.profiles SET updated_by='${U.owner}' WHERE id='${U.ordinary}'`),
        /audit fields are server controlled/,
      );
      await expectRejected(
        () => db.query(`UPDATE public.profiles SET created_at='2000-01-01' WHERE id='${U.ordinary}'`),
        /audit fields are server controlled/,
      );
    });
  });

  // ===========================================================================
  // 5. ADMIN AUTHORITY SOURCES (P111-05)
  // ===========================================================================
  describe('5. is_organization_admin(): per-source behaviour', () => {
    const isAdmin = async (user: string, org = ORG_A) => {
      await s.as(user);
      return (await scalar(`SELECT public.is_organization_admin('${org}') AS a`)).a as boolean;
    };
    it('A. owner flag grants admin (with active membership)', async () => expect(await isAdmin(U.owner)).toBe(true));
    it('B. user_roles + active SYSTEM admin role grants admin', async () => expect(await isAdmin(U.roleAdmin)).toBe(true));
    it('C. organization_members.role_id + SYSTEM admin role grants admin (TRANSITIONAL)', async () => expect(await isAdmin(U.memberRoleAdmin)).toBe(true));
    it('D. profiles.is_organization_admin + active membership grants admin (TRANSITIONAL)', async () => expect(await isAdmin(U.profileAdmin)).toBe(true));
    it('a CUSTOM role merely coded "ADMIN"/named "Organization Administrator" does NOT grant admin', async () => expect(await isAdmin(U.customAdmin)).toBe(false));
    it('profile flag WITHOUT membership does not grant admin', async () => {
      await s.owner();
      await db.exec(`UPDATE public.profiles SET is_organization_admin=true WHERE id='${U.profileOnly}'`);
      expect(await isAdmin(U.profileOnly)).toBe(false);
      await s.owner();
      await db.exec(`UPDATE public.profiles SET is_organization_admin=false WHERE id='${U.profileOnly}'`);
    });
    it('inactive SYSTEM role revokes source B and C', async () => {
      await s.owner();
      await db.exec(`UPDATE public.roles SET is_active=false WHERE id='${ROLE_SYS_TENANT_ADMIN}'`);
      expect(await isAdmin(U.roleAdmin)).toBe(false);
      expect(await isAdmin(U.memberRoleAdmin)).toBe(false);
      await s.owner();
      await db.exec(`UPDATE public.roles SET is_active=true WHERE id='${ROLE_SYS_TENANT_ADMIN}'`);
      expect(await isAdmin(U.roleAdmin)).toBe(true);
    });
    it('inactive membership revokes every source; admin of A is not admin of B', async () => {
      expect(await isAdmin(U.owner, ORG_B)).toBe(false);
      await s.owner();
      await db.exec(`UPDATE public.organization_members SET is_active=false WHERE organization_id='${ORG_A}' AND user_id='${U.owner}'`);
      expect(await isAdmin(U.owner)).toBe(false);
      await s.owner();
      await db.exec(`UPDATE public.organization_members SET is_active=true WHERE organization_id='${ORG_A}' AND user_id='${U.owner}'`);
    });
    it('suspended organization revokes admin', async () => {
      await s.owner();
      await db.exec(`UPDATE public.organizations SET status='Suspended' WHERE id='${ORG_A}'`);
      expect(await isAdmin(U.owner)).toBe(false);
      await s.owner();
      await db.exec(`UPDATE public.organizations SET status='Active' WHERE id='${ORG_A}'`);
    });
  });

  // ===========================================================================
  // 6. ORGANIZATION SELECTION (P111-06)
  // ===========================================================================
  describe('6. current_user_organization_id(): explicit, membership-validated selection', () => {
    const cur = async (user: string, claims: Record<string, any> = {}) => {
      await s.as(user, 'authenticated', claims);
      return (await scalar(`SELECT public.current_user_organization_id() AS o`)).o as string | null;
    };
    it('single eligible membership resolves without a claim', async () => expect(await cur(U.ordinary)).toBe(ORG_A));
    it('multi-organization user WITHOUT a claim is ambiguous => NULL (fail closed)', async () => expect(await cur(U.multi)).toBeNull());
    it('multi-organization user with a claim selects that organization only if membership is active', async () => {
      expect(await cur(U.multi, { organization_id: ORG_B })).toBe(ORG_B);
      expect(await cur(U.multi, { organization_id: ORG_A })).toBe(ORG_A);
    });
    it('claim for an organization the user is NOT a member of is ignored (multi-org => NULL)', async () => {
      expect(await cur(U.multi, { organization_id: ORG_EXPIRED })).toBeNull();
    });
    it('a claim never creates membership for a non-member', async () => {
      expect(await cur(U.profileOnly, { organization_id: ORG_A })).toBeNull();
      expect(await cur(U.newcomer, { organization_id: ORG_B })).toBeNull();
    });
    it('profile.organization_id is not membership proof', async () => expect(await cur(U.profileOnly)).toBeNull());
    it('malformed organization claim cannot raise an authorization error', async () => {
      expect(await cur(U.ordinary, { organization_id: 'not-a-uuid' })).toBe(ORG_A);
      expect(await cur(U.multi, { organization_id: "'; DROP TABLE x;--" })).toBeNull();
    });
    it('expired organization membership is not eligible', async () => expect(await cur(U.expiredMember)).toBeNull());
  });

  // ===========================================================================
  // 7. TOKEN HOOK
  // ===========================================================================
  describe('7. custom_access_token_hook: no profile-based org, no ambiguous multi-org claims', () => {
    const hook = async (user: string) => {
      await s.owner();
      const ev = JSON.stringify({ user_id: user, claims: { app_metadata: {} } });
      const r = await scalar(`SELECT public.custom_access_token_hook('${ev}'::jsonb) AS e`);
      return (r.e.claims.app_metadata ?? {}) as Record<string, any>;
    };
    it('single membership => organization claim present', async () => expect((await hook(U.ordinary)).organization_id).toBe(ORG_A));
    it('multi-organization => no organization claim', async () => expect((await hook(U.multi)).organization_id).toBeUndefined());
    it('profile organization without membership => no organization claim', async () => expect((await hook(U.profileOnly)).organization_id).toBeUndefined());
    it('super admin role claim is informational and never an authority', async () => {
      expect((await hook(U.super)).role).toBe('SUPER_ADMIN');
      await s.as(U.ordinary, 'authenticated', { role: 'SUPER_ADMIN', organization_id: ORG_B });
      expect((await scalar(`SELECT public.is_super_admin() AS x`)).x).toBe(false);
      expect((await scalar(`SELECT public.is_organization_member('${ORG_B}') AS x`)).x).toBe(false);
    });
    it('hook is executable only by supabase_auth_admin', async () => {
      await s.owner();
      const r = await scalar(`SELECT has_function_privilege('authenticated','public.custom_access_token_hook(jsonb)','EXECUTE') a,
                                     has_function_privilege('anon','public.custom_access_token_hook(jsonb)','EXECUTE') b,
                                     has_function_privilege('supabase_auth_admin','public.custom_access_token_hook(jsonb)','EXECUTE') c`);
      expect([r.a, r.b, r.c]).toEqual([false, false, true]);
    });
  });

  // ===========================================================================
  // 8. MIGRATION COMPATIBILITY + STAGING SCRIPTS EXECUTE AS WRITTEN
  // ===========================================================================
  describe('8. Migration compatibility and staging verification scripts', () => {
    it('get_user_effective_permissions keeps its original signature and parameter names across all migrations', async () => {
      await s.owner();
      const r = await scalar(`SELECT pg_get_function_identity_arguments(p.oid) AS args, pg_get_function_result(p.oid) AS res
                                FROM pg_proc p WHERE p.proname='get_user_effective_permissions' AND p.pronamespace='public'::regnamespace`);
      expect(r.args).toBe('p_organization_id uuid, p_user_id uuid');
      expect(r.res).toBe('text[]');
    });
    it('only one overload of each replaced function exists (no shadow definitions)', async () => {
      await s.owner();
      const r = await db.query(`SELECT proname, COUNT(*)::int AS n FROM pg_proc WHERE pronamespace='public'::regnamespace
        AND proname IN ('is_super_admin','is_organization_admin','is_organization_member','current_user_organization_id',
                        'get_user_effective_permissions','custom_access_token_hook','fn_enforce_profile_security_fields') GROUP BY proname`);
      for (const row of r.rows as any[]) expect(row.n).toBe(1);
    });
    it('staging STRUCTURAL verification SQL: every check passes (embedded engine)', async () => {
      await s.owner();
      const sql = fs.readFileSync(path.resolve('supabase/staging/phase1_1_1_structural_verification.sql'), 'utf8');
      const chunks = sql.split(/;\s*\r?\n/).map((c) => c.trim()).filter((c) => /\b(WITH|SELECT)\b/.test(c.replace(/--.*$/gm, '')));
      const rows = (await db.query(chunks[0] + ';')).rows as { check_name: string; ok: boolean }[];
      expect(rows.length).toBeGreaterThan(30);
      const failed = rows.filter((r) => r.ok !== true).map((r) => r.check_name);
      expect(failed).toEqual([]);
      for (const c of chunks.slice(1)) await db.query(c + ';'); // informational queries must at least execute
    });
    it('staging BEHAVIOURAL smoke script executes to completion and leaves no data behind', async () => {
      await s.owner();
      const sql = fs.readFileSync(path.resolve('supabase/staging/phase1_1_1_behavioral_smoke.sql'), 'utf8');
      await db.exec(sql);
      await s.owner();
      const left = await scalar(`SELECT COUNT(*)::int AS n FROM public.organizations WHERE code LIKE 'SMOKE_%'`);
      expect(left.n).toBe(0);
    });
  });
});
