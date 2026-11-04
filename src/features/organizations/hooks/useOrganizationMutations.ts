// ==============================================================================
// JK-PAYROLL: CLIENT USE-ORGANIZATION-MUTATIONS HOOK
// Clean CRUD operations (Create, Update, Delete) with loading & error states
// File: src/features/organizations/hooks/useOrganizationMutations.ts
// ==============================================================================

import { useState, useCallback } from 'react';
import { Organization } from '../types.js';
import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from '../organization.schema.js';
import {
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from '../services/client.js';

export function useOrganizationMutations() {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const createOrg = useCallback(
    async (data: CreateOrganizationInput): Promise<Organization> => {
      setIsSubmitting(true);
      setMutationError(null);
      try {
        const result = await createOrganization(data);
        return result;
      } catch (err: any) {
        const msg = err.message || 'Failed to provision organization';
        setMutationError(msg);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const updateOrg = useCallback(
    async (id: string, data: UpdateOrganizationInput): Promise<Organization> => {
      setIsSubmitting(true);
      setMutationError(null);
      try {
        const result = await updateOrganization(id, data);
        return result;
      } catch (err: any) {
        const msg = err.message || 'Failed to update organization';
        setMutationError(msg);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const deleteOrg = useCallback(
    async (id: string): Promise<boolean> => {
      setIsSubmitting(true);
      setMutationError(null);
      try {
        await deleteOrganization(id);
        return true;
      } catch (err: any) {
        const msg = err.message || 'Failed to delete organization';
        setMutationError(msg);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  return {
    createOrg,
    updateOrg,
    deleteOrg,
    isSubmitting,
    mutationError,
    clearError: () => setMutationError(null),
  };
}

export default useOrganizationMutations;
