// ==============================================================================
// JK-PAYROLL: PHASE 1 SECURITY REGRESSION TEST SUITE
// File: tests/security-phase1.test.ts
// Tests: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { db } from '../src/server/db/repository.js';
import { generateTestToken } from '../src/server/middleware/auth.middleware.js';
import { roleService } from '../src/features/roles/role.service.js';
import { authService } from '../src/features/auth/auth.service.js';
import * as supabaseModule from '../src/server/db/supabase.js';

describe('Phase 1 — Critical Security Fixes Regression Suite', () => {
  const app = createApp();

  // Test Fixtures: Two distinct organizations (Tenant A and Tenant B) + Root Super Admin
  const rootOrgId = '00000000-0000-0000-0000-000000000000';
  let tenantA: any;
  let tenantB: any;

  let superAdminUser: any;
  let superAdminToken: string;

  let tenantAdminA: any;
  let tenantAdminAToken: string;
  let regularUserA: any;
  let regularUserAToken: string;

  let tenantAdminB: any;
  let tenantAdminBToken: string;
  let regularUserB: any;
  let regularUserBToken: string;

  let deptA: any;
  let deptB: any;

  let customRoleA: any;
  let customRoleB: any;
  let systemRole: any;

  beforeEach(() => {
    db.resetTestData();
    db.seedCatalog();

    // 1. Root Super Admin
    superAdminUser = db.createProfile({
      id: 'a0000000-0000-0000-0000-000000000001',
      tenantId: rootOrgId,
      fullName: 'Platform Super Admin',
      email: 'superadmin@paypulse.internal',
      isSuperAdmin: true,
      isTenantAdmin: false,
    });
    db.tenants.set(rootOrgId, {
      id: rootOrgId,
      name: 'SuperAdmin Platform',
      code: 'ROOT',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    superAdminToken = generateTestToken({
      userId: superAdminUser.id,
      tenantId: rootOrgId,
      isSuperAdmin: true,
    });

    // 2. Tenants A and B
    tenantA = db.createTenant({ name: 'Acme Corporation', code: 'ACME' });
    tenantB = db.createTenant({ name: 'Beta Industries', code: 'BETA' });

    // 3. Profiles for Tenant A
    tenantAdminA = db.createProfile({
      id: 'a0000000-0000-0000-0000-000000000002',
      tenantId: tenantA.id,
      fullName: 'Alice Tenant Admin A',
      email: 'alice@acme.com',
      isTenantAdmin: true,
      isSuperAdmin: false,
    });
    tenantAdminAToken = generateTestToken({
      userId: tenantAdminA.id,
      tenantId: tenantA.id,
      isTenantAdmin: true,
      isSuperAdmin: false,
    });

    regularUserA = db.createProfile({
      id: 'a0000000-0000-0000-0000-000000000003',
      tenantId: tenantA.id,
      fullName: 'Alex Regular User A',
      email: 'alex@acme.com',
      isTenantAdmin: false,
      isSuperAdmin: false,
    });
    regularUserAToken = generateTestToken({
      userId: regularUserA.id,
      tenantId: tenantA.id,
      isTenantAdmin: false,
      isSuperAdmin: false,
    });

    // 4. Profiles for Tenant B
    tenantAdminB = db.createProfile({
      id: 'b0000000-0000-0000-0000-000000000001',
      tenantId: tenantB.id,
      fullName: 'Bob Tenant Admin B',
      email: 'bob@beta.com',
      isTenantAdmin: true,
      isSuperAdmin: false,
    });
    tenantAdminBToken = generateTestToken({
      userId: tenantAdminB.id,
      tenantId: tenantB.id,
      isTenantAdmin: true,
      isSuperAdmin: false,
    });

    regularUserB = db.createProfile({
      id: 'b0000000-0000-0000-0000-000000000002',
      tenantId: tenantB.id,
      fullName: 'Betty Regular User B',
      email: 'betty@beta.com',
      isTenantAdmin: false,
      isSuperAdmin: false,
    });
    regularUserBToken = generateTestToken({
      userId: regularUserB.id,
      tenantId: tenantB.id,
      isTenantAdmin: false,
      isSuperAdmin: false,
    });

    // 5. Departments in Tenant A and Tenant B
    deptA = db.createDepartment({
      organizationId: tenantA.id,
      tenantId: tenantA.id,
      code: 'HR-A',
      name: 'Human Resources A',
    });
    deptB = db.createDepartment({
      organizationId: tenantB.id,
      tenantId: tenantB.id,
      code: 'HR-B',
      name: 'Human Resources B',
    });

    // 6. Custom and System Roles
    customRoleA = roleService.createRole({
      organizationId: tenantA.id,
      code: 'ACME_OFFICER',
      name: 'Acme Operations Officer',
      roleType: 'CUSTOM',
    });

    customRoleB = roleService.createRole({
      organizationId: tenantB.id,
      code: 'BETA_LEAD',
      name: 'Beta Team Lead',
      roleType: 'CUSTOM',
    });

    systemRole = db.getRoleById('c0000000-0000-0000-0000-000000000001'); // SUPER_ADMIN
  });

  // ============================================================================
  // SEC-01 — SECURE USER ROLE ASSIGNMENT
  // ============================================================================
  describe('SEC-01: Secure User Role Assignment', () => {
    it('Unauthenticated user cannot assign a role', async () => {
      const res = await request(app)
        .post('/api/user-roles')
        .send({
          userId: regularUserA.id,
          roleId: customRoleA.id,
          tenantId: tenantA.id,
        });

      expect(res.status).toBe(401);
    });

    it('Regular authenticated user cannot assign a role', async () => {
      const res = await request(app)
        .post('/api/user-roles')
        .set('Authorization', `Bearer ${regularUserAToken}`)
        .send({
          userId: regularUserA.id,
          roleId: customRoleA.id,
          tenantId: tenantA.id,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Tenant Admin privilege required');
    });

    it('Tenant Admin can assign an eligible role within their organization', async () => {
      const res = await request(app)
        .post('/api/user-roles')
        .set('Authorization', `Bearer ${tenantAdminAToken}`)
        .send({
          userId: regularUserA.id,
          roleId: customRoleA.id,
          tenantId: tenantA.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.roleId).toBe(customRoleA.id);
      expect(res.body.data.userId).toBe(regularUserA.id);
      expect(res.body.data.tenantId).toBe(tenantA.id);
    });

    it('Tenant Admin cannot assign a role from another organization', async () => {
      const res = await request(app)
        .post('/api/user-roles')
        .set('Authorization', `Bearer ${tenantAdminAToken}`)
        .send({
          userId: regularUserA.id,
          roleId: customRoleB.id, // belongs to Tenant B
          tenantId: tenantA.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('belongs to another organization');
    });

    it('Tenant Admin cannot assign a SYSTEM role without authorization', async () => {
      const res = await request(app)
        .post('/api/user-roles')
        .set('Authorization', `Bearer ${tenantAdminAToken}`)
        .send({
          userId: regularUserA.id,
          roleId: systemRole.id, // SUPER_ADMIN system role
          tenantId: tenantA.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('cannot assign a global SYSTEM role');
    });

    it('Tenant Admin cannot assign a role to a user from another organization', async () => {
      const res = await request(app)
        .post('/api/user-roles')
        .set('Authorization', `Bearer ${tenantAdminAToken}`)
        .send({
          userId: regularUserB.id, // User in Tenant B
          roleId: customRoleA.id,
          tenantId: tenantA.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Target user does not belong to your organization');
    });

    it('Tenant Admin cannot modify another organization user-role assignment', async () => {
      // Seed a user-role in Tenant B
      const assignmentB = db.assignUserRole({
        tenantId: tenantB.id,
        userId: regularUserB.id,
        roleId: customRoleB.id,
      });

      // Tenant Admin A tries to modify assignmentB
      const res = await request(app)
        .put(`/api/user-roles/${assignmentB.id}`)
        .set('Authorization', `Bearer ${tenantAdminAToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(404);

      // Tenant Admin A tries to delete assignmentB
      const delRes = await request(app)
        .delete(`/api/user-roles/${assignmentB.id}`)
        .set('Authorization', `Bearer ${tenantAdminAToken}`);

      expect(delRes.status).toBe(404);
    });
  });

  // ============================================================================
  // SEC-02 — PREVENT SUPER ADMIN PRIVILEGE INJECTION
  // ============================================================================
  describe('SEC-02: Prevent Super Admin Privilege Injection', () => {
    it('Tenant Admin cannot create a Super Admin', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tenantAdminAToken}`)
        .send({
          fullName: 'Malicious Escalated User',
          email: 'escalate@acme.com',
          isSuperAdmin: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.isSuperAdmin).toBe(false);

      // Verify in DB
      const createdInDb = db.getProfileById(res.body.user.id);
      expect(createdInDb?.isSuperAdmin).toBe(false);
    });

    it('Regular user cannot create any user or Super Admin', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${regularUserAToken}`)
        .send({
          fullName: 'Regular Created User',
          email: 'regular_attempt@acme.com',
          isSuperAdmin: true,
        });

      expect(res.status).toBe(403);
    });

    it('A request containing isSuperAdmin: true cannot escalate privileges via payload manipulation', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tenantAdminAToken}`)
        .send({
          fullName: 'Injected Privilege User',
          email: 'injected@acme.com',
          isSuperAdmin: true,
          tenantId: rootOrgId,
        });

      expect(res.status).toBe(201);
      expect(res.body.user.isSuperAdmin).toBe(false);
      expect(res.body.user.tenantId).toBe(tenantA.id); // Must remain Tenant A
    });

    it('Authorized Super Admin can create a Super Admin user', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          fullName: 'Second Super Administrator',
          email: 'superadmin2@paypulse.internal',
          isSuperAdmin: true,
          tenantId: rootOrgId,
        });

      expect(res.status).toBe(201);
      expect(res.body.user.isSuperAdmin).toBe(true);
    });
  });

  // ============================================================================
  // SEC-03 — FIX PERMISSION RPC AND FAIL-CLOSED BEHAVIOR
  // ============================================================================
  describe('SEC-03: Fix Permission RPC and Fail-Closed Behavior', () => {
    it('calls get_user_effective_permissions RPC with p_organization_id and p_user_id named parameters', async () => {
      const rpcSpy = vi.fn().mockResolvedValue({
        data: ['TypeOfLeave.View', 'RequestForLeave.View'],
        error: null,
      });

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'remote-user-123',
                  full_name: 'Remote User',
                  email: 'remote@example.com',
                  organization_id: tenantA.id,
                  department_id: deptA.id,
                  is_active: true,
                  is_organization_admin: false,
                  is_super_admin: false,
                },
              }),
            }),
          }),
        }),
        rpc: rpcSpy,
      };

      vi.spyOn(supabaseModule, 'getSupabaseClient').mockReturnValue(mockSupabase as any);

      const session = await authService.resolveUserSession('remote-user-123');

      expect(rpcSpy).toHaveBeenCalledWith('get_user_effective_permissions', {
        p_organization_id: tenantA.id,
        p_user_id: 'remote-user-123',
      });
      expect(session.effectivePermissions).toEqual(['TypeOfLeave.View', 'RequestForLeave.View']);

      vi.restoreAllMocks();
    });

    it('fails closed when RPC fails and never grants RequestForLeave.Approval.Create or default fallback', async () => {
      const rpcSpy = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'function get_user_effective_permissions does not exist' },
      });

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'remote-user-fail',
                  full_name: 'Remote User Failed',
                  email: 'fail@example.com',
                  organization_id: tenantA.id,
                  department_id: deptA.id,
                  is_active: true,
                  is_organization_admin: false,
                  is_super_admin: false,
                },
              }),
            }),
          }),
        }),
        rpc: rpcSpy,
      };

      vi.spyOn(supabaseModule, 'getSupabaseClient').mockReturnValue(mockSupabase as any);

      const session = await authService.resolveUserSession('remote-user-fail');

      // Fail-closed: Must be empty array, NOT permissive fallback!
      expect(session.effectivePermissions).toEqual([]);
      expect(session.effectivePermissions).not.toContain('RequestForLeave.Approval.Create');
      expect(session.effectivePermissions).not.toContain('PayrollComputation.View');

      vi.restoreAllMocks();
    });

    it('fails closed when RPC throws an exception', async () => {
      const rpcSpy = vi.fn().mockRejectedValue(new Error('Network connection timeout'));

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'remote-user-throw',
                  full_name: 'Remote User Throw',
                  email: 'throw@example.com',
                  organization_id: tenantA.id,
                  department_id: deptA.id,
                  is_active: true,
                  is_organization_admin: false,
                  is_super_admin: false,
                },
              }),
            }),
          }),
        }),
        rpc: rpcSpy,
      };

      vi.spyOn(supabaseModule, 'getSupabaseClient').mockReturnValue(mockSupabase as any);

      const session = await authService.resolveUserSession('remote-user-throw');

      expect(session.effectivePermissions).toEqual([]);
      expect(session.effectivePermissions).not.toContain('RequestForLeave.Approval.Create');

      vi.restoreAllMocks();
    });
  });

  // ============================================================================
  // SEC-04 — ENFORCE TENANT ISOLATION ON USER QUERIES
  // ============================================================================
  describe('SEC-04: Enforce Tenant Isolation on User Queries', () => {
    it('Tenant A cannot list Tenant B users even when specifying organizationId/tenantId query', async () => {
      const res = await request(app)
        .get(`/api/users?organizationId=${tenantB.id}`)
        .set('Authorization', `Bearer ${tenantAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBeGreaterThan(0);
      // All returned users must belong to Tenant A, none to Tenant B
      for (const u of res.body.users) {
        expect(u.tenantId).toBe(tenantA.id);
        expect(u.tenantId).not.toBe(tenantB.id);
      }
    });

    it('Tenant A cannot retrieve Tenant B user profiles by ID (returns 404)', async () => {
      const res = await request(app)
        .get(`/api/users/${regularUserB.id}`)
        .set('Authorization', `Bearer ${regularUserAToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('Super Admin can access cross-tenant user records', async () => {
      const res = await request(app)
        .get(`/api/users?organizationId=${tenantB.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBeGreaterThan(0);
      for (const u of res.body.users) {
        expect(u.tenantId).toBe(tenantB.id);
      }

      // Single lookup
      const singleRes = await request(app)
        .get(`/api/users/${regularUserB.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(singleRes.status).toBe(200);
      expect(singleRes.body.user.id).toBe(regularUserB.id);
    });
  });

  // ============================================================================
  // SEC-05 — PREVENT CROSS-TENANT DEPARTMENT IDOR
  // ============================================================================
  describe('SEC-05: Prevent Cross-Tenant Department IDOR', () => {
    it('Tenant A cannot retrieve Tenant B department by ID (returns 404)', async () => {
      const res = await request(app)
        .get(`/api/departments/${deptB.id}`)
        .set('Authorization', `Bearer ${regularUserAToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('Tenant Admin A cannot retrieve Tenant B department subtree (returns 404)', async () => {
      const res = await request(app)
        .get(`/api/departments/${deptB.id}/sub-tree`)
        .set('Authorization', `Bearer ${tenantAdminAToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('Tenant A cannot enumerate Tenant B departments via tree endpoint with organizationId parameter', async () => {
      const res = await request(app)
        .get(`/api/departments/tree?organizationId=${tenantB.id}`)
        .set('Authorization', `Bearer ${tenantAdminAToken}`);

      expect(res.status).toBe(200);
      // Must be scoped to Tenant A
      expect(res.body.tenantId).toBe(tenantA.id);
      if (res.body.departmentTree.length > 0) {
        expect(res.body.departmentTree[0].organizationId).toBe(tenantA.id);
      }
    });

    it('Super Admin can access authorized departments across tenants', async () => {
      const res = await request(app)
        .get(`/api/departments/${deptB.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.department.id).toBe(deptB.id);
      expect(res.body.department.organizationId).toBe(tenantB.id);
    });
  });

  // ============================================================================
  // SEC-06 — RESTRICT ORGANIZATION DIRECTORY ACCESS
  // ============================================================================
  describe('SEC-06: Restrict Organization Directory Access', () => {
    it('Regular user only retrieves their own organization and cannot enumerate other tenants', async () => {
      const res = await request(app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${regularUserAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toBeDefined();
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].id).toBe(tenantA.id);
      expect(res.body.items[0].name).toBe('Acme Corporation');
      expect(res.body.total).toBe(1);
    });

    it('Tenant Admin only retrieves their own organization', async () => {
      const res = await request(app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${tenantAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].id).toBe(tenantA.id);
      expect(res.body.items.find((o: any) => o.id === tenantB.id)).toBeUndefined();
    });

    it('Tenant Admin cannot search or query across another organization directory', async () => {
      const res = await request(app)
        .get('/api/organizations?search=Beta')
        .set('Authorization', `Bearer ${tenantAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(0); // Scoped to Tenant A, where Beta does not exist
      expect(res.body.total).toBe(0); // 0 matching results in scope
    });

    it('Super Admin retains platform-wide access and can list all organizations', async () => {
      const res = await request(app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(2);
      const foundA = res.body.items.find((o: any) => o.id === tenantA.id);
      const foundB = res.body.items.find((o: any) => o.id === tenantB.id);
      expect(foundA).toBeDefined();
      expect(foundB).toBeDefined();
    });
  });
});
