// ==============================================================================
// JK-PAYROLL: CLIENT USE-DEPARTMENTS HOOK
// File: src/features/departments/hooks/use-departments.ts
// ==============================================================================

import { useState, useCallback, useEffect } from 'react';
import { DepartmentItem, DepartmentNode, DepartmentFilterState } from '../types.js';
import {
  fetchDepartments,
  fetchDepartmentTree,
  createDepartment as apiCreateDepartment,
  updateDepartment as apiUpdateDepartment,
  deleteDepartment as apiDeleteDepartment,
} from '../services/department.client.js';

export function useDepartments(initialFilters?: DepartmentFilterState) {
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [departmentTree, setDepartmentTree] = useState<DepartmentNode[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [filters, setFilters] = useState<DepartmentFilterState>(initialFilters || {});
  const [meta, setMeta] = useState({
    total: 0,
    activeCount: 0,
    rootCount: 0,
    subCount: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchDepartments(filters);
      setDepartments(res.items);
      setMeta({
        total: res.total,
        activeCount: res.activeCount,
        rootCount: res.rootCount,
        subCount: res.subCount,
      });

      const tree = await fetchDepartmentTree(filters.organizationId !== 'All' ? filters.organizationId : undefined);
      setDepartmentTree(tree);
    } catch (err: any) {
      setError(err.message || 'Failed to load departments');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectDepartment = useCallback((id: string | null) => {
    setSelectedDepartmentId(id);
  }, []);

  return {
    departments,
    departmentTree,
    meta,
    selectedDepartmentId,
    selectDepartment,
    filters,
    setFilters,
    isLoading,
    error,
    refresh: loadData,
  };
}

export function useDepartmentMutations() {
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const create = async (data: any) => {
    setIsMutating(true);
    setMutationError(null);
    try {
      return await apiCreateDepartment(data);
    } catch (err: any) {
      setMutationError(err.message);
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  const update = async (id: string, data: any) => {
    setIsMutating(true);
    setMutationError(null);
    try {
      return await apiUpdateDepartment(id, data);
    } catch (err: any) {
      setMutationError(err.message);
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  const remove = async (id: string) => {
    setIsMutating(true);
    setMutationError(null);
    try {
      return await apiDeleteDepartment(id);
    } catch (err: any) {
      setMutationError(err.message);
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  return {
    create,
    update,
    remove,
    isMutating,
    mutationError,
  };
}

export default useDepartments;
