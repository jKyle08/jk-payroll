// ==============================================================================
// JK-PAYROLL: TENANTS VALIDATION SCHEMAS (ZOD V3.24)
// File: src/features/tenants/tenant.schema.ts
// ==============================================================================

import { z } from 'zod';

export const createTenantSchema = z.object({
  name: z.string().min(2, 'Tenant name is required').max(100),
  code: z.string().min(2, 'Tenant code is required').max(30),
  modules: z.array(z.string()).default([]),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;

export const setTenantModulesSchema = z.object({
  moduleIds: z.array(z.string()).min(1, 'At least one module ID must be provided'),
});

export type SetTenantModulesInput = z.infer<typeof setTenantModulesSchema>;
