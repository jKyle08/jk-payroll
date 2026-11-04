// ==============================================================================
// JK-PAYROLL: TENANTS FEATURE TYPES
// File: src/features/tenants/types.ts
// ==============================================================================

import { Module } from '../../types/index.js';

export interface Tenant {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  industry?: string;
  domain?: string;
  adminName?: string;
  adminEmail?: string;
  adminUsername?: string;
  adminTitle?: string;
  modules?: string[];
  planTier?: string;
  defaultPayFrequency?: string;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantInput {
  id?: string;
  name: string;
  code: string;
  isActive?: boolean;
  industry?: string;
  domain?: string;
  adminName?: string;
  adminEmail?: string;
  adminUsername?: string;
  adminTitle?: string;
  modules?: string[];
  planTier?: string;
  defaultPayFrequency?: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface SetTenantModulesInput {
  moduleIds: string[];
}

export interface TenantWithModules extends Omit<Tenant, 'modules'> {
  modules: Module[];
}
