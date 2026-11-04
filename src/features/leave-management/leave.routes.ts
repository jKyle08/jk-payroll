// ==============================================================================
// JK-PAYROLL: LEAVE MANAGEMENT FEATURE ROUTES
// File: src/features/leave-management/leave.routes.ts
// ==============================================================================

import { Router } from 'express';
import { leaveController } from './leave.controller.js';
import { authenticateJwt } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.guard.js';
import { PERMISSIONS } from '../../lib/constants/permissions.js';

export const leaveRoutes = Router();

leaveRoutes.use(authenticateJwt);

// TypeOfLeave
leaveRoutes.post(
  '/types',
  requirePermission(PERMISSIONS.TYPE_OF_LEAVE.ADD),
  (req, res) => leaveController.createTypeOfLeave(req, res)
);

leaveRoutes.get(
  '/types',
  requirePermission(PERMISSIONS.TYPE_OF_LEAVE.VIEW),
  (req, res) => leaveController.getTypeOfLeaveList(req, res)
);

// RequestForLeave
leaveRoutes.post(
  '/requests',
  requirePermission(PERMISSIONS.REQUEST_FOR_LEAVE.ADD),
  (req, res) => leaveController.createLeaveRequest(req, res)
);

leaveRoutes.get(
  '/requests',
  requirePermission(PERMISSIONS.REQUEST_FOR_LEAVE.VIEW),
  (req, res) => leaveController.getLeaveRequests(req, res)
);

leaveRoutes.put(
  '/requests/:id/approve',
  requirePermission(PERMISSIONS.REQUEST_FOR_LEAVE.APPROVAL_CREATE),
  (req, res) => leaveController.approveLeaveRequest(req, res)
);

export default leaveRoutes;
