// ==============================================================================
// JK-PAYROLL: ROLES FEATURE SERVICE
// File: src/features/roles/role.service.ts
// ==============================================================================

import { db } from '../../server/db/repository.js';
import { Role, RolePermission, CreateRoleInput, RoleItem, UpdateRoleInput, RoleType } from './types.js';

export class RoleService {
  // ----------------------------------------------------------------------------
  // ROLE DEFINITION CRUD (roles v2: SYSTEM = global/read-only, CUSTOM = per organization)
  // ----------------------------------------------------------------------------
  private codeExists(organizationId: string | null, code: string, ignoreId?: string): boolean {
    return Array.from(db.roles.values()).some(
      (r) =>
        r.id !== ignoreId &&
        (r.organizationId ?? null) === organizationId &&
        r.code.toUpperCase() === code.toUpperCase()
    );
  }

  public createRole(data: CreateRoleInput): Role {
    const roleType: RoleType = data.roleType ?? (data.organizationId ? 'CUSTOM' : 'SYSTEM');

    if (roleType === 'CUSTOM' && !data.organizationId) {
      throw new Error('A custom role must belong to an organization');
    }
    if (roleType === 'SYSTEM' && data.organizationId) {
      throw new Error('A system role is global and cannot belong to an organization');
    }
    if (data.organizationId && !db.getTenantById(data.organizationId)) {
      throw new Error(`Organization ${data.organizationId} not found`);
    }

    const code = data.code.trim().toUpperCase();
    if (this.codeExists(data.organizationId, code)) {
      throw new Error(`Role code '${code}' already exists in this scope`);
    }

    const role: Role = {
      id: crypto.randomUUID(),
      organizationId: data.organizationId,
      code,
      name: data.name.trim(),
      description: data.description?.trim() || undefined,
      roleType,
      isDefault: data.isDefault ?? false,
      isMutable: data.isMutable ?? true,
      isActive: data.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (role.isDefault) this.clearDefaultFlag(role.organizationId, role.id);
    db.roles.set(role.id, role);
    return role;
  }

  /** Only one default role per scope (organization or global) */
  private clearDefaultFlag(organizationId: string | null, exceptId: string): void {
    for (const r of db.roles.values()) {
      if (r.id !== exceptId && (r.organizationId ?? null) === organizationId && r.isDefault) {
        r.isDefault = false;
      }
    }
  }

  public getRoleById(
    id: string,
    actor?: { isSuperAdmin?: boolean; tenantId?: string; organizationId?: string }
  ): Role | undefined {
    const role = db.roles.get(id);
    if (!role) return undefined;

    if (actor && !actor.isSuperAdmin) {
      const activeOrgId = actor.organizationId || actor.tenantId;
      const isGlobal = role.roleType === 'SYSTEM' || role.organizationId === null;
      if (!isGlobal && activeOrgId && role.organizationId !== activeOrgId) {
        return undefined;
      }
    }
    return role;
  }

  /** Roles visible to an organization: its own CUSTOM roles + all global SYSTEM roles */
  public getRolesByOrganization(organizationId: string): Role[] {
    return Array.from(db.roles.values()).filter(
      (r) => r.organizationId === null || r.organizationId === organizationId
    );
  }

  /** @deprecated use getRolesByOrganization */
  public getRolesByTenant(tenantId: string): Role[] {
    return this.getRolesByOrganization(tenantId);
  }

  public mapRoleToItem(role: Role, isSuperAdmin = false): RoleItem {
    const org = role.organizationId ? db.getTenantById(role.organizationId) : undefined;
    const assignedUsers = db.getUserRoles().filter((ur) => ur.roleId === role.id).length;
    return {
      id: role.id,
      organizationId: role.organizationId,
      organizationName: role.organizationId ? org?.name || 'Organization' : 'Global (All Organizations)',
      organizationCode: role.organizationId ? org?.code || null : null,
      code: role.code,
      name: role.name,
      description: role.description,
      roleType: role.roleType,
      isDefault: role.isDefault,
      isMutable: role.isMutable,
      isEditable: isSuperAdmin ? true : (role.roleType === 'CUSTOM' && role.isMutable),
      assignedUsers,
    };
  }

  public listRoles(filters?: {
    search?: string;
    organizationId?: string;
    roleType?: string;
    /** When provided, restricts results to global roles + this organization's roles */
    scopeOrganizationId?: string;
    isSuperAdmin?: boolean;
  }): { items: RoleItem[]; total: number; systemCount: number; customCount: number } {
    let roles = Array.from(db.roles.values());

    if (filters?.scopeOrganizationId) {
      roles = roles.filter((r) => r.organizationId === null || r.organizationId === filters.scopeOrganizationId);
    }
    if (filters?.organizationId && filters.organizationId !== 'All') {
      roles =
        filters.organizationId === 'GLOBAL'
          ? roles.filter((r) => r.organizationId === null)
          : roles.filter((r) => r.organizationId === filters.organizationId);
    }
    if (filters?.roleType && filters.roleType !== 'All') {
      roles = roles.filter((r) => r.roleType === filters.roleType);
    }

    let items = roles.map((r) => this.mapRoleToItem(r, filters?.isSuperAdmin));
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (i) =>
          i.code.toLowerCase().includes(q) ||
          i.name.toLowerCase().includes(q) ||
          (i.description || '').toLowerCase().includes(q) ||
          i.organizationName.toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => (a.roleType === b.roleType ? a.name.localeCompare(b.name) : a.roleType === 'SYSTEM' ? -1 : 1));

    return {
      items,
      total: items.length,
      systemCount: items.filter((i) => i.roleType === 'SYSTEM').length,
      customCount: items.filter((i) => i.roleType === 'CUSTOM').length,
    };
  }

