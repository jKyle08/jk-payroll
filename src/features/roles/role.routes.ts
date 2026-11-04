// ==============================================================================
// JK-PAYROLL: ROLES FEATURE ROUTES
// File: src/features/roles/role.routes.ts
// ==============================================================================

import { Router } from 'express';
import { roleController } from './role.controller.js';
import { authenticateJwt, requireTenantAdmin } from '../../middleware/auth.middleware.js';

export const roleRoutes = Router();

roleRoutes.use(authenticateJwt);

roleRoutes.get('/', (req, res) => roleController.getRoles(req, res));
roleRoutes.get('/:id', (req, res) => roleController.getRole(req, res));
roleRoutes.get('/:id/permissions', (req, res) => roleController.getRolePermissions(req, res));

roleRoutes.post('/', requireTenantAdmin, (req, res) => roleController.createRole(req, res));
roleRoutes.put('/:id', requireTenantAdmin, (req, res) => roleController.updateRole(req, res));
roleRoutes.delete('/:id', requireTenantAdmin, (req, res) => roleController.deleteRole(req, res));
roleRoutes.put('/:id/permissions', requireTenantAdmin, (req, res) => roleController.assignRolePermissions(req, res));

export default roleRoutes;
