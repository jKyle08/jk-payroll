// ==============================================================================
// JK-PAYROLL: USER ROLES FEATURE CONTROLLER
// Handles Page-Driven CRUD operations for User Role Assignments
// File: src/features/roles/user-role.controller.ts
// ==============================================================================

import { Request, Response } from 'express';
import { roleService } from './role.service.js';
import {
  createUserRoleSchema,
  updateUserRoleSchema,
  userRoleQuerySchema,
} from './role.schema.js';
import { auditLogsService, extractTrustedActor } from '../audit-logs/audit-logs.service.js';

export class UserRoleController {
  /**
   * GET /api/user-roles
   * List user roles with filters (search, tenantId, roleId, status)
   */
  public async listUserRoles(req: Request, res: Response): Promise<void> {
    try {
      const parsed = userRoleQuerySchema.safeParse(req.query);
      const filters = parsed.success ? parsed.data : undefined;
      const actor = req.user
        ? {
            isSuperAdmin: Boolean(req.user.isSuperAdmin),
            tenantId: req.user.tenantId,
            userId: req.user.userId,
          }
        : undefined;
      const result = roleService.listUserRoles(filters, actor);

      const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
      const limit = Math.max(1, parseInt(String(req.query.limit || '10'), 10) || 10);
      const pagedItems = hasPagination
        ? result.items.slice((page - 1) * limit, page * limit)
        : result.items;

      res.status(200).json({
        success: true,
        data: pagedItems,
        meta: {
          total: result.total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(result.total / limit)),
          activeCount: result.activeCount,
          rolesCount: result.rolesCount,
          tenantsCount: result.tenantsCount,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to list user roles' });
    }
  }

  /**
   * GET /api/user-roles/:id
   * Get single user role assignment by ID
   */
  public async getUserRole(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const actor = req.user
        ? {
            isSuperAdmin: Boolean(req.user.isSuperAdmin),
            tenantId: req.user.tenantId,
            userId: req.user.userId,
          }
        : undefined;
      const item = roleService.getUserRoleById(id, actor);
      if (!item) {
        res.status(404).json({ success: false, error: `User role assignment with ID '${id}' not found` });
        return;
      }
      res.status(200).json({ success: true, data: item });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to retrieve user role' });
    }
  }

  /**
   * POST /api/user-roles
   * Create / assign user role
   */
  public async createUserRole(req: Request, res: Response): Promise<void> {
    try {
      const parsed = createUserRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Validation Error', details: parsed.error.format() });
        return;
      }

      const actor = req.user
        ? {
            isSuperAdmin: Boolean(req.user.isSuperAdmin),
            tenantId: req.user.tenantId,
          }
        : undefined;

      const created = roleService.createUserRole(parsed.data, actor);

      const trustedActor = extractTrustedActor(req);
      auditLogsService
        .recordAuditLog({
          organizationId: created.tenantId || actor?.tenantId || '00000000-0000-0000-0000-000000000000',
          actor: trustedActor,
          module: 'USER_ROLES',
          entityType: 'user_roles',
          entityId: created.id,
          action: 'CREATE',
          oldValues: null,
          newValues: { ...created },
        })
        .catch(() => {});

      res.status(201).json({
        success: true,
        message: 'User role assigned successfully',
        data: created,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || 'Failed to assign user role' });
    }
  }

  /**
   * PUT /api/user-roles/:id
   * Update user role assignment
   */
  public async updateUserRole(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const parsed = updateUserRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Validation Error', details: parsed.error.format() });
        return;
      }

      const actor = req.user
        ? {
            isSuperAdmin: Boolean(req.user.isSuperAdmin),
            tenantId: req.user.tenantId,
          }
        : undefined;

      const updated = roleService.updateUserRole(id, parsed.data, actor);
      if (!updated) {
        res.status(404).json({ success: false, error: `User role assignment with ID '${id}' not found` });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'User role updated successfully',
        data: updated,
      });
    } catch (error: any) {
      if (error.message?.includes('Access denied')) {
        res.status(404).json({ success: false, error: `User role assignment with ID '${req.params.id}' not found` });
        return;
      }
      res.status(400).json({ success: false, error: error.message || 'Failed to update user role' });
    }
  }

  /**
   * DELETE /api/user-roles/:id
   * Delete / remove user role assignment
   */
  public async deleteUserRole(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const actor = req.user
        ? {
            isSuperAdmin: Boolean(req.user.isSuperAdmin),
            tenantId: req.user.tenantId,
          }
        : undefined;

      const success = roleService.deleteUserRole(id, actor);
      if (!success) {
        res.status(404).json({ success: false, error: `User role assignment with ID '${id}' not found` });
        return;
      }

      const trustedActor = extractTrustedActor(req);
      auditLogsService
        .recordAuditLog({
          organizationId: actor?.tenantId || '00000000-0000-0000-0000-000000000000',
          actor: trustedActor,
          module: 'USER_ROLES',
          entityType: 'user_roles',
          entityId: id,
          action: 'DELETE',
          oldValues: { id },
          newValues: null,
        })
        .catch(() => {});

      res.status(200).json({
        success: true,
        message: 'User role assignment deleted successfully',
      });
    } catch (error: any) {
      if (error.message?.includes('Access denied')) {
        res.status(404).json({ success: false, error: `User role assignment with ID '${req.params.id}' not found` });
        return;
      }
      res.status(500).json({ success: false, error: error.message || 'Failed to delete user role' });
    }
  }
}

export const userRoleController = new UserRoleController();
