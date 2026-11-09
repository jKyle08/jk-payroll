// ==============================================================================
// JK-PAYROLL: ORGANIZATION API CLIENT SERVICE
// High-reliability fetch client communicating with /api/organizations
// File: src/features/organizations/services/client.ts
// ==============================================================================

import {
  Organization,
  OrgFilterState,
} from '../types.js';
import {
  CreateOrganizationInput,
  CreateOrganizationFormInput,
  UpdateOrganizationInput,
} from '../organization.schema.js';

export interface OrganizationListResponse {
  items: Organization[];
  total: number;
  activeCount: number;
  pendingCount: number;
  totalHeadcount: number;
}

const BASE_URL = '/api/organizations';

/**
 * Standard HTTP Request helper with consistent error throwing
 */
async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach JWT Bearer token from localStorage
  if (typeof window !== 'undefined' && !headers.has('Authorization')) {
    const token = localStorage.getItem('token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/401') {
        window.location.href = '/401';
      }
    }
    const errorMessage =
      data?.error || data?.message || `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  // If response has nested data wrapper, unwrap it
  if (data && typeof data === 'object' && 'data' in data && data.success !== undefined) {
    return data.data as T;
  }

  return data as T;
}

/**
 * List organizations with optional query filters
 */
export async function fetchOrganizations(
  filters?: Partial<OrgFilterState> & { page?: number; limit?: number }
): Promise<OrganizationListResponse> {
  const queryParams = new URLSearchParams();

  if (filters?.search) queryParams.set('search', filters.search);
  if (filters?.status && filters.status !== 'All') queryParams.set('status', filters.status);
  const tier = filters?.tier || filters?.planTier;
  if (tier && tier !== 'All') queryParams.set('tier', tier);
  if (filters?.page) queryParams.set('page', String(filters.page));
  if (filters?.limit) queryParams.set('limit', String(filters.limit));

  const queryString = queryParams.toString();
  const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;

  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(url, { headers });
  const res = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(res?.error || `Request failed with status ${response.status}`);
  }

  if (Array.isArray(res)) {
    return {
      items: res,
      total: res.length,
      activeCount: res.filter((o) => o.status === 'Active').length,
      pendingCount: res.filter((o) => o.status === 'Onboarding').length,
      totalHeadcount: res.reduce((acc, o) => acc + (o.headcount || 0), 0),
    };
  }

  const items: Organization[] = res.data || res.items || [];
  return {
    items,
    total: res.meta?.total ?? res.total ?? items.length,
    activeCount: res.meta?.activeCount ?? res.activeCount ?? 0,
    pendingCount: res.meta?.pendingCount ?? res.pendingCount ?? 0,
    totalHeadcount: res.meta?.totalHeadcount ?? res.totalHeadcount ?? 0,
  };
}

/**
 * Fetch a single organization by its ID
 */
export async function fetchOrganizationById(id: string): Promise<Organization> {
  if (!id) throw new Error('Organization ID is required');
  return apiRequest<Organization>(`${BASE_URL}/${encodeURIComponent(id)}`);
}

/**
 * Provision / Create a new organization
 */
export async function createOrganization(
  data: CreateOrganizationInput | CreateOrganizationFormInput
): Promise<Organization> {
  return apiRequest<Organization>(BASE_URL, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update an existing organization settings
 */
export async function updateOrganization(
  id: string,
  data: UpdateOrganizationInput
): Promise<Organization> {
  if (!id) throw new Error('Organization ID is required');
  return apiRequest<Organization>(`${BASE_URL}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete an organization by ID
 */
export async function deleteOrganization(
  id: string
): Promise<{ success: boolean; message?: string }> {
  if (!id) throw new Error('Organization ID is required');
  return apiRequest<{ success: boolean; message?: string }>(
    `${BASE_URL}/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    }
  );
}

export const organizationClient = {
  fetchOrganizations,
  fetchOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
};

export default organizationClient;