  private assertMutable(role: Role, isSuperAdmin = false): void {
    if (role.roleType === 'SYSTEM' && !isSuperAdmin) {
      throw new Error('System Global roles can only be edited by Super Admin');
    }
    if (!role.isMutable && !isSuperAdmin) {
      throw new Error('This role is locked (immutable) to prevent administrative lockout');
    }
  }

  public updateRole(
    id: string,
    data: UpdateRoleInput,
    isSuperAdmin = false,
    actorOrgId?: string
  ): Role | undefined {
    const role = db.roles.get(id);
    if (!role) return undefined;

    if (!isSuperAdmin) {
      if (role.roleType === 'SYSTEM' || role.organizationId === null) {
        throw Object.assign(new Error('System Global roles can only be edited by Super Admin'), {
          statusCode: 403,
          code: 'SYSTEM_ROLE_MODIFICATION_FORBIDDEN',
        });
      }
      if (actorOrgId && role.organizationId !== actorOrgId) {
        throw Object.assign(new Error('Access denied: You can only modify roles of your own organization'), {
          statusCode: 403,
          code: 'ORGANIZATION_ACCESS_DENIED',
        });
      }
    }

    this.assertMutable(role, isSuperAdmin);

    if (data.name !== undefined) role.name = data.name.trim();
    if (data.description !== undefined) role.description = data.description.trim() || undefined;
    if (data.isActive !== undefined) role.isActive = data.isActive;
    if (data.isDefault !== undefined) {
      role.isDefault = data.isDefault;
      if (role.isDefault) this.clearDefaultFlag(role.organizationId, role.id);
    }
    role.updatedAt = new Date();
    return role;
  }

  public deleteRole(id: string, isSuperAdmin = false, actorOrgId?: string): boolean {
    const role = db.roles.get(id);
    if (!role) return false;

    if (!isSuperAdmin) {
      if (role.roleType === 'SYSTEM' || role.organizationId === null) {
        throw Object.assign(new Error('System Global roles can only be deleted by Super Admin'), {
          statusCode: 403,
          code: 'SYSTEM_ROLE_MODIFICATION_FORBIDDEN',
        });
      }
      if (actorOrgId && role.organizationId !== actorOrgId) {
        throw Object.assign(new Error('Access denied: You can only delete roles of your own organization'), {
          statusCode: 403,
          code: 'ORGANIZATION_ACCESS_DENIED',
        });
      }
    }

    this.assertMutable(role, isSuperAdmin);

    const inUse = db.getUserRoles().some((ur) => ur.roleId === id);
    if (inUse) {
      throw new Error('This role is assigned to users. Remove those assignments before deleting it');
    }
    for (const [key, rp] of db.rolePermissions.entries()) {
      if (rp.roleId === id) db.rolePermissions.delete(key);
    }
    return db.roles.delete(id);
  }

