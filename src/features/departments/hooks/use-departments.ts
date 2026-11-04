// ==============================================================================
// JK-PAYROLL: CLIENT USE-DEPARTMENTS HOOK
// File: src/features/departments/hooks/use-departments.ts
// ==============================================================================

import { useState, useCallback } from 'react';
import { DepartmentTreeNode } from '../types.js';

export function useDepartments(initialTree: DepartmentTreeNode[] = []) {
  const [departmentTree, setDepartmentTree] = useState<DepartmentTreeNode[]>(initialTree);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const selectDepartment = useCallback((id: string | null) => {
    setSelectedDepartmentId(id);
  }, []);

  return {
    departmentTree,
    setDepartmentTree,
    selectedDepartmentId,
    selectDepartment,
    isLoading,
    setIsLoading,
  };
}

export default useDepartments;
