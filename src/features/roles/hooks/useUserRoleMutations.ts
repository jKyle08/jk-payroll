// ==============================================================================
// JK-PAYROLL: USE USER ROLE MUTATIONS HOOK
// File: src/features/roles/hooks/useUserRoleMutations.ts
// ==============================================================================

import { useState, useCallback } from 'react';
import { UserRoleItem, CreateUserRoleInput, UpdateUserRoleInput } from '../types.js';
import {
  createUserRole,
  updateUserRole,
  deleteUserRole,
} from '../services/user-role.client.js';

export function useUserRoleMutations() {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const assignRole = useCallback(
    async (input: CreateUserRoleInput): Promise<UserRoleItem> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const result = await createUserRole(input);
        return result;
      } catch (err: any) {
        setError(err.message || 'Failed to assign user role');
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const updateRole = useCallback(
    async (id: string, input: UpdateUserRoleInput): Promise<UserRoleItem> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const result = await updateUserRole(id, input);
        return result;
      } catch (err: any) {
        setError(err.message || 'Failed to update user role');
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const removeRole = useCallback(async (id: string): Promise<void> => {
    setIsSubmitting(true);
    setError(null);
    try {
      await deleteUserRole(id);
    } catch (err: any) {
      setError(err.message || 'Failed to delete user role');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {
    isSubmitting,
    error,
    assignRole,
    updateRole,
    removeRole,
  };
}
