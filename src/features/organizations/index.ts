// ==============================================================================
// JK-PAYROLL: ORGANIZATIONS FEATURE PUBLIC BARREL EXPORTS
// Clean, Page-Driven CRUD Architecture (Zero Component Bloat)
// File: src/features/organizations/index.ts
// ==============================================================================

// Primary Page-Driven Architecture Exports
export { OrganizationMain } from './components/OrganizationMain.js';
export { OrganizationFormPage } from './components/OrganizationFormPage.js';
export { OrganizationToolbar } from './components/OrganizationToolbar.js';
export { OrganizationTable } from './components/OrganizationTable.js';
export { OrganizationTableRow } from './components/OrganizationTableRow.js';
export { OrganizationTableSkeleton } from './components/OrganizationTableSkeleton.js';

// Hooks
export { useOrganizations } from './hooks/useOrganizations.js';
export { useOrganization } from './hooks/useOrganization.js';
export { useOrganizationMutations } from './hooks/useOrganizationMutations.js';

// Services Client
export * from './services/client.js';

// Domain Types & Validation Schemas
export * from './types.js';
export * from './organization.schema.js';
