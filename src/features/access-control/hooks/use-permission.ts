// ==============================================================================
// JK-PAYROLL: CLIENT-SIDE USE-PERMISSION HOOK & EVALUATOR
// File: src/features/access-control/hooks/use-permission.ts
// ==============================================================================

import { useCallback, useMemo } from 'react';
import { MUTATING_ACTIONS } from '../../../lib/constants/permissions.js';
import { PermissionState } from '../types.js';

/**
 * Pure function to evaluate if a user's permissions satisfy a required key.
 *
 * Implicit Rule:
 * Any mutating action (.Add, .Edit, .Delete, .Approval.Create)
 * automatically grants read-only .View access for that same module.
 */
export function evaluatePermission(
  userPermissions: string[] | Set<string> = [],
  key: string
): boolean {
  if (!key) return false;

  const set =
    userPermissions instanceof Set ? userPermissions : new Set(userPermissions);

  // 1. Direct match (O(1))
  if (set.has(key)) {
    return true;
  }

  // 2. Implicit fallback for .View
  if (key.endsWith('.View')) {
    const modulePrefix = key.slice(0, -5); // Extract 'TypeOfLeave' from 'TypeOfLeave.View'

    // Check if user possesses any mutating action for this module
    return (
      set.has(`${modulePrefix}.Add`) ||
      set.has(`${modulePrefix}.Edit`) ||
      set.has(`${modulePrefix}.Delete`) ||
      set.has(`${modulePrefix}.Approval.Create`)
    );
  }

  return false;
}

/**
 * Custom React hook to evaluate user permissions with implicit fallback.
 *
 * @param userPermissions Array of permission keys held by the user (e.g. ['TypeOfLeave.Add'])
 */
export function usePermission(userPermissions: string[] = []): PermissionState {
  // Set for fast O(1) membership lookups across UI buttons and navigation gates
  const permissionSet = useMemo(() => new Set<string>(userPermissions), [userPermissions]);

  /**
   * Checks whether the user satisfies a specific permission key.
   */
  const hasPermission = useCallback(
    (key: string): boolean => {
      if (!key) return false;

      // 1. Direct match (O(1))
      if (permissionSet.has(key)) {
        return true;
      }

      // 2. Implicit fallback for .View
      if (key.endsWith('.View')) {
        const modulePrefix = key.slice(0, -5);
        return (
          permissionSet.has(`${modulePrefix}.Add`) ||
          permissionSet.has(`${modulePrefix}.Edit`) ||
          permissionSet.has(`${modulePrefix}.Delete`) ||
          permissionSet.has(`${modulePrefix}.Approval.Create`)
        );
      }

      return false;
    },
    [permissionSet]
  );

  /**
   * Checks whether the user satisfies AT LEAST ONE of the provided keys.
   */
  const hasAnyPermission = useCallback(
    (...keys: string[]): boolean => {
      if (keys.length === 0) return true;
      return keys.some((key) => hasPermission(key));
    },
    [hasPermission]
  );

  /**
   * Checks whether the user satisfies ALL of the provided keys.
   */
  const hasAllPermissions = useCallback(
    (...keys: string[]): boolean => {
      if (keys.length === 0) return true;
      return keys.every((key) => hasPermission(key));
    },
    [hasPermission]
  );

  return useMemo(
    () => ({
      effectivePermissions: userPermissions,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
    }),
    [userPermissions, hasPermission, hasAnyPermission, hasAllPermissions]
  );
}
