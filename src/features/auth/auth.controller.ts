// ==============================================================================
// JK-PAYROLL: AUTH FEATURE CONTROLLER
// File: src/features/auth/auth.controller.ts
// ==============================================================================

import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from './auth.service.js';
import { LoginInput, RegisterInput } from './types.js';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2).max(100),
  invitationToken: z.string().min(40).max(200),
}).strict();

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

      const session = await authService.login(parsed.data as LoginInput);
      res.status(200).json({
        token: session.token,
        user: session,
      });
    } catch (error: any) {
      res.status(401).json({ error: error.message || 'Invalid email or password' });
    }
  }

  /**
   * POST /api/auth/register
   */
  public async register(req: Request, res: Response): Promise<void> {
    try {
      const parsed = RegisterSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invitation token, email, full name, and password are required.' });
        return;
      }
      const session = await authService.register(parsed.data as RegisterInput);
      res.status(201).json({ message: 'Account registered and organization membership activated.', token: session.token, user: session });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Registration failed', code: 'INVITATION_REGISTRATION_FAILED' });
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

  /**
   * POST /api/auth/refresh
   */
  public async refresh(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
      const refreshToken = req.body?.refreshToken;
      const token = bearerToken || req.body?.token;

      if (!token && !refreshToken) {
        res.status(401).json({ error: 'Unauthorized: Missing token for refresh' });
        return;
      }

      const result = await authService.refreshToken(token, refreshToken);
      res.status(200).json({
        token: result.token,
        user: result.user,
      });
    } catch (error: any) {
      res.status(401).json({ error: error.message || 'Session refresh failed' });
    }
  }

  /**
   * POST /api/auth/switch-organization
   */
  public async switchOrganization(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user;
      if (!authUser) {
        res.status(401).json({ error: 'Unauthorized: Session missing', code: 'UNAUTHORIZED' });
        return;
      }

      const requestedOrgId = (req.body.organizationId || req.body.tenantId) as string | undefined;
      if (!requestedOrgId || typeof requestedOrgId !== 'string' || !requestedOrgId.trim()) {
        res.status(400).json({
          error: 'Organization ID is required',
          code: 'ORGANIZATION_CONTEXT_REQUIRED',
        });
        return;
      }

      const result = await authService.switchOrganization(authUser.userId, requestedOrgId.trim());
      res.status(200).json(result);
    } catch (error: any) {
      const statusCode = error.statusCode || 400;
      res.status(statusCode).json({ error: error.message, code: error.code });
    }
  }
}

export const authController = new AuthController();
