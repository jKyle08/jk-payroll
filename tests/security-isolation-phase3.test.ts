// ==============================================================================
// JK-PAYROLL: PHASE 3 SECURITY REMEDIATION TEST SUITE
// File: tests/security-isolation-phase3.test.ts
// Findings: SEC-FIND-06A, SEC-FIND-06B, Terminology Standardization
// Scope: Cross-Organization Resource Isolation, Role IDOR, Administrative Hardening
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { db } from '../src/server/db/repository.js';
import { generateTestToken } from '../src/server/middleware/auth.middleware.js';
import * as supabaseModule from '../src/server/db/supabase.js';
import { roleService } from '../src/features/roles/role.service.js';

describe('Phase 3 — Cross-Organization Resource Isolation & IDOR Remediation Suite', () => {
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

  let customRoleA: any;
  let customRoleB: any;
  let systemRole: any;

  let deptA: any;
  let deptB: any;

  let userRoleA: any;
  let userRoleB: any;

  beforeEach(() => {
    db.resetTestData();
    db.seedCatalog();

    // Mock remote Supabase client to ensure pure in-memory execution without network latency
    const mockSupabase = {
      from: vi.fn().mockImplementation((_table: string) => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((_col1: string, _val1: any) => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            eq: vi.fn().mockImplementation((_col2: string, _val2: any) => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        }),
      })),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    vi.spyOn(supabaseModule, 'getSupabaseClient').mockReturnValue(mockSupabase as any);

    // 1. Root Platform Super Admin
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
      fullName: 'Platform Super Administrator',
      email: 'superadmin@paypulse.internal',
      isTenantAdmin: false,
      isSuperAdmin: true,
      isActive: true,
    });
    superAdminToken = generateTestToken({
      userId: superAdminUser.id,
      tenantId: rootOrgId,
      isSuperAdmin: true,
      isTenantAdmin: false,
    });

    // 2. Organizations A & B
    tenantA = db.createTenant({ name: 'Acme Corporation', code: 'ACME' });
    tenantA.isActive = true;
    tenantA.status = 'Active';
    tenantA.endDate = '2099-12-31';
    db.tenants.set(tenantA.id, tenantA);

    tenantB = db.createTenant({ name: 'Beta Industries', code: 'BETA' });
    tenantB.isActive = true;
    tenantB.status = 'Active';
    tenantB.endDate = '2099-12-31';
    db.tenants.set(tenantB.id, tenantB);

    // Ensure standard modules are allocated to both organizations
    const deptMod = Array.from(db.modules.values()).find((m) => m.code === 'Department');
    const roleMod = Array.from(db.modules.values()).find((m) => m.code === 'RolePermission');
    const empMod = Array.from(db.modules.values()).find((m) => m.code === 'EmployeeProfile');
    const moduleIds = [deptMod?.id, roleMod?.id, empMod?.id].filter(Boolean) as string[];

    db.setTenantModules(tenantA.id, moduleIds);
    db.setTenantModules(tenantB.id, moduleIds);

    // 3. Organization A Profiles
    orgAdminA = db.createProfile({
      id: 'a0000000-0000-0000-0000-000000000002',
      tenantId: tenantA.id,
      fullName: 'Alice Org Admin A',
      email: 'alice@acme.com',
      isTenantAdmin: true,
      isSuperAdmin: false,
      isActive: true,
    });
    orgAdminAToken = generateTestToken({
      userId: orgAdminA.id,
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
      isActive: true,
    });
    regularUserAToken = generateTestToken({
      userId: regularUserA.id,
      tenantId: tenantA.id,
      isTenantAdmin: false,
      isSuperAdmin: false,
    });

    // 4. Organization B Profiles
    orgAdminB = db.createProfile({
      id: 'b0000000-0000-0000-0000-000000000001',
      tenantId: tenantB.id,
      fullName: 'Bob Org Admin B',
      email: 'bob@beta.com',
      isTenantAdmin: true,
      isSuperAdmin: false,
      isActive: true,
    });
    orgAdminBToken = generateTestToken({
      userId: orgAdminB.id,
      tenantId: tenantB.id,
      isTenantAdmin: true,
      isSuperAdmin: false,
    });

    regularUserB = db.createProfile({
      id: 'b0000000-0000-0000-0000-000000000002',
      tenantId: tenantB.id,
      fullName: 'Bella Regular User B',
      email: 'bella@beta.com',
      isTenantAdmin: false,
      isSuperAdmin: false,
      isActive: true,
    });
    regularUserBToken = generateTestToken({
      userId: regularUserB.id,
      tenantId: tenantB.id,
      isTenantAdmin: false,
      isSuperAdmin: false,
    });

    // 5. Roles
    customRoleA = roleService.createRole({
      organizationId: tenantA.id,
      code: 'ACME_ENGINEER',
      name: 'Acme Engineer',
      description: 'Engineering role in Organization A',
      roleType: 'CUSTOM',
    });

    customRoleB = roleService.createRole({
      organizationId: tenantB.id,
      code: 'BETA_OPERATOR',
      name: 'Beta Operator',
      description: 'Operations role in Organization B',
      roleType: 'CUSTOM',
    });

    systemRole = roleService.createRole({
      organizationId: null,
      code: 'SYSTEM_SUPERADMIN',
      name: 'Super Administrator',
      description: 'Global system role',
      roleType: 'SYSTEM',
      isMutable: false,
    });

    // Seed some permissions for Role A
    const deptViewAction = Array.from(db.moduleActions.values()).find(
      (a) => a.fullKey === 'Department.View'
    );
    if (deptViewAction) {
      roleService.assignRolePermissions(customRoleA.id, [deptViewAction.id]);
    }

    // 6. Departments
    deptA = db.createDepartment({
      organizationId: tenantA.id,
      code: 'ACME_HQ',
      name: 'Acme Headquarters',
      isActive: true,
    });

    deptB = db.createDepartment({
      organizationId: tenantB.id,
      code: 'BETA_HQ',
      name: 'Beta Headquarters',
      isActive: true,
    });

    // 7. User Role Assignments
    userRoleA = db.assignUserRole({
      tenantId: tenantA.id,
      userId: regularUserA.id,
      roleId: customRoleA.id,
    });

    userRoleB = db.assignUserRole({
      tenantId: tenantB.id,
      userId: regularUserB.id,
      roleId: customRoleB.id,
    });
  });

  // ============================================================================
  // SEC-FIND-06B: ROLE ENDPOINT CROSS-ORGANIZATION IDOR
  // ============================================================================
  describe('SEC-FIND-06B: Role Endpoint Cross-Organization IDOR', () => {
    it('1. Organization A can retrieve its own role', async () => {
      const res = await request(app)
        .get(`/api/roles/${customRoleA.id}`)
        .set('Authorization', `Bearer ${orgAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.role.id).toBe(customRoleA.id);
      expect(res.body.role.organizationId).toBe(tenantA.id);
    });

    it("2. Organization A cannot retrieve Organization B's role (returns 404/403)", async () => {
      const res = await request(app)
        .get(`/api/roles/${customRoleB.id}`)
        .set('Authorization', `Bearer ${orgAdminAToken}`);

      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it("3. Organization A cannot update Organization B's role (returns 404/403)", async () => {
      const res = await request(app)
        .put(`/api/roles/${customRoleB.id}`)
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({ name: 'Tampered Name by Org A' });

      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);

      // Verify role in DB remains intact
      const freshRoleB = db.roles.get(customRoleB.id);
      expect(freshRoleB?.name).toBe('Beta Operator');
    });

    it("4. Organization A cannot delete Organization B's role (returns 404/403)", async () => {
      const res = await request(app)
        .delete(`/api/roles/${customRoleB.id}`)
        .set('Authorization', `Bearer ${orgAdminAToken}`);

      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);

      // Verify role still exists in DB
      expect(db.roles.has(customRoleB.id)).toBe(true);
    });

    it("5. Organization A cannot retrieve Organization B's role permissions", async () => {
      const res = await request(app)
        .get(`/api/roles/${customRoleB.id}/permissions`)
        .set('Authorization', `Bearer ${orgAdminAToken}`);

      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it("6. Organization A cannot assign permissions to Organization B's role", async () => {
      const deptAddAction = Array.from(db.moduleActions.values()).find(
        (a) => a.fullKey === 'Department.Add'
      );
      expect(deptAddAction).toBeDefined();

      const res = await request(app)
        .put(`/api/roles/${customRoleB.id}/permissions`)
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({ actionIds: [deptAddAction!.id] });

      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it("7. Organization A cannot remove permissions from Organization B's role via permissions endpoint", async () => {
      const res = await request(app)
        .put(`/api/roles/${customRoleB.id}/permissions`)
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({ actionIds: [] });

      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('8. Organization A cannot modify global system roles (returns 403 SYSTEM_ROLE_MODIFICATION_FORBIDDEN)', async () => {
      const res = await request(app)
        .put(`/api/roles/${systemRole.id}`)
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({ name: 'Tampered System Admin' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('SYSTEM_ROLE_MODIFICATION_FORBIDDEN');
    });

    it('9. Organization A cannot create a role under Organization B by manipulating the request body', async () => {
      const res = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({
          organizationId: tenantB.id, // Attacker attempts to target Org B
          code: 'SPOOFED_ROLE',
          name: 'Spoofed Role',
          roleType: 'CUSTOM',
        });

      // Role must be created under Org A's validated context, NOT Org B
      expect(res.status).toBe(201);
      expect(res.body.data.organizationId).toBe(tenantA.id);
      expect(res.body.data.organizationId).not.toBe(tenantB.id);
    });

    it('10. Role permission assignment validates every permission against catalog and active licensing', async () => {
      const res = await request(app)
        .put(`/api/roles/${customRoleA.id}/permissions`)
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({ actionIds: ['00000000-0000-0000-0000-000000000099'] }); // Non-existent action

      expect([400, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('11. Role endpoints reject requests without a valid token/session context', async () => {
      const res = await request(app).get(`/api/roles/${customRoleA.id}`);
      expect(res.status).toBe(401);
    });

    it('12. Organization ownership does not bypass required RBAC permissions', async () => {
      // Regular user A is a member of Org A, but lacks TenantAdmin / role management permissions
      const res = await request(app)
        .put(`/api/roles/${customRoleA.id}`)
        .set('Authorization', `Bearer ${regularUserAToken}`)
        .send({ name: 'Regular User Tampering' });

      expect(res.status).toBe(403);
    });

    it('13. Super Admin operations work only through explicitly authorized paths', async () => {
      // Super Admin can inspect custom roles across organizations
      const res = await request(app)
        .get(`/api/roles/${customRoleA.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.role.id).toBe(customRoleA.id);

      // Super Admin can also update global system roles
      const updateSysRes = await request(app)
        .put(`/api/roles/${systemRole.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ description: 'Updated global system description by Super Admin' });

      expect(updateSysRes.status).toBe(200);
    });
  });

  // ============================================================================
  // SEC-FIND-06A: ADMINISTRATIVE CONTROLLER IDOR TESTS
  // ============================================================================
  describe('SEC-FIND-06A: Administrative Controller IDOR', () => {
    it("14. Organization A cannot retrieve Organization B's department by ID (returns 404)", async () => {
      const res = await request(app)
        .get(`/api/departments/${deptB.id}`)
        .set('Authorization', `Bearer ${orgAdminAToken}`);

      expect(res.status).toBe(404);
    });

    it("15. Organization A cannot update Organization B's department (returns 404/400)", async () => {
      const res = await request(app)
        .put(`/api/departments/${deptB.id}`)
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({ name: 'Tampered Department Name' });

      expect([400, 403, 404]).toContain(res.status);
      expect(db.departments.get(deptB.id)?.name).toBe('Beta Headquarters');
    });

    it("16. Organization A cannot delete Organization B's department (returns 404/400)", async () => {
      const res = await request(app)
        .delete(`/api/departments/${deptB.id}`)
        .set('Authorization', `Bearer ${orgAdminAToken}`);

      expect([400, 403, 404]).toContain(res.status);
      expect(db.departments.has(deptB.id)).toBe(true);
    });

    it('17. Organization A cannot attach an unrelated user from Organization B as Department Head', async () => {
      const res = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({
          code: 'ACME_NEW',
          name: 'Acme New Branch',
          headUserId: regularUserB.id, // User from Org B!
        });

      expect([400, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it("18. Organization A cannot modify Organization B's user-role assignments (returns 404/400)", async () => {
      const res = await request(app)
        .put(`/api/user-roles/${userRoleB.id}`)
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({ isActive: false });

      expect([400, 403, 404]).toContain(res.status);
    });

    it("19. Organization A cannot modify Organization B's department-module assignments", async () => {
      const deptModule = Array.from(db.modules.values()).find((m) => m.code === 'Department');
      expect(deptModule).toBeDefined();

      const res = await request(app)
        .put(`/api/departments/${deptB.id}/modules`)
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({ moduleIds: [deptModule!.id] });

      expect([400, 403, 404]).toContain(res.status);
    });

    it("20. Organization A cannot modify Organization B's organization-module assignments (requires SuperAdmin)", async () => {
      const res = await request(app)
        .put(`/api/organizations/${tenantB.id}/modules`)
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({ moduleCodes: ['Department'] });

      expect(res.status).toBe(403);
    });

    it('21. Department hierarchy operations cannot reference parent departments from another organization', async () => {
      const res = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({
          code: 'ACME_SUB',
          name: 'Acme Sub Branch',
          parentDepartmentId: deptB.id, // Parent belonging to Org B!
        });

      expect([400, 403]).toContain(res.status);
    });

    it('22. User permissions cannot be modified across organizations', async () => {
      const deptViewAction = Array.from(db.moduleActions.values()).find(
        (a) => a.fullKey === 'Department.View'
      );
      expect(deptViewAction).toBeDefined();

      // Org Admin A attempts to modify User B's permissions
      const res = await request(app)
        .put(`/api/users/${regularUserB.id}/permissions`)
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({ actionIds: [deptViewAction!.id] });

      expect(res.status).toBe(404);
    });

    it('23. Administrative endpoints reject missing organization context where required', async () => {
      const res = await request(app)
        .get('/api/roles')
        .set('x-organization-id', '99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${regularUserAToken}`);

      expect([403, 404]).toContain(res.status);
    });

    it('24. Valid Super Admin administrative access continues to work across organizations', async () => {
      const res = await request(app)
        .get(`/api/departments/${deptA.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.department.id).toBe(deptA.id);

      const resB = await request(app)
        .get(`/api/departments/${deptB.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(resB.status).toBe(200);
      expect(resB.body.department.id).toBe(deptB.id);
    });

    it('25. Ordinary organization administrators cannot access global administrative resources or routes', async () => {
      // Ordinary Org Admin A attempts to hit /api/super-admin/tenants
      const res = await request(app)
        .post('/api/super-admin/tenants')
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({ name: 'Malicious Org', code: 'MAL' });

      expect(res.status).toBe(403);
    });
  });

  // ============================================================================
  // TERMINOLOGY STANDARDIZATION & REGRESSION TESTS
  // ============================================================================
  describe('Terminology Standardization & Context Consistency', () => {
    it('26. Existing API functionality continues to work after internal terminology changes', async () => {
      const res = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${orgAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('27. Existing organization context middleware and request types expose organizationId and tenantId consistently', async () => {
      const res = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${orgAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tenantId).toBe(tenantA.id);
    });

    it('28. No duplicate tenant and organization context values can conflict', async () => {
      // Sending both x-organization-id and x-tenant-id matching the active organization
      const res = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .set('x-organization-id', tenantA.id)
        .set('x-tenant-id', tenantA.id);

      expect(res.status).toBe(200);
    });

    it('29. Database schema and queries maintain organization_id alignment without introducing ad-hoc columns', () => {
      // Verify in-memory repository profiles and roles adhere to organizationId
      const role = db.roles.get(customRoleA.id);
      expect(role).toBeDefined();
      expect(role?.organizationId).toBe(tenantA.id);
    });

    it('30. Access Control matrix lookup is strictly scoped to the active organization', async () => {
      // Org Admin A attempts to access permission matrix for Org B's role
      const res = await request(app)
        .get(`/api/access-control/matrix/${customRoleB.id}`)
        .set('Authorization', `Bearer ${orgAdminAToken}`);

      expect([403, 404]).toContain(res.status);
    });
  });
});
