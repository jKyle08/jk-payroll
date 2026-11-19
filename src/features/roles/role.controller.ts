// ==============================================================================
// JK-PAYROLL: ROLES FEATURE CONTROLLER
// File: src/features/roles/role.controller.ts
// ==============================================================================

import { Request, Response } from 'express';
import { z } from 'zod';
import { roleService } from './role.service.js';
import { createRoleSchema, updateRoleSchema, roleQuerySchema } from './role.schema.js';
import { auditLogsService, extractTrustedActor } from '../audit-logs/audit-logs.service.js';

const AssignRolePermissionsSchema = z.object({
  actionIds: z.array(z.string().uuid()),
});

export class RoleController {
  /**
   * POST /api/roles
   * Organization admins create CUSTOM roles in their own organization.
   * Platform super admins may also create global SYSTEM roles (organizationId = null).
   */
  public async createRole(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const parsed = createRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Validation Error', details: parsed.error.format() });
        return;
      }

      let { organizationId, roleType } = parsed.data;
      if (!user.isSuperAdmin) {
        // Tenants can only create private CUSTOM roles
        organizationId = user.tenantId as string;
        roleType = 'CUSTOM';
      }

      const role = roleService.createRole({
        organizationId,
        code: parsed.data.code,
        name: parsed.data.name,
        description: parsed.data.description,
        roleType,
        isDefault: parsed.data.isDefault,
        isMutable: parsed.data.isMutable,
      });

      const trustedActor = extractTrustedActor(req);
      auditLogsService
        .recordAuditLog({
          organizationId: role.organizationId || user.tenantId || '00000000-0000-0000-0000-000000000000',
          actor: trustedActor,
          module: 'RBAC',
          entityType: 'roles',
          entityId: role.id,
          action: 'CREATE',
          oldValues: null,
          newValues: { ...role },
        })
        .catch(() => {});

