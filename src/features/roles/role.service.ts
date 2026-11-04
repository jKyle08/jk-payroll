// ==============================================================================
// JK-PAYROLL: ROLES FEATURE SERVICE
// File: src/features/roles/role.service.ts
// ==============================================================================

import { db } from '../../db/repository.js';
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

  public getRoleById(id: string): Role | undefined {
    return db.roles.get(id);
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

  public updateRole(id: string, data: UpdateRoleInput, isSuperAdmin = false): Role | undefined {
    const role = db.roles.get(id);
    if (!role) return undefined;
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

  public deleteRole(id: string, isSuperAdmin = false): boolean {
    const role = db.roles.get(id);
    if (!role) return false;
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

  public assignRolePermissions(roleId: string, actionIds: string[]): RolePermission[] {
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

  public getRolePermissions(roleId: string): string[] {
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

  public listUserRoles(filters?: {
    search?: string;
    tenantId?: string;
    roleId?: string;
    status?: string;
  }): { items: any[]; total: number; activeCount: number; rolesCount: number; tenantsCount: number } {
    let all = db.getUserRoles().map((ur) => this.mapUserRoleToItem(ur));

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

      if (filters.tenantId && filters.tenantId !== 'All') {
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

  public getUserRoleById(id: string): any | undefined {
    const ur = db.getUserRoleById(id);
    if (!ur) return undefined;
    return this.mapUserRoleToItem(ur);
  }

  public createUserRole(data: {
    tenantId: string;
    userId: string;
    roleId: string;
    isActive?: boolean;
  }): any {
    const created = db.assignUserRole(data);
    return this.mapUserRoleToItem(created);
  }

  public updateUserRole(
    id: string,
    data: { tenantId?: string; userId?: string; roleId?: string; isActive?: boolean }
  ): any | undefined {
    const updated = db.updateUserRole(id, data);
    if (!updated) return undefined;
    return this.mapUserRoleToItem(updated);
  }

  public deleteUserRole(id: string): boolean {
    return db.deleteUserRole(id);
  }
}

export const roleService = new RoleService();
export const userRoleService = roleService;

