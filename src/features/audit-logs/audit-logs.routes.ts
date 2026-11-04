// ==============================================================================
// JK-PAYROLL: AUDIT LOGS FEATURE ROUTES
// File: src/features/audit-logs/audit-logs.routes.ts
// ==============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { auditLogsController } from './audit-logs.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

export const auditLogsRoutes = Router();

// Strict authentication required for audit trail security
auditLogsRoutes.use(authMiddleware);

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

export default auditLogsRoutes;

