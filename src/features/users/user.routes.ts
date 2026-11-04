// ==============================================================================
// JK-PAYROLL: USERS FEATURE ROUTES
// File: src/features/users/user.routes.ts
// ==============================================================================

import { Router } from 'express';
import { userController } from './user.controller.js';
import { authenticateJwt, requireTenantAdmin } from '../../middleware/auth.middleware.js';

export const userRoutes = Router();

userRoutes.use(authenticateJwt);

userRoutes.get('/', (req, res) => userController.listUsers(req, res));
userRoutes.get('/:id', (req, res) => userController.getUser(req, res));
userRoutes.get('/:id/eligible-modules', (req, res) => userController.getUserEligibleModules(req, res));
userRoutes.get('/:id/permissions', (req, res) => userController.getUserPermissions(req, res));

userRoutes.post('/', requireTenantAdmin, (req, res) => userController.createUser(req, res));
userRoutes.put('/:id/permissions', requireTenantAdmin, (req, res) => userController.assignUserPermissions(req, res));

export default userRoutes;
