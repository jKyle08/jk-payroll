// ==============================================================================
// JK-PAYROLL: AUTH FEATURE CONTROLLER
// File: src/features/auth/auth.controller.ts
// ==============================================================================

import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from './auth.service.js';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  tenantName: z.string().min(2).optional(),
  tenantCode: z.string().min(2).optional(),
  departmentName: z.string().min(2).optional(),
  departmentCode: z.string().min(2).optional(),
});

export class AuthController {
  /**
   * POST /api/auth/login
   */
  public async login(req: Request, res: Response): Promise<void> {
    try {
      const parsed = LoginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
        return;
      }

      const session = await authService.login(parsed.data);
      res.status(200).json({
        token: session.token,
        user: session,
      });
    } catch (error: any) {
      const statusCode = error.message?.includes('Invalid') ? 401 : 400;
      res.status(statusCode).json({ error: error.message || 'Login failed' });
    }
  }

  /**
   * POST /api/auth/register
   */
  public async register(req: Request, res: Response): Promise<void> {
    try {
      const parsed = RegisterSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
        return;
      }

      const session = await authService.register(parsed.data);
      res.status(201).json({
        message: 'Account registered successfully',
        token: session.token,
        user: session,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Registration failed' });
    }
  }

  /**
   * GET /api/auth/me
   */
  public async me(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user;
      if (!authUser) {
        res.status(401).json({ error: 'Unauthorized: Session missing' });
        return;
      }

      const session = await authService.resolveUserSession(authUser.userId);
      res.status(200).json({ user: session });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * POST /api/auth/logout
   */
  public async logout(_req: Request, res: Response): Promise<void> {
    res.status(200).json({ message: 'Signed out successfully' });
  }
}

export const authController = new AuthController();
