// ==============================================================================
// JK-PAYROLL: USERS FEATURE SERVICE
// File: src/features/users/user.service.ts
// ==============================================================================

import { db } from '../../db/repository.js';
import { Profile, CreateUserInput } from './types.js';
import { Module, UserPermission } from '../../types/index.js';
import { permissionService } from '../access-control/services/permission.service.js';

export class UserService {
  public createUser(data: CreateUserInput): Profile {
    return db.createProfile(data);
  }

  public getUserById(id: string): Profile | undefined {
    return db.getProfileById(id);
  }

  public getUsersByTenant(tenantId?: string): Profile[] {
    if (!tenantId || tenantId === 'all' || tenantId === 'All') {
      return Array.from(db.profiles.values());
    }
    return Array.from(db.profiles.values()).filter(
      (p) => p.tenantId === tenantId || (p as any).organizationId === tenantId
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
