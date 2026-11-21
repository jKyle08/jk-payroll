// Phase 1.2 provisioning SQL scenarios executed in embedded PGlite.
// This is SQL/role integration evidence, not a local Supabase/PostgreSQL server run.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { createMigratedDb, expectRejected, session } from './helpers/pg-harness.js';

const ORG = '71000000-0000-0000-0000-000000000001';
const DEPT = '72000000-0000-0000-0000-000000000001';
const DEPT_OTHER = '72000000-0000-0000-0000-000000000002';
const SUPER = '73000000-0000-0000-0000-000000000001';
const OWNER = '73000000-0000-0000-0000-000000000002';
const ORDINARY = '73000000-0000-0000-0000-000000000003';
const INVITED = '73000000-0000-0000-0000-000000000004';
const INVITED_WRONG = '73000000-0000-0000-0000-000000000005';
const INVITED_OWNER = '73000000-0000-0000-0000-000000000006';
const MEMBER = '73000000-0000-0000-0000-000000000007';
const TENANT_ADMIN_ROLE = 'f0000000-0000-0000-0000-000000000002';
const EMPLOYEE_ROLE = 'f0000000-0000-0000-0000-000000000003';
const CUSTOM_ROLE = '74000000-0000-0000-0000-000000000001';
const INACTIVE_ROLE = '74000000-0000-0000-0000-000000000002';

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

