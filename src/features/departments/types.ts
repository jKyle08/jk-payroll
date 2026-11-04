// ==============================================================================
// JK-PAYROLL: DEPARTMENTS FEATURE TYPES
// File: src/features/departments/types.ts
// ==============================================================================

export interface Department {
  id: string;
  organizationId: string;
  /** Backward compatibility alias for tenantId */
  tenantId?: string;
  parentDepartmentId: string | null;
  code: string;
  name: string;
  description?: string;
  headUserId?: string | null;
  depth: number;
  treePath?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DepartmentNode extends Department {
  children: DepartmentNode[];
  path?: string[];
}

export interface DepartmentItem {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationCode: string;
  parentDepartmentId: string | null;
  parentDepartmentName?: string;
  parentDepartmentCode?: string;
  code: string;
  name: string;
  description?: string;
  headUserId?: string | null;
  headUserName?: string;
  headUserEmail?: string;
  depth: number;
  depthLabel: string; // "Head Department" (0), "Sub-Department" (1), "Unit" (2+)
  treePath: string;
  isActive: boolean;
  childrenCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentInput {
  organizationId?: string;
  tenantId?: string;
  parentDepartmentId?: string | null;
  code: string;
  name: string;
  description?: string;
  headUserId?: string | null;
  isActive?: boolean;
}

export interface UpdateDepartmentInput {
  organizationId?: string;
  parentDepartmentId?: string | null;
  code?: string;
  name?: string;
  description?: string;
  headUserId?: string | null;
  isActive?: boolean;
}

export interface DepartmentFilterState {
  search?: string;
  organizationId?: string | 'All';
  status?: 'All' | 'Active' | 'Inactive';
  depth?: number | string | 'All';
}

export interface AllocateDeptModulesInput {
  moduleIds: string[];
}

export const DEFAULT_DEPARTMENT_ORGANIZATIONS = [
  { id: '00000000-0000-0000-0000-000000000000', name: 'SuperAdmin Platform', code: 'ROOT' },
  { id: '00000000-0000-0000-0000-000000000001', name: 'Apex Health Systems', code: 'APEX-HLTH' },
];
