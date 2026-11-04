// ==============================================================================
// JK-PAYROLL: DATA SCOPING MIDDLEWARE & SERVICE
// File: src/middleware/data-scoping.middleware.ts
// ==============================================================================

import { Request, Response, NextFunction } from 'express';
import { db } from '../db/repository.js';
import { AuthUserContext, DataScope, LeaveRequest } from '../types/index.js';

export interface ScopedRequestContext {
  scope: DataScope;
  allowedDepartmentIds: string[];
}

declare global {
  namespace Express {
    interface Request {
      dataScope?: ScopedRequestContext;
    }
  }
}

export class DataScopingService {
  /**
   * Filters records based on user context and requested data scope.
   */
  public filterLeaveRequests(
    records: LeaveRequest[],
    user: AuthUserContext,
    scope: DataScope = 'Self'
  ): LeaveRequest[] {
    // 1. Strict Tenant Isolation baseline
    const tenantRecords = records.filter((r) => r.tenantId === user.tenantId);

    // 2. Tenant scope: Full tenant access
    if (scope === 'Tenant') {
      return tenantRecords;
    }

    // If user has no department, they can only access 'Self'
    if (!user.departmentId) {
      return tenantRecords.filter((r) => r.userId === user.userId);
    }

    switch (scope) {
      case 'Self':
        return tenantRecords.filter((r) => r.userId === user.userId);

      case 'SubDepartment':
        // Records strictly within the user's specific department
        return tenantRecords.filter((r) => r.departmentId === user.departmentId);

      case 'EntireDepartment': {
        // Current department + recursively all descendant sub-departments
        const subTree = db.getDepartmentSubTree(user.tenantId, user.departmentId);
        const allowedDeptIds = new Set(subTree.map((d) => d.id));
        return tenantRecords.filter((r) => allowedDeptIds.has(r.departmentId));
      }

      default:
        return tenantRecords.filter((r) => r.userId === user.userId);
    }
  }

  /**
   * Returns an array of accessible department IDs for a given scope.
   */
  public getScopedDepartmentIds(user: AuthUserContext, scope: DataScope): string[] {
    if (!user.departmentId) {
      return [];
    }

    if (scope === 'SubDepartment') {
      return [user.departmentId];
    }

    if (scope === 'EntireDepartment') {
      const subTree = db.getDepartmentSubTree(user.tenantId, user.departmentId);
      return subTree.map((d) => d.id);
    }

    if (scope === 'Tenant') {
      const allDepts = db.getDepartmentsByTenant(user.tenantId);
      return allDepts.map((d) => d.id);
    }

    return [];
  }
}

export const dataScopingService = new DataScopingService();

/**
 * Middleware to resolve data scoping for departmental queries.
 */
export function dataScopingMiddleware(defaultScope: DataScope = 'Self') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized: Session required for data scoping' });
      return;
    }

    const requestedScope = (req.query.scope as DataScope) || defaultScope;

    // Guard: Prevent non-admin users from escalating to Tenant scope
    let effectiveScope: DataScope = requestedScope;
    if (requestedScope === 'Tenant' && !user.isTenantAdmin && !user.isSuperAdmin) {
      effectiveScope = 'EntireDepartment';
    }

    const allowedDepartmentIds = dataScopingService.getScopedDepartmentIds(user, effectiveScope);

    req.dataScope = {
      scope: effectiveScope,
      allowedDepartmentIds,
    };

    next();
  };
}
