// ==============================================================================
// JK-PAYROLL: ACCESS CONTROL CONTROLLER
// Runtime Privilege Evaluations & Permission Matrix Management
// File: src/features/access-control/access-control.controller.ts
// ==============================================================================

import { Request, Response } from 'express';
import { permissionService } from './services/permission.service.js';
import { roleService } from '../roles/role.service.js';
import { db } from '../../server/db/repository.js';
import { auditLogsService, extractTrustedActor } from '../audit-logs/audit-logs.service.js';
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
      const user = db.getProfileById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: `User with ID '${userId}' not found`,
        });
        return;
      }

      const effectivePermissions = permissionService.getUserEffectivePermissions(user.tenantId, userId);
      const hasPermission = permissionService.evaluatePermission(
        effectivePermissions,
        permissionKey
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
      const roleId = req.params.roleId as string;
      const user = req.user;
      const actor = user
        ? {
            isSuperAdmin: Boolean(user.isSuperAdmin),
            tenantId: user.tenantId,
            organizationId: user.organizationId || user.tenantId,
          }
        : undefined;

      const role = roleService.getRoleById(roleId, actor);

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
        category: (mod.category || 'Platform') as string,
        isActive: true,
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
        .map((rp) => rp.actionId || (rp as any).moduleActionId);

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
      const roleId = req.params.roleId as string;
      const { grantedActionIds }: UpdateRoleMatrixInput = req.body;
      const user = req.user;
      const isSuper = Boolean(user?.isSuperAdmin);
      const actor = user
        ? {
            isSuperAdmin: isSuper,
            tenantId: user.tenantId,
            organizationId: user.organizationId || user.tenantId,
          }
        : undefined;

      const role = roleService.getRoleById(roleId, actor);
      if (!role) {
        res.status(404).json({
          success: false,
          error: `Role with ID '${roleId}' not found`,
        });
        return;
      }

      if ((role.roleType === 'SYSTEM' || role.organizationId === null) && !isSuper) {
        res.status(403).json({
          success: false,
          error: 'Forbidden: Global SYSTEM roles can only be edited by Super Admin',
          code: 'SYSTEM_ROLE_MODIFICATION_FORBIDDEN',
        });
        return;
      }

      const activeOrgId = user?.organizationId || user?.tenantId;
      if (!isSuper && role.organizationId !== activeOrgId) {
        res.status(403).json({
          success: false,
          error: 'Forbidden: You can only modify permissions of roles in your own organization',
          code: 'ORGANIZATION_ACCESS_DENIED',
        });
        return;
      }

      // Validate grantedActionIds
      for (const actionId of grantedActionIds) {
        const action = db.moduleActions.get(actionId);
        if (!action) {
          res.status(400).json({
            success: false,
            error: `Invalid permission: Module action '${actionId}' does not exist`,
            code: 'INVALID_PERMISSION_ASSIGNMENT',
          });
          return;
        }

        // Tier 1 constraint: module must be enabled for the organization if not Super Admin
        if (!isSuper && activeOrgId && !db.isModuleActiveForTenant(activeOrgId, action.moduleId)) {
          const mod = db.modules.get(action.moduleId);
          res.status(403).json({
            success: false,
            error: `Cannot grant permission '${action.action}' for module '${mod?.name || action.moduleId}': module is not allocated to organization`,
            code: 'MODULE_NOT_ALLOCATED',
          });
          return;
        }
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
          actionId,
        } as any);
      }

      const trustedActor = extractTrustedActor(req);
      auditLogsService
        .recordAuditLog({
          organizationId: role.organizationId || activeOrgId || '00000000-0000-0000-0000-000000000000',
          actor: trustedActor,
          module: 'RBAC',
          entityType: 'role_permissions',
          entityId: roleId,
          action: 'UPDATE',
          oldValues: null,
          newValues: { roleId, grantedActionIds },
        })
        .catch(() => {});

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
      const user = req.user;
      const isSuper = Boolean(user?.isSuperAdmin);
      const tenantId = user?.organizationId || user?.tenantId;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Organization context required for department module allocation',
          code: 'ORGANIZATION_CONTEXT_REQUIRED',
        });
        return;
      }

      const dept = db.getDepartmentById(departmentId);
      const deptOrg = dept?.organizationId || dept?.tenantId;
      if (!dept || (!isSuper && deptOrg !== tenantId)) {
        res.status(404).json({
          success: false,
          error: `Department with ID '${departmentId}' not found`,
        });
        return;
      }

      const allocated = permissionService.allocateDepartmentModules(
        deptOrg || tenantId,
        departmentId,
        moduleIds
      );

      const trustedActor = extractTrustedActor(req);
      auditLogsService
        .recordAuditLog({
          organizationId: deptOrg || tenantId,
          actor: trustedActor,
          module: 'DEPARTMENTS',
          entityType: 'department_modules',
          entityId: departmentId,
          action: 'UPDATE',
          oldValues: null,
          newValues: { departmentId, moduleIds },
        })
        .catch(() => {});

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
