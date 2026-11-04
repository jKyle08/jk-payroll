// ==============================================================================
// JK-PAYROLL: DEPARTMENTS FEATURE TYPES
// File: src/features/departments/types.ts
// ==============================================================================

export interface Department {
  id: string;
  tenantId: string;
  parentDepartmentId: string | null;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DepartmentNode extends Department {
  children: DepartmentNode[];
  depth?: number;
  path?: string[];
}

export interface CreateDepartmentInput {
  tenantId: string;
  parentDepartmentId?: string | null;
  code: string;
  name: string;
  isActive?: boolean;
}

export interface AllocateDeptModulesInput {
  moduleIds: string[];
}
