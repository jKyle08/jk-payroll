// ==============================================================================
// JK-PAYROLL: USE ROLE DIRECTORY (LIST) HOOK
// File: src/features/roles/hooks/useRoleDirectory.ts
// ==============================================================================

import { useState, useEffect, useCallback } from 'react';
import { RoleItem, RoleFilterState } from '../types.js';
import { fetchRoles } from '../services/role.client.js';

export const DEFAULT_ROLE_FILTERS: RoleFilterState = {
  search: '',
  organizationId: 'All',
  roleType: 'All',
};

export function useRoleDirectory(initial: RoleFilterState = DEFAULT_ROLE_FILTERS) {
  const [filters, setFiltersState] = useState<RoleFilterState>(initial);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [items, setItems] = useState<RoleItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, systemCount: 0, customCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setFilters = useCallback((nextFilters: RoleFilterState) => {
    setPage(1);
    setFiltersState(nextFilters);
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const startTime = Date.now();
    try {
      const res = await fetchRoles({
        ...filters,
        page,
        limit: pageSize,
      });
      const elapsed = Date.now() - startTime;
      if (elapsed < 300) {
        await new Promise((r) => setTimeout(r, 300 - elapsed));
      }
      setItems(res.items);
      setMeta({ total: res.total, systemCount: res.systemCount, customCount: res.customCount });
    } catch (err: any) {
      setError(err.message || 'Failed to load roles');
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const resetFilters = useCallback(() => {
    setPage(1);
    setFiltersState(DEFAULT_ROLE_FILTERS);
  }, []);

  return {
    items,
    meta,
    page,
    setPage,
    pageSize,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
    filters,
    setFilters,
    resetFilters,
    isLoading,
    error,
    refresh,
  };
}
