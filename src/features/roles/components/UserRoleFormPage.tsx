// ==============================================================================
// JK-PAYROLL: USER ROLE UNIFIED FORM PAGE
// Single page-driven form for both Create and Edit of User Role assignments
// Design System: "Midnight & Champagne Steel"
// File: src/features/roles/components/UserRoleFormPage.tsx
// ==============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
  Shield,
  Check,
} from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { UserRoleItem } from '../types.js';
import { fetchUserRoleById } from '../services/user-role.client.js';
import { useUserRoleMutations } from '../hooks/useUserRoleMutations.js';
import {
  SearchableSelect,
  type SearchableOption,
} from '../../../components/ui/SearchableSelect.js';
import { useAuth } from '../../auth/hooks/use-auth.js';

export interface UserRoleFormPageProps {
  userRoleIdOverride?: string;
  onNavigateBack?: () => void;
  onSuccess?: (item: UserRoleItem) => void;
}

// Available Default Organizations
const DEFAULT_ORGANIZATIONS = [
  {
    id: '00000000-0000-0000-0000-000000000000',
    name: 'SuperAdmin Platform',
    code: 'ROOT',
    description: 'System root management & platform operations',
  },
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Apex Health Systems',
    code: 'APEX-HLTH',
    description: 'Primary healthcare tenant organization',
  },
];

// Available Default Roles
const DEFAULT_ROLES = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    code: 'SUPER_ADMIN',
    name: 'Super Administrator',
    description:
      'Full platform-wide root authority across all modules and tenants',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    code: 'ADMIN',
    name: 'Administrator',
    description:
      'Organization-level administrative control over department and policies',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    code: 'PAYROLL_OFFICER',
    name: 'Payroll Officer',
    description:
      'Manages salary computations, payroll runs, and statutory deductions',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000004',
    code: 'HR_MANAGER',
    name: 'HR Manager',
    description:
      'Staff directory placement, leave approvals, and employee profiles',
  },
];

// Available Users for Selection with Current Role
export interface UserCandidate {
  id: string;
  name: string;
  email: string;
  tenantId: string;
  currentRole: string;
  dept: string;
}

const AVAILABLE_USERS: UserCandidate[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Super Administrator',
    email: 'superadmin@paypulse.internal',
    tenantId: '00000000-0000-0000-0000-000000000000',
    currentRole: 'Super Administrator',
    dept: 'System Root',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Alexander Wright',
    email: 'admin@apexcorp.com',
    tenantId: '00000000-0000-0000-0000-000000000001',
    currentRole: 'Administrator',
    dept: 'Executive',
  },
  {
    id: 'usr-1',
    name: 'Rachel Sterling',
    email: 'rachel.sterling@enterprise.net',
    tenantId: '00000000-0000-0000-0000-000000000001',
    currentRole: 'Operations Lead',
    dept: 'HR & Operations',
  },
  {
    id: 'usr-2',
    name: 'Marcus Vance',
    email: 'm.vance@enterprise.net',
    tenantId: '00000000-0000-0000-0000-000000000001',
    currentRole: 'HR Manager',
    dept: 'Human Resources',
  },
  {
    id: 'usr-3',
    name: 'Elena Rostova',
    email: 'e.rostova@enterprise.net',
    tenantId: '00000000-0000-0000-0000-000000000001',
    currentRole: 'Technical Lead',
    dept: 'Information Technology',
  },
  {
    id: 'usr-4',
    name: 'David Kim',
    email: 'david.kim@enterprise.net',
    tenantId: '00000000-0000-0000-0000-000000000001',
    currentRole: 'Finance Director',
    dept: 'Finance & Accounts',
  },
  {
    id: 'usr-5',
    name: 'Sarah Jenkins',
    email: 's.jenkins@enterprise.net',
    tenantId: '00000000-0000-0000-0000-000000000001',
    currentRole: 'Payroll Officer',
    dept: 'Payroll Division',
  },
  {
    id: 'usr-6',
    name: 'Michael Chang',
    email: 'm.chang@enterprise.net',
    tenantId: '00000000-0000-0000-0000-000000000001',
    currentRole: 'System Administrator',
    dept: 'IT Infrastructure',
  },
];

