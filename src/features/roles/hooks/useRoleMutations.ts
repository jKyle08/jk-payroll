// ==============================================================================
// JK-PAYROLL: USE ROLE MUTATIONS HOOK
// File: src/features/roles/hooks/useRoleMutations.ts
// ==============================================================================

import { useState, useCallback } from 'react';
import { RoleItem, CreateRoleInput, UpdateRoleInput } from '../types.js';
import { createRole, updateRole, deleteRole } from '../services/role.client.js';

export function useRoleMutations() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T,>(fn: () => Promise<T>, fallback: string): Promise<T> => {
    setIsSubmitting(true);
    setError(null);
    try {
      return await fn();
    } catch (err: any) {
      setError(err.message || fallback);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const addRole = useCallback(
    (input: CreateRoleInput): Promise<RoleItem> => run(() => createRole(input), 'Failed to create role'),
    [run]
  );
  const editRole = useCallback(
    (id: string, input: UpdateRoleInput): Promise<RoleItem> => run(() => updateRole(id, input), 'Failed to update role'),
    [run]
  );
  const removeRole = useCallback((id: string): Promise<void> => run(() => deleteRole(id), 'Failed to delete role'), [run]);

  return { isSubmitting, error, addRole, editRole, removeRole };
}
