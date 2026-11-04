// ==============================================================================
// JK-PAYROLL: CLIENT USE-ORGANIZATION HOOK
// Single record fetching for detail & edit mode
// File: src/features/organizations/hooks/useOrganization.ts
// ==============================================================================

import { useState, useEffect, useCallback } from 'react';
import { Organization } from '../types.js';
import { fetchOrganizationById } from '../services/client.js';

export function useOrganization(id?: string) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!id);
  const [error, setError] = useState<string | null>(null);

  const loadOrg = useCallback(async () => {
    if (!id) {
      setOrganization(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchOrganizationById(id);
      setOrganization(data);
    } catch (err: any) {
      setError(err.message || `Failed to load organization '${id}'`);
      setOrganization(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrg();
  }, [loadOrg]);

  return {
    organization,
    isLoading,
    error,
    refetch: loadOrg,
  };
}

export default useOrganization;
