// ==============================================================================
// JK-PAYROLL: USE USER ROLES QUERY HOOK
// File: src/features/roles/hooks/useUserRoles.ts
// ==============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { UserRoleItem, UserRoleFilterState } from '../types.js';
import { fetchUserRoles, UserRoleListResponse } from '../services/user-role.client.js';

export function useUserRoles() {
  const [userRoles, setUserRoles] = useState<UserRoleItem[]>([]);
  const [serverMeta, setServerMeta] = useState<{
    total: number;
    activeCount: number;
    rolesCount: number;
    tenantsCount: number;
  } | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFiltersState] = useState<UserRoleFilterState>({
    search: '',
    tenantId: 'All',
    roleId: 'All',
    status: 'All',
  });

  const setFilters = useCallback((nextFilters: UserRoleFilterState | ((prev: UserRoleFilterState) => UserRoleFilterState)) => {
    setPage(1);
    setFiltersState(nextFilters);
  }, []);

  const loadUserRoles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const startTime = Date.now();
    try {
      const data: UserRoleListResponse = await fetchUserRoles({
        search: filters.search,
        tenantId: filters.tenantId,
        roleId: filters.roleId,
        status: filters.status,
        page,
        limit: pageSize,
      });
      const elapsed = Date.now() - startTime;
      if (elapsed < 300) {
        await new Promise((r) => setTimeout(r, 300 - elapsed));
      }
      setUserRoles(data.items);
      setServerMeta({
        total: data.total,
        activeCount: data.activeCount,
        rolesCount: data.rolesCount,
        tenantsCount: data.tenantsCount,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load user roles');
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    loadUserRoles();
  }, [loadUserRoles]);

  const kpis = useMemo(() => {
    if (serverMeta) {
      return {
        total: serverMeta.total,
        active: serverMeta.activeCount,
        uniqueTenants: serverMeta.tenantsCount,
        uniqueRoles: serverMeta.rolesCount,
      };
    }
    const total = userRoles.length;
    const active = userRoles.filter((ur) => ur.isActive).length;
    const uniqueTenants = new Set(userRoles.map((ur) => ur.tenantId)).size;
    const uniqueRoles = new Set(userRoles.map((ur) => ur.roleId)).size;
    return { total, active, uniqueTenants, uniqueRoles };
  }, [userRoles, serverMeta]);

  const updateSearch = useCallback((search: string) => {
    setPage(1);
    setFiltersState((prev) => ({ ...prev, search }));
  }, []);

  const updateTenantFilter = useCallback((tenantId: string | 'All') => {
    setPage(1);
    setFiltersState((prev) => ({ ...prev, tenantId }));
  }, []);

  const updateRoleFilter = useCallback((roleId: string | 'All') => {
    setPage(1);
    setFiltersState((prev) => ({ ...prev, roleId }));
  }, []);

  const updateStatusFilter = useCallback((status: 'All' | 'Active' | 'Inactive') => {
    setPage(1);
    setFiltersState((prev) => ({ ...prev, status }));
  }, []);

  const resetFilters = useCallback(() => {
    setPage(1);
    setFiltersState({
      search: '',
      tenantId: 'All',
      roleId: 'All',
      status: 'All',
    });
  }, []);

  return {
    userRoles,
    totalCount: serverMeta?.total ?? userRoles.length,
    page,
    setPage,
    pageSize,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
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
