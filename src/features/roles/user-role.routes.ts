// ==============================================================================
// JK-PAYROLL: USER ROLES FEATURE ROUTES
// File: src/features/roles/user-role.routes.ts
// ==============================================================================

import { Router } from 'express';
import { userRoleController } from './user-role.controller.js';
import { authenticateJwt } from '../../middleware/auth.middleware.js';

export const userRoleRoutes = Router();

userRoleRoutes.use(authenticateJwt);

userRoleRoutes.get('/', (req, res) => userRoleController.listUserRoles(req, res));
userRoleRoutes.get('/:id', (req, res) => userRoleController.getUserRole(req, res));
userRoleRoutes.post('/', (req, res) => userRoleController.createUserRole(req, res));
userRoleRoutes.put('/:id', (req, res) => userRoleController.updateUserRole(req, res));
userRoleRoutes.delete('/:id', (req, res) => userRoleController.deleteUserRole(req, res));

export default userRoleRoutes;
