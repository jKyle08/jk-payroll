// ==============================================================================
// JK-PAYROLL: DEPARTMENT HTTP CLIENT SERVICE
// File: src/features/departments/services/department.client.ts
// ==============================================================================

import {
  Department,
  DepartmentItem,
  DepartmentNode,
  CreateDepartmentInput,
  UpdateDepartmentInput,
} from '../types.js';

export interface DepartmentListResponse {
  items: DepartmentItem[];
  total: number;
  activeCount: number;
  rootCount: number;
  subCount: number;
}

export async function fetchDepartments(params?: {
  search?: string;
  organizationId?: string;
  tenantId?: string;
  status?: string;
  depth?: string | number;
  page?: number;
  limit?: number;
}): Promise<DepartmentListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  const org = params?.organizationId || params?.tenantId;
  if (org && org !== 'All') query.append('organizationId', org);
  if (params?.status && params.status !== 'All') query.append('status', params.status);
  if (params?.depth !== undefined && params.depth !== 'All') query.append('depth', String(params.depth));
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`/api/departments?${query.toString()}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: Failed to fetch departments`);
  }

  const json = await res.json();
  return {
    items: json.data || [],
    total: json.meta?.total || 0,
    activeCount: json.meta?.activeCount || 0,
    rootCount: json.meta?.rootCount || 0,
    subCount: json.meta?.subCount || 0,
  };
}

export async function fetchDepartmentById(id: string): Promise<DepartmentItem> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`/api/departments/${id}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: Failed to fetch department`);
  }

  const json = await res.json();
  return json.data || json.department;
}

export async function createDepartment(data: CreateDepartmentInput): Promise<Department> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch('/api/departments', {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: Failed to create department`);
  }

  const json = await res.json();
  return json.data || json.department;
}

export async function updateDepartment(id: string, data: UpdateDepartmentInput): Promise<Department> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`/api/departments/${id}`, {
    method: 'PUT',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: Failed to update department`);
  }

  const json = await res.json();
  return json.data || json.department;
}

export async function deleteDepartment(id: string): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`/api/departments/${id}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: Failed to delete department`);
  }
}

export async function fetchDepartmentTree(organizationId?: string): Promise<DepartmentNode[]> {
  const query = new URLSearchParams();
  if (organizationId) query.append('organizationId', organizationId);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`/api/departments/tree?${query.toString()}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: Failed to fetch department tree`);
  }

  const json = await res.json();
  return json.data || json.departmentTree || [];
}
