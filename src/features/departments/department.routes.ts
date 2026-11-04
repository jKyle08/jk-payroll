// ==============================================================================
// JK-PAYROLL: DEPARTMENTS FEATURE ROUTES
// File: src/features/departments/department.routes.ts
// ==============================================================================

import { Router } from 'express';
import { departmentController } from './department.controller.js';
import { authenticateJwt, requireTenantAdmin } from '../../middleware/auth.middleware.js';

export const departmentRoutes = Router();

departmentRoutes.use(authenticateJwt);

departmentRoutes.get('/tree', (req, res) => departmentController.getDepartmentTree(req, res));
departmentRoutes.get('/:id', (req, res) => departmentController.getDepartment(req, res));
departmentRoutes.get('/:id/sub-tree', (req, res) => departmentController.getDepartmentSubTree(req, res));

// Admin only operations
departmentRoutes.post('/', requireTenantAdmin, (req, res) => departmentController.createDepartment(req, res));
departmentRoutes.put('/:id/modules', requireTenantAdmin, (req, res) => departmentController.allocateDepartmentModules(req, res));

export default departmentRoutes;
