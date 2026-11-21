// ==============================================================================
// JK PAYROLL: AUTHENTICATION & TENANT MIDDLEWARE (SUPABASE INTEGRATED)
// File: src/server/middleware/auth.middleware.ts
// ==============================================================================
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { db } from '../db/repository.js';
import { getSupabaseClient } from '../db/supabase.js';
import { permissionService } from '../../features/access-control/services/permission.service.js';
import { AuthUserContext } from '../../shared/types/index.js';
import {
  requireTenantAdmin as rbacRequireTenantAdmin,
  requireSuperAdmin as rbacRequireSuperAdmin,
  isSuperAdmin,
} from './rbac.guard.js';
import {
  resolveOrganizationContext,
  validateOrganizationEligibility,
  validateUserOrganizationMembership,
} from '../../features/organizations/organization-context.service.js';

export { isSuperAdmin } from './rbac.guard.js';
export {
  resolveOrganizationContext,
  validateOrganizationEligibility,
  validateUserOrganizationMembership,
} from '../../features/organizations/organization-context.service.js';

export function generateTestToken(payload: {
  userId: string;
  email?: string;
  tenantId?: string;
  departmentId?: string | null;
  isTenantAdmin?: boolean;
  isSuperAdmin?: boolean;
  appMetadata?: Record<string, any>;
}): string {
  if (!ENV.JWT_SECRET) {
    throw new Error('JWT_SECRET must be configured for token generation.');
  }

  return jwt.sign(
    {
      sub: payload.userId,
      email: payload.email || 'user@example.com',
      tenant_id: payload.tenantId,
      department_id: payload.departmentId,
      isTenantAdmin: payload.isTenantAdmin,
      isSuperAdmin: payload.isSuperAdmin,
      app_metadata: payload.appMetadata,
    },
    ENV.JWT_SECRET,
    {
      algorithm: 'HS256',
      issuer: ENV.JWT_ISSUER,
      audience: ENV.JWT_AUDIENCE,
      expiresIn: '1d',
    }
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

export const requireOrganizationAdmin = requireTenantAdmin;
export const organizationContextMiddleware = (req: Request, res: Response, next: NextFunction) => authMiddleware(req, res, next);

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header' });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'Unauthorized: Missing token' });
      return;
    }

    let userId: string | null = null;
    let decodedEmail: string | undefined;
    let tokenTenantId: string | undefined;

    // Decode token header & payload to determine token family and inspect claims safely
    const unverified = jwt.decode(token, { complete: true }) as {
      header?: { alg?: string; typ?: string };
      payload?: jwt.JwtPayload | string;
    } | null;

    if (!unverified || typeof unverified !== 'object' || !unverified.payload || typeof unverified.payload !== 'object') {
      res.status(401).json({ error: 'Unauthorized: Malformed token' });
      return;
    }

    const rawPayload = unverified.payload as jwt.JwtPayload;

    // 1. In production, local JWT authentication is strictly prohibited
    if (ENV.NODE_ENV === 'production' && rawPayload.iss === ENV.JWT_ISSUER) {
      res.status(401).json({ error: 'Unauthorized: Local JWT tokens are not permitted in production' });
      return;
    }

    // 2. Local JWT verification: Allowed ONLY in development/test when explicitly enabled
    // and token does not indicate a remote Supabase token
    const isSupabaseToken = Boolean(
      typeof rawPayload.iss === 'string' && rawPayload.iss.includes('supabase.co')
    );

    if (ENV.ALLOW_LOCAL_JWT && ENV.NODE_ENV !== 'production' && !isSupabaseToken) {
      try {
        const decoded = jwt.verify(token, ENV.JWT_SECRET, {
          algorithms: ['HS256'],
          issuer: ENV.JWT_ISSUER,
          audience: ENV.JWT_AUDIENCE,
        }) as jwt.JwtPayload;

        if (!decoded.sub || typeof decoded.sub !== 'string') {
          res.status(401).json({ error: 'Unauthorized: Token missing subject claim' });
          return;
        }

        userId = decoded.sub;
        decodedEmail = decoded.email;
        tokenTenantId = (decoded.tenant_id || decoded.organization_id || decoded.tenantId || decoded.organizationId) as string | undefined;
      } catch (jwtErr: any) {
        res.status(401).json({
          error: 'Unauthorized: Invalid or expired token',
          message: jwtErr.message,
        });
        return;
      }
    }

    // 3. Fallback to Supabase Auth identity provider
    if (!userId) {
      try {
        const supabase = getSupabaseClient();
        const { data: authData, error: authError } = await supabase.auth.getUser(token);
        if (authError || !authData.user) {
          res.status(401).json({
            error: 'Unauthorized: Invalid Supabase Auth token',
            code: 'SESSION_EXPIRED',
            message: authError?.message || 'The authentication token has expired or is invalid. Please log in again.',
          });
          return;
        }
        userId = authData.user.id;
        decodedEmail = authData.user.email;
        tokenTenantId = (authData.user.user_metadata?.organization_id || authData.user.app_metadata?.organization_id) as string | undefined;
      } catch (err: any) {
        res.status(401).json({ error: 'Unauthorized: Could not verify token', details: err.message });
        return;
      }
    }

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: User ID missing from token' });
      return;
    }

    // 4. Resolve user profile (Check in-memory db first, fallback to Supabase PostgreSQL)
    // In production, local repository entries are caches only and cannot establish
    // active status or platform-admin authority.
    let profile = ENV.NODE_ENV === 'production' ? undefined : db.getProfileById(userId);

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
            // Phase 1.1.1: profiles.organization_id must never manufacture membership.
            // Membership is resolved from organization_members by validateUserOrganizationMembership().
            syncMembership: false,
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

    // 5. Enforce user active status
    if (!profile.isActive) {
      res.status(403).json({ error: 'Forbidden: User account is inactive', code: 'ORGANIZATION_ACCESS_DENIED' });
      return;
    }

    // 6. Centralized Organization Context & Membership Resolution (SEC-FIND-04 & SEC-FIND-08)
    const effectiveOrgId = tokenTenantId || profile.tenantId;
    const initialUserContext: AuthUserContext = {
      userId: profile.id,
      organizationId: effectiveOrgId,
      tenantId: effectiveOrgId,
      departmentId: profile.departmentId,
      fullName: profile.fullName,
      isOrganizationAdmin: Boolean(profile.isTenantAdmin),
      isTenantAdmin: Boolean(profile.isTenantAdmin),
      isSuperAdmin: Boolean(profile.isSuperAdmin),
      isActive: Boolean(profile.isActive),
    };

    const orgResolution = await resolveOrganizationContext(req, initialUserContext);
    if (!orgResolution.valid || !orgResolution.organization) {
      res.status(orgResolution.statusCode || 403).json({
        error: orgResolution.error || 'Forbidden: Organization access denied',
        code: orgResolution.code,
      });
      return;
    }

    const validatedTenant = orgResolution.organization;
    const membership = orgResolution.membership;

    const isOrgAdmin = Boolean(
      membership?.isOwner || (profile.tenantId === validatedTenant.id && profile.isTenantAdmin)
    );

    // 7. Establish unified, authoritative request context
    const userContext: AuthUserContext = {
      userId: profile.id,
      organizationId: validatedTenant.id,
      tenantId: validatedTenant.id,
      departmentId: membership?.departmentId || profile.departmentId,
      fullName: profile.fullName,
      isOrganizationAdmin: isOrgAdmin,
      isTenantAdmin: isOrgAdmin,
      isSuperAdmin: Boolean(profile.isSuperAdmin),
      isActive: Boolean(profile.isActive),
    };

    req.user = userContext;
    req.organization = validatedTenant;
    req.tenant = validatedTenant;

    // Preload effective permissions for fast evaluation against validated tenant
    if (ENV.NODE_ENV === 'production') {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.rpc('get_user_effective_permissions', {
          p_organization_id: userContext.organizationId,
          p_user_id: userContext.userId,
        });
        req.effectivePermissions = !error && Array.isArray(data) ? data : [];
      } catch {
        req.effectivePermissions = [];
      }
    } else {
      req.effectivePermissions = permissionService.getUserEffectivePermissions(
        userContext.tenantId,
        userContext.userId
      );
    }

    next();
  } catch (error: any) {
    res.status(500).json({ error: 'Internal Auth Error', message: error.message });
  }
}

export const authenticateJwt = authMiddleware;
