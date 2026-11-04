// ==============================================================================
// JK-PAYROLL: ACCESS CONTROL PERMISSION SERVICE
// File: src/features/access-control/services/permission.service.ts
// ==============================================================================

import { db } from '../../../db/repository.js';
import { Module, UserPermission, DepartmentModule } from '../../../types/index.js';

export class PermissionService {
  /**
   * Tier 2: Allocates tenant-enabled modules to a department.
   * Throws an error if any module is not active for the tenant (Tier 1 constraint).
   */
  public allocateDepartmentModules(
    tenantId: string,
    departmentId: string,
    moduleIds: string[]
  ): DepartmentModule[] {
    return db.allocateDepartmentModules(tenantId, departmentId, moduleIds);
  }

  /**
   * Retrieves all modules available to a user based on their department hierarchy
   * (Directly assigned + inherited from parent/ancestor departments).
   */
  public getEligibleModulesForUser(tenantId: string, userId: string): Module[] {
    const profile = db.getProfileById(userId);
    if (!profile || profile.tenantId !== tenantId) {
      throw new Error(`User ${userId} not found in tenant ${tenantId}`);
    }

    if (!profile.departmentId) {
      return [];
    }

    return db.getDepartmentEffectiveModules(tenantId, profile.departmentId);
  }

  /**
   * Tier 3: Assigns granular action permissions to a user.
   * Throws an error if any action belongs to a module not allocated to user's department or its ancestors.
   */
  public assignUserPermissions(
    tenantId: string,
    userId: string,
    actionIds: string[]
  ): UserPermission[] {
    return db.assignUserPermissions(tenantId, userId, actionIds);
  }

  /**
   * Evaluates all effective permissions for a user:
   * Considers department hierarchy, tenant-level activations, direct assignments,
   * and implicit permission dependencies.
   */
  public getUserEffectivePermissions(tenantId: string, userId: string): string[] {
    return db.getUserEffectivePermissions(tenantId, userId);
  }

  /**
   * Evaluates whether the effective permissions satisfy a required action key.
   *
   * Implicit Permission Fallback Rule:
   * Any mutating action (.Add, .Edit, .Delete, .Approval.Create) automatically grants .View access
   * for that module without requiring an explicit .View entry in the database.
   */
  public evaluatePermission(
    effectivePermissions: string[] | Set<string>,
    requiredKey: string
  ): boolean {
    if (!requiredKey) return false;

    const set =
      effectivePermissions instanceof Set
        ? effectivePermissions
        : new Set(effectivePermissions);

    // 1. Direct match (O(1))
    if (set.has(requiredKey)) {
      return true;
    }

    // 2. Implicit fallback for .View
    if (requiredKey.endsWith('.View')) {
      const modulePrefix = requiredKey.slice(0, -5);
      return (
        set.has(`${modulePrefix}.Add`) ||
        set.has(`${modulePrefix}.Edit`) ||
        set.has(`${modulePrefix}.Delete`) ||
        set.has(`${modulePrefix}.Approval.Create`)
      );
    }

    return false;
  }
}

export const permissionService = new PermissionService();