  public assignRolePermissions(
    roleId: string,
    actionIds: string[],
    actor?: { isSuperAdmin?: boolean; tenantId?: string; organizationId?: string }
  ): RolePermission[] {
    const role = db.roles.get(roleId);
    if (!role) {
      throw Object.assign(new Error(`Role with ID '${roleId}' not found`), {
        statusCode: 404,
        code: 'ROLE_NOT_FOUND',
      });
    }

    const isSuper = Boolean(actor?.isSuperAdmin);
    const actorOrgId = actor?.organizationId || actor?.tenantId;

    if (!isSuper) {
      if (role.roleType === 'SYSTEM' || role.organizationId === null) {
        throw Object.assign(new Error('Global SYSTEM roles can only be edited by Super Admin'), {
          statusCode: 403,
          code: 'SYSTEM_ROLE_MODIFICATION_FORBIDDEN',
        });
      }
      if (actorOrgId && role.organizationId !== actorOrgId) {
        throw Object.assign(new Error('Access denied: You can only modify permissions of roles in your own organization'), {
          statusCode: 403,
          code: 'ORGANIZATION_ACCESS_DENIED',
        });
      }
    }

    this.assertMutable(role, isSuper);

    // Validate that every actionId exists and is valid
    const targetOrgId = role.organizationId || actorOrgId;
    for (const actionId of actionIds) {
      const action = db.moduleActions.get(actionId);
      if (!action) {
        throw Object.assign(new Error(`Invalid permission: Module action '${actionId}' does not exist`), {
          statusCode: 400,
          code: 'INVALID_PERMISSION_ASSIGNMENT',
        });
      }

      // Tier 1 constraint: module must be enabled for the organization if not Super Admin
      if (!isSuper && targetOrgId && !db.isModuleActiveForTenant(targetOrgId, action.moduleId)) {
        const mod = db.modules.get(action.moduleId);
        throw Object.assign(
          new Error(`Cannot grant permission '${action.action}' for module '${mod?.name || action.moduleId}': module is not allocated to organization`),
          {
            statusCode: 403,
            code: 'MODULE_NOT_ALLOCATED',
          }
        );
      }
    }

    // Clear existing
    for (const [key, rp] of db.rolePermissions.entries()) {
      if (rp.roleId === roleId) {
        db.rolePermissions.delete(key);
      }
    }

    const assigned: RolePermission[] = [];
    for (const actionId of actionIds) {
      const rp: RolePermission = {
        roleId,
        actionId,
        createdAt: new Date(),
      };
      db.rolePermissions.set(`${roleId}:${actionId}`, rp);
      assigned.push(rp);
    }
    return assigned;
  }

  public getRolePermissions(
    roleId: string,
    actor?: { isSuperAdmin?: boolean; tenantId?: string; organizationId?: string }
  ): string[] {
    const role = this.getRoleById(roleId, actor);
    if (!role) {
      throw Object.assign(new Error(`Role with ID '${roleId}' not found`), {
        statusCode: 404,
        code: 'ROLE_NOT_FOUND',
      });
    }

    return Array.from(db.rolePermissions.values())
      .filter((rp) => rp.roleId === roleId)
      .map((rp) => rp.actionId);
  }

