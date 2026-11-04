// ==============================================================================
// JK-PAYROLL: DEPARTMENTS FEATURE CLIENT EXPORTS
// Strictly Frontend-Safe Modules (Components, Hooks, Types, Schemas, Services)
// File: src/features/departments/index.ts
// ==============================================================================

export * from './types.js';
export {
  createDepartmentSchema,
  updateDepartmentSchema,
  departmentQuerySchema,
  allocateDepartmentModulesSchema,
} from './department.schema.js';
export * from './services/department.client.js';
export * from './hooks/use-departments.js';

// Components
export * from './components/department-tree.js';
export * from './components/DepartmentMain.js';
export * from './components/DepartmentFormPage.js';
export * from './components/DepartmentTable.js';
export * from './components/DepartmentTableRow.js';
export * from './components/DepartmentToolbar.js';
