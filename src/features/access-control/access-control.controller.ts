// ==============================================================================
// JK-PAYROLL: ACCESS CONTROL CONTROLLER
// Runtime Privilege Evaluations & Permission Matrix Management
// File: src/features/access-control/access-control.controller.ts
// ==============================================================================

import { Request, Response } from 'express';
import { permissionService } from './services/permission.service.js';
import { db } from '../../db/repository.js';
import {
  EvaluatePermissionInput,
  UpdateRoleMatrixInput,
  AllocateDeptModulesInput,
} from './access-control.schema.js';

export class AccessControlController {
  /**
   * POST /api/access-control/evaluate
   * Evaluates if a user has a specific permission taking hierarchy into account
   */
  public async evaluatePermission(req: Request, res: Response): Promise<void> {
    try {
      const { userId, permissionKey, departmentId }: EvaluatePermissionInput = req.body;
      const user = db.getUserById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: `User with ID '${userId}' not found`,
        });
        return;
      }

      const hasPermission = permissionService.hasPermission(
        userId,
        permissionKey,
        departmentId || user.departmentId
      );

      res.status(200).json({
        success: true,
        data: {
          userId,
          permissionKey,
          hasPermission,
          evaluatedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Permission evaluation failed',
      });
    }
  }

  /**
   * GET /api/access-control/matrix/:roleId
   * Retrieves the permission matrix catalog and active grants for a role
   */
  public async getRoleMatrix(req: Request, res: Response): Promise<void> {
    try {
      const { roleId } = req.params;
      const role = db.roles.get(roleId);

      if (!role) {
        res.status(404).json({
          success: false,
          error: `Role with ID '${roleId}' not found`,
        });
        return;
      }

      const modules = Array.from(db.modules.values()).map((mod) => ({
        id: mod.id,
        code: mod.code,
        name: mod.name,
        category: 'Platform',
        isActive: mod.isActive,
        actions: Array.from(db.moduleActions.values())
          .filter((act) => act.moduleId === mod.id)
          .map((act) => ({
            id: act.id,
            moduleId: act.moduleId,
            action: act.action,
            fullKey: `${mod.code}.${act.action}`,
          })),
      }));

      // Find role permissions
      const grantedActionIds = Array.from(db.rolePermissions.values())
        .filter((rp) => rp.roleId === roleId)
        .map((rp) => rp.moduleActionId);

      res.status(200).json({
        success: true,
        data: {
          roleId,
          roleName: role.name,
          modules,
          grantedActionIds,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve permission matrix',
      });
    }
  }

  /**
   * PUT /api/access-control/matrix/:roleId
   * Updates granted actions for a role with implicit view enforcement
   */
  public async updateRoleMatrix(req: Request, res: Response): Promise<void> {
    try {
      const { roleId } = req.params;
      const { grantedActionIds }: UpdateRoleMatrixInput = req.body;

      const role = db.roles.get(roleId);
      if (!role) {
        res.status(404).json({
          success: false,
          error: `Role with ID '${roleId}' not found`,
        });
        return;
      }

      // Delete existing role permissions
      for (const [key, rp] of db.rolePermissions.entries()) {
        if (rp.roleId === roleId) {
          db.rolePermissions.delete(key);
        }
      }

      // Insert new permissions
      for (const actionId of grantedActionIds) {
        const id = `rp-${roleId}-${actionId}`;
        db.rolePermissions.set(id, {
          id,
          roleId,
          moduleActionId: actionId,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Role permissions matrix updated successfully',
        data: {
          roleId,
          grantedCount: grantedActionIds.length,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update role permissions matrix',
      });
    }
  }

  /**
   * POST /api/access-control/departments/modules
   * Allocates tenant-enabled modules to a department
   */
  public async allocateDepartmentModules(req: Request, res: Response): Promise<void> {
    try {
      const { departmentId, moduleIds }: AllocateDeptModulesInput = req.body;
      const user = (req as any).user;
      const tenantId = user?.tenantId;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant context required for department module allocation',
        });
        return;
      }

      const allocated = permissionService.allocateDepartmentModules(
        tenantId,
        departmentId,
        moduleIds
      );

      res.status(200).json({
        success: true,
        message: 'Department modules allocated successfully',
        data: allocated,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to allocate department modules',
      });
    }
  }
}

export const accessControlController = new AccessControlController();
export default accessControlController;