  // ----------------------------------------------------------------------------
  // USER ROLE CRUD METHODS (Page-Driven Architecture)
  // ----------------------------------------------------------------------------
  public mapUserRoleToItem(ur: any): any {
    const tenant = db.getTenantById(ur.tenantId);
    const profile = db.getProfileById(ur.userId);
    const role = db.getRoleById(ur.roleId);

    return {
      id: ur.id,
      tenantId: ur.tenantId,
      tenantName: tenant?.name || 'Default Organization',
      tenantCode: tenant?.code || 'ORG',
      userId: ur.userId,
      userName: profile?.fullName || 'User',
      userEmail: profile?.email || 'user@example.com',
      userUsername: profile?.username || '',
      roleId: ur.roleId,
      roleName: role?.name || 'Administrator',
      roleCode: role?.code || 'ADMIN',
      roleDescription: role?.description,
      isActive: ur.isActive !== undefined ? ur.isActive : true,
      assignedAt: new Date(ur.createdAt || Date.now()).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }),
      updatedAt: ur.updatedAt
        ? new Date(ur.updatedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          })
        : undefined,
    };
  }

  public listUserRoles(
    filters?: {
      search?: string;
      tenantId?: string;
      roleId?: string;
      status?: string;
    },
    actor?: { isSuperAdmin?: boolean; tenantId?: string; userId?: string }
  ): { items: any[]; total: number; activeCount: number; rolesCount: number; tenantsCount: number } {
    let all = db.getUserRoles().map((ur) => this.mapUserRoleToItem(ur));

    const isSuper = Boolean(actor?.isSuperAdmin);
    if (actor && !isSuper && actor.tenantId) {
      all = all.filter((item) => item.tenantId === actor.tenantId);
    } else if (filters?.tenantId && filters.tenantId !== 'All') {
      all = all.filter((item) => item.tenantId === filters.tenantId);
    }

    if (filters) {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        all = all.filter(
          (item) =>
            item.userName.toLowerCase().includes(q) ||
            item.userEmail.toLowerCase().includes(q) ||
            item.roleName.toLowerCase().includes(q) ||
            item.roleCode.toLowerCase().includes(q) ||
            item.tenantName.toLowerCase().includes(q) ||
            item.tenantCode.toLowerCase().includes(q)
        );
      }

      if (isSuper && filters.tenantId && filters.tenantId !== 'All') {
        all = all.filter((item) => item.tenantId === filters.tenantId);
      }

      if (filters.roleId && filters.roleId !== 'All') {
        all = all.filter((item) => item.roleId === filters.roleId);
      }

      if (filters.status && filters.status !== 'All') {
        const wantActive = filters.status === 'Active';
        all = all.filter((item) => item.isActive === wantActive);
      }
    }

    const uniqueRoles = new Set(all.map((item) => item.roleId));
    const uniqueTenants = new Set(all.map((item) => item.tenantId));

    return {
      items: all,
      total: all.length,
      activeCount: all.filter((item) => item.isActive).length,
      rolesCount: uniqueRoles.size,
      tenantsCount: uniqueTenants.size,
    };
  }

  public getUserRoleById(
    id: string,
    actor?: { isSuperAdmin?: boolean; tenantId?: string; userId?: string }
  ): any | undefined {
    const ur = db.getUserRoleById(id);
    if (!ur) return undefined;
    const isSuper = Boolean(actor?.isSuperAdmin);
    if (actor && !isSuper && actor.tenantId && ur.tenantId !== actor.tenantId) {
      return undefined;
    }
    return this.mapUserRoleToItem(ur);
  }

  public createUserRole(
    data: {
      tenantId: string;
      userId: string;
      roleId: string;
      isActive?: boolean;
    },
    actor?: { isSuperAdmin?: boolean; tenantId?: string; userId?: string }
  ): any {
    const isSuper = Boolean(actor?.isSuperAdmin);
    const effectiveTenantId = actor && !isSuper && actor.tenantId ? actor.tenantId : data.tenantId;

    if (!effectiveTenantId) {
      throw new Error('Organization ID is required');
    }

    const targetUser = db.getProfileById(data.userId);
    if (!targetUser) {
      throw new Error(`User with ID '${data.userId}' not found`);
    }

    if (actor && !isSuper && targetUser.tenantId !== effectiveTenantId) {
      throw new Error('Target user does not belong to your organization');
    }

    const targetRole = db.getRoleById(data.roleId);
    if (!targetRole) {
      throw new Error(`Role with ID '${data.roleId}' not found`);
    }
    if (!targetRole.isActive) {
      throw new Error('Role is inactive and cannot be assigned');
    }

    if (actor && !isSuper) {
      if (targetRole.roleType === 'SYSTEM' || targetRole.organizationId === null) {
        throw new Error('Tenant administrator cannot assign a global SYSTEM role without authorization');
      }
      if (targetRole.organizationId !== effectiveTenantId) {
        throw new Error('Role belongs to another organization and cannot be assigned');
      }
      if (actor.userId === data.userId) {
        throw new Error('Organization administrators cannot assign a role to themselves');
      }
      if (['TENANT_ADMIN', 'ORGANIZATION_ADMIN', 'ORG_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(targetRole.code.toUpperCase())) {
        throw new Error('Organization administrators cannot assign privileged roles');
      }
    }

    const created = db.assignUserRole({
      ...data,
      tenantId: effectiveTenantId,
    });
    return this.mapUserRoleToItem(created);
  }

  public updateUserRole(
    id: string,
    data: { tenantId?: string; userId?: string; roleId?: string; isActive?: boolean },
    actor?: { isSuperAdmin?: boolean; tenantId?: string; userId?: string }
  ): any | undefined {
    const existing = db.getUserRoleById(id);
    if (!existing) return undefined;

    const isSuper = Boolean(actor?.isSuperAdmin);
    if (actor && !isSuper && actor.tenantId && existing.tenantId !== actor.tenantId) {
      throw new Error('Access denied: Cannot modify user role assignment of another organization');
    }

    const effectiveTenantId = actor && !isSuper && actor.tenantId ? actor.tenantId : (data.tenantId || existing.tenantId);

    if (data.userId && data.userId !== existing.userId) {
      const targetUser = db.getProfileById(data.userId);
      if (!targetUser) throw new Error(`User with ID '${data.userId}' not found`);
      if (actor && !isSuper && targetUser.tenantId !== effectiveTenantId) {
        throw new Error('Target user does not belong to your organization');
      }
    }

    if (data.roleId && data.roleId !== existing.roleId) {
      const targetRole = db.getRoleById(data.roleId);
      if (!targetRole) throw new Error(`Role with ID '${data.roleId}' not found`);
      if (!targetRole.isActive) throw new Error('Role is inactive and cannot be assigned');
      if (actor && !isSuper) {
        if (targetRole.roleType === 'SYSTEM' || targetRole.organizationId === null) {
          throw new Error('Tenant administrator cannot assign a global SYSTEM role without authorization');
        }
        if (targetRole.organizationId !== effectiveTenantId) {
          throw new Error('Role belongs to another organization and cannot be assigned');
        }
        if ((data.userId || existing.userId) === actor.userId) {
          throw new Error('Organization administrators cannot assign a role to themselves');
        }
        if (['TENANT_ADMIN', 'ORGANIZATION_ADMIN', 'ORG_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(targetRole.code.toUpperCase())) {
          throw new Error('Organization administrators cannot assign privileged roles');
        }
      }
    }

    const updated = db.updateUserRole(id, {
      ...data,
      tenantId: effectiveTenantId,
    });
    if (!updated) return undefined;
    return this.mapUserRoleToItem(updated);
  }

  public deleteUserRole(
    id: string,
    actor?: { isSuperAdmin?: boolean; tenantId?: string }
  ): boolean {
    const existing = db.getUserRoleById(id);
    if (!existing) return false;

    const isSuper = Boolean(actor?.isSuperAdmin);
    if (actor && !isSuper && actor.tenantId && existing.tenantId !== actor.tenantId) {
      throw new Error('Access denied: Cannot delete user role assignment of another organization');
    }

    return db.deleteUserRole(id);
  }
}

export const roleService = new RoleService();
export const userRoleService = roleService;

