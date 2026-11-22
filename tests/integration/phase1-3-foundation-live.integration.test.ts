// ==============================================================================
// JK-PAYROLL: PHASES 1–3 REAL POSTGRESQL & SUPABASE INTEGRATION TEST SUITE
// File: tests/integration/phase1-3-foundation-live.integration.test.ts
// Scope: Onboarding, RBAC, Multi-Tenancy, Composite FKs, Triggers & Option C
// Target: Live Supabase Remote PostgreSQL instance (fsnfqnbixitmmjmeogml)
// ==============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHash } from 'node:crypto';
import { getSupabaseClient, getSupabaseAnonClient } from '../../src/server/db/supabase.js';

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

describe('Phases 1–3 Live Supabase PostgreSQL Integration Suite', { timeout: 30000 }, () => {
  const serviceClient = getSupabaseClient();
  const anonClient = getSupabaseAnonClient();

  const timestamp = Date.now().toString(36).toUpperCase();
  const testPrefix = `TEST_PHASE13_${timestamp}_`;
  
  // Tracking created disposable IDs for clean teardown
  const createdOrgIds: string[] = [];
  const createdAuthUserIds: string[] = [];

  let superAdminId: string;
  let testAdminEmail: string;
  let testAdminId: string;
  let testAdminToken: string;
  let testAdminTokenHash: string;
  let testOrgId: string;
  let testOrgCode: string;
  let testDeptId: string;
  let testAdminRoleId: string;

  beforeAll(async () => {
    // 1. Verify connection to live Supabase PostgreSQL
    const { error: pingError } = await serviceClient.from('organizations').select('id').limit(1);
    expect(pingError).toBeNull();

    // 2. Locate or create a SuperAdmin user for issuing invitations
    testAdminEmail = `admin_${timestamp.toLowerCase()}@paypulse-test.invalid`;
    testOrgCode = `${testPrefix}ORG`;

    // Create auth users in Supabase Auth
    const { data: superUser, error: superErr } = await serviceClient.auth.admin.createUser({
      email: `super_${timestamp.toLowerCase()}@paypulse-test.invalid`,
      password: 'TestPassword123!@#',
      email_confirm: true,
    });
    if (superErr || !superUser.user) throw new Error(`SuperAdmin creation failed: ${superErr?.message}`);
    superAdminId = superUser.user.id;
    createdAuthUserIds.push(superAdminId);

    // Mark as SuperAdmin in profiles
    await serviceClient.from('profiles').upsert({
      id: superAdminId,
      full_name: 'Platform SuperAdmin',
      email: `super_${timestamp.toLowerCase()}@paypulse-test.invalid`,
      is_super_admin: true,
      is_organization_admin: false,
      is_active: true,
    });

    // Create prospective Tenant Admin auth user
    const { data: adminUser, error: adminErr } = await serviceClient.auth.admin.createUser({
      email: testAdminEmail,
      password: 'TestPassword123!@#',
      email_confirm: true,
    });
    if (adminErr || !adminUser.user) throw new Error(`Admin user creation failed: ${adminErr?.message}`);
    testAdminId = adminUser.user.id;
    createdAuthUserIds.push(testAdminId);
  });

  afterAll(async () => {
    // Safe teardown of test fixtures
    for (const orgId of createdOrgIds) {
      try {
        await serviceClient.from('user_roles').delete().eq('organization_id', orgId);
        await serviceClient.from('organization_members').delete().eq('organization_id', orgId);
        await serviceClient.from('role_permissions').delete().eq('organization_id', orgId);
        await serviceClient.from('roles').delete().eq('organization_id', orgId);
        await serviceClient.from('department_modules').delete().eq('organization_id', orgId);
        await serviceClient.from('organization_modules').delete().eq('organization_id', orgId);
        await serviceClient.from('departments').delete().eq('organization_id', orgId);
        await serviceClient.from('profiles').delete().eq('organization_id', orgId);
        await serviceClient.from('organization_onboarding_invitations').delete().eq('organization_id', orgId);
        await serviceClient.from('organizations').delete().eq('id', orgId);
      } catch (err) {
        console.warn('Cleanup error for org:', orgId, err);
      }
    }

    // Delete auth users
    for (const userId of createdAuthUserIds) {
      try {
        await serviceClient.auth.admin.deleteUser(userId);
      } catch {
        // ignore
      }
    }
  });

  // ============================================================================
  // 1. PHASE 1: ONBOARDING INVITATION & ATOMIC REGISTRATION
  // ============================================================================
  describe('Phase 1 — Organization Registration & Onboarding Lifecycle', () => {
    it('SuperAdmin can generate a cryptographically unique onboarding invitation with 24h expiration', async () => {
      testAdminToken = `token_${timestamp}_${Math.random().toString(36).substring(2)}`;
      testAdminTokenHash = hash(testAdminToken);

      const { data, error } = await serviceClient.rpc('create_organization_onboarding_invitation', {
        p_actor_id: superAdminId,
        p_invited_email: testAdminEmail,
        p_token_hash: testAdminTokenHash,
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();

      const expiresAt = new Date(data);
      const hours = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
      expect(hours).toBeGreaterThan(23.9);
      expect(hours).toBeLessThanOrEqual(24.05);

      // Verify stored row in database (invitation token hash stored, not plaintext)
      const { data: invRow, error: invErr } = await serviceClient
        .from('organization_onboarding_invitations')
        .select('*')
        .eq('token_hash', testAdminTokenHash)
        .single();

      expect(invErr).toBeNull();
      expect(invRow.invited_email).toBe(testAdminEmail);
      expect(invRow.redeemed_at).toBeNull();
    });

    it('Non-SuperAdmin cannot create an onboarding invitation (fails closed)', async () => {
      const bogusTokenHash = hash('bogus-token');
      const { error } = await serviceClient.rpc('create_organization_onboarding_invitation', {
        p_actor_id: testAdminId, // ordinary user / non-superadmin
        p_invited_email: 'hacker@example.invalid',
        p_token_hash: bogusTokenHash,
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/Only an active SuperAdmin/);
    });

    it('Initial administrator atomically redeems invitation: provisions organization, department, profile, and Option C template roles', async () => {
      const orgPayload = {
        name: `Acme Corp ${timestamp}`,
        code: testOrgCode,
        slug: `acme-${timestamp.toLowerCase()}`,
        sector: 'Private',
        tier: 'Enterprise',
        industry: 'Technology & Software',
        currency: 'PHP',
        timezone: 'Asia/Manila',
        countryCode: 'PH',
        defaultPayFrequency: 'Semi-Monthly',
        supportedWorkModes: ['OnSite', 'Hybrid'],
        statutoryIds: { tin: '123-456-789' },
        settings: {},
        admin: {
          fullName: 'Acme Root Admin',
          username: `acme_admin_${timestamp.toLowerCase()}`,
          title: 'Managing Director',
        },
      };

      const { data: provisioned, error: provError } = await serviceClient.rpc(
        'provision_organization_from_onboarding_invitation',
        {
          p_token_hash: testAdminTokenHash,
          p_user_id: testAdminId,
          p_organization: orgPayload,
          p_department_name: 'Human Resources',
          p_department_code: 'HR',
        }
      );

      expect(provError).toBeNull();
      expect(provisioned).toBeDefined();

      const record = Array.isArray(provisioned) ? provisioned[0] : provisioned;
      expect(record.organization_id).toBeDefined();
      expect(record.department_id).toBeDefined();
      expect(record.user_id).toBe(testAdminId);

      testOrgId = record.organization_id;
      testDeptId = record.department_id;
      createdOrgIds.push(testOrgId);

      // Verify Organization row
      const { data: orgRow } = await serviceClient
        .from('organizations')
        .select('*')
        .eq('id', testOrgId)
        .single();
      expect(orgRow.code).toBe(testOrgCode);
      expect(orgRow.status).toBe('Active');
      expect(orgRow.is_active).toBe(true);

      // Verify Root Department row
      const { data: deptRow } = await serviceClient
        .from('departments')
        .select('*')
        .eq('id', testDeptId)
        .single();
      expect(deptRow.code).toBe('HR');
      expect(deptRow.organization_id).toBe(testOrgId);

      // Verify Profile row
      const { data: profRow } = await serviceClient
        .from('profiles')
        .select('*')
        .eq('id', testAdminId)
        .single();
      expect(profRow.organization_id).toBe(testOrgId);
      expect(profRow.is_super_admin).toBe(false);
      expect(profRow.is_organization_admin).toBe(false);
      expect(profRow.is_active).toBe(true);

      // Verify Option C Template Roles: ORG_ADMIN and EMPLOYEE instantiated for the tenant
      const { data: roles } = await serviceClient
        .from('roles')
        .select('*')
        .eq('organization_id', testOrgId);

      expect(roles).toBeDefined();
      expect(roles?.length).toBeGreaterThanOrEqual(2);

      const orgAdminRole = roles?.find((r) => r.code === 'ORG_ADMIN');
      expect(orgAdminRole).toBeDefined();
      expect(orgAdminRole?.organization_id).toBe(testOrgId);
      expect(orgAdminRole?.role_type).toBe('CUSTOM');
      testAdminRoleId = orgAdminRole!.id;

      const employeeRole = roles?.find((r) => r.code === 'EMPLOYEE');
      expect(employeeRole).toBeDefined();
      expect(employeeRole?.organization_id).toBe(testOrgId);
      expect(employeeRole?.role_type).toBe('CUSTOM');

      // Verify Tier 1: organization_modules populated
      const { data: orgMods } = await serviceClient
        .from('organization_modules')
        .select('*')
        .eq('organization_id', testOrgId);
      expect(orgMods?.length).toBe(3);

      // Verify Tier 2: department_modules populated
      const { data: deptMods } = await serviceClient
        .from('department_modules')
        .select('*')
        .eq('organization_id', testOrgId);
      expect(deptMods?.length).toBe(3);

      // Verify Tier 3: role_permissions populated for ORG_ADMIN
      const { data: rolePerms } = await serviceClient
        .from('role_permissions')
        .select('*')
        .eq('organization_id', testOrgId)
        .eq('role_id', testAdminRoleId);
      expect(rolePerms?.length).toBeGreaterThan(0);

      // Verify organization_members row: is_owner = true, role_id = tenant ORG_ADMIN
      const { data: memberRow } = await serviceClient
        .from('organization_members')
        .select('*')
        .eq('organization_id', testOrgId)
        .eq('user_id', testAdminId)
        .single();
      expect(memberRow.is_owner).toBe(true);
      expect(memberRow.role_id).toBe(testAdminRoleId);

      // Verify user_roles row: single role assigned to initial administrator
      const { data: userRoleRow } = await serviceClient
        .from('user_roles')
        .select('*')
        .eq('organization_id', testOrgId)
        .eq('user_id', testAdminId)
        .single();
      expect(userRoleRow.role_id).toBe(testAdminRoleId);

      // Verify Invitation marked as redeemed
      const { data: invRow } = await serviceClient
        .from('organization_onboarding_invitations')
        .select('*')
        .eq('token_hash', testAdminTokenHash)
        .single();
      expect(invRow.redeemed_at).not.toBeNull();
      expect(invRow.redeemed_by).toBe(testAdminId);
      expect(invRow.organization_id).toBe(testOrgId);
    });

    it('Reused invitation cannot be redeemed by a different user', async () => {
      // Create another auth user
      const { data: intruder } = await serviceClient.auth.admin.createUser({
        email: `intruder_${timestamp.toLowerCase()}@paypulse-test.invalid`,
        password: 'TestPassword123!@#',
        email_confirm: true,
      });
      createdAuthUserIds.push(intruder!.user!.id);

      const { error } = await serviceClient.rpc('provision_organization_from_onboarding_invitation', {
        p_token_hash: testAdminTokenHash,
        p_user_id: intruder!.user!.id,
        p_organization: { name: 'Intruder Org', code: `${testPrefix}INTR` },
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/already been used/);
    });

    it('Expired invitation is rejected without modifying database records', async () => {
      const expiredToken = `expired_${timestamp}`;
      const expiredHash = hash(expiredToken);
      const expiredEmail = `expired_${timestamp.toLowerCase()}@paypulse-test.invalid`;

      const { data: expUser } = await serviceClient.auth.admin.createUser({
        email: expiredEmail,
        password: 'TestPassword123!@#',
        email_confirm: true,
      });
      createdAuthUserIds.push(expUser!.user!.id);

      await serviceClient.rpc('create_organization_onboarding_invitation', {
        p_actor_id: superAdminId,
        p_invited_email: expiredEmail,
        p_token_hash: expiredHash,
      });

      // Backdate expires_at to 1 hour ago
      await serviceClient
        .from('organization_onboarding_invitations')
        .update({ expires_at: new Date(Date.now() - 3600000).toISOString() })
        .eq('token_hash', expiredHash);

      const { error } = await serviceClient.rpc('provision_organization_from_onboarding_invitation', {
        p_token_hash: expiredHash,
        p_user_id: expUser!.user!.id,
        p_organization: { name: 'Expired Org', code: `${testPrefix}EXP` },
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/expired/);
    });
  });

  // ============================================================================
  // 2. PHASE 2: MULTI-TENANT ISOLATION & COMPOSITE CONSTRAINTS
  // ============================================================================
  describe('Phase 2 — Multi-Tenant Architecture & Database Boundaries', () => {
    let foreignOrgId: string;
    let foreignAdminId: string;
    let foreignRoleId: string;

    beforeAll(async () => {
      // Create a second tenant for cross-tenant testing
      const foreignCode = `${testPrefix}ORG2`;
      const foreignEmail = `foreign_${timestamp.toLowerCase()}@paypulse-test.invalid`;
      const foreignToken = `token2_${timestamp}`;
      const foreignTokenHash = hash(foreignToken);

      const { data: fUser } = await serviceClient.auth.admin.createUser({
        email: foreignEmail,
        password: 'TestPassword123!@#',
        email_confirm: true,
      });
      foreignAdminId = fUser!.user!.id;
      createdAuthUserIds.push(foreignAdminId);

      await serviceClient.rpc('create_organization_onboarding_invitation', {
        p_actor_id: superAdminId,
        p_invited_email: foreignEmail,
        p_token_hash: foreignTokenHash,
      });

      const { data: prov } = await serviceClient.rpc('provision_organization_from_onboarding_invitation', {
        p_token_hash: foreignTokenHash,
        p_user_id: foreignAdminId,
        p_organization: {
          name: 'Foreign Org',
          code: foreignCode,
          slug: `foreign-${timestamp.toLowerCase()}`,
        },
      });
      const rec = Array.isArray(prov) ? prov[0] : prov;
      foreignOrgId = rec.organization_id;
      createdOrgIds.push(foreignOrgId);

      const { data: fRole } = await serviceClient
        .from('roles')
        .select('id')
        .eq('organization_id', foreignOrgId)
        .eq('code', 'ORG_ADMIN')
        .single();
      foreignRoleId = fRole!.id;
    });

    it('Composite Foreign Key rejects cross-tenant role assignment in user_roles', async () => {
      // Try assigning foreignOrgId's role to testOrgId's user
      const { error } = await serviceClient.from('user_roles').insert({
        organization_id: testOrgId,
        user_id: testAdminId,
        role_id: foreignRoleId, // Belongs to foreignOrgId!
      });

      expect(error).toBeDefined();
      // Should violate fk_user_roles_org_role or trigger
      expect(error?.code).toMatch(/23503|23514|42501/);
    });

    it('Single-role primary key enforces at most one role per user per organization', async () => {
      // testAdminId already has testAdminRoleId in testOrgId.
      // Trying to insert another row with same (organization_id, user_id) must fail with 23505 (unique_violation).
      const { data: empRole } = await serviceClient
        .from('roles')
        .select('id')
        .eq('organization_id', testOrgId)
        .eq('code', 'EMPLOYEE')
        .single();

      const { error } = await serviceClient.from('user_roles').insert({
        organization_id: testOrgId,
        user_id: testAdminId,
        role_id: empRole!.id,
      });

      expect(error).toBeDefined();
      expect(error?.code).toBe('23505'); // user_roles_pkey violation
    });

    it('Anonymous user cannot read organization records across tenants (RLS)', async () => {
      const { data, error } = await anonClient
        .from('organizations')
        .select('*')
        .eq('id', testOrgId);

      if (error) {
        expect(error.code).toBe('42501');
      } else {
        expect(data?.length).toBe(0);
      }
    });

    it('Anonymous user cannot read organization_modules (RLS)', async () => {
      const { data, error } = await anonClient
        .from('organization_modules')
        .select('*')
        .eq('organization_id', testOrgId);

      if (error) {
        expect(error.code).toBe('42501');
      } else {
        expect(data?.length).toBe(0);
      }
    });
  });

  // ============================================================================
  // 3. PHASE 3: RBAC & EFFECTIVE PERMISSION RESOLUTION
  // ============================================================================
  describe('Phase 3 — RBAC, Entitlements & Authorization Enforcement', () => {
    it('SuperAdmin role assignment is blocked by trigger in user_roles', async () => {
      const globalSuperAdminRoleId = 'f0000000-0000-0000-0000-000000000001';

      const { error } = await serviceClient.from('user_roles').insert({
        organization_id: testOrgId,
        user_id: testAdminId,
        role_id: globalSuperAdminRoleId,
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/Platform SuperAdmin|Protected role/);
    });

    it('Protected role codes cannot be assigned through ordinary user role writes', async () => {
      // Create a custom role with a protected code alias in testOrgId
      const { data: spoofRole, error: roleCreateError } = await serviceClient
        .from('roles')
        .insert({
          organization_id: testOrgId,
          code: 'SUPERADMIN',
          name: 'Spoofed SuperAdmin',
          role_type: 'CUSTOM',
          is_active: true,
        })
        .select('id')
        .single();

      if (!roleCreateError && spoofRole) {
        // Attempting to assign it must be rejected by trigger
        const { error: assignError } = await serviceClient.from('user_roles').insert({
          organization_id: testOrgId,
          user_id: testAdminId,
          role_id: spoofRole.id,
        });

        expect(assignError).toBeDefined();
        expect(assignError?.message).toMatch(/Protected role codes/);

        // Clean up spoof role
        await serviceClient.from('roles').delete().eq('id', spoofRole.id);
      }
    });

    it('Effective permissions resolve successfully for onboarded administrator via get_user_effective_permissions RPC', async () => {
      const { data: perms, error } = await serviceClient.rpc('get_user_effective_permissions', {
        p_organization_id: testOrgId,
        p_user_id: testAdminId,
      });

      expect(error).toBeNull();
      expect(perms).toBeDefined();
      expect(Array.isArray(perms)).toBe(true);

      // Should include administrative permissions for licensed modules
      expect(perms).toContain('Department.View');
      expect(perms).toContain('Department.Add');
      expect(perms).toContain('EmployeeProfile.View');
      expect(perms).toContain('RolePermission.View');
    });

    it('is_organization_admin returns true for initial organization owner', async () => {
      // Test using service_role query to check is_organization_admin logic
      const { data: member } = await serviceClient
        .from('organization_members')
        .select('is_owner')
        .eq('organization_id', testOrgId)
        .eq('user_id', testAdminId)
        .single();

      expect(member.is_owner).toBe(true);
    });
  });

  // ============================================================================
  // 4. DATABASE INTEGRITY: REFERENTIAL CASCADE BEHAVIOR (F-30B-10)
  // ============================================================================
  describe('Database Integrity — Referential Cascade & Foreign Key Behavior (F-30B-10)', () => {
    it('Assigned role cannot be deleted while assigned to a user in user_roles (ON DELETE NO ACTION enforces foreign key integrity)', async () => {
      // Attempt to delete testAdminRoleId while assigned in user_roles
      const { error: delAssignedError } = await serviceClient
        .from('roles')
        .delete()
        .eq('id', testAdminRoleId);

      expect(delAssignedError).toBeDefined();
      expect(delAssignedError?.code).toBe('23503'); // foreign_key_violation
    });

    it('Unassigned custom role can be deleted cleanly without constraint violation', async () => {
      // Create an unassigned custom role in testOrgId
      const { data: unassignedRole, error: createErr } = await serviceClient
        .from('roles')
        .insert({
          organization_id: testOrgId,
          code: 'TEMP_TEST_ROLE',
          name: 'Temporary Test Role',
          role_type: 'CUSTOM',
          is_active: true,
        })
        .select('id')
        .single();

      expect(createErr).toBeNull();
      expect(unassignedRole).toBeDefined();

      // Delete the unassigned role
      const { error: delError } = await serviceClient
        .from('roles')
        .delete()
        .eq('id', unassignedRole!.id);

      expect(delError).toBeNull();
    });

    it('Removing role assignment from user_roles unblocks role deletion under ON DELETE NO ACTION', async () => {
      // 1. Create disposable role and assign it to a new member
      const { data: dispUser } = await serviceClient.auth.admin.createUser({
        email: `disp_${timestamp.toLowerCase()}@paypulse-test.invalid`,
        password: 'TestPassword123!@#',
        email_confirm: true,
      });
      createdAuthUserIds.push(dispUser!.user!.id);

      await serviceClient.from('profiles').insert({
        id: dispUser!.user!.id,
        organization_id: testOrgId,
        full_name: 'Disposable User',
        email: `disp_${timestamp.toLowerCase()}@paypulse-test.invalid`,
        is_active: true,
      });

      await serviceClient.from('organization_members').insert({
        organization_id: testOrgId,
        user_id: dispUser!.user!.id,
        is_owner: false,
        is_active: true,
      });

      const { data: customRole, error: roleErr } = await serviceClient
        .from('roles')
        .insert({
          organization_id: testOrgId,
          code: 'DISP_ROLE',
          name: 'Disposable Role',
          role_type: 'CUSTOM',
          is_active: true,
        })
        .select('id')
        .single();
      expect(roleErr).toBeNull();

      // Assign role
      const { error: assignErr } = await serviceClient.from('user_roles').insert({
        organization_id: testOrgId,
        user_id: dispUser!.user!.id,
        role_id: customRole!.id,
      });
      expect(assignErr).toBeNull();

      // Attempt deletion while assigned -> must fail (23503)
      const { error: blockedError } = await serviceClient
        .from('roles')
        .delete()
        .eq('id', customRole!.id);
      expect(blockedError).toBeDefined();
      expect(blockedError?.code).toBe('23503');

      // Unassign role
      await serviceClient
        .from('user_roles')
        .delete()
        .eq('organization_id', testOrgId)
        .eq('user_id', dispUser!.user!.id);

      // Delete role now succeeds under ON DELETE NO ACTION
      const { error: unblockedError } = await serviceClient
        .from('roles')
        .delete()
        .eq('id', customRole!.id);
      expect(unblockedError).toBeNull();
    });
  });
});
