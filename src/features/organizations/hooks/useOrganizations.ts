// ==============================================================================
// JK-PAYROLL: CLIENT USE-ORGANIZATIONS HOOK
// Data fetching, search filtering, and list state management
// File: src/features/organizations/hooks/useOrganizations.ts
// ==============================================================================

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Organization, OrgFilterState } from '../types.js';
import { fetchOrganizations } from '../services/client.js';

export interface UseOrganizationsOptions {
  initialData?: Organization[];
  autoFetch?: boolean;
}

export function useOrganizations(options: UseOrganizationsOptions = {}) {
  const [organizations, setOrganizations] = useState<Organization[]>(
    options.initialData || []
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    options.initialData === undefined && options.autoFetch !== false
  );
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<OrgFilterState>({
    search: '',
    status: 'All',
    planTier: 'All',
    tier: 'All',
    payFrequency: 'All',
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchOrganizations();
      setOrganizations(response.items);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch organizations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options.initialData !== undefined) {
      setOrganizations(options.initialData);
      setIsLoading(false);
      return;
    }
    if (options.autoFetch !== false) {
      loadData();
    }
  }, [options.initialData, options.autoFetch, loadData]);

  // Client-side filtering logic
  const filteredOrganizations = useMemo(() => {
    return organizations.filter((org) => {
      const query = filters.search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        org.name.toLowerCase().includes(query) ||
        org.code.toLowerCase().includes(query) ||
        org.slug.toLowerCase().includes(query) ||
        org.domain.toLowerCase().includes(query) ||
        (org.admin?.email && org.admin.email.toLowerCase().includes(query)) ||
        (org.admin?.name && org.admin.name.toLowerCase().includes(query));

      const matchesStatus =
        filters.status === 'All' || org.status === filters.status;

      const activeTier = filters.tier && filters.tier !== 'All' ? filters.tier : filters.planTier;
      const matchesTier = !activeTier || activeTier === 'All' || org.planTier === activeTier;

      const matchesFrequency =
        !filters.payFrequency ||
        filters.payFrequency === 'All' ||
        org.defaultPayFrequency === filters.payFrequency;

      return matchesSearch && matchesStatus && matchesTier && matchesFrequency;
    });
  }, [organizations, filters]);

  // Real-time KPI summaries
  const kpis = useMemo(() => {
    const total = organizations.length;
    const active = organizations.filter((o) => o.status === 'Active').length;
    const pending = organizations.filter((o) => o.status === 'Onboarding').length;
    const totalHeadcount = organizations.reduce(
      (acc, o) => acc + (o.headcount || 0),
      0
    );

    return { total, active, pending, totalHeadcount };
  }, [organizations]);

  // Optimistic list updates
  const addOrganization = useCallback((newOrg: Organization) => {
    setOrganizations((prev) => [newOrg, ...prev]);
  }, []);

  const updateOrganizationInState = useCallback((updatedOrg: Organization) => {
    setOrganizations((prev) =>
      prev.map((o) => (o.id === updatedOrg.id ? updatedOrg : o))
    );
  }, []);

  const removeOrganizationFromState = useCallback((id: string) => {
    setOrganizations((prev) => prev.filter((o) => o.id !== id));
  }, []);

  return {
    organizations,
    filteredOrganizations,
    kpis,
    filters,
    setFilters,
    isLoading,
    error,
    refetch: loadData,
    addOrganization,
    updateOrganizationInState,
    removeOrganizationFromState,
  };
}

export default useOrganizations;
