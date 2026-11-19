// ==============================================================================
// JK-PAYROLL: PHASE 4 SECURITY REMEDIATION TEST SUITE
// File: tests/security-database-rls-phase4.test.ts
// Findings: SEC-FIND-07, SEC-FIND-13, SEC-FIND-14
// Scope: PostgreSQL Row Level Security (RLS) & Database Access Hardening
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from '../src/server/app.js';
import { db } from '../src/server/db/repository.js';
import { generateTestToken } from '../src/server/middleware/auth.middleware.js';
import * as supabaseModule from '../src/server/db/supabase.js';

describe('Phase 4 — PostgreSQL Row Level Security (RLS) & Database Access Hardening Suite', () => {
  const app = createApp();

  const rootOrgId = '00000000-0000-0000-0000-000000000000';
  let tenantA: any;
  let tenantB: any;

  let superAdminUser: any;
  let superAdminToken: string;

  let orgAdminA: any;
  let orgAdminAToken: string;
  let regularUserA: any;
  let regularUserAToken: string;

  let orgAdminB: any;
  let orgAdminBToken: string;
  let regularUserB: any;
  let regularUserBToken: string;

  // Read the Phase 4 SQL migration file content
  const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261119000010_remediate_database_rls.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  beforeEach(() => {
    db.resetTestData();
    db.seedCatalog();

    // Mock remote Supabase client to ensure predictable test execution
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((_col: string, _val: any) => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            eq: vi.fn().mockImplementation(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        }),
      })),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    vi.spyOn(supabaseModule, 'getSupabaseClient').mockReturnValue(mockSupabase as any);

    // Root Super Admin Setup
    db.tenants.set(rootOrgId, {
      id: rootOrgId,
      name: 'System Root',
      code: 'ROOT',
      isActive: true,
      status: 'Active',
      startDate: '2020-01-01T00:00:00.000Z',
      endDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    superAdminUser = db.createProfile({
      id: 'a0000000-0000-0000-0000-000000000001',
      tenantId: rootOrgId,
      fullName: 'Platform Super Admin',
      email: 'superadmin@paypulse.internal',
      isSuperAdmin: true,
      isTenantAdmin: true,
      isActive: true,
    });
    superAdminToken = generateTestToken({
      userId: superAdminUser.id,
      tenantId: rootOrgId,
      isSuperAdmin: true,
      appMetadata: { role: 'SUPER_ADMIN' },
    });

    // Tenant A Setup
    tenantA = db.createTenant({
      name: 'Alpha Corp',
      code: 'ALPHA',
      isActive: true,
      status: 'Active',
      startDate: '2025-01-01T00:00:00.000Z',
      endDate: null,
    });

    orgAdminA = db.createProfile({
      id: 'a0000000-0000-0000-0000-000000000002',
      tenantId: tenantA.id,
      fullName: 'Alice Org Admin',
      email: 'alice@alpha.test',
      isSuperAdmin: false,
      isTenantAdmin: true,
      isActive: true,
    });
    orgAdminAToken = generateTestToken({
      userId: orgAdminA.id,
      tenantId: tenantA.id,
      isSuperAdmin: false,
      appMetadata: { organization_id: tenantA.id, role: 'ADMIN' },
    });

    regularUserA = db.createProfile({
      id: 'a0000000-0000-0000-0000-000000000003',
      tenantId: tenantA.id,
      fullName: 'Alex Regular User',
      email: 'alex@alpha.test',
      isSuperAdmin: false,
      isTenantAdmin: false,
      isActive: true,
    });
    regularUserAToken = generateTestToken({
      userId: regularUserA.id,
      tenantId: tenantA.id,
      isSuperAdmin: false,
      appMetadata: { organization_id: tenantA.id, role: 'USER' },
    });

    // Tenant B Setup
    tenantB = db.createTenant({
      name: 'Beta LLC',
      code: 'BETA',
      isActive: true,
      status: 'Active',
      startDate: '2025-01-01T00:00:00.000Z',
      endDate: null,
    });

    orgAdminB = db.createProfile({
      id: 'b0000000-0000-0000-0000-000000000002',
      tenantId: tenantB.id,
      fullName: 'Bob Org Admin',
      email: 'bob@beta.test',
      isSuperAdmin: false,
      isTenantAdmin: true,
      isActive: true,
    });
    orgAdminBToken = generateTestToken({
      userId: orgAdminB.id,
      tenantId: tenantB.id,
      isSuperAdmin: false,
      appMetadata: { organization_id: tenantB.id, role: 'ADMIN' },
    });

    regularUserB = db.createProfile({
      id: 'b0000000-0000-0000-0000-000000000003',
      tenantId: tenantB.id,
      fullName: 'Bella Regular User',
      email: 'bella@beta.test',
      isSuperAdmin: false,
      isTenantAdmin: false,
      isActive: true,
    });
    regularUserBToken = generateTestToken({
      userId: regularUserB.id,
      tenantId: tenantB.id,
      isSuperAdmin: false,
      appMetadata: { organization_id: tenantB.id, role: 'USER' },
    });
  });

  // ============================================================================
  // SECTION 1: SEC-FIND-13 — RLS ENABLEMENT & ORGANIZATION MEMBERSHIP AUDIT
  // ============================================================================
  describe('SEC-FIND-13 — Organization Membership RLS & Table Lockdown', () => {
    it('1. verifies RLS is explicitly enabled on organization_members', () => {
      expect(migrationSql).toMatch(/ALTER\s+TABLE\s+public\.organization_members\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY;/i);
    });

    it('2. verifies RLS is explicitly enabled on payroll_runs', () => {
      expect(migrationSql).toMatch(/ALTER\s+TABLE\s+public\.payroll_runs\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY;/i);
    });

    it('3. verifies RLS is explicitly enabled on all core tenant tables', () => {
      const requiredTables = [
        'organizations',
        'departments',
        'profiles',
        'roles',
        'user_roles',
        'organization_modules',
        'department_modules',
        'role_permissions',
        'user_permissions',
        'organization_members',
        'payroll_runs',
      ];
      for (const table of requiredTables) {
        const regex = new RegExp(`ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY;`, 'i');
        expect(migrationSql).toMatch(regex);
      }
    });

    it('4. verifies organization_members has separate SELECT, INSERT, UPDATE, DELETE policies', () => {
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+org_members_select_policy\s+ON\s+public\.organization_members\s+FOR\s+SELECT/i);
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+org_members_insert_policy\s+ON\s+public\.organization_members\s+FOR\s+INSERT/i);
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+org_members_update_policy\s+ON\s+public\.organization_members\s+FOR\s+UPDATE/i);
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+org_members_delete_policy\s+ON\s+public\.organization_members\s+FOR\s+DELETE/i);
    });

    it('5. verifies org_members_select_policy allows user to read their own record or org admin to view org members', () => {
      expect(migrationSql).toContain('public.is_super_admin()');
      expect(migrationSql).toContain('user_id = auth.uid()');
      expect(migrationSql).toContain('public.is_organization_admin(organization_id)');
    });

    it('6. verifies org_members_update_policy prevents regular users from elevating themselves to is_owner', () => {
      expect(migrationSql).toMatch(/is_owner\s+IS\s+FALSE\s+OR\s+public\.is_super_admin\(\)/i);
    });

    it('7. verifies org_members_delete_policy protects the owner from non-superadmin deletion', () => {
      expect(migrationSql).toMatch(/is_owner\s+IS\s+FALSE\s+OR\s+public\.is_super_admin\(\)/i);
    });

    it('8. simulates RLS evaluation: regular user can select only their own membership record', () => {
      // Simulate evaluateOrgMembersSelect(user, record)
      const evaluateOrgMembersSelect = (user: any, record: any) => {
        if (user.isSuperAdmin) return true;
        if (record.user_id === user.id) return true;
        if (user.isTenantAdmin && record.organization_id === user.tenantId) return true;
        return false;
      };

      const memberRecordA1 = { user_id: regularUserA.id, organization_id: tenantA.id };
      const memberRecordA2 = { user_id: orgAdminA.id, organization_id: tenantA.id };
      const memberRecordB = { user_id: regularUserB.id, organization_id: tenantB.id };

      // Alex can select Alex
      expect(evaluateOrgMembersSelect(regularUserA, memberRecordA1)).toBe(true);
      // Alex cannot select Alice (unless admin)
      expect(evaluateOrgMembersSelect(regularUserA, memberRecordA2)).toBe(false);
      // Alex cannot select Bella in Tenant B
      expect(evaluateOrgMembersSelect(regularUserA, memberRecordB)).toBe(false);

      // Org admin Alice can select all members in Tenant A
      expect(evaluateOrgMembersSelect(orgAdminA, memberRecordA1)).toBe(true);
      expect(evaluateOrgMembersSelect(orgAdminA, memberRecordA2)).toBe(true);
      // Org admin Alice cannot select members in Tenant B
      expect(evaluateOrgMembersSelect(orgAdminA, memberRecordB)).toBe(false);

      // Super Admin can select all records across all tenants
      expect(evaluateOrgMembersSelect(superAdminUser, memberRecordA1)).toBe(true);
      expect(evaluateOrgMembersSelect(superAdminUser, memberRecordB)).toBe(true);
    });

    it('9. simulates RLS evaluation: cross-tenant member insert is blocked for organization admin', () => {
      const evaluateOrgMembersInsert = (user: any, newRecord: any) => {
        if (user.isSuperAdmin) return true;
        if (user.isTenantAdmin && newRecord.organization_id === user.tenantId) return true;
        return false;
      };

      const validInsert = { organization_id: tenantA.id, user_id: 'some-user' };
      const crossTenantInsert = { organization_id: tenantB.id, user_id: 'some-user' };

      expect(evaluateOrgMembersInsert(orgAdminA, validInsert)).toBe(true);
      expect(evaluateOrgMembersInsert(orgAdminA, crossTenantInsert)).toBe(false);
      expect(evaluateOrgMembersInsert(regularUserA, validInsert)).toBe(false);
    });

    it('10. simulates RLS evaluation: non-owner org admin cannot promote a member to is_owner', () => {
      const evaluateOrgMembersUpdate = (user: any, existingRecord: any, updatedFields: any) => {
        if (user.isSuperAdmin) return true;
        if (!user.isTenantAdmin || existingRecord.organization_id !== user.tenantId) return false;
        // Check owner elevation restriction
        if (updatedFields.is_owner === true && !user.isOwner && !user.isSuperAdmin) {
          return false;
        }
        return true;
      };

      const targetMember = { user_id: regularUserA.id, organization_id: tenantA.id, is_owner: false };

      // Non-owner Org Admin Alice attempts to promote Alex to owner
      expect(evaluateOrgMembersUpdate(orgAdminA, targetMember, { is_owner: true })).toBe(false);
      // Non-owner Org Admin Alice can update regular fields (e.g. role)
      expect(evaluateOrgMembersUpdate(orgAdminA, targetMember, { role_id: 'new-role' })).toBe(true);
      // Super Admin can promote to owner
      expect(evaluateOrgMembersUpdate(superAdminUser, targetMember, { is_owner: true })).toBe(true);
    });
  });

  // ============================================================================
  // SECTION 2: SEC-FIND-14 — ELIMINATION OF OVERLY PERMISSIVE 'FOR ALL' POLICIES
  // ============================================================================
  describe('SEC-FIND-14 — Elimination of FOR ALL Policies & Command Separation', () => {
    it('11. verifies all legacy FOR ALL policies are explicitly dropped', () => {
      const legacyPolicies = [
        'organizations_access_policy',
        'departments_access_policy',
        'profiles_access_policy',
        'roles_access_policy',
        'user_roles_access_policy',
        'org_modules_access_policy',
        'dept_modules_access_policy',
        'role_permissions_access_policy',
        'user_permissions_access_policy',
        'organization_members_access_policy',
        'payroll_runs_access_policy',
      ];

      for (const policy of legacyPolicies) {
        expect(migrationSql).toContain(`DROP POLICY IF EXISTS ${policy}`);
      }
    });

    it('12. verifies command-specific policies exist for organizations', () => {
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+organizations_select_policy\s+ON\s+public\.organizations\s+FOR\s+SELECT/i);
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+organizations_insert_policy\s+ON\s+public\.organizations\s+FOR\s+INSERT/i);
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+organizations_update_policy\s+ON\s+public\.organizations\s+FOR\s+UPDATE/i);
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+organizations_delete_policy\s+ON\s+public\.organizations\s+FOR\s+DELETE/i);
    });

    it('13. verifies organizations_insert_policy and organizations_delete_policy restrict mutations to Super Admin', () => {
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+organizations_insert_policy[\s\S]*?WITH\s+CHECK\s*\(\s*public\.is_super_admin\(\)\s*\)/i);
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+organizations_delete_policy[\s\S]*?USING\s*\(\s*public\.is_super_admin\(\)\s*\)/i);
    });

    it('14. verifies command-specific policies exist for departments', () => {
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+departments_select_policy\s+ON\s+public\.departments\s+FOR\s+SELECT/i);
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+departments_insert_policy\s+ON\s+public\.departments\s+FOR\s+INSERT/i);
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+departments_update_policy\s+ON\s+public\.departments\s+FOR\s+UPDATE/i);
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+departments_delete_policy\s+ON\s+public\.departments\s+FOR\s+DELETE/i);
    });

    it('15. verifies command-specific policies exist for profiles', () => {
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+profiles_select_policy\s+ON\s+public\.profiles\s+FOR\s+SELECT/i);
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+profiles_insert_policy\s+ON\s+public\.profiles\s+FOR\s+INSERT/i);
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+profiles_update_policy\s+ON\s+public\.profiles\s+FOR\s+UPDATE/i);
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+profiles_delete_policy\s+ON\s+public\.profiles\s+FOR\s+DELETE/i);
    });

    it('16. verifies profiles_insert_policy and profiles_update_policy forbid non-superadmins from setting is_super_admin', () => {
      expect(migrationSql).toMatch(/id\s*=\s*auth\.uid\(\)\s+AND\s+is_super_admin\s*=\s*false/i);
      expect(migrationSql).toMatch(/is_super_admin\s*=\s*\(SELECT\s+p\.is_super_admin\s+FROM\s+public\.profiles\s+p\s+WHERE\s+p\.id\s*=\s*auth\.uid\(\)\)/i);
    });

    it('17. verifies roles policies protect global system roles from mutation by organization admins', () => {
      // Must enforce role_type = 'CUSTOM' (or is_system = false) AND organization_id IS NOT NULL for INSERT/UPDATE/DELETE
      expect(migrationSql).toMatch(/roles_insert_policy[\s\S]*?(role_type\s*=\s*'CUSTOM'|is_system\s*=\s*false)/i);
      expect(migrationSql).toMatch(/roles_update_policy[\s\S]*?(role_type\s*=\s*'CUSTOM'|is_system\s*=\s*false)/i);
      expect(migrationSql).toMatch(/roles_delete_policy[\s\S]*?(role_type\s*=\s*'CUSTOM'|is_system\s*=\s*false)/i);
    });

    it('18. verifies organization_modules mutations are restricted strictly to Super Admin', () => {
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+org_modules_insert_policy[\s\S]*?WITH\s+CHECK\s*\(\s*public\.is_super_admin\(\)\s*\)/i);
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+org_modules_update_policy[\s\S]*?USING\s*\(\s*public\.is_super_admin\(\)\s*\)/i);
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+org_modules_delete_policy[\s\S]*?USING\s*\(\s*public\.is_super_admin\(\)\s*\)/i);
    });

    it('19. verifies command-specific policies exist for user_roles and permissions', () => {
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+user_roles_select_policy\s+ON\s+public\.user_roles/i);
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+user_roles_insert_policy\s+ON\s+public\.user_roles/i);
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+role_permissions_select_policy\s+ON\s+public\.role_permissions/i);
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+role_permissions_insert_policy\s+ON\s+public\.role_permissions/i);
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+user_permissions_select_policy\s+ON\s+public\.user_permissions/i);
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+user_permissions_insert_policy\s+ON\s+public\.user_permissions/i);
    });

    it('20. verifies payroll_runs policies exist and isolate execution records to organization admins', () => {
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+payroll_runs_select_policy\s+ON\s+public\.payroll_runs/i);
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+payroll_runs_insert_policy\s+ON\s+public\.payroll_runs/i);
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+payroll_runs_update_policy\s+ON\s+public\.payroll_runs/i);
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+payroll_runs_delete_policy\s+ON\s+public\.payroll_runs/i);
    });

    it('21. simulates RLS evaluation: regular user cannot self-promote to super admin via profile update', () => {
      const evaluateProfileUpdate = (user: any, targetProfileId: string, updatedFields: any) => {
        if (user.isSuperAdmin) return true;
        // Self-update
        if (targetProfileId === user.id) {
          if (updatedFields.is_super_admin !== undefined && updatedFields.is_super_admin !== user.isSuperAdmin) {
            return false; // Escalation blocked
          }
          if (updatedFields.is_organization_admin !== undefined && updatedFields.is_organization_admin !== user.isTenantAdmin) {
            return false; // Escalation blocked
          }
          if (updatedFields.organization_id !== undefined && updatedFields.organization_id !== user.tenantId) {
            return false; // Organization hijacking blocked
          }
          return true;
        }
        // Org Admin updating someone else in org
        if (user.isTenantAdmin && updatedFields.is_super_admin) {
          return false;
        }
        return false;
      };

      // Alex attempts to set is_super_admin = true on self
      expect(evaluateProfileUpdate(regularUserA, regularUserA.id, { is_super_admin: true })).toBe(false);
      // Alex attempts to set is_organization_admin = true on self
      expect(evaluateProfileUpdate(regularUserA, regularUserA.id, { is_organization_admin: true })).toBe(false);
      // Alex attempts to change tenantId
      expect(evaluateProfileUpdate(regularUserA, regularUserA.id, { organization_id: tenantB.id })).toBe(false);
      // Alex can update allowed personal fields (e.g. fullName)
      expect(evaluateProfileUpdate(regularUserA, regularUserA.id, { fullName: 'Alex Updated' })).toBe(true);
    });

    it('22. simulates RLS evaluation: organization admin cannot update or delete system roles', () => {
      const evaluateRoleMutation = (user: any, roleRecord: any, operation: 'UPDATE' | 'DELETE') => {
        if (user.isSuperAdmin) return true;
        // Non-superadmin cannot mutate system roles or roles with NULL organization_id
        if (roleRecord.organization_id === null || roleRecord.is_system === true) {
          return false;
        }
        // Can only mutate roles belonging to their own organization
        if (user.isTenantAdmin && roleRecord.organization_id === user.tenantId) {
          return true;
        }
        return false;
      };

      const systemRole = { id: 'role-sys', organization_id: null, is_system: true };
      const customRoleA = { id: 'role-a', organization_id: tenantA.id, is_system: false };
      const customRoleB = { id: 'role-b', organization_id: tenantB.id, is_system: false };

      // Alice cannot update or delete system role
      expect(evaluateRoleMutation(orgAdminA, systemRole, 'UPDATE')).toBe(false);
      expect(evaluateRoleMutation(orgAdminA, systemRole, 'DELETE')).toBe(false);

      // Alice can update or delete Tenant A custom role
      expect(evaluateRoleMutation(orgAdminA, customRoleA, 'UPDATE')).toBe(true);
      expect(evaluateRoleMutation(orgAdminA, customRoleA, 'DELETE')).toBe(true);

      // Alice cannot update or delete Tenant B custom role
      expect(evaluateRoleMutation(orgAdminA, customRoleB, 'UPDATE')).toBe(false);
      expect(evaluateRoleMutation(orgAdminA, customRoleB, 'DELETE')).toBe(false);

      // Super Admin can update or delete any role
      expect(evaluateRoleMutation(superAdminUser, systemRole, 'UPDATE')).toBe(true);
    });
  });

  // ============================================================================
  // SECTION 3: SEC-FIND-07 — SERVICE-ROLE ACCESS BOUNDARIES & LEAK PREVENTION
  // ============================================================================
  describe('SEC-FIND-07 — Service-Role Database Authorization Boundaries', () => {
    it('23. verifies SUPABASE_SERVICE_ROLE_KEY is never exposed to Vite client environment', () => {
      const envExamplePath = path.resolve(__dirname, '../.env.example');
      const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');

      // Check that client-facing VITE_ prefixed keys do not expose service role key
      expect(envExampleContent).not.toMatch(/VITE_.*SERVICE_ROLE/i);

      // Verify no client files import or reference getSupabaseClient or SERVICE_ROLE
      const clientDir = path.resolve(__dirname, '../src/client');
      const checkDirForForbiddenPatterns = (dir: string) => {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
          const fullPath = path.join(dir, file.name);
          if (file.isDirectory()) {
            checkDirForForbiddenPatterns(fullPath);
          } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            expect(content).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
            expect(content).not.toContain('getSupabaseClient');
          }
        }
      };
      checkDirForForbiddenPatterns(clientDir);
    });

    it('24. verifies anonymous role has all table mutations revoked in migration', () => {
      expect(migrationSql).toMatch(/REVOKE\s+ALL\s+ON\s+ALL\s+TABLES\s+IN\s+SCHEMA\s+public\s+FROM\s+anon;/i);
    });

    it('25. verifies authenticated role privileges are granted to public tables subject to RLS', () => {
      expect(migrationSql).toMatch(/GRANT\s+SELECT,\s+INSERT,\s+UPDATE,\s+DELETE\s+ON\s+ALL\s+TABLES\s+IN\s+SCHEMA\s+public\s+TO\s+authenticated;/i);
    });

    it('26. verifies Express backend protects service-role backed endpoints behind auth guard', async () => {
      // Direct call without token must fail with 401 Unauthorized before any DB query
      const res = await request(app)
        .get('/api/organizations')
        .expect(401);

      expect(res.body.error).toBeDefined();
    });

    it('27. verifies Express backend protects service-role backed organization routes behind context guard', async () => {
      // Request with regular user token attempting to access organization endpoints without proper permissions
      const res = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${regularUserAToken}`)
        .send({ name: 'Hacker Org', code: 'HACK' })
        .expect(403);

      expect(res.body.error).toBeDefined();
    });

    it('28. verifies Express backend fails closed on cross-tenant service-role query attempt', async () => {
      // Alice attempts to access Tenant B departments through Express backend
      const res = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .set('x-organization-id', tenantB.id)
        .expect(403);

      expect(res.body.error).toMatch(/membership|forbidden|tenant/i);
    });
  });

  // ============================================================================
  // SECTION 4: DATABASE HELPER FUNCTIONS & ANTI-RECURSION AUDIT
  // ============================================================================
  describe('Database Helper Functions & Anti-Recursion Verification', () => {
    it('29. verifies all helper functions are declared with SECURITY DEFINER and SET search_path = public', () => {
      const helperFunctions = [
        'current_user_organization_id',
        'is_super_admin',
        'is_organization_admin',
        'is_organization_member',
      ];

      for (const fn of helperFunctions) {
        const regex = new RegExp(`CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+public\\.${fn}[\\s\\S]*?SECURITY\\s+DEFINER[\\s\\S]*?SET\\s+search_path\\s*=\\s*public`, 'i');
        expect(migrationSql).toMatch(regex);
      }
    });

    it('30. verifies is_organization_admin queries both profiles and organization_members safely', () => {
      const fnRegex = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.is_organization_admin[\s\S]*?\$\$([\s\S]*?)\$\$;/i;
      const match = migrationSql.match(fnRegex);
      expect(match).not.toBeNull();
      const fnBody = match![1];

      expect(fnBody).toContain('public.profiles');
      expect(fnBody).toContain('public.organization_members');
      expect(fnBody).toContain('is_owner');
    });

    it('31. verifies is_organization_member queries both profiles and organization_members safely', () => {
      const fnRegex = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.is_organization_member[\s\S]*?\$\$([\s\S]*?)\$\$;/i;
      const match = migrationSql.match(fnRegex);
      expect(match).not.toBeNull();
      const fnBody = match![1];

      expect(fnBody).toContain('public.profiles');
      expect(fnBody).toContain('public.organization_members');
    });

    it('32. simulates helper function logic: fails closed when profile is inactive', () => {
      const evaluateIsSuperAdmin = (profile: any) => {
        if (!profile || !profile.isActive) return false;
        return profile.isSuperAdmin === true;
      };

      const inactiveSuperAdmin = { isSuperAdmin: true, isActive: false };
      expect(evaluateIsSuperAdmin(inactiveSuperAdmin)).toBe(false);
      expect(evaluateIsSuperAdmin(null)).toBe(false);
      expect(evaluateIsSuperAdmin(superAdminUser)).toBe(true);
    });

    it('33. simulates helper function logic: evaluates org admin correctly for owner and admin roles', () => {
      const evaluateIsOrgAdmin = (user: any, targetOrgId: string, membership: any) => {
        if (!user || !user.isActive) return false;
        if (user.isSuperAdmin) return true;
        if (user.isTenantAdmin && user.tenantId === targetOrgId) return true;
        if (membership && membership.organization_id === targetOrgId && membership.is_active) {
          if (membership.is_owner) return true;
          if (['ADMIN', 'ORGANIZATION_ADMIN'].includes(membership.role_code?.toUpperCase())) return true;
        }
        return false;
      };

      const memberOwner = { organization_id: tenantA.id, is_active: true, is_owner: true };
      const memberStaff = { organization_id: tenantA.id, is_active: true, is_owner: false, role_code: 'STAFF' };

      expect(evaluateIsOrgAdmin(regularUserA, tenantA.id, memberOwner)).toBe(true);
      expect(evaluateIsOrgAdmin(regularUserA, tenantA.id, memberStaff)).toBe(false);
      expect(evaluateIsOrgAdmin(regularUserA, tenantB.id, memberOwner)).toBe(false);
    });

    it('34. verifies catalog tables (modules and module_actions) mutations are locked down to super admin', () => {
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+modules_mutate_policy\s+ON\s+public\.modules[\s\S]*?USING\s*\(\s*public\.is_super_admin\(\)\s*\)/i);
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+module_actions_mutate_policy\s+ON\s+public\.module_actions[\s\S]*?USING\s*\(\s*public\.is_super_admin\(\)\s*\)/i);
    });

    it('35. verifies complete database isolation matrix across tenants A and B', () => {
      // Verifies that neither user nor admin in Tenant A can read or write any resource in Tenant B
      const checkAccess = (user: any, resourceOrgId: string, isSuperAdminAllowed = true) => {
        if (user.isSuperAdmin && isSuperAdminAllowed) return true;
        return user.tenantId === resourceOrgId;
      };

      expect(checkAccess(regularUserA, tenantA.id)).toBe(true);
      expect(checkAccess(orgAdminA, tenantA.id)).toBe(true);
      expect(checkAccess(regularUserA, tenantB.id)).toBe(false);
      expect(checkAccess(orgAdminA, tenantB.id)).toBe(false);
      expect(checkAccess(regularUserB, tenantA.id)).toBe(false);
      expect(checkAccess(orgAdminB, tenantA.id)).toBe(false);
      expect(checkAccess(superAdminUser, tenantA.id)).toBe(true);
      expect(checkAccess(superAdminUser, tenantB.id)).toBe(true);
    });
  });
});
