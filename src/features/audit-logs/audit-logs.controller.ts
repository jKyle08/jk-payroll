// ==============================================================================
// JK-PAYROLL: AUDIT LOGS FEATURE CONTROLLER
// File: src/features/audit-logs/audit-logs.controller.ts
// ==============================================================================

import { Request, Response } from 'express';
import { auditLogsService } from './audit-logs.service.js';
import { AuditAction } from './types.js';

export class AuditLogsController {
  /**
   * GET /api/audit-logs
   * List point-in-time audit log snapshots with multi-tenant filtering.
   */
  public async listAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      let requestedOrgId = (req.query.organizationId as string) || (req.query.tenantId as string);

      // Scoping:
      // Superadmin can see all the audit logs across all organizations (or filter by requestedOrgId).
      // Non-superadmin users can ONLY see the audit logs of their own organization.
      if (!user?.isSuperAdmin) {
        if (!user?.tenantId) {
          res.status(403).json({
            success: false,
            error: 'Forbidden: No organization association found for this user account',
          });
          return;
        }
        // Force organizationId strictly to the actor's tenant ID
        requestedOrgId = user.tenantId as string;
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const page = parseInt(req.query.page as string) || 1;
      const offset = (page - 1) * limit;

      const result = await auditLogsService.getAuditLogs({
        organizationId: requestedOrgId,
        moduleId: req.query.moduleId as string,
        action: req.query.action as AuditAction,
        actorId: req.query.actorId as string,
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
          totalPages: Math.ceil(result.total / limit),
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
      const id = req.params.id as string;
      const log = await auditLogsService.getAuditLogById(id);

      if (!log) {
        res.status(404).json({ success: false, error: 'Audit log entry not found' });
        return;
      }

      const user = req.user;
      // Superadmin can view any organization's audit log entry.
      // Non-superadmin users can only view logs from their own organization.
      if (user && !user.isSuperAdmin && log.organization_id !== user.tenantId) {
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
