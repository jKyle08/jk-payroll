// ==============================================================================
// JK-PAYROLL: USERS FEATURE CONTROLLER
// File: src/features/users/user.controller.ts
// ==============================================================================

import { Request, Response } from 'express';
import { z } from 'zod';
import { userService } from './user.service.js';
import { auditLogsService, extractTrustedActor } from '../audit-logs/audit-logs.service.js';

const CreateUserSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  isTenantAdmin: z.boolean().optional(),
  isSuperAdmin: z.boolean().optional(),
});

const AssignUserPermissionsSchema = z.object({
  actionIds: z.array(z.string().uuid()),
});

export class UserController {
  public async createUser(req: Request, res: Response): Promise<void> {
    try {
      const parsed = CreateUserSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
        return;
      }

      const isSuper = Boolean(req.user?.isSuperAdmin);
      const isSuperAdmin = isSuper ? Boolean(parsed.data.isSuperAdmin) : false;
      const tenantId = isSuper && (req.body.tenantId || req.body.organizationId)
        ? (req.body.tenantId || req.body.organizationId)
        : req.user!.tenantId;

      const actor = req.user
        ? {
            isSuperAdmin: isSuper,
            tenantId: req.user.tenantId,
          }
        : undefined;

      const profile = userService.createUser(
        {
          tenantId,
          departmentId: parsed.data.departmentId,
          fullName: parsed.data.fullName,
          email: parsed.data.email,
          isTenantAdmin: parsed.data.isTenantAdmin,
          isSuperAdmin,
        },
        actor
      );

      const trustedActor = extractTrustedActor(req);
      auditLogsService
        .recordAuditLog({
          organizationId: profile.tenantId,
          actor: trustedActor,
          module: 'PROFILES',
          entityType: 'profiles',
          entityId: profile.id,
          action: 'CREATE',
          oldValues: null,
          newValues: { ...profile },
        })
        .catch(() => {});

      res.status(201).json({ message: 'User created successfully', user: profile });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  public async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const isSuper = Boolean(req.user?.isSuperAdmin);
      const requestedOrgId = (req.query.organizationId as string) || (req.query.tenantId as string);
      const tenantId = isSuper ? (requestedOrgId || undefined) : req.user?.tenantId;
      const actor = req.user
        ? {
            isSuperAdmin: isSuper,
            tenantId: req.user.tenantId,
          }
        : undefined;
      const users = userService.getUsersByTenant(tenantId, actor);
      res.status(200).json({ success: true, count: users.length, tenantId, users, data: users });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  public async getUser(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const actor = req.user
        ? {
            isSuperAdmin: Boolean(req.user.isSuperAdmin),
            tenantId: req.user.tenantId,
          }
        : undefined;
      const user = userService.getUserById(id, actor);
      if (!user) {
        res.status(404).json({ error: `User ${id} not found` });
        return;
      }
      res.status(200).json({ user });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  public async getUserEligibleModules(req: Request, res: Response): Promise<void> {
    try {
      const isSuper = Boolean(req.user?.isSuperAdmin);
      const userId = req.params.id as string;
      const actor = req.user
        ? {
            isSuperAdmin: isSuper,
            tenantId: req.user.tenantId,
          }
        : undefined;

      const targetUser = userService.getUserById(userId, actor);
      if (!targetUser) {
        res.status(404).json({ error: `User ${userId} not found` });
        return;
      }

      const tenantId = targetUser.tenantId;
      const modules = userService.getUserEligibleModules(tenantId, userId);
      res.status(200).json({ userId, eligibleModules: modules });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  public async assignUserPermissions(req: Request, res: Response): Promise<void> {
    try {
      const isSuper = Boolean(req.user?.isSuperAdmin);
      const userId = req.params.id as string;
      const actor = req.user
        ? {
            isSuperAdmin: isSuper,
            tenantId: req.user.tenantId,
          }
        : undefined;

      const targetUser = userService.getUserById(userId, actor);
      if (!targetUser) {
        res.status(404).json({ error: `User ${userId} not found` });
        return;
      }

      const parsed = AssignUserPermissionsSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
        return;
      }

      const tenantId = targetUser.tenantId;
      const permissions = userService.assignUserPermissions(
        tenantId,
        userId,
        parsed.data.actionIds
      );

      const trustedActor = extractTrustedActor(req);
      auditLogsService
        .recordAuditLog({
          organizationId: tenantId,
          actor: trustedActor,
          module: 'USERS',
          entityType: 'user_permissions',
          entityId: userId,
          action: 'UPDATE',
          oldValues: null,
          newValues: { userId, permissions },
        })
        .catch(() => {});

      res.status(200).json({
        message: 'User permissions assigned successfully',
        userId,
        permissions,
      });
    } catch (error: any) {
      // 400 Bad Request on Tier 2/3 violation
      res.status(400).json({ error: error.message });
    }
  }

  public async getUserPermissions(req: Request, res: Response): Promise<void> {
    try {
      const isSuper = Boolean(req.user?.isSuperAdmin);
      const userId = req.params.id as string;
      const actor = req.user
        ? {
            isSuperAdmin: isSuper,
            tenantId: req.user.tenantId,
          }
        : undefined;

      const targetUser = userService.getUserById(userId, actor);
      if (!targetUser) {
        res.status(404).json({ error: `User ${userId} not found` });
        return;
      }

      const tenantId = targetUser.tenantId;
      const effectivePermissions = userService.getUserEffectivePermissions(tenantId, userId);
      res.status(200).json({ userId, effectivePermissions });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const userController = new UserController();
