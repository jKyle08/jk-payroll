import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/db/repository.js';
import { generateTestToken } from '../src/middleware/auth.middleware.js';
import { permissionService } from '../src/features/access-control/services/permission.service.js';
import { dataScopingService } from '../src/middleware/data-scoping.middleware.js';

describe('Multi-Tenant, Departmental Hierarchy & Cascading RBAC Test Suite', () => {
  const app = createApp();

  // Test Entities
  let superAdminToken: string;
  let tenantA: any;
  let tenantB: any;
  let tenantAdminA: any;
  let tenantAdminAToken: string;
  let tenantAdminB: any;
  let tenantAdminBToken: string;

  let deptHQ_A: any;
  let deptHR_A: any;
  let deptHROps_A: any; // Sub-sub department
  let deptFin_A: any;

  let userHROps_A: any; // in deptHROps_A
  let userHROps_AToken: string;
  let userFinance_A: any; // in deptFin_A
  let userFinance_AToken: string;

  let deptHQ_B: any;
  let user_B: any;
  let user_BToken: string;

  // Catalog module and action IDs (pre-seeded)
  const MOD_TYPE_OF_LEAVE = '10000000-0000-0000-0000-000000000001';
  const MOD_REQUEST_FOR_LEAVE = '10000000-0000-0000-0000-000000000002';
  const MOD_PAYROLL = '10000000-0000-0000-0000-000000000003';

  const ACT_TYPE_OF_LEAVE_VIEW = '20000000-0000-0000-0000-000000000001';
  const ACT_TYPE_OF_LEAVE_ADD = '20000000-0000-0000-0000-000000000002';
  const ACT_REQUEST_FOR_LEAVE_VIEW = '20000000-0000-0000-0000-000000000011';
  const ACT_REQUEST_FOR_LEAVE_ADD = '20000000-0000-0000-0000-000000000012';

  beforeEach(() => {
    // Reset test data while retaining module & action catalog
    db.resetTestData();
    db.seedCatalog();

    // 1. Super Admin Profile
    const superAdmin = db.createProfile({
      fullName: 'Global Super Admin',
      isSuperAdmin: true,
      tenantId: '00000000-0000-0000-0000-000000000000',
    });
    // Dummy tenant for super admin
    db.tenants.set('00000000-0000-0000-0000-000000000000', {
      id: '00000000-0000-0000-0000-000000000000',
      name: 'System Root',
      code: 'ROOT',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    superAdminToken = generateTestToken({ userId: superAdmin.id, isSuperAdmin: true });

    // 2. Create Tenants A and B
    tenantA = db.createTenant({ name: 'Acme International', code: 'ACME' });
    tenantB = db.createTenant({ name: 'Beta Logistics', code: 'BETA' });

    // 3. Tenant Admins
    tenantAdminA = db.createProfile({
      fullName: 'Alice Tenant Admin',
      tenantId: tenantA.id,
      isTenantAdmin: true,
    });
    tenantAdminAToken = generateTestToken({ userId: tenantAdminA.id, tenantId: tenantA.id });

    tenantAdminB = db.createProfile({
      fullName: 'Bob Tenant Admin',
      tenantId: tenantB.id,
      isTenantAdmin: true,
    });
    tenantAdminBToken = generateTestToken({ userId: tenantAdminB.id, tenantId: tenantB.id });

    // 4. Department Hierarchy in Tenant A:
    // HQ -> HR -> HR-Ops
    // HQ -> Finance
    deptHQ_A = db.createDepartment({ tenantId: tenantA.id, code: 'HQ', name: 'Global HQ' });
    deptHR_A = db.createDepartment({ tenantId: tenantA.id, code: 'HR', name: 'Human Resources', parentDepartmentId: deptHQ_A.id });
    deptHROps_A = db.createDepartment({ tenantId: tenantA.id, code: 'HR-OPS', name: 'HR Operations', parentDepartmentId: deptHR_A.id });
    deptFin_A = db.createDepartment({ tenantId: tenantA.id, code: 'FIN', name: 'Finance & Accounts', parentDepartmentId: deptHQ_A.id });

    // Department in Tenant B
    deptHQ_B = db.createDepartment({ tenantId: tenantB.id, code: 'HQ-B', name: 'Beta HQ' });

    // 5. Normal Users
    userHROps_A = db.createProfile({
      fullName: 'Charlie HR Specialist',
      tenantId: tenantA.id,
      departmentId: deptHROps_A.id,
    });
    userHROps_AToken = generateTestToken({ userId: userHROps_A.id, tenantId: tenantA.id });

    userFinance_A = db.createProfile({
      fullName: 'David Accountant',
      tenantId: tenantA.id,
      departmentId: deptFin_A.id,
    });
    userFinance_AToken = generateTestToken({ userId: userFinance_A.id, tenantId: tenantA.id });

    user_B = db.createProfile({
      fullName: 'Eve Beta Worker',
      tenantId: tenantB.id,
      departmentId: deptHQ_B.id,
    });
    user_BToken = generateTestToken({ userId: user_B.id, tenantId: tenantB.id });
  });

  // ============================================================================
  // TEST CASE 1: TIER 1 -> TIER 2 CONSTRAINT
  // Attempting to assign a module to a department when tenant does not have it enabled
  // MUST FAIL.
  // ============================================================================
  describe('Security Test 1: Tier 1 -> Tier 2 Constraint', () => {
    it('MUST FAIL when allocating a module to a department if the tenant does not have it enabled', async () => {
      // Tenant A currently has NO modules enabled.
      // Tenant Admin A attempts to assign 'TypeOfLeave' to deptHR_A.
      const res = await request(app)
        .put(`/api/tenant/departments/${deptHR_A.id}/modules`)
        .set('Authorization', `Bearer ${tenantAdminAToken}`)
        .send({ moduleIds: [MOD_TYPE_OF_LEAVE] });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('not enabled for tenant');
    });

    it('SUCCEEDS after Super Admin enables the module for the tenant', async () => {
      // Super Admin enables TypeOfLeave and RequestForLeave for Tenant A
      const saRes = await request(app)
        .put(`/api/super-admin/tenants/${tenantA.id}/modules`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ moduleIds: [MOD_TYPE_OF_LEAVE, MOD_REQUEST_FOR_LEAVE] });

      expect(saRes.status).toBe(200);

      // Now Tenant Admin can successfully allocate TypeOfLeave to deptHR_A
      const deptRes = await request(app)
        .put(`/api/tenant/departments/${deptHR_A.id}/modules`)
        .set('Authorization', `Bearer ${tenantAdminAToken}`)
        .send({ moduleIds: [MOD_TYPE_OF_LEAVE] });

      expect(deptRes.status).toBe(200);
      expect(deptRes.body.allocatedModules).toHaveLength(1);
      expect(deptRes.body.allocatedModules[0].moduleId).toBe(MOD_TYPE_OF_LEAVE);
    });
  });

  // ============================================================================
  // TEST CASE 2: TIER 2 -> TIER 3 CONSTRAINT
  // Attempting to grant a user permission for a module not allocated to their department
  // MUST FAIL.
  // ============================================================================
  describe('Security Test 2: Tier 2 -> Tier 3 Constraint', () => {
    it('MUST FAIL when granting user permission for a module not allocated to user department', async () => {
      // 1. Enable TypeOfLeave and PayrollProcessing for Tenant A
      db.setTenantModules(tenantA.id, [MOD_TYPE_OF_LEAVE, MOD_PAYROLL]);

      // 2. Allocate TypeOfLeave ONLY to HR department (Finance does NOT have it)
      db.allocateDepartmentModules(tenantA.id, deptHR_A.id, [MOD_TYPE_OF_LEAVE]);

      // 3. Attempt to grant TypeOfLeave.Add to userFinance_A (who is in deptFin_A)
      const res = await request(app)
        .put(`/api/tenant/users/${userFinance_A.id}/permissions`)
        .set('Authorization', `Bearer ${tenantAdminAToken}`)
        .send({ actionIds: [ACT_TYPE_OF_LEAVE_ADD] });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('not allocated to department or its ancestors');
    });

    it('SUCCEEDS when granting permission for a module allocated to the department', async () => {
      // Enable TypeOfLeave for Tenant A and assign to HR department
      db.setTenantModules(tenantA.id, [MOD_TYPE_OF_LEAVE]);
      db.allocateDepartmentModules(tenantA.id, deptHR_A.id, [MOD_TYPE_OF_LEAVE]);

      // Since deptHROps_A is a child of deptHR_A, userHROps_A inherits TypeOfLeave!
      const res = await request(app)
        .put(`/api/tenant/users/${userHROps_A.id}/permissions`)
        .set('Authorization', `Bearer ${tenantAdminAToken}`)
        .send({ actionIds: [ACT_TYPE_OF_LEAVE_ADD] });

      expect(res.status).toBe(200);
      expect(res.body.permissions).toHaveLength(1);
    });
  });

  // ============================================================================
  // TEST CASE 3: IMPLICIT PERMISSION INHERITANCE
  // Querying TypeOfLeave with ONLY TypeOfLeave.Add must pass TypeOfLeave.View checks
  // ============================================================================
  describe('Security Test 3: Implicit Permission Inheritance (.Add -> .View)', () => {
    it('Querying TypeOfLeave with ONLY TypeOfLeave.Add successfully passes TypeOfLeave.View checks', async () => {
      // 1. Enable module for tenant and allocate to HR department
      db.setTenantModules(tenantA.id, [MOD_TYPE_OF_LEAVE]);
      db.allocateDepartmentModules(tenantA.id, deptHR_A.id, [MOD_TYPE_OF_LEAVE]);

      // 2. Explicitly grant ONLY TypeOfLeave.Add (NO explicit View granted!)
      db.assignUserPermissions(tenantA.id, userHROps_A.id, [ACT_TYPE_OF_LEAVE_ADD]);

      // Verify that effective permissions in database evaluation include TypeOfLeave.View
      const effectivePerms = permissionService.getUserEffectivePermissions(tenantA.id, userHROps_A.id);
      expect(effectivePerms).toContain('TypeOfLeave.Add');
      expect(effectivePerms).toContain('TypeOfLeave.View'); // Implicitly expanded!

      // 3. User creates a TypeOfLeave item via POST /api/type-of-leave (requires TypeOfLeave.Add)
      const postRes = await request(app)
        .post('/api/type-of-leave')
        .set('Authorization', `Bearer ${userHROps_AToken}`)
        .send({ code: 'VL', name: 'Vacation Leave', daysAllowed: 15 });

      expect(postRes.status).toBe(201);
      expect(postRes.body.leaveType.code).toBe('VL');

      // 4. User queries GET /api/type-of-leave (requires TypeOfLeave.View)
      // Must pass even though only TypeOfLeave.Add was directly assigned!
      const getRes = await request(app)
        .get('/api/type-of-leave')
        .set('Authorization', `Bearer ${userHROps_AToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.typesOfLeave).toHaveLength(1);
      expect(getRes.body.typesOfLeave[0].code).toBe('VL');
    });

    it('Fails access when user has NO permissions for that module', async () => {
      // userFinance_A has no permissions on TypeOfLeave
      const res = await request(app)
        .get('/api/type-of-leave')
        .set('Authorization', `Bearer ${userFinance_AToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Insufficient permissions');
    });
  });

  // ============================================================================
  // TEST CASE 4: CROSS-TENANT ISOLATION
  // Verifying that users from Tenant A cannot view or mutate entities in Tenant B
  // ============================================================================
  describe('Security Test 4: Cross-Tenant Isolation', () => {
    it('Users from Tenant A cannot view records belonging to Tenant B', async () => {
      // Seed leave types in Tenant A and Tenant B
      db.setTenantModules(tenantA.id, [MOD_TYPE_OF_LEAVE]);
      db.setTenantModules(tenantB.id, [MOD_TYPE_OF_LEAVE]);

      db.allocateDepartmentModules(tenantA.id, deptHR_A.id, [MOD_TYPE_OF_LEAVE]);
      db.allocateDepartmentModules(tenantB.id, deptHQ_B.id, [MOD_TYPE_OF_LEAVE]);

      db.assignUserPermissions(tenantA.id, userHROps_A.id, [ACT_TYPE_OF_LEAVE_VIEW]);
      db.assignUserPermissions(tenantB.id, user_B.id, [ACT_TYPE_OF_LEAVE_VIEW]);

      // Create leave types in respective tenants
      db.createTypeOfLeave(tenantA.id, { code: 'AL-A', name: 'Annual Leave Tenant A', daysAllowed: 20 });
      db.createTypeOfLeave(tenantB.id, { code: 'SL-B', name: 'Sick Leave Tenant B', daysAllowed: 10 });

      // User in Tenant A queries leave types
      const resA = await request(app)
        .get('/api/type-of-leave')
        .set('Authorization', `Bearer ${userHROps_AToken}`);

      expect(resA.status).toBe(200);
      expect(resA.body.typesOfLeave).toHaveLength(1);
      expect(resA.body.typesOfLeave[0].code).toBe('AL-A');
      // Must NOT contain Tenant B data
      expect(resA.body.typesOfLeave.some((item: any) => item.code === 'SL-B')).toBe(false);

      // User in Tenant B queries leave types
      const resB = await request(app)
        .get('/api/type-of-leave')
        .set('Authorization', `Bearer ${user_BToken}`);

      expect(resB.status).toBe(200);
      expect(resB.body.typesOfLeave).toHaveLength(1);
      expect(resB.body.typesOfLeave[0].code).toBe('SL-B');
      // Must NOT contain Tenant A data
      expect(resB.body.typesOfLeave.some((item: any) => item.code === 'AL-A')).toBe(false);
    });

    it('Tenant Admin A cannot manage departments in Tenant B', async () => {
      // Tenant Admin A tries to allocate modules to Tenant B's department
      const res = await request(app)
        .put(`/api/tenant/departments/${deptHQ_B.id}/modules`)
        .set('Authorization', `Bearer ${tenantAdminAToken}`)
        .send({ moduleIds: [MOD_TYPE_OF_LEAVE] });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('does not belong to tenant');
    });
  });

  // ============================================================================
  // TEST CASE 5: RECURSIVE DEPARTMENT HIERARCHY & TREE RETRIEVAL
  // ============================================================================
  describe('Department Hierarchy Tree & Ancestor Inheritance', () => {
    it('Correctly retrieves complete department tree for tenant', async () => {
      const res = await request(app)
        .get('/api/tenant/departments/tree')
        .set('Authorization', `Bearer ${tenantAdminAToken}`);

      expect(res.status).toBe(200);
      const tree = res.body.departmentTree;
      expect(tree).toHaveLength(1); // 1 root: HQ

      const hqNode = tree[0];
      expect(hqNode.code).toBe('HQ');
      expect(hqNode.children).toHaveLength(2); // HR and FIN

      const hrNode = hqNode.children.find((c: any) => c.code === 'HR');
      expect(hrNode).toBeDefined();
      expect(hrNode.children).toHaveLength(1); // HR-OPS
      expect(hrNode.children[0].code).toBe('HR-OPS');
    });

    it('Sub-department inherits module allocated at top-level HQ department', async () => {
      // Enable Payroll for Tenant A
      db.setTenantModules(tenantA.id, [MOD_PAYROLL]);

      // Allocate Payroll to root HQ department
      db.allocateDepartmentModules(tenantA.id, deptHQ_A.id, [MOD_PAYROLL]);

      // Both userHROps_A (deptHROps_A) and userFinance_A (deptFin_A) inherit Payroll!
      const eligibleHROps = permissionService.getEligibleModulesForUser(tenantA.id, userHROps_A.id);
      expect(eligibleHROps.some((m) => m.id === MOD_PAYROLL)).toBe(true);

      const eligibleFinance = permissionService.getEligibleModulesForUser(tenantA.id, userFinance_A.id);
      expect(eligibleFinance.some((m) => m.id === MOD_PAYROLL)).toBe(true);
    });
  });

  // ============================================================================
  // TEST CASE 6: DATA SCOPING UTILITY
  // Self, SubDepartment, EntireDepartment, Tenant
  // ============================================================================
  describe('Data Scoping Utility', () => {
    it('Correctly enforces Self, SubDepartment, and EntireDepartment scopes', async () => {
      // Create leave requests across the department tree in Tenant A:
      // Request 1: Charlie in HR-Ops
      const req1 = db.createLeaveRequest(tenantA.id, {
        departmentId: deptHROps_A.id,
        userId: userHROps_A.id,
        typeOfLeaveId: 'dummy-leave-id',
        startDate: '2026-11-10',
        endDate: '2026-11-12',
        daysCount: 3,
      });

      // Request 2: Another user in HR (parent of HR-Ops)
      const userHRParent = db.createProfile({
        fullName: 'Helen HR Manager',
        tenantId: tenantA.id,
        departmentId: deptHR_A.id,
      });
      const req2 = db.createLeaveRequest(tenantA.id, {
        departmentId: deptHR_A.id,
        userId: userHRParent.id,
        typeOfLeaveId: 'dummy-leave-id',
        startDate: '2026-11-15',
        endDate: '2026-11-16',
        daysCount: 2,
      });

      // Request 3: David in Finance
      const req3 = db.createLeaveRequest(tenantA.id, {
        departmentId: deptFin_A.id,
        userId: userFinance_A.id,
        typeOfLeaveId: 'dummy-leave-id',
        startDate: '2026-11-20',
        endDate: '2026-11-21',
        daysCount: 2,
      });

      const allRequests = [req1, req2, req3];

      // Context for Charlie (in HR-Ops)
      const charlieContext = {
        userId: userHROps_A.id,
        tenantId: tenantA.id,
        departmentId: deptHROps_A.id,
        fullName: userHROps_A.fullName,
        isTenantAdmin: false,
        isSuperAdmin: false,
        isActive: true,
      };

      // Scope: Self
      const selfScoped = dataScopingService.filterLeaveRequests(allRequests, charlieContext, 'Self');
      expect(selfScoped).toHaveLength(1);
      expect(selfScoped[0].id).toBe(req1.id);

      // Context for Helen (in HR)
      const helenContext = {
        userId: userHRParent.id,
        tenantId: tenantA.id,
        departmentId: deptHR_A.id,
        fullName: userHRParent.fullName,
        isTenantAdmin: false,
        isSuperAdmin: false,
        isActive: true,
      };

      // Scope: SubDepartment (only HR, not HR-Ops)
      const subDeptScoped = dataScopingService.filterLeaveRequests(allRequests, helenContext, 'SubDepartment');
      expect(subDeptScoped).toHaveLength(1);
      expect(subDeptScoped[0].id).toBe(req2.id);

      // Scope: EntireDepartment for Helen (HR + HR-Ops child!)
      const entireDeptScoped = dataScopingService.filterLeaveRequests(allRequests, helenContext, 'EntireDepartment');
      expect(entireDeptScoped).toHaveLength(2); // req1 (HR-Ops) and req2 (HR)
      expect(entireDeptScoped.map((r) => r.id)).toContain(req1.id);
      expect(entireDeptScoped.map((r) => r.id)).toContain(req2.id);
      expect(entireDeptScoped.map((r) => r.id)).not.toContain(req3.id); // Finance excluded

      // Scope: Tenant for Tenant Admin
      const adminContext = {
        userId: tenantAdminA.id,
        tenantId: tenantA.id,
        departmentId: null,
        fullName: tenantAdminA.fullName,
        isTenantAdmin: true,
        isSuperAdmin: false,
        isActive: true,
      };
      const tenantScoped = dataScopingService.filterLeaveRequests(allRequests, adminContext, 'Tenant');
      expect(tenantScoped).toHaveLength(3);
    });
  });

  // ============================================================================
  // TEST CASE 7: INACTIVE USER / INACTIVE TENANT
  // ============================================================================
  describe('Account Inactivity Enforcement', () => {
    it('Rejects requests if the user is inactive', async () => {
      // Deactivate Charlie
      userHROps_A.isActive = false;

      const res = await request(app)
        .get('/api/type-of-leave')
        .set('Authorization', `Bearer ${userHROps_AToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('User account is inactive');
    });

    it('Rejects requests if the tenant is inactive', async () => {
      // Deactivate Tenant A
      tenantA.isActive = false;

      const res = await request(app)
        .get('/api/type-of-leave')
        .set('Authorization', `Bearer ${userFinance_AToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Tenant account is inactive');
    });
  });

  // ============================================================================
  // TEST CASE 8: REQUIREPERMISSION SET CACHING & FAST EVALUATION
  // ============================================================================
  describe('requirePermission Set Caching & O(1) Resolution', () => {
    it('caches req.permissionSet and reuses it for subsequent permission checks', async () => {
      const { requirePermission } = await import('../src/middleware/rbac.guard.js');

      const mockReq: any = {
        user: { id: 'user-1', isSuperAdmin: false },
        effectivePermissions: ['TypeOfLeave.Add'],
      };
      const mockRes: any = {
        status: (code: number) => ({ json: (body: any) => body }),
      };
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      // 1. First evaluation: should build and cache permissionSet
      const guard = requirePermission('TypeOfLeave.View');
      guard(mockReq, mockRes, next);

      expect(nextCalled).toBe(true);
      expect(mockReq.permissionSet).toBeInstanceOf(Set);
      expect(mockReq.permissionSet.has('TypeOfLeave.Add')).toBe(true);

      const cachedInstance = mockReq.permissionSet;

      // 2. Second evaluation: should reuse the same Set instance
      nextCalled = false;
      const guard2 = requirePermission('TypeOfLeave.Add');
      guard2(mockReq, mockRes, next);

      expect(nextCalled).toBe(true);
      expect(mockReq.permissionSet).toBe(cachedInstance);
    });
  });
});
