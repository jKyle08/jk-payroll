import { describe, it, expect } from 'vitest';
import { evaluatePermission } from '../src/features/access-control/hooks/use-permission.js';
import { PERMISSIONS } from '../src/lib/constants/permissions.js';

describe('Client-Side Permission Evaluation Logic (evaluatePermission & usePermission)', () => {
  it('correctly matches direct permissions', () => {
    const userPerms = [PERMISSIONS.TYPE_OF_LEAVE.VIEW, PERMISSIONS.REQUEST_FOR_LEAVE.ADD];

    expect(evaluatePermission(userPerms, PERMISSIONS.TYPE_OF_LEAVE.VIEW)).toBe(true);
    expect(evaluatePermission(userPerms, PERMISSIONS.REQUEST_FOR_LEAVE.ADD)).toBe(true);
    expect(evaluatePermission(userPerms, PERMISSIONS.PAYROLL_COMPUTATION.VIEW)).toBe(false);
  });

  it('implicitly grants .View if user possesses .Add, .Edit, .Delete, or .Approval.Create', () => {
    // User ONLY has .Add for TypeOfLeave (no explicit .View)
    const userOnlyAdd = [PERMISSIONS.TYPE_OF_LEAVE.ADD];

    expect(evaluatePermission(userOnlyAdd, PERMISSIONS.TYPE_OF_LEAVE.VIEW)).toBe(true);
    expect(evaluatePermission(userOnlyAdd, PERMISSIONS.TYPE_OF_LEAVE.ADD)).toBe(true);
    expect(evaluatePermission(userOnlyAdd, PERMISSIONS.TYPE_OF_LEAVE.EDIT)).toBe(false);

    // User ONLY has .Approval.Create for RequestForLeave
    const userOnlyApproval = [PERMISSIONS.REQUEST_FOR_LEAVE.APPROVAL_CREATE];

    expect(evaluatePermission(userOnlyApproval, PERMISSIONS.REQUEST_FOR_LEAVE.VIEW)).toBe(true);
    expect(evaluatePermission(userOnlyApproval, PERMISSIONS.REQUEST_FOR_LEAVE.APPROVAL_CREATE)).toBe(true);

    // User ONLY has .Delete for PayrollComputation
    const userOnlyDelete = [PERMISSIONS.PAYROLL_COMPUTATION.DELETE];

    expect(evaluatePermission(userOnlyDelete, PERMISSIONS.PAYROLL_COMPUTATION.VIEW)).toBe(true);
    expect(evaluatePermission(userOnlyDelete, PERMISSIONS.PAYROLL_COMPUTATION.DELETE)).toBe(true);
  });

  it('correctly checks non-existent or empty permissions', () => {
    expect(evaluatePermission([], PERMISSIONS.TYPE_OF_LEAVE.VIEW)).toBe(false);
    expect(evaluatePermission(undefined as any, PERMISSIONS.TYPE_OF_LEAVE.VIEW)).toBe(false);
    expect(evaluatePermission(['Random.Key'], '')).toBe(false);
  });

  it('evaluates permissions directly when provided as a Set<string>', () => {
    const permSet = new Set<string>([PERMISSIONS.TYPE_OF_LEAVE.ADD]);

    expect(evaluatePermission(permSet, PERMISSIONS.TYPE_OF_LEAVE.VIEW)).toBe(true);
    expect(evaluatePermission(permSet, PERMISSIONS.TYPE_OF_LEAVE.ADD)).toBe(true);
    expect(evaluatePermission(permSet, PERMISSIONS.PAYROLL_COMPUTATION.VIEW)).toBe(false);
  });
});
