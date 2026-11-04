// ==============================================================================
// JK-PAYROLL: USER ROLE UNIFIED FORM PAGE
// Single page-driven form for both Create and Edit of User Role assignments
// Design System: "Midnight & Champagne Steel"
// File: src/features/roles/components/UserRoleFormPage.tsx
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  User,
  CheckCircle,
  AlertCircle,
  Loader2,
  Lock,
  Search,
  Shield,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { UserRoleItem, CreateUserRoleInput } from '../types.js';
import { fetchUserRoleById } from '../services/user-role.client.js';
import { useUserRoleMutations } from '../hooks/useUserRoleMutations.js';

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

// Available Roles
const DEFAULT_ROLES = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    code: 'SUPER_ADMIN',
    name: 'Super Administrator',
    description: 'Full platform-wide root authority across all modules and tenants',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    code: 'ADMIN',
    name: 'Administrator',
    description: 'Organization-level administrative control over department and policies',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    code: 'PAYROLL_OFFICER',
    name: 'Payroll Officer',
    description: 'Manages salary computations, payroll runs, and statutory deductions',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000004',
    code: 'HR_MANAGER',
    name: 'HR Manager',
    description: 'Staff directory placement, leave approvals, and employee profiles',
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

  let navigate: ((path: string) => void) | undefined;
  try {
    navigate = useNavigate();
  } catch {
    navigate = undefined;
  }

  const handleBack = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else if (navigate) {
      navigate('/roles');
    }
  };

  const [isLoadingItem, setIsLoadingItem] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [tenantId, setTenantId] = useState<string>(DEFAULT_ORGANIZATIONS[0].id);
  const [userId, setUserId] = useState<string>(AVAILABLE_USERS[0].id);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([AVAILABLE_USERS[0].id]);
  const [userSearch, setUserSearch] = useState<string>('');
  const [roleId, setRoleId] = useState<string>(DEFAULT_ROLES[0].id);
  const [isActive, setIsActive] = useState<boolean>(true);

  const { assignRole, updateRole, isSubmitting, error: mutationError } = useUserRoleMutations();

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
      setTenantId(DEFAULT_ORGANIZATIONS[0].id);
      setUserId(AVAILABLE_USERS[0].id);
      setSelectedUserIds([AVAILABLE_USERS[0].id]);
      setUserSearch('');
      setRoleId(DEFAULT_ROLES[0].id);
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
      <div className="min-h-screen bg-[#FBFBFC] p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#6B7280]">
          <Loader2 className="w-6 h-6 animate-spin text-[#0F172A]" />
          <span className="text-xs font-medium">Loading user role details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-[#111827] pb-16 font-sans">
      {/* Top Header / Sticky Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#E5E7EB] px-6 lg:px-8 py-4">
        <div className="w-full flex items-center justify-between">
          <div>
            {/* Standardized Breadcrumbs */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleBack}
                className="text-xs font-semibold text-[#6B7280] hover:underline cursor-pointer"
              >
                User Roles
              </button>
              <span className="text-xs text-[#E5E7EB]">/</span>
              <span className="text-xs font-semibold text-[#111827]">
                User Role Form
              </span>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-[#111827] mt-1">
              {isEditMode ? 'Edit User Role' : 'Assign User Role'}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content Form Area */}
      <main className="w-full px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Success Banner */}
          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Mutation Error Banner */}
          {mutationError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{mutationError}</span>
            </div>
          )}

          {loadError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{loadError}</span>
            </div>
          )}

          {/* CARD 1: USER ROLE DETAILS */}
          <section className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-[#E5E7EB]">
              <div className="w-9 h-9 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] text-[#0F172A] flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#111827]">
                  1. Role Configuration
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Attach security role to a user scoped within an organization.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Organization (Default SuperAdmin & Admin) */}
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Target Organization <span className="text-rose-500">*</span>
                </label>
                <select
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-all cursor-pointer font-medium"
                >
                  {DEFAULT_ORGANIZATIONS.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.code})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#6B7280] mt-1">
                  Default organizations available: SuperAdmin and Admin.
                </p>
              </div>

              {/* User Selection: Multi-User Table for Add, Single Select for Edit */}
              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#374151]">
                    User Accounts <span className="text-rose-500">*</span>
                  </label>
                  {!isEditMode && (
                    <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                      {selectedUserIds.length} of {AVAILABLE_USERS.length} selected
                    </span>
                  )}
                </div>

                {isEditMode ? (
                  <div>
                    <select
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      className="w-full h-10 px-3.5 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-all cursor-pointer font-medium"
                    >
                      {AVAILABLE_USERS.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email}) — Current Role: {u.currentRole}
                        </option>
                      ))}
                    </select>
                  </div>
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
                            filteredUsers.every((u) => selectedUserIds.includes(u.id))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              const allIds = Array.from(
                                new Set([...selectedUserIds, ...filteredUsers.map((u) => u.id)])
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
                            <th className="py-2.5 px-3">User</th>
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
                                    setSelectedUserIds(selectedUserIds.filter((id) => id !== u.id));
                                  } else {
                                    setSelectedUserIds([...selectedUserIds, u.id]);
                                  }
                                }}
                              >
                                <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedUserIds([...selectedUserIds, u.id]);
                                      } else {
                                        setSelectedUserIds(selectedUserIds.filter((id) => id !== u.id));
                                      }
                                    }}
                                    className="rounded text-[#0F172A] focus:ring-[#0F172A] cursor-pointer"
                                  />
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="font-semibold text-[#111827]">{u.name}</div>
                                  <div className="text-[10px] text-[#6B7280] font-mono">{u.email}</div>
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
                      Select one or multiple users to assign this role simultaneously.
                    </p>
                  </div>
                )}
              </div>

              {/* Security Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Security Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-all cursor-pointer font-medium"
                >
                  {DEFAULT_ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#6B7280] mt-1">
                  {DEFAULT_ROLES.find((r) => r.id === roleId)?.description || 'Security role definition.'}
                </p>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
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
                    <span className="font-medium text-[#111827]">Active (Operational)</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="isActive"
                      checked={isActive === false}
                      onChange={() => setIsActive(false)}
                      className="text-[#0F172A] focus:ring-[#0F172A]"
                    />
                    <span className="font-medium text-[#6B7280]">Inactive (Suspended)</span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* BOTTOM FLOATING ACTION BAR: Right-aligned Cancel, Reset, Save */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
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
              className="h-10 px-6 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-xl transition-all cursor-pointer shadow-none flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{isEditMode ? 'Updating...' : 'Saving...'}</span>
                </>
              ) : (
                <span>{isEditMode ? 'Update' : 'Save'}</span>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};
