// ==============================================================================
// JK-PAYROLL: USER ROLE HTTP CLIENT SERVICE
// File: src/features/roles/services/user-role.client.ts
// ==============================================================================

import {
  UserRoleItem,
  CreateUserRoleInput,
  UpdateUserRoleInput,
} from '../types.js';
import { authFetch } from '../../../client/lib/auth-session.js';

export interface UserRoleListResponse {
  items: UserRoleItem[];
  total: number;
  activeCount: number;
  rolesCount: number;
  tenantsCount: number;
}

export async function fetchUserRoles(params?: {
  search?: string;
  tenantId?: string;
  roleId?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<UserRoleListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.tenantId && params.tenantId !== 'All') query.append('tenantId', params.tenantId);
  if (params?.roleId && params.roleId !== 'All') query.append('roleId', params.roleId);
  if (params?.status && params.status !== 'All') query.append('status', params.status);
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));

  const res = await authFetch(`/api/user-roles?${query.toString()}`);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: Failed to fetch user roles`);
  }

  const json = await res.json();
  return {
    items: json.data || [],
    total: json.meta?.total || 0,
    activeCount: json.meta?.activeCount || 0,
    rolesCount: json.meta?.rolesCount || 0,
    tenantsCount: json.meta?.tenantsCount || 0,
  };
}

export async function fetchUserRoleById(id: string): Promise<UserRoleItem> {
  const res = await authFetch(`/api/user-roles/${id}`);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: Failed to fetch user role`);
  }

  const json = await res.json();
  return json.data;
}

export async function createUserRole(data: CreateUserRoleInput): Promise<UserRoleItem> {
  const res = await authFetch('/api/user-roles', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: Failed to create user role`);
  }

  const json = await res.json();
  return json.data;
}

export async function updateUserRole(id: string, data: UpdateUserRoleInput): Promise<UserRoleItem> {
  const res = await authFetch(`/api/user-roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: Failed to update user role`);
  }

  const json = await res.json();
  return json.data;
}

export async function deleteUserRole(id: string): Promise<void> {
  const res = await authFetch(`/api/user-roles/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: Failed to delete user role`);
  }
}
