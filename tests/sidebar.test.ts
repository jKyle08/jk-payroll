// ==============================================================================
// JK-PAYROLL: SIDEBAR PERMISSION EVALUATION TESTS
// File: tests/sidebar.test.ts
// ==============================================================================

import { describe, it, expect } from 'vitest';
import { evaluatePermission } from '../src/features/access-control/hooks/use-permission.js';
import { PERMISSIONS } from '../src/shared/constants/permissions.js';

describe('Sidebar Navigation Permission Logic', () => {
  it('hides leave types and requests if user has no permissions', () => {
    const userPermissions: string[] = [];

    expect(evaluatePermission(userPermissions, PERMISSIONS.TYPE_OF_LEAVE.VIEW)).toBe(false);
    expect(evaluatePermission(userPermissions, PERMISSIONS.REQUEST_FOR_LEAVE.VIEW)).toBe(false);
    expect(evaluatePermission(userPermissions, PERMISSIONS.PAYROLL_COMPUTATION.VIEW)).toBe(false);
  });

  it('displays TypeOfLeave when user has TypeOfLeave.View', () => {
    const userPermissions = ['TypeOfLeave.View'];
    expect(evaluatePermission(userPermissions, PERMISSIONS.TYPE_OF_LEAVE.VIEW)).toBe(true);
    expect(evaluatePermission(userPermissions, PERMISSIONS.REQUEST_FOR_LEAVE.VIEW)).toBe(false);
  });

  it('displays TypeOfLeave when user has mutating action TypeOfLeave.Add (implied view)', () => {
    const userPermissions = ['TypeOfLeave.Add'];
    expect(evaluatePermission(userPermissions, PERMISSIONS.TYPE_OF_LEAVE.VIEW)).toBe(true);
  });

  it('displays RequestForLeave when user has RequestForLeave.Approval.Create (implied view)', () => {
    const userPermissions = ['RequestForLeave.Approval.Create'];
    expect(evaluatePermission(userPermissions, PERMISSIONS.REQUEST_FOR_LEAVE.VIEW)).toBe(true);
  });

  it('displays PayrollComputation when user has PayrollComputation.Edit (implied view)', () => {
    const userPermissions = ['PayrollComputation.Edit'];
    expect(evaluatePermission(userPermissions, PERMISSIONS.PAYROLL_COMPUTATION.VIEW)).toBe(true);
  });

  describe('Multi-Level Grouping & Category Hierarchy', () => {
    it('verifies category groups and multi-level nested children exist', async () => {
      const { MULTI_LEVEL_NAV_GROUPS } = await import('../src/client/components/layout/sidebar.js');

      expect(MULTI_LEVEL_NAV_GROUPS.length).toBeGreaterThanOrEqual(4);

      const adminCat = MULTI_LEVEL_NAV_GROUPS.find((g) => g.id === 'administration-cat');
      expect(adminCat).toBeDefined();
      expect(adminCat?.title).toBe('Administration');

      // Verify nested folders (Level 2) and children (Level 3)
      const deptGroup = adminCat?.items.find((i) => i.id === 'departments-group');
      expect(deptGroup).toBeDefined();
      expect(deptGroup?.children?.length).toBeGreaterThanOrEqual(2);

      const deptTree = deptGroup?.children?.find((c) => c.id === 'departments');
      expect(deptTree?.requiredPermission).toBe(PERMISSIONS.DEPARTMENT.VIEW);
    });

    it('evaluates permission visibility for administrative nested modules', () => {
      // User with ONLY Department.Add should have access to Department.View
      const userPermissions = ['Department.Add', 'Tenant.View'];

      expect(evaluatePermission(userPermissions, PERMISSIONS.DEPARTMENT.VIEW)).toBe(true);
      expect(evaluatePermission(userPermissions, PERMISSIONS.TENANT.VIEW)).toBe(true);
      expect(evaluatePermission(userPermissions, PERMISSIONS.PROFILE.VIEW)).toBe(false);
      expect(evaluatePermission(userPermissions, PERMISSIONS.ROLE_PERMISSION.VIEW)).toBe(false);
    });
  });

  describe('Super Admin Organization Workspace Swapping & Module Allocation', () => {
    it('verifies FLATTENED_NAV_SECTIONS associate items with module codes', async () => {
      const { FLATTENED_NAV_SECTIONS } = await import('../src/client/components/layout/sidebar.js');

      const allItems = FLATTENED_NAV_SECTIONS.flatMap((s) => s.items);

      const payrollItem = allItems.find((i) => i.id === 'payroll-computation');
      expect(payrollItem).toBeDefined();
      expect(payrollItem?.moduleCode).toBe('PayrollProcessing');

      const leaveTypeItem = allItems.find((i) => i.id === 'type-of-leave');
      expect(leaveTypeItem).toBeDefined();
      expect(leaveTypeItem?.moduleCode).toBe('TypeOfLeave');

      const leaveReqItem = allItems.find((i) => i.id === 'request-for-leave');
      expect(leaveReqItem).toBeDefined();
      expect(leaveReqItem?.moduleCode).toBe('RequestForLeave');

      const deptItem = allItems.find((i) => i.id === 'departments');
      expect(deptItem).toBeDefined();
      expect(deptItem?.moduleCode).toBe('Department');
    });

    it('filters out modules when an organization has only core modules allocated', async () => {
      const { FLATTENED_NAV_SECTIONS } = await import('../src/client/components/layout/sidebar.js');

      // Tenant with ONLY Core modules (No Payroll or Leaves)
      const allocatedModules = ['Department', 'EmployeeProfile', 'RolePermission'];

      const allItems = FLATTENED_NAV_SECTIONS.flatMap((s) => s.items);

      const visibleItems = allItems.filter((item) => {
        if (item.moduleCode && !allocatedModules.includes(item.moduleCode)) {
          return false;
        }
        return true;
      });

      const visibleIds = visibleItems.map((i) => i.id);

      // Core modules are visible (Role Directory is in sidebar, User Role is assigned via Role Directory)
      expect(visibleIds).toContain('dashboard');
      expect(visibleIds).toContain('departments');
      expect(visibleIds).toContain('employee-profiles');
      expect(visibleIds).toContain('roles-directory');
      expect(visibleIds).not.toContain('employee-roles');

      // Unallocated add-on modules are hidden
      expect(visibleIds).not.toContain('payroll-computation');
      expect(visibleIds).not.toContain('request-for-leave');
      expect(visibleIds).not.toContain('type-of-leave');
    });

    it('enables all modules when the swapped organization has full enterprise module suite', async () => {
      const { FLATTENED_NAV_SECTIONS } = await import('../src/client/components/layout/sidebar.js');

      const fullSuite = [
        'Department',
        'EmployeeProfile',
        'RolePermission',
        'PayrollProcessing',
        'TypeOfLeave',
        'RequestForLeave',
      ];

      const allItems = FLATTENED_NAV_SECTIONS.flatMap((s) => s.items);

      const visibleItems = allItems.filter((item) => {
        if (item.moduleCode && !fullSuite.includes(item.moduleCode)) {
          return false;
        }
        return true;
      });

      const visibleIds = visibleItems.map((i) => i.id);

      expect(visibleIds).toContain('dashboard');
      expect(visibleIds).toContain('departments');
      expect(visibleIds).toContain('payroll-computation');
      expect(visibleIds).toContain('request-for-leave');
      expect(visibleIds).toContain('type-of-leave');
    });

    it('exports OrganizationSwitcherModal and Sidebar components', async () => {
      const { Sidebar, OrganizationSwitcherModal } = await import('../src/client/components/layout/index.js');
      expect(Sidebar).toBeDefined();
      expect(typeof Sidebar).toBe('function');
      expect(OrganizationSwitcherModal).toBeDefined();
      expect(typeof OrganizationSwitcherModal).toBe('function');
    });
  });
});
