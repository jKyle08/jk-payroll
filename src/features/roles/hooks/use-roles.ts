// ==============================================================================
// JK-PAYROLL: CLIENT USE-ROLES HOOK
// File: src/features/roles/hooks/use-roles.ts
// ==============================================================================

import { useState } from 'react';
import { Role } from '../types.js';

export function useRoles(initialRoles: Role[] = []) {
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  return {
    roles,
    setRoles,
    selectedRoleId,
    setSelectedRoleId,
  };
}

export default useRoles;
