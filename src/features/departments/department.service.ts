// ==============================================================================
// JK-PAYROLL: DEPARTMENTS FEATURE SERVICE
// File: src/features/departments/department.service.ts
// ==============================================================================

import { db } from '../../db/repository.js';
import {
  Department,
  DepartmentNode,
  DepartmentItem,
  CreateDepartmentInput,
  UpdateDepartmentInput,
  DepartmentFilterState,
} from './types.js';

export class DepartmentService {
  /**
   * Enrich raw Department model with organization, parent, lead, and child count metadata
   */
  public enrichDepartment(dept: Department): DepartmentItem {
    const orgId = dept.organizationId || dept.tenantId || '';
    const org = db.getTenantById(orgId);
    const parent = dept.parentDepartmentId ? db.getDepartmentById(dept.parentDepartmentId) : null;
    const headUser = dept.headUserId ? db.profiles.get(dept.headUserId) : null;

    const childrenCount = Array.from(db.departments.values()).filter(
      (d) => (d.organizationId === orgId || d.tenantId === orgId) && d.parentDepartmentId === dept.id
    ).length;

    const depth = dept.depth ?? (dept.parentDepartmentId ? 1 : 0);
    const depthLabel = depth === 0 ? 'Head Department' : depth === 1 ? 'Sub-Department' : 'Unit';

    return {
      id: dept.id,
      organizationId: orgId,
      organizationName: org?.name || 'Unknown Organization',
      organizationCode: org?.code || 'N/A',
      parentDepartmentId: dept.parentDepartmentId,
      parentDepartmentName: parent?.name,
      parentDepartmentCode: parent?.code,
      code: dept.code,
      name: dept.name,
      description: dept.description,
      headUserId: dept.headUserId,
      headUserName: headUser?.fullName,
      headUserEmail: headUser?.email,
      depth,
      depthLabel,
      treePath: dept.treePath || dept.code.toLowerCase(),
      isActive: dept.isActive,
      childrenCount,
      createdAt: dept.createdAt ? new Date(dept.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: dept.updatedAt ? new Date(dept.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  /**
   * List departments with optional query filters and actor boundary checks
   */
  public listDepartments(
    filters?: DepartmentFilterState,
    actor?: { isSuperAdmin?: boolean; tenantId?: string }
  ): {
    items: DepartmentItem[];
    total: number;
    activeCount: number;
    rootCount: number;
    subCount: number;
  } {
    let all = Array.from(db.departments.values());

    // Role / Tenant scoping: Non-super admins can only view their own organization's departments
    if (actor && !actor.isSuperAdmin && actor.tenantId) {
      all = all.filter((d) => (d.organizationId || d.tenantId) === actor.tenantId);
    }

    // Apply explicit organization filter
    if (filters?.organizationId && filters.organizationId !== 'All') {
      all = all.filter((d) => (d.organizationId || d.tenantId) === filters.organizationId);
    }

    // Status filter
    if (filters?.status && filters.status !== 'All') {
      const activeBool = filters.status === 'Active';
      all = all.filter((d) => d.isActive === activeBool);
    }

    // Depth filter
    if (filters?.depth !== undefined && filters.depth !== 'All') {
      const targetDepth = Number(filters.depth);
      all = all.filter((d) => (d.depth ?? 0) === targetDepth);
    }

    // Search query
    if (filters?.search && filters.search.trim().length > 0) {
      const q = filters.search.toLowerCase().trim();
      all = all.filter((d) => {
        const enriched = this.enrichDepartment(d);
        return (
          d.name.toLowerCase().includes(q) ||
          d.code.toLowerCase().includes(q) ||
          (d.description && d.description.toLowerCase().includes(q)) ||
          (d.treePath && d.treePath.toLowerCase().includes(q)) ||
          (enriched.organizationName && enriched.organizationName.toLowerCase().includes(q)) ||
          (enriched.headUserName && enriched.headUserName.toLowerCase().includes(q))
        );
      });
    }

    const items = all.map((d) => this.enrichDepartment(d));
    const total = items.length;
    const activeCount = items.filter((i) => i.isActive).length;
    const rootCount = items.filter((i) => i.depth === 0).length;
    const subCount = items.filter((i) => i.depth > 0).length;

    return {
      items,
      total,
      activeCount,
      rootCount,
      subCount,
    };
  }

  public getDepartmentById(id: string): DepartmentItem | undefined {
    const dept = db.getDepartmentById(id);
    if (!dept) return undefined;
    return this.enrichDepartment(dept);
  }

  public createDepartment(
    data: CreateDepartmentInput,
    actor?: { isSuperAdmin?: boolean; tenantId?: string }
  ): Department {
    const orgId = data.organizationId || data.tenantId || actor?.tenantId;
    if (!orgId) {
      throw new Error('Organization ID is required');
    }

    // Access Boundary: Non-super admin cannot create department for a different tenant
    if (actor && !actor.isSuperAdmin && actor.tenantId && orgId !== actor.tenantId) {
      throw new Error('Access denied: cannot create department for another organization');
    }

    return db.createDepartment({
      organizationId: orgId,
      parentDepartmentId: data.parentDepartmentId,
      code: data.code,
      name: data.name,
      description: data.description,
      headUserId: data.headUserId,
      isActive: data.isActive,
    });
  }

  public updateDepartment(
    id: string,
    data: UpdateDepartmentInput,
    actor?: { isSuperAdmin?: boolean; tenantId?: string }
  ): Department {
    const existing = db.getDepartmentById(id);
    if (!existing) {
      throw new Error(`Department with ID '${id}' not found`);
    }

    const existingOrgId = existing.organizationId || existing.tenantId;

    // Access Boundary
    if (actor && !actor.isSuperAdmin && actor.tenantId && existingOrgId !== actor.tenantId) {
      throw new Error('Access denied: cannot update department of another organization');
    }

    return db.updateDepartment(id, {
      organizationId: data.organizationId || existingOrgId,
      parentDepartmentId: data.parentDepartmentId,
      code: data.code,
      name: data.name,
      description: data.description,
      headUserId: data.headUserId,
      isActive: data.isActive,
    });
  }

  public deleteDepartment(
    id: string,
    actor?: { isSuperAdmin?: boolean; tenantId?: string }
  ): boolean {
    const existing = db.getDepartmentById(id);
    if (!existing) {
      return false;
    }

    const existingOrgId = existing.organizationId || existing.tenantId;

    // Access Boundary
    if (actor && !actor.isSuperAdmin && actor.tenantId && existingOrgId !== actor.tenantId) {
      throw new Error('Access denied: cannot delete department of another organization');
    }

    return db.deleteDepartment(id);
  }

  public getDepartmentsByTenant(tenantId: string): Department[] {
    return db.getDepartmentsByTenant(tenantId);
  }

  public getDepartmentsByOrganization(organizationId: string): Department[] {
    return db.getDepartmentsByOrganization(organizationId);
  }

  public getDepartmentTree(organizationId: string): DepartmentNode[] {
    return db.getDepartmentTree(organizationId);
  }

  public getDepartmentSubTree(organizationId: string, departmentId: string): Department[] {
    return db.getDepartmentSubTree(organizationId, departmentId);
  }

  public getDepartmentAncestors(organizationId: string, departmentId: string): Department[] {
    return db.getDepartmentAncestors(organizationId, departmentId);
  }
}

export const departmentService = new DepartmentService();