describe('Phase 1.2 provisioning SQL (PGlite embedded engine)', () => {
  let db: Awaited<ReturnType<typeof createMigratedDb>>;
  let s: ReturnType<typeof session>;
  const query = async (sql: string) => db.query(sql);
  const scalar = async (sql: string) => (await query(sql)).rows[0] as any;

  beforeAll(async () => {
    db = await createMigratedDb();
    s = session(db);
    await s.owner();
    await db.exec(`
      INSERT INTO auth.users(id,email) VALUES
        ('${SUPER}','super@example.invalid'),('${OWNER}','owner@example.invalid'),
        ('${ORDINARY}','ordinary@example.invalid'),('${INVITED}','invitee@example.invalid'),
        ('${INVITED_WRONG}','wrong@example.invalid'),('${INVITED_OWNER}','first-owner@example.invalid'),
        ('${MEMBER}','member@example.invalid'),
        ('75000000-0000-0000-0000-000000000001','expired-member@example.invalid'),
        ('75000000-0000-0000-0000-000000000002','revoked-role@example.invalid');
      INSERT INTO public.organizations(id,code,slug,name,status) VALUES
        ('${ORG}','P12','p12','Phase 1.2 Org','Active');
      INSERT INTO public.departments(id,organization_id,code,name) VALUES
        ('${DEPT}','${ORG}','HR','HR'),('${DEPT_OTHER}','${ORG}','FIN','Finance');
      INSERT INTO public.roles(id,organization_id,code,name,role_type,is_active) VALUES
        ('${CUSTOM_ROLE}','${ORG}','STAFF','Staff','CUSTOM',true),
        ('${INACTIVE_ROLE}','${ORG}','OLD_STAFF','Old Staff','CUSTOM',false);
      INSERT INTO public.profiles(id,organization_id,department_id,full_name,email,is_super_admin,is_active)
      VALUES ('${SUPER}',NULL,NULL,'Super','super@example.invalid',true,true),
             ('${OWNER}','${ORG}','${DEPT}','Owner','owner@example.invalid',false,true),
             ('${ORDINARY}','${ORG}','${DEPT}','Ordinary','ordinary@example.invalid',false,true);
      INSERT INTO public.organization_members(organization_id,user_id,role_id,department_id,is_owner,is_active)
      VALUES ('${ORG}','${OWNER}','${TENANT_ADMIN_ROLE}','${DEPT}',true,true),
             ('${ORG}','${ORDINARY}','${EMPLOYEE_ROLE}','${DEPT}',false,true);
      INSERT INTO public.user_roles(organization_id,user_id,role_id)
      VALUES ('${ORG}','${OWNER}','${TENANT_ADMIN_ROLE}'),('${ORG}','${ORDINARY}','${EMPLOYEE_ROLE}');
    `);
  });

  afterAll(async () => { await db?.close(); });

  it('issues 24-hour onboarding links only for active SuperAdmins', async () => {
    await s.as(null, 'service_role');
    await expectRejected(
      () => query(`SELECT public.create_organization_onboarding_invitation('${ORDINARY}','blocked@example.invalid','${hash('blocked')}')`),
      /Only an active SuperAdmin/,
    );
    const r = await scalar(`SELECT public.create_organization_onboarding_invitation('${SUPER}','first-owner@example.invalid','${hash('first-owner-token')}') AS expires_at`);
    const hours = (new Date(r.expires_at).getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(23.9);
    expect(hours).toBeLessThanOrEqual(24.01);
  });

  it('first-owner redemption atomically creates active organization, department, profile, owner membership, and TENANT_ADMIN assignment', async () => {
    await s.as(null, 'service_role');
    const tokenHash = hash('first-owner-token');
    const payload = JSON.stringify({
      name: 'Invited Organization', code: 'INVITED', slug: 'invited', sector: 'Private', tier: 'Enterprise',
      industry: 'Technology', currency: 'PHP', timezone: 'Asia/Manila', countryCode: 'PH',
      defaultPayFrequency: 'Semi-Monthly', supportedWorkModes: ['OnSite'], statutoryIds: {}, settings: {}, modules: [],
      admin: { fullName: 'First Owner', email: 'first-owner@example.invalid', username: 'first-owner', title: 'Administrator' },
    }).replace(/'/g, "''");
    const result = await scalar(`SELECT * FROM public.provision_organization_from_onboarding_invitation('${tokenHash}','${INVITED_OWNER}','${payload}'::jsonb,'Human Resources','HR')`);
    expect(result.user_id).toBe(INVITED_OWNER);
    const state = await scalar(`
      SELECT o.status::text status, p.is_active profile_active, p.is_organization_admin profile_admin,
             p.is_super_admin profile_super, m.is_active member_active, m.is_owner,
             r.code role_code, d.organization_id = o.id dept_scoped,
             EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.organization_id=o.id AND ur.user_id='${INVITED_OWNER}' AND ur.role_id=m.role_id) role_assigned
      FROM public.organizations o JOIN public.profiles p ON p.id='${INVITED_OWNER}'
      JOIN public.organization_members m ON m.organization_id=o.id AND m.user_id='${INVITED_OWNER}'
      JOIN public.roles r ON r.id=m.role_id JOIN public.departments d ON d.id=m.department_id
      WHERE o.id='${result.organization_id}'`);
    expect(state).toEqual({ status: 'Active', profile_active: true, profile_admin: false, profile_super: false, member_active: true, is_owner: true, role_code: 'TENANT_ADMIN', dept_scoped: true, role_assigned: true });
    const replay = await scalar(`SELECT * FROM public.provision_organization_from_onboarding_invitation('${tokenHash}','${INVITED_OWNER}','${payload}'::jsonb,'Human Resources','HR')`);
    expect(replay.organization_id).toBe(result.organization_id);
  });

  it('rejects invalid and expired onboarding links without creating tenant data', async () => {
    await s.as(null, 'service_role');
    await expectRejected(() => query(`SELECT * FROM public.provision_organization_from_onboarding_invitation('${hash('missing')}','${INVITED_WRONG}','{}'::jsonb)`), /Invalid onboarding invitation/);
    await query(`SELECT public.create_organization_onboarding_invitation('${SUPER}','wrong@example.invalid','${hash('expired-owner')}')`);
    await query(`UPDATE public.organization_onboarding_invitations SET expires_at=clock_timestamp()-interval '1 second' WHERE token_hash='${hash('expired-owner')}'`);
    await expectRejected(() => query(`SELECT * FROM public.provision_organization_from_onboarding_invitation('${hash('expired-owner')}','${INVITED_WRONG}','{}'::jsonb)`), /expired/);
    expect((await scalar(`SELECT count(*)::int n FROM public.profiles WHERE id='${INVITED_WRONG}'`)).n).toBe(0);
  });

  it('organization admins can invite only active in-organization custom roles and departments', async () => {
    await s.as(null, 'service_role');
    const exp = await scalar(`SELECT public.create_organization_member_invitation('${OWNER}','${ORG}','member@example.invalid','${DEPT}','${CUSTOM_ROLE}','${hash('member-token')}') AS expires_at`);
    expect(new Date(exp.expires_at).getTime()).toBeGreaterThan(Date.now());
    await expectRejected(() => query(`SELECT public.create_organization_member_invitation('${ORDINARY}','${ORG}','x@example.invalid','${DEPT}','${CUSTOM_ROLE}','${hash('not-admin')}')`), /administrator authority/);
    await expectRejected(() => query(`SELECT public.create_organization_member_invitation('${OWNER}','${ORG}','x@example.invalid','${DEPT_OTHER}','${TENANT_ADMIN_ROLE}','${hash('owner-injection')}')`), /cannot invite privileged/);
    await expectRejected(() => query(`SELECT public.create_organization_member_invitation('${OWNER}','${ORG}','x@example.invalid','${DEPT}','${INACTIVE_ROLE}','${hash('inactive-role')}')`), /inactive/);
    await expectRejected(() => query(`SELECT public.create_organization_member_invitation('${OWNER}','${ORG}','x@example.invalid','${ORG}','${CUSTOM_ROLE}','${hash('foreign-dept')}')`), /Department must be active/);
  });

  it('member invite redemption creates only the invited organization, department, and role; replay is idempotent', async () => {
    await s.as(null, 'service_role');
    const result = await scalar(`SELECT * FROM public.provision_organization_member_from_invitation('${hash('member-token')}','${MEMBER}','Member One')`);
    expect(result).toEqual({ organization_id: ORG, department_id: DEPT, user_id: MEMBER, role_id: CUSTOM_ROLE });
    const state = await scalar(`SELECT p.organization_id, p.department_id, p.is_active, p.is_organization_admin, p.is_super_admin, m.is_owner, r.id role_id FROM public.profiles p JOIN public.organization_members m ON m.user_id=p.id AND m.organization_id='${ORG}' JOIN public.roles r ON r.id=m.role_id WHERE p.id='${MEMBER}'`);
    expect(state).toEqual({ organization_id: ORG, department_id: DEPT, is_active: true, is_organization_admin: false, is_super_admin: false, is_owner: false, role_id: CUSTOM_ROLE });
    const replay = await scalar(`SELECT * FROM public.provision_organization_member_from_invitation('${hash('member-token')}','${MEMBER}','Member One')`);
    expect(replay).toEqual(result);
    expect((await scalar(`SELECT count(*)::int n FROM public.organization_members WHERE user_id='${MEMBER}' AND organization_id='${ORG}'`)).n).toBe(1);
  });

  it('wrong-email, duplicate, expired, and revoked-role redemptions fail without partial profile or membership writes', async () => {
    await s.as(null, 'service_role');
    await query(`SELECT public.create_organization_member_invitation('${OWNER}','${ORG}','different@example.invalid',NULL,'${CUSTOM_ROLE}','${hash('wrong-email')}')`);
    await expectRejected(() => query(`SELECT * FROM public.provision_organization_member_from_invitation('${hash('wrong-email')}','${INVITED}','Someone')`), /does not match/);
    expect((await scalar(`SELECT count(*)::int n FROM public.profiles WHERE id='${INVITED}'`)).n).toBe(0);

    await query(`SELECT public.create_organization_member_invitation('${OWNER}','${ORG}','expired-member@example.invalid',NULL,'${CUSTOM_ROLE}','${hash('expired-member')}')`);
    await query(`UPDATE public.organization_member_invitations SET expires_at=clock_timestamp()-interval '1 second' WHERE token_hash='${hash('expired-member')}'`);
    await expectRejected(() => query(`SELECT * FROM public.provision_organization_member_from_invitation('${hash('expired-member')}','75000000-0000-0000-0000-000000000001','Expired')`), /expired/);

    await query(`SELECT public.create_organization_member_invitation('${OWNER}','${ORG}','revoked-role@example.invalid',NULL,'${CUSTOM_ROLE}','${hash('revoked-role')}')`);
    await db.exec(`UPDATE public.roles SET is_active=false WHERE id='${CUSTOM_ROLE}';`);
    await expectRejected(() => query(`SELECT * FROM public.provision_organization_member_from_invitation('${hash('revoked-role')}','75000000-0000-0000-0000-000000000002','Revoked')`), /no longer eligible/);
    await s.owner();
    await db.exec(`UPDATE public.roles SET is_active=true WHERE id='${CUSTOM_ROLE}';`);
    await s.as(null, 'service_role');
    expect((await scalar(`SELECT count(*)::int n FROM public.organization_members WHERE user_id='75000000-0000-0000-0000-000000000002'`)).n).toBe(0);
  });

  it('client roles cannot read invitation rows or execute provisioning RPCs', async () => {
    await s.as(ORDINARY, 'authenticated');
    await expectRejected(() => query(`SELECT * FROM public.organization_onboarding_invitations`), /permission denied/);
    await expectRejected(() => query(`SELECT * FROM public.organization_member_invitations`), /permission denied/);
    expect((await scalar(`SELECT has_function_privilege('authenticated','public.provision_organization_member_from_invitation(text,uuid,text)','EXECUTE') AS auth_exec, has_function_privilege('anon','public.provision_organization_member_from_invitation(text,uuid,text)','EXECUTE') AS anon_exec, has_function_privilege('service_role','public.provision_organization_member_from_invitation(text,uuid,text)','EXECUTE') AS service_exec`))).toEqual({ auth_exec: false, anon_exec: false, service_exec: true });
    expect((await scalar(`SELECT has_function_privilege('authenticated','public.provision_organization_from_onboarding_invitation(text,uuid,jsonb,text,text)','EXECUTE') AS auth_exec, has_function_privilege('service_role','public.provision_organization_from_onboarding_invitation(text,uuid,jsonb,text,text)','EXECUTE') AS service_exec`))).toEqual({ auth_exec: false, service_exec: true });
  });
});
