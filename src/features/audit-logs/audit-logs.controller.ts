// ==============================================================================
// JK-PAYROLL: AUDIT LOGS FEATURE CONTROLLER
// File: src/features/audit-logs/audit-logs.controller.ts
// ==============================================================================

import { Request, Response } from 'express';
import { auditLogsService } from './audit-logs.service.js';
import { AuditAction, AuditActorType } from './types.js';

export class AuditLogsController {
  /**
   * GET /api/audit-logs
   * List point-in-time audit log snapshots with multi-tenant filtering.
   */
  public async listAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized: User context missing' });
        return;
      }

      if (user.isActive === false) {
        res.status(403).json({ success: false, error: 'Forbidden: User account is inactive' });
        return;
      }

      // Check authorization: Super Admin OR Organization Admin (or explicit AuditLogs.View)
      const isAuthorized =
        user.isSuperAdmin ||
        user.isOrganizationAdmin ||
        user.isTenantAdmin ||
        req.permissionSet?.has('AuditLogs.View') ||
        req.effectivePermissions?.includes('AuditLogs.View');

      if (!isAuthorized) {
        res.status(403).json({
          success: false,
          error: 'Forbidden: Insufficient permissions to access audit logs',
          code: 'AUDIT_LOG_ACCESS_FORBIDDEN',
        });
        return;
      }

      let requestedOrgId = (req.query.organizationId as string) || (req.query.tenantId as string);

      // Scoping:
      // Superadmin can inspect audit logs across all organizations or filter by requestedOrgId.
      // Non-superadmin users can ONLY see the audit logs of their own authorized organization.
      if (!user.isSuperAdmin) {
        const effectiveOrgId = (user.organizationId || user.tenantId) as string;
        if (!effectiveOrgId) {
          res.status(403).json({
            success: false,
            error: 'Forbidden: No organization association found for this user account',
          });
          return;
        }
        // Force organizationId strictly to the actor's verified organization ID
        requestedOrgId = effectiveOrgId;
      }

      const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 50), 200);
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const offset = (page - 1) * limit;

      const result = await auditLogsService.getAuditLogs({
        organizationId: requestedOrgId,
        moduleId: req.query.moduleId as string,
        action: req.query.action as AuditAction,
        actorId: req.query.actorId as string,
        actorType: req.query.actorType as AuditActorType,
        search: req.query.search as string,
        limit,
        offset,
      });

      res.status(200).json({
        success: true,
        data: result.logs,
        meta: {
          total: result.total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(result.total / limit)),
          stats: result.stats,
        },
      });
    } catch (error: any) {
      console.error('Audit logs controller error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal Server Error while retrieving audit logs',
      });
    }
  }

  /**
   * GET /api/audit-logs/:id
   * Retrieve a specific audit log snapshot.
   */
  public async getAuditLog(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized: User context missing' });
        return;
      }

      if (user.isActive === false) {
        res.status(403).json({ success: false, error: 'Forbidden: User account is inactive' });
        return;
      }

      const isAuthorized =
        user.isSuperAdmin ||
        user.isOrganizationAdmin ||
        user.isTenantAdmin ||
        req.permissionSet?.has('AuditLogs.View') ||
        req.effectivePermissions?.includes('AuditLogs.View');

      if (!isAuthorized) {
        res.status(403).json({
          success: false,
          error: 'Forbidden: Insufficient permissions to access audit logs',
          code: 'AUDIT_LOG_ACCESS_FORBIDDEN',
        });
        return;
      }

      const id = req.params.id as string;
      const log = await auditLogsService.getAuditLogById(id);

      if (!log) {
        res.status(404).json({ success: false, error: 'Audit log entry not found' });
        return;
      }

      // Non-superadmin users can only view logs from their own authorized organization
      const effectiveOrgId = (user.organizationId || user.tenantId) as string;
      if (!user.isSuperAdmin && log.organization_id !== effectiveOrgId) {
        res.status(403).json({
          success: false,
          error: 'Forbidden: Cannot access audit logs of other organizations',
        });
        return;
      }

      res.status(200).json({ success: true, data: log });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const auditLogsController = new AuditLogsController();