export const UserRoleFormPage: React.FC<UserRoleFormPageProps> = ({
  userRoleIdOverride,
  onNavigateBack,
  onSuccess,
}) => {
  const params = useParams<{ id?: string }>();
  const id = userRoleIdOverride || params.id;
  const isEditMode = Boolean(id);
  const { token } = useAuth();

  let navigate: ((path: string) => void) | undefined;
  let pathname = '/admin/roles';
  try {
    navigate = useNavigate();
    const loc = useLocation();
    pathname = loc.pathname;
  } catch {
    navigate = undefined;
  }

  const handleBack = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else if (navigate) {
      if (pathname.startsWith('/admin/permissions')) {
        navigate('/admin/permissions');
      } else {
        navigate('/admin/roles');
      }
    }
  };

  const [isLoadingItem, setIsLoadingItem] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Live Organizations & Roles state
  const [orgList, setOrgList] = useState(DEFAULT_ORGANIZATIONS);
  const [roleList, setRoleList] = useState(DEFAULT_ROLES);

  useEffect(() => {
    let isMounted = true;
    const loadLookups = async () => {
      try {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const [orgsRes, rolesRes] = await Promise.all([
          fetch('/api/organizations', { headers }).catch(() => null),
          fetch('/api/roles', { headers }).catch(() => null),
        ]);
        if (orgsRes && orgsRes.ok) {
          const json = await orgsRes.json();
          const list = Array.isArray(json)
            ? json
            : Array.isArray(json.data)
            ? json.data
            : [];
          if (isMounted && list.length > 0) {
            setOrgList(
              list.map((o: any) => ({
                id: o.id,
                name: o.name,
                code: o.code || o.slug || 'ORG',
                description: o.industry || 'Tenant organization',
              }))
            );
          }
        }
        if (rolesRes && rolesRes.ok) {
          const json = await rolesRes.json();
          const list = Array.isArray(json)
            ? json
            : Array.isArray(json.items)
            ? json.items
            : Array.isArray(json.data)
            ? json.data
            : [];
          if (isMounted && list.length > 0) {
            setRoleList(
              list.map((r: any) => ({
                id: r.id,
                code: r.code,
                name: r.name,
                description: r.description || 'Security role definition.',
              }))
            );
          }
        }
      } catch {
        // Ignore lookup fallback
      }
    };
    loadLookups();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Form State
  const [tenantId, setTenantId] = useState<string>(DEFAULT_ORGANIZATIONS[0].id);
  const [userId, setUserId] = useState<string>(AVAILABLE_USERS[0].id);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([
    AVAILABLE_USERS[0].id,
  ]);
  const [userSearch, setUserSearch] = useState<string>('');
  const [roleId, setRoleId] = useState<string>(DEFAULT_ROLES[0].id);
  const [isActive, setIsActive] = useState<boolean>(true);

  const { assignRole, updateRole, isSubmitting, error: mutationError } =
    useUserRoleMutations();

  // Load existing role assignment for edit mode
  useEffect(() => {
    if (isEditMode && id) {
      setIsLoadingItem(true);
      setLoadError(null);
      fetchUserRoleById(id)
        .then((data) => {
          if (data) {
            setTenantId(data.tenantId);
            setUserId(data.userId);
            setSelectedUserIds([data.userId]);
            setRoleId(data.roleId);
            setIsActive(data.isActive);
          }
        })
        .catch((err) => {
          setLoadError(err.message || 'Failed to load user role assignment');
        })
        .finally(() => {
          setIsLoadingItem(false);
        });
    }
  }, [id, isEditMode]);

  // Reset form to defaults or initial values
  const handleReset = () => {
    if (isEditMode && id) {
      fetchUserRoleById(id).then((data) => {
        if (data) {
          setTenantId(data.tenantId);
          setUserId(data.userId);
          setSelectedUserIds([data.userId]);
          setRoleId(data.roleId);
          setIsActive(data.isActive);
        }
      });
    } else {
      setTenantId(orgList[0]?.id || DEFAULT_ORGANIZATIONS[0].id);
      setUserId(AVAILABLE_USERS[0].id);
      setSelectedUserIds([AVAILABLE_USERS[0].id]);
      setUserSearch('');
      setRoleId(roleList[0]?.id || DEFAULT_ROLES[0].id);
      setIsActive(true);
    }
  };

  const filteredUsers = AVAILABLE_USERS.filter((u) => {
    if (!userSearch.trim()) return true;
    const term = userSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.currentRole.toLowerCase().includes(term) ||
      u.dept.toLowerCase().includes(term)
    );
  });

  const orgOptions: SearchableOption[] = useMemo(
    () =>
      orgList.map((org) => ({
        value: org.id,
        label: org.name,
        sublabel: org.code,
        avatarText: String(org.name || '?')
          .slice(0, 2)
          .toUpperCase(),
        avatarColor:
          org.id === '00000000-0000-0000-0000-000000000000'
            ? 'bg-[#0F172A]'
            : 'bg-purple-600',
      })),
    [orgList]
  );

  const roleOptions: SearchableOption[] = useMemo(
    () =>
      roleList.map((r) => ({
        value: r.id,
        label: `${r.name} (${r.code})`,
        sublabel: r.description,
      })),
    [roleList]
  );

  const userOptions: SearchableOption[] = useMemo(
    () =>
      AVAILABLE_USERS.map((u) => ({
        value: u.id,
        label: `${u.name} (${u.email})`,
        sublabel: `Current Role: ${u.currentRole} • ${u.dept}`,
      })),
    []
  );

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);

    const targetIds = isEditMode ? [userId] : selectedUserIds;
    if (targetIds.length === 0) return;

    try {
      let result: UserRoleItem;
      if (isEditMode && id) {
        result = await updateRole(id, {
          tenantId,
          userId,
          roleId,
          isActive,
        });
      } else {
        const promises = targetIds.map((uId) =>
          assignRole({
            tenantId,
            userId: uId,
            roleId,
            isActive,
          })
        );
        const results = await Promise.all(promises);
        result = results[0];
      }

      setSuccessMessage(
        isEditMode
          ? 'User role assignment updated successfully.'
          : `Role assigned to ${targetIds.length} user(s) successfully.`
      );

      if (onSuccess) {
        onSuccess(result);
      } else {
        setTimeout(() => {
          handleBack();
        }, 700);
      }
    } catch {
      // Handled by hook error state
    }
  };

  if (isEditMode && isLoadingItem) {
    return (
      <div className="p-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#6B7280]">
          <Loader2 className="w-6 h-6 animate-spin text-[#0F172A]" />
          <span className="text-xs font-medium">
            Loading user role details...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 text-[#111827] dark:text-white">
      {/* Page Header Bar with Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E7EB] dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <button
              type="button"
              onClick={handleBack}
              className="text-xs font-semibold text-[#6B7280] hover:underline cursor-pointer"
            >
              User Roles
            </button>
            <span className="text-xs text-[#E5E7EB] dark:text-slate-700">/</span>
            <button
              type="button"
              onClick={handleBack}
              className="text-xs font-semibold text-[#6B7280] hover:underline cursor-pointer"
            >
              User Role Directory
            </button>
            <span className="text-xs text-[#E5E7EB] dark:text-slate-700">/</span>
            <span className="text-xs font-semibold text-[#111827] dark:text-slate-200">
              {isEditMode ? 'Edit Assignment' : 'Assign Role'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#111827] dark:text-white flex items-center gap-2.5 tracking-tight">
            <ShieldCheck className="w-6 h-6 text-[#0F172A] dark:text-white" />
            <span>{isEditMode ? 'Edit User Role' : 'Assign User Role'}</span>
          </h1>
          <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">
            Bind an authenticated user to an organization authorization scope
            and role privileges.
          </p>
        </div>
      </div>

      {/* Banners */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {(mutationError || loadError) && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{mutationError || loadError}</span>
        </div>
      )}

      {/* Unified Assignment Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* CARD: ROLE ASSIGNMENT SCOPE & DETAILS */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-[#E5E7EB] dark:border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#111827] dark:text-white">
                User Role Binding
              </h2>
              <p className="text-xs text-[#6B7280]">
                Bind account identity to an organization boundary and
                authorization role
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Organization (Default SuperAdmin & Admin) */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300">
                  Organization Scope <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium font-mono">
                  Defaults: SuperAdmin &amp; Admin
                </span>
              </div>
              <SearchableSelect
                value={tenantId}
                onChange={(v) => setTenantId(v)}
                searchPlaceholder="Search organizations..."
                options={orgOptions}
              />
              <p className="text-[11px] text-[#6B7280] mt-1">
                Select SuperAdmin for platform-wide root roles or Admin for
                tenant-scoped operations.
              </p>
            </div>

            {/* User Selection: Multi-User Table for Add, SearchableSelect for Edit */}
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300">
                  User Accounts <span className="text-rose-500">*</span>
                </label>
                {!isEditMode && (
                  <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                    {selectedUserIds.length} of {AVAILABLE_USERS.length}{' '}
                    selected
                  </span>
                )}
              </div>

              {isEditMode ? (
                <SearchableSelect
                  value={userId}
                  onChange={(val) => setUserId(val)}
                  searchPlaceholder="Search user by name or email..."
                  options={userOptions}
                />
              ) : (
                <div className="space-y-2.5">
                  {/* User Search & Select All */}
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Filter users by name, email, or current role..."
                        className="w-full h-9 pl-8 pr-3 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#0F172A]"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#374151] px-3 py-1.5 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] select-none">
                      <input
                        type="checkbox"
                        checked={
                          filteredUsers.length > 0 &&
                          filteredUsers.every((u) =>
                            selectedUserIds.includes(u.id)
                          )
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            const allIds = Array.from(
                              new Set([
                                ...selectedUserIds,
                                ...filteredUsers.map((u) => u.id),
                              ])
                            );
                            setSelectedUserIds(allIds);
                          } else {
                            const remaining = selectedUserIds.filter(
                              (id) => !filteredUsers.some((u) => u.id === id)
                            );
                            setSelectedUserIds(remaining);
                          }
                        }}
                        className="rounded text-[#0F172A] focus:ring-[#0F172A]"
                      />
                      <span>Select All</span>
                    </label>
                  </div>

                  {/* Users List Table with Current Role */}
                  <div className="rounded-xl border border-[#E5E7EB] overflow-hidden bg-white max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3 text-center w-10">
                            <span className="sr-only">Select</span>
                          </th>
                          <th className="py-2.5 px-3">User Identity</th>
                          <th className="py-2.5 px-3">Current Role</th>
                          <th className="py-2.5 px-3">Department</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F3F4F6]">
                        {filteredUsers.map((u) => {
                          const isChecked = selectedUserIds.includes(u.id);
                          return (
                            <tr
                              key={u.id}
                              className={`transition-colors hover:bg-[#F8FAFC] cursor-pointer ${
                                isChecked ? 'bg-indigo-50/40' : ''
                              }`}
                              onClick={() => {
                                if (isChecked) {
                                  setSelectedUserIds(
                                    selectedUserIds.filter((id) => id !== u.id)
                                  );
                                } else {
                                  setSelectedUserIds([
                                    ...selectedUserIds,
                                    u.id,
                                  ]);
                                }
                              }}
                            >
                              <td
                                className="py-2.5 px-3 text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedUserIds([
                                        ...selectedUserIds,
                                        u.id,
                                      ]);
                                    } else {
                                      setSelectedUserIds(
                                        selectedUserIds.filter(
                                          (id) => id !== u.id
                                        )
                                      );
                                    }
                                  }}
                                  className="rounded text-[#0F172A] focus:ring-[#0F172A] cursor-pointer"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-[#111827]">
                                  {u.name}
                                </div>
                                <div className="text-[10px] text-[#6B7280] font-mono">
                                  {u.email}
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  <Shield className="w-2.5 h-2.5" />
                                  <span>{u.currentRole}</span>
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-[#6B7280] text-[11px]">
                                {u.dept}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-[#6B7280]">
                    Select one or multiple users to assign this role
                    simultaneously.
                  </p>
                </div>
              )}
            </div>

            {/* Security Role Selection */}
            <div>
              <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1">
                Security Role <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                value={roleId}
                onChange={(v) => setRoleId(v)}
                searchPlaceholder="Search security roles..."
                options={roleOptions}
              />
              <p className="text-[11px] text-[#6B7280] mt-1">
                {roleList.find((r) => r.id === roleId)?.description ||
                  'Security role definition.'}
              </p>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1">
                Status
              </label>
              <div className="flex items-center space-x-4 pt-2">
                <label className="flex items-center space-x-2 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="isActive"
                    checked={isActive === true}
                    onChange={() => setIsActive(true)}
                    className="text-[#0F172A] focus:ring-[#0F172A]"
                  />
                  <span className="font-medium text-[#111827] dark:text-white">
                    Active (Operational)
                  </span>
                </label>
                <label className="flex items-center space-x-2 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="isActive"
                    checked={isActive === false}
                    onChange={() => setIsActive(false)}
                    className="text-[#0F172A] focus:ring-[#0F172A]"
                  />
                  <span className="font-medium text-[#6B7280]">
                    Inactive (Suspended)
                  </span>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM ACTION BAR: Right-aligned Cancel, Reset, Save */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB] dark:border-slate-800">
          <button
            type="button"
            onClick={handleBack}
            disabled={isSubmitting}
            className="h-10 px-5 text-xs font-semibold text-[#4B5563] bg-white hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={isSubmitting}
            className="h-10 px-5 text-xs font-semibold text-[#4B5563] bg-white hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-6 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-xl transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isEditMode ? 'Updating...' : 'Saving...'}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{isEditMode ? 'Update' : 'Save'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserRoleFormPage;
