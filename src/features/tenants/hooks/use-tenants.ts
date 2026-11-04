// ==============================================================================
// JK-PAYROLL: CLIENT USE-TENANTS HOOK
// File: src/features/tenants/hooks/use-tenants.ts
// ==============================================================================

import { useState } from 'react';
import { Tenant } from '../types.js';

export function useTenants(initialTenants: Tenant[] = []) {
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);

  return {
    tenants,
    setTenants,
    activeTenantId,
    setActiveTenantId,
  };
}

export default useTenants;
