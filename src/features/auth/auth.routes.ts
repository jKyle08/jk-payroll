// ==============================================================================
// JK-PAYROLL: AUTH FEATURE ROUTES
// File: src/features/auth/auth.routes.ts
// ==============================================================================

import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticateJwt } from '../../middleware/auth.middleware.js';

export const authRoutes = Router();

authRoutes.post('/login', (req, res) => authController.login(req, res));
authRoutes.post('/register', (req, res) => authController.register(req, res));
authRoutes.get('/me', authenticateJwt, (req, res) => authController.me(req, res));
authRoutes.post('/logout', (req, res) => authController.logout(req, res));

export default authRoutes;
