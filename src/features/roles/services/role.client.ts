// ==============================================================================
// JK-PAYROLL: ROLE (DEFINITION) HTTP CLIENT SERVICE
// File: src/features/roles/services/role.client.ts
// ==============================================================================

import { RoleItem, CreateRoleInput, UpdateRoleInput } from '../types.js';

export interface RoleListResponse {
  items: RoleItem[];
  total: number;
  systemCount: number;
  customCount: number;
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function unwrap<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: ${fallback}`);
  }
  return res.json();
}

export async function fetchRoles(params?: {
  search?: string;
  organizationId?: string;
  roleType?: string;
}): Promise<RoleListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.organizationId && params.organizationId !== 'All') query.append('organizationId', params.organizationId);
  if (params?.roleType && params.roleType !== 'All') query.append('roleType', params.roleType);

  const json = await unwrap<any>(await fetch(`/api/roles?${query.toString()}`, { headers: authHeaders() }), 'Failed to fetch roles');
  return {
    items: json.data || [],
    total: json.meta?.total || 0,
    systemCount: json.meta?.systemCount || 0,
    customCount: json.meta?.customCount || 0,
  };
}

export async function fetchRoleById(id: string): Promise<RoleItem> {
  const json = await unwrap<any>(await fetch(`/api/roles/${id}`, { headers: authHeaders() }), 'Failed to fetch role');
  return json.data;
}

export async function createRole(data: CreateRoleInput): Promise<RoleItem> {
  const json = await unwrap<any>(
    await fetch('/api/roles', { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }),
    'Failed to create role'
  );
  return json.data;
}

export async function updateRole(id: string, data: UpdateRoleInput): Promise<RoleItem> {
  const json = await unwrap<any>(
    await fetch(`/api/roles/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }),
    'Failed to update role'
  );
  return json.data;
}

export async function deleteRole(id: string): Promise<void> {
  await unwrap<any>(await fetch(`/api/roles/${id}`, { method: 'DELETE', headers: authHeaders() }), 'Failed to delete role');
}
