// ==============================================================================
// JK-PAYROLL: SIDEBAR PERMISSION EVALUATION TESTS
// File: tests/sidebar.test.ts
// ==============================================================================

import { describe, it, expect } from 'vitest';
import { evaluatePermission } from '../src/features/access-control/hooks/use-permission.js';
import { PERMISSIONS } from '../src/lib/constants/permissions.js';

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
      const { MULTI_LEVEL_NAV_GROUPS } = await import('../src/components/layout/sidebar.js');

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
});
