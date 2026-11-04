// ==============================================================================
// JK-PAYROLL: PAYROLL FEATURE ROUTES
// File: src/features/payroll/payroll.routes.ts
// ==============================================================================

import { Router } from 'express';
import { payrollController } from './payroll.controller.js';
import { authenticateJwt } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.guard.js';
import { PERMISSIONS } from '../../lib/constants/permissions.js';

export const payrollRoutes = Router();

payrollRoutes.use(authenticateJwt);

payrollRoutes.post(
  '/compute',
  requirePermission(PERMISSIONS.PAYROLL_COMPUTATION.ADD),
  (req, res) => payrollController.computePayroll(req, res)
);

payrollRoutes.get(
  '/batches',
  requirePermission(PERMISSIONS.PAYROLL_COMPUTATION.VIEW),
  (req, res) => payrollController.getBatches(req, res)
);

payrollRoutes.get(
  '/batches/:id',
  requirePermission(PERMISSIONS.PAYROLL_COMPUTATION.VIEW),
  (req, res) => payrollController.getBatch(req, res)
);

payrollRoutes.put(
  '/batches/:id/approve',
  requirePermission(PERMISSIONS.PAYROLL_COMPUTATION.EDIT),
  (req, res) => payrollController.approveBatch(req, res)
);

export default payrollRoutes;
