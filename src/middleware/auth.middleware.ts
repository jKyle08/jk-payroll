// ==============================================================================
// JK PAYROLL: AUTHENTICATION & TENANT MIDDLEWARE (SUPABASE INTEGRATED)
// ==============================================================================
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { db } from '../db/repository.js';
import { getSupabaseClient } from '../db/supabase.js';
import { permissionService } from '../features/access-control/services/permission.service.js';
import { AuthUserContext } from '../types/index.js';
import { requireTenantAdmin as rbacRequireTenantAdmin, requireSuperAdmin as rbacRequireSuperAdmin } from './rbac.guard.js';

export function generateTestToken(payload: {
  userId: string;
  email?: string;
  tenantId?: string;
  departmentId?: string | null;
  isTenantAdmin?: boolean;
  isSuperAdmin?: boolean;
}): string {
  return jwt.sign(
    {
      sub: payload.userId,
      email: payload.email || 'user@example.com',
      tenant_id: payload.tenantId,
      department_id: payload.departmentId,
      isTenantAdmin: payload.isTenantAdmin,
      isSuperAdmin: payload.isSuperAdmin,
    },
    ENV.JWT_SECRET,
    { expiresIn: '1d' }
  );
}

// Middleware adapter supporting both direct (req, res, next) and factory ()
export const requireTenantAdmin = (req?: Request, res?: Response, next?: NextFunction) => {
  const guard = rbacRequireTenantAdmin();
  if (req && res && next) {
    return guard(req, res, next);
  }
  return guard;
};

export const requireSuperAdmin = (req?: Request, res?: Response, next?: NextFunction) => {
  const guard = rbacRequireSuperAdmin();
  if (req && res && next) {
    return guard(req, res, next);
  }
  return guard;
};

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header' });
      return;
    }

    const token = authHeader.split(' ')[1];
    let userId: string | null = null;
    let decodedEmail: string | undefined;

    // 1. Try local JWT verify first
    try {
      const decoded: any = jwt.verify(token, ENV.JWT_SECRET);
      userId = decoded.sub;
      decodedEmail = decoded.email;
    } catch {
      // 2. Fallback to Supabase auth validation
      try {
        const supabase = getSupabaseClient();
        const { data: authData, error: authError } = await supabase.auth.getUser(token);
        if (authError || !authData.user) {
          res.status(401).json({ error: 'Unauthorized: Invalid Supabase Auth token' });
          return;
        }
        userId = authData.user.id;
        decodedEmail = authData.user.email;
      } catch (err: any) {
        res.status(401).json({ error: 'Unauthorized: Could not verify token', details: err.message });
        return;
      }
    }

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: User ID missing from token' });
      return;
    }

    // 3. Resolve user profile (Check in-memory db first, fallback to Supabase PostgreSQL)
    let profile = db.getProfileById(userId);

    if (!profile) {
      try {
        const supabase = getSupabaseClient();
        const { data: remoteProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (remoteProfile) {
          // Sync remote profile into db repository
          profile = db.createProfile({
            id: remoteProfile.id,
            tenantId: remoteProfile.organization_id,
            departmentId: remoteProfile.department_id,
            fullName: remoteProfile.full_name,
            isTenantAdmin: remoteProfile.is_organization_admin,
            isSuperAdmin: remoteProfile.is_super_admin,
            isActive: remoteProfile.is_active,
          });

          // Also ensure tenant exists locally
          if (!db.getTenantById(remoteProfile.organization_id)) {
            const { data: remoteTenant } = await supabase
              .from('organizations')
              .select('*')
              .eq('id', remoteProfile.organization_id)
              .maybeSingle();

            if (remoteTenant) {
              db.tenants.set(remoteTenant.id, {
                id: remoteTenant.id,
                name: remoteTenant.name,
                code: remoteTenant.code,
                isActive: remoteTenant.is_active,
                createdAt: new Date(remoteTenant.created_at),
                updatedAt: new Date(remoteTenant.updated_at),
              });
            }
          }
        }
      } catch (err) {
        console.error('Error fetching remote profile from Supabase:', err);
      }
    }

    if (!profile) {
      res.status(401).json({
        error: 'Unauthorized: User profile does not exist in JK Payroll',
        userId,
        email: decodedEmail,
        suggestion: 'Please register your tenant and profile or run demo seed.',
      });
      return;
    }

    // Check user active status
    if (!profile.isActive) {
      res.status(403).json({ error: 'Forbidden: User account is inactive' });
      return;
    }

    // Check tenant active status
    let tenant = db.getTenantById(profile.tenantId);
    if (!tenant) {
      res.status(403).json({ error: 'Forbidden: User tenant does not exist' });
      return;
    }

    if (!tenant.isActive) {
      res.status(403).json({ error: 'Forbidden: Tenant account is inactive' });
      return;
    }

    // Check organization expiration for non-superadmin users
    if (!profile.isSuperAdmin && tenant.endDate) {
      const expirationTime = new Date(tenant.endDate).getTime();
      if (expirationTime < Date.now()) {
        res.status(403).json({
          error: 'Forbidden: Organization access period has expired. Access blocked.',
        });
        return;
      }
    }

    // Construct Auth Context
    const userContext: AuthUserContext = {
      userId: profile.id,
      tenantId: profile.tenantId,
      departmentId: profile.departmentId,
      fullName: profile.fullName,
      isTenantAdmin: profile.isTenantAdmin,
      isSuperAdmin: profile.isSuperAdmin,
      isActive: profile.isActive,
    };

    req.user = userContext;

    // Preload effective permissions for fast evaluation
    req.effectivePermissions = permissionService.getUserEffectivePermissions(
      userContext.tenantId,
      userContext.userId
    );

    next();
  } catch (error: any) {
    res.status(500).json({ error: 'Internal Auth Error', message: error.message });
  }
}

export const authenticateJwt = authMiddleware;

