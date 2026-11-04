// ==============================================================================
// JK-PAYROLL: DEPARTMENTS FEATURE ROUTES
// File: src/features/departments/department.routes.ts
// ==============================================================================

import { Router } from 'express';
import { departmentController } from './department.controller.js';
import { authenticateJwt, requireTenantAdmin } from '../../middleware/auth.middleware.js';

export const departmentRoutes = Router();

departmentRoutes.use(authenticateJwt);

// Query & Read operations
departmentRoutes.get('/', (req, res) => departmentController.listDepartments(req, res));
departmentRoutes.get('/tree', (req, res) => departmentController.getDepartmentTree(req, res));
departmentRoutes.get('/:id', (req, res) => departmentController.getDepartment(req, res));
departmentRoutes.get('/:id/sub-tree', (req, res) => departmentController.getDepartmentSubTree(req, res));

// Admin CRUD operations (Tenant Admin or Super Admin)
departmentRoutes.post('/', requireTenantAdmin, (req, res) => departmentController.createDepartment(req, res));
departmentRoutes.put('/:id', requireTenantAdmin, (req, res) => departmentController.updateDepartment(req, res));
departmentRoutes.delete('/:id', requireTenantAdmin, (req, res) => departmentController.deleteDepartment(req, res));
departmentRoutes.put('/:id/modules', requireTenantAdmin, (req, res) => departmentController.allocateDepartmentModules(req, res));

export default departmentRoutes;
