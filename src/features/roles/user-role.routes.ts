// ==============================================================================
// JK-PAYROLL: USER ROLES FEATURE ROUTES
// File: src/features/roles/user-role.routes.ts
// ==============================================================================

import { Router } from 'express';
import { userRoleController } from './user-role.controller.js';
import { authenticateJwt, requireTenantAdmin } from '../../server/middleware/auth.middleware.js';

export const userRoleRoutes = Router();

userRoleRoutes.use(authenticateJwt);

userRoleRoutes.get('/', (req, res) => userRoleController.listUserRoles(req, res));
userRoleRoutes.get('/:id', (req, res) => userRoleController.getUserRole(req, res));
userRoleRoutes.post('/', requireTenantAdmin, (req, res) => userRoleController.createUserRole(req, res));
userRoleRoutes.put('/:id', requireTenantAdmin, (req, res) => userRoleController.updateUserRole(req, res));
userRoleRoutes.delete('/:id', requireTenantAdmin, (req, res) => userRoleController.deleteUserRole(req, res));

export default userRoleRoutes;