      res.status(201).json({ success: true, message: 'Role created successfully', role, data: roleService.mapRoleToItem(role) });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/roles
   * Lists roles visible to the caller: global SYSTEM roles + own organization's CUSTOM roles.
   */
  public async getRoles(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const tenantId = user.tenantId as string;
      const parsed = roleQuerySchema.safeParse(req.query);
      const filters = parsed.success ? parsed.data : {};
      const result = roleService.listRoles({
        ...filters,
        scopeOrganizationId: user.isSuperAdmin ? undefined : tenantId,
        isSuperAdmin: user.isSuperAdmin,
      });

      const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
      const limit = Math.max(1, parseInt(String(req.query.limit || '10'), 10) || 10);
      const pagedItems = hasPagination
        ? result.items.slice((page - 1) * limit, page * limit)
        : result.items;

      res.status(200).json({
        success: true,
        tenantId,
        roles: roleService.getRolesByOrganization(tenantId),
        data: pagedItems,
        meta: {
          total: result.total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(result.total / limit)),
          systemCount: result.systemCount,
          customCount: result.customCount,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public async getRole(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const user = req.user;
      const actor = user
        ? {
            isSuperAdmin: Boolean(user.isSuperAdmin),
            tenantId: user.tenantId,
            organizationId: user.organizationId || user.tenantId,
          }
        : undefined;

      const role = roleService.getRoleById(id, actor);
      if (!role) {
        res.status(404).json({ success: false, error: `Role ${id} not found`, code: 'ROLE_NOT_FOUND' });
        return;
      }
      res.status(200).json({ success: true, role, data: roleService.mapRoleToItem(role) });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /** PUT /api/roles/:id - SYSTEM and immutable roles are rejected */
  public async updateRole(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const user = req.user!;
      const isSuper = Boolean(user.isSuperAdmin);
      const actor = {
        isSuperAdmin: isSuper,
        tenantId: user.tenantId,
        organizationId: user.organizationId || user.tenantId,
      };

      const existing = roleService.getRoleById(id, actor);
      if (!existing) {
        res.status(404).json({ success: false, error: `Role ${id} not found`, code: 'ROLE_NOT_FOUND' });
        return;
      }

      if ((existing.roleType === 'SYSTEM' || existing.organizationId === null) && !isSuper) {
        res.status(403).json({
          success: false,
          error: 'System Global roles can only be edited by Super Admin',
          code: 'SYSTEM_ROLE_MODIFICATION_FORBIDDEN',
        });
        return;
      }

      const activeOrgId = user.organizationId || user.tenantId;
      if (!isSuper && existing.organizationId !== activeOrgId) {
        res.status(403).json({
          success: false,
          error: 'You can only modify roles of your own organization',
          code: 'ORGANIZATION_ACCESS_DENIED',
        });
        return;
      }

      const parsed = updateRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Validation Error', details: parsed.error.format() });
        return;
      }

      const updated = roleService.updateRole(id, parsed.data, isSuper, activeOrgId)!;

      const trustedActor = extractTrustedActor(req);
      auditLogsService
        .recordAuditLog({
          organizationId: updated.organizationId || activeOrgId || '00000000-0000-0000-0000-000000000000',
          actor: trustedActor,
          module: 'RBAC',
          entityType: 'roles',
          entityId: id,
          action: 'UPDATE',
          oldValues: null,
          newValues: { ...updated },
        })
        .catch(() => {});

      res.status(200).json({ success: true, role: updated, data: roleService.mapRoleToItem(updated) });
    } catch (error: any) {
      const statusCode = error.statusCode || 400;
      res.status(statusCode).json({ success: false, error: error.message, code: error.code });
    }
  }

  /** DELETE /api/roles/:id - SYSTEM, immutable, or in-use roles are rejected */
  public async deleteRole(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const user = req.user!;
      const isSuper = Boolean(user.isSuperAdmin);
      const actor = {
        isSuperAdmin: isSuper,
        tenantId: user.tenantId,
        organizationId: user.organizationId || user.tenantId,
      };

      const existing = roleService.getRoleById(id, actor);
      if (!existing) {
        res.status(404).json({ success: false, error: `Role ${id} not found`, code: 'ROLE_NOT_FOUND' });
        return;
      }

      if ((existing.roleType === 'SYSTEM' || existing.organizationId === null) && !isSuper) {
        res.status(403).json({
          success: false,
          error: 'System Global roles can only be deleted by Super Admin',
          code: 'SYSTEM_ROLE_MODIFICATION_FORBIDDEN',
        });
        return;
      }

      const activeOrgId = user.organizationId || user.tenantId;
      if (!isSuper && existing.organizationId !== activeOrgId) {
        res.status(403).json({
          success: false,
          error: 'You can only delete roles of your own organization',
          code: 'ORGANIZATION_ACCESS_DENIED',
        });
        return;
      }

      roleService.deleteRole(id, isSuper, activeOrgId);

      const trustedActor = extractTrustedActor(req);
      auditLogsService
        .recordAuditLog({
          organizationId: existing.organizationId || activeOrgId || '00000000-0000-0000-0000-000000000000',
          actor: trustedActor,
          module: 'RBAC',
          entityType: 'roles',
          entityId: id,
          action: 'DELETE',
          oldValues: { ...existing },
          newValues: null,
        })
        .catch(() => {});

      res.status(200).json({ success: true, message: 'Role deleted successfully' });
    } catch (error: any) {
      const statusCode = error.statusCode || 400;
      res.status(statusCode).json({ success: false, error: error.message, code: error.code });
    }
  }

  public async assignRolePermissions(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const user = req.user!;
      const isSuper = Boolean(user.isSuperAdmin);
      const actor = {
        isSuperAdmin: isSuper,
        tenantId: user.tenantId,
        organizationId: user.organizationId || user.tenantId,
      };

      const parsed = AssignRolePermissionsSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Validation Error', details: parsed.error.format() });
        return;
      }

      const assigned = roleService.assignRolePermissions(id, parsed.data.actionIds, actor);

      const trustedActor = extractTrustedActor(req);
      const targetRole = roleService.getRoleById(id);
      auditLogsService
        .recordAuditLog({
          organizationId: targetRole?.organizationId || actor.organizationId || '00000000-0000-0000-0000-000000000000',
          actor: trustedActor,
          module: 'RBAC',
          entityType: 'role_permissions',
          entityId: id,
          action: 'UPDATE',
          oldValues: null,
          newValues: { roleId: id, permissions: assigned },
        })
        .catch(() => {});

      res.status(200).json({
        success: true,
        message: 'Role permissions updated successfully',
        roleId: id,
        permissions: assigned,
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 400;
      res.status(statusCode).json({ success: false, error: error.message, code: error.code });
    }
  }

  public async getRolePermissions(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const user = req.user;
      const actor = user
        ? {
            isSuperAdmin: Boolean(user.isSuperAdmin),
            tenantId: user.tenantId,
            organizationId: user.organizationId || user.tenantId,
          }
        : undefined;

      const actionIds = roleService.getRolePermissions(id, actor);
      res.status(200).json({ success: true, roleId: id, actionIds });
    } catch (error: any) {
      const statusCode = error.statusCode || 400;
      res.status(statusCode).json({ success: false, error: error.message, code: error.code });
    }
  }
}

export const roleController = new RoleController();
