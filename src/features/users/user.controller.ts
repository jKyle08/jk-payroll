// ==============================================================================
// JK-PAYROLL: USERS FEATURE CONTROLLER
// File: src/features/users/user.controller.ts
// ==============================================================================

import { Request, Response } from 'express';
import { z } from 'zod';
import { userService } from './user.service.js';

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
      const tenantId = req.user!.tenantId;
      const parsed = CreateUserSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
        return;
      }

      const profile = userService.createUser({
        tenantId,
        departmentId: parsed.data.departmentId,
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        isTenantAdmin: parsed.data.isTenantAdmin,
        isSuperAdmin: parsed.data.isSuperAdmin,
      });

      res.status(201).json({ message: 'User created successfully', user: profile });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  public async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const users = userService.getUsersByTenant(tenantId);
      res.status(200).json({ tenantId, users });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  public async getUser(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const user = userService.getUserById(id);
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
      const tenantId = req.user!.tenantId;
      const userId = req.params.id as string;

      const modules = userService.getUserEligibleModules(tenantId, userId);
      res.status(200).json({ userId, eligibleModules: modules });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  public async assignUserPermissions(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.params.id as string;
      const parsed = AssignUserPermissionsSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
        return;
      }

      const permissions = userService.assignUserPermissions(
        tenantId,
        userId,
        parsed.data.actionIds
      );

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
      const tenantId = req.user!.tenantId;
      const userId = req.params.id as string;
      const effectivePermissions = userService.getUserEffectivePermissions(tenantId, userId);
      res.status(200).json({ userId, effectivePermissions });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const userController = new UserController();
