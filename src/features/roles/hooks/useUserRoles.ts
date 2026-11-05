// ==============================================================================
// JK-PAYROLL: USE USER ROLES QUERY HOOK
// File: src/features/roles/hooks/useUserRoles.ts
// ==============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { UserRoleItem, UserRoleFilterState } from '../types.js';
import { fetchUserRoles, UserRoleListResponse } from '../services/user-role.client.js';

export function useUserRoles() {
  const [userRoles, setUserRoles] = useState<UserRoleItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<UserRoleFilterState>({
    search: '',
    tenantId: 'All',
    roleId: 'All',
    status: 'All',
  });

  const loadUserRoles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data: UserRoleListResponse = await fetchUserRoles({
        search: filters.search,
        tenantId: filters.tenantId,
        roleId: filters.roleId,
        status: filters.status,
      });
      setUserRoles(data.items);
    } catch (err: any) {
      setError(err.message || 'Failed to load user roles');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadUserRoles();
  }, [loadUserRoles]);

  const kpis = useMemo(() => {
    const total = userRoles.length;
    const active = userRoles.filter((ur) => ur.isActive).length;
    const uniqueTenants = new Set(userRoles.map((ur) => ur.tenantId)).size;
    const uniqueRoles = new Set(userRoles.map((ur) => ur.roleId)).size;
    return { total, active, uniqueTenants, uniqueRoles };
  }, [userRoles]);

  const updateSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const updateTenantFilter = useCallback((tenantId: string | 'All') => {
    setFilters((prev) => ({ ...prev, tenantId }));
  }, []);

  const updateRoleFilter = useCallback((roleId: string | 'All') => {
    setFilters((prev) => ({ ...prev, roleId }));
  }, []);

  const updateStatusFilter = useCallback((status: 'All' | 'Active' | 'Inactive') => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      tenantId: 'All',
      roleId: 'All',
      status: 'All',
    });
  }, []);

  return {
    userRoles,
    isLoading,
    error,
    filters,
    setFilters,
    kpis,
    refetch: loadUserRoles,
    updateSearch,
    updateTenantFilter,
    updateRoleFilter,
    updateStatusFilter,
    resetFilters,
  };
}
