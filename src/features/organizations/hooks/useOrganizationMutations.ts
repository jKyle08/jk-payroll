// ==============================================================================
// JK-PAYROLL: CLIENT USE-ORGANIZATION-MUTATIONS HOOK
// Clean CRUD operations (Create, Update, Delete) with loading & error states
// File: src/features/organizations/hooks/useOrganizationMutations.ts
// ==============================================================================

import { useState, useCallback } from 'react';
import { Organization, OrganizationOnboardingResult } from '../types.js';
import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OrganizationOnboardingInput,
  UpdateOrganizationSettingsInput,
} from '../organization.schema.js';
import {
  createOrganization,
  createOrganizationOnboarding,
  createOrganizationOnboardingInvitation,
  updateOrganization,
  updateOrganizationSettings,
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

  const onboardOrg = useCallback(
    async (data: OrganizationOnboardingInput, onboardingToken?: string): Promise<OrganizationOnboardingResult> => {
      setIsSubmitting(true);
      setMutationError(null);
      try {
        const result = onboardingToken
          ? await createOrganizationOnboarding(data, onboardingToken)
          : { organization: await createOrganization(data), redirectUrl: '/organizations' };
        return result;
      } catch (err: any) {
        const msg = err.message || 'Failed to onboard organization';
        setMutationError(msg);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const createOnboardingInvitation = useCallback(async (email: string) => {
    setIsSubmitting(true);
    setMutationError(null);
    try {
      return await createOrganizationOnboardingInvitation(email);
    } catch (err: any) {
      const msg = err.message || 'Failed to create onboarding link';
      setMutationError(msg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const updateOrgSettings = useCallback(
    async (id: string, data: UpdateOrganizationSettingsInput): Promise<Organization> => {
      setIsSubmitting(true);
      setMutationError(null);
      try {
        const result = await updateOrganizationSettings(id, data);
        return result;
      } catch (err: any) {
        const msg = err.message || 'Failed to update organization settings';
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
    onboardOrg,
    createOnboardingInvitation,
    updateOrg,
    updateOrgSettings,
    deleteOrg,
    isSubmitting,
    mutationError,
    clearError: () => setMutationError(null),
  };
}

export default useOrganizationMutations;
