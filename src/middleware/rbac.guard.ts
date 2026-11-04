// ==============================================================================
// JK PAYROLL: RBAC PERMISSION GUARDS
// ==============================================================================
import { Request, Response, NextFunction } from 'express';
import { MUTATING_ACTIONS } from '../lib/constants/permissions.js';

/**
 * Enforces a required granular permission key (e.g. 'TypeOfLeave.View', 'RequestForLeave.Add').
 * 
 * Evaluates against a Set<string> cached on the request for O(1) lookup efficiency.
 * Maintains implicit permission fallback:
 * If checking for *.View, any mutating action (*.Add, *.Edit, *.Delete, *.Approval.Create)
 * automatically satisfies the requirement!
 */
export function requirePermission(requiredKey: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: User context missing' });
      return;
    }

    // Super Admin has global bypass
    if (req.user.isSuperAdmin) {
      return next();
    }

    // Cache Set<string> on request for O(1) lookups
    if (!req.permissionSet) {
      req.permissionSet = new Set<string>(req.effectivePermissions || []);
    }

    const permissionSet = req.permissionSet;
    let isPermitted = permissionSet.has(requiredKey);

    // Maintain implicit .View inheritance rule when checking for *.View
    if (!isPermitted && requiredKey.endsWith('.View')) {
      const modulePrefix = requiredKey.slice(0, -5);
      isPermitted =
        permissionSet.has(`${modulePrefix}.Add`) ||
        permissionSet.has(`${modulePrefix}.Edit`) ||
        permissionSet.has(`${modulePrefix}.Delete`) ||
        permissionSet.has(`${modulePrefix}.Approval.Create`);
    }

    if (!isPermitted) {
      res.status(403).json({
        error: 'Forbidden: Insufficient permissions',
        requiredPermission: requiredKey,
        effectivePermissions: req.effectivePermissions || [],
      });
      return;
    }

    next();
  };
}

/**
 * Restricts access to Tenant Admins or Super Admins
 */
export function requireTenantAdmin() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: User context missing' });
      return;
    }

    if (!req.user.isTenantAdmin && !req.user.isSuperAdmin) {
      res.status(403).json({ error: 'Forbidden: Tenant Admin privilege required' });
      return;
    }

    next();
  };
}

/**
 * Restricts access strictly to Super Admins
 */
export function requireSuperAdmin() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: User context missing' });
      return;
    }

    if (!req.user.isSuperAdmin) {
      res.status(403).json({ error: 'Forbidden: Super Admin privilege required' });
      return;
    }

    next();
  };
}
