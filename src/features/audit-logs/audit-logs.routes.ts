// ==============================================================================
// JK-PAYROLL: AUDIT LOGS FEATURE ROUTES
// File: src/features/audit-logs/audit-logs.routes.ts
// ==============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { auditLogsController } from './audit-logs.controller.js';
import { authMiddleware } from '../../server/middleware/auth.middleware.js';

export const auditLogsRoutes = Router();

// Strict authentication required for audit trail security
auditLogsRoutes.use(authMiddleware);

/**
 * Authorization guard: Strictly restricts audit log inspection to:
 * 1. Active Super Administrators
 * 2. Active Organization Administrators
 * 3. Accounts granted explicit 'AuditLogs.View' permission
 */
export const requireAuditLogAuthorization = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized: Authentication context missing' });
    return;
  }

  if (user.isActive === false) {
    res.status(403).json({ error: 'Forbidden: Inactive user account' });
    return;
  }

  if (user.isSuperAdmin || user.isOrganizationAdmin || user.isTenantAdmin) {
    return next();
  }

  const hasAuditPermission =
    req.permissionSet?.has('AuditLogs.View') ||
    req.effectivePermissions?.includes('AuditLogs.View');

  if (hasAuditPermission) {
    return next();
  }

  res.status(403).json({
    error: 'Forbidden: Insufficient permissions to access audit logs',
    code: 'AUDIT_LOG_ACCESS_FORBIDDEN',
  });
};

auditLogsRoutes.use(requireAuditLogAuthorization);

/**
 * @route   GET /api/audit-logs
 * @desc    List point-in-time snapshot audit logs
 */
auditLogsRoutes.get('/', (req, res) => auditLogsController.listAuditLogs(req, res));

/**
 * @route   GET /api/audit-logs/:id
 * @desc    Get audit log entry details
 */
auditLogsRoutes.get('/:id', (req, res) => auditLogsController.getAuditLog(req, res));

// ------------------------------------------------------------------------------
// IMMUTABILITY GUARDS AT HTTP API BOUNDARY (SEC-FIND-18)
// ------------------------------------------------------------------------------
auditLogsRoutes.post('*', (_req: Request, res: Response) => {
  res.status(405).json({
    error: 'Method Not Allowed: Audit logs are append-only records and cannot be submitted via API',
  });
});

auditLogsRoutes.put('*', (_req: Request, res: Response) => {
  res.status(405).json({
    error: 'Method Not Allowed: Audit logs are immutable records and cannot be modified',
  });
});

auditLogsRoutes.delete('*', (_req: Request, res: Response) => {
  res.status(405).json({
    error: 'Method Not Allowed: Audit logs are immutable records and cannot be deleted',
  });
});

export default auditLogsRoutes;
