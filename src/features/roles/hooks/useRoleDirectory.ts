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
  const [filters, setFilters] = useState<RoleFilterState>(initial);
  const [items, setItems] = useState<RoleItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, systemCount: 0, customCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchRoles(filters);
      setItems(res.items);
      setMeta({ total: res.total, systemCount: res.systemCount, customCount: res.customCount });
    } catch (err: any) {
      setError(err.message || 'Failed to load roles');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const resetFilters = useCallback(() => setFilters(DEFAULT_ROLE_FILTERS), []);

  return { items, meta, filters, setFilters, resetFilters, isLoading, error, refresh };
}
