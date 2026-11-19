// ==============================================================================
// JK-PAYROLL: USERS FEATURE SERVICE
// File: src/features/users/user.service.ts
// ==============================================================================

import { db } from '../../server/db/repository.js';
import { Profile, CreateUserInput } from './types.js';
import { Module, UserPermission } from '../../shared/types/index.js';
import { permissionService } from '../access-control/services/permission.service.js';

export class UserService {
  public createUser(
    data: CreateUserInput,
    actor?: { isSuperAdmin?: boolean; tenantId?: string }
  ): Profile {
    const isSuper = Boolean(actor?.isSuperAdmin);
    const isSuperAdmin = isSuper ? Boolean(data.isSuperAdmin) : false;
    const tenantId = actor && !isSuper && actor.tenantId ? actor.tenantId : data.tenantId;

    if (!tenantId) {
      throw new Error('Organization ID is required to create a user');
    }

    if (data.departmentId) {
      const dept = db.getDepartmentById(data.departmentId);
      const deptOrg = dept?.organizationId || dept?.tenantId;
      if (!dept || deptOrg !== tenantId) {
        throw new Error(`Department ${data.departmentId} does not belong to organization ${tenantId}`);
      }
    }

    return db.createProfile({
      ...data,
      tenantId,
      isSuperAdmin,
    });
  }

  public getUserById(
    id: string,
    actor?: { isSuperAdmin?: boolean; tenantId?: string }
  ): Profile | undefined {
    const profile = db.getProfileById(id);
    if (!profile) return undefined;
    if (actor && !actor.isSuperAdmin && actor.tenantId && profile.tenantId !== actor.tenantId) {
      return undefined;
    }
    return profile;
  }

  public getUsersByTenant(
    tenantId?: string,
    actor?: { isSuperAdmin?: boolean; tenantId?: string }
  ): Profile[] {
    const isSuper = Boolean(actor?.isSuperAdmin);
    const effectiveTenantId = actor && !isSuper && actor.tenantId ? actor.tenantId : tenantId;

    if (!effectiveTenantId || effectiveTenantId === 'all' || effectiveTenantId === 'All') {
      return Array.from(db.profiles.values());
    }
    return Array.from(db.profiles.values()).filter(
      (p) => p.tenantId === effectiveTenantId || (p as any).organizationId === effectiveTenantId
    );
  }

  public getUserEligibleModules(tenantId: string, userId: string): Module[] {
    return permissionService.getEligibleModulesForUser(tenantId, userId);
  }

  public assignUserPermissions(
    tenantId: string,
    userId: string,
    actionIds: string[]
  ): UserPermission[] {
    return permissionService.assignUserPermissions(tenantId, userId, actionIds);
  }

  public getUserEffectivePermissions(tenantId: string, userId: string): string[] {
    return permissionService.getUserEffectivePermissions(tenantId, userId);
  }
}

export const userService = new UserService();
