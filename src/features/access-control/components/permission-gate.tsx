// ==============================================================================
// JK-PAYROLL: PERMISSION-GATE REACT COMPONENT
// File: src/features/access-control/components/permission-gate.tsx
// ==============================================================================

import React from 'react';
import { usePermission } from '../hooks/use-permission.js';

export interface PermissionGateProps {
  /**
   * Required permission key(s) (e.g. "TypeOfLeave.View" or ["TypeOfLeave.Edit", "TypeOfLeave.Add"])
   */
  required: string | string[];

  /**
   * List of permissions currently held by the user
   */
  userPermissions?: string[];

  /**
   * If an array of keys is supplied, determines if ANY or ALL must match.
   * Default: "any"
   */
  matchType?: 'any' | 'all';

  /**
   * Fallback UI to render when permissions are not satisfied
   */
  fallback?: React.ReactNode;

  /**
   * Protected content rendered when permissions are satisfied
   */
  children: React.ReactNode;
}

/**
 * Declarative component to conditionally render UI elements based on user permissions.
 *
 * Supports implicit permission inheritance:
 * Requiring `*.View` will render if the user possesses `*.Add`, `*.Edit`, `*.Delete`, or `*.Approval.Create`.
 *
 * @example
 * <PermissionGate required="TypeOfLeave.View" userPermissions={userPerms} fallback={<AccessDenied />}>
 *   <LeaveTypeTable />
 * </PermissionGate>
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  required,
  userPermissions = [],
  matchType = 'any',
  fallback = null,
  children,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission(userPermissions);

  let isAllowed = false;

  if (Array.isArray(required)) {
    isAllowed = matchType === 'all' ? hasAllPermissions(...required) : hasAnyPermission(...required);
  } else {
    isAllowed = hasPermission(required);
  }

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGate;
