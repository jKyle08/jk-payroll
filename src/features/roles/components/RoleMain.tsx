// ==============================================================================
// JK-PAYROLL: ROLE DIRECTORY (MAIN) PAGE
// Breadcrumb: Roles / Role Directory. Design System: Balanced Glossy Graphite
// File: src/features/roles/components/RoleMain.tsx
// ==============================================================================

import { CustomSelect } from '../../../client/components/ui/CustomSelect.js';
import { SearchableSelect } from '../../../client/components/ui/SearchableSelect.js';
import { SearchButton } from '../../../client/components/ui/SearchButton.js';
import { KpiCard } from '../../../client/components/ui/KpiCard.js';
import { Button, Badge, TableActionMenu, toast, Input } from '../../../client/components/ui/index.js';
import { Pagination, usePagination } from '../../../client/components/ui/Pagination.js';
import React, { useState, useEffect } from 'react';
import { Plus, UserPlus, Shield, Globe2, Building2, Search, X, Filter, Lock, Pencil, Trash2, Eye, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../../../client/components/ui/ConfirmDialog.js';
import { RoleItem } from '../types.js';
import { useRoleDirectory } from '../hooks/useRoleDirectory.js';
import { useRoleMutations } from '../hooks/useRoleMutations.js';

export interface RoleMainProps {
  organizations?: { id: string; name: string; code: string }[];
  onCreate?: () => void;
  onOpen?: (item: RoleItem) => void;
}

const DEFAULT_ROLE_FILTER_ORGS = [
  { id: '00000000-0000-0000-0000-000000000000', name: 'SuperAdmin Platform', code: 'ROOT' },
  { id: '00000000-0000-0000-0000-000000000001', name: 'Apex Health Systems', code: 'APEX-HLTH' },
];

export const RoleMain: React.FC<RoleMainProps> = ({ organizations = [], onCreate, onOpen }) => {
  const {
    items,
    meta,
    page: serverPage,
    setPage: setServerPage,
    pageSize: serverPageSize,
    setPageSize: setServerPageSize,
    filters,
    setFilters,
    resetFilters,
    isLoading,
    error,
    refresh,
  } = useRoleDirectory();
  const { removeRole, isSubmitting, error: mutationError } = useRoleMutations();
  const [pendingDelete, setPendingDelete] = useState<RoleItem | null>(null);

  let navigate: ((path: string) => void) | undefined;
  try {
    navigate = useNavigate();
  } catch {
    navigate = undefined;
  }

  const orgOptionsList = organizations.length > 0 ? organizations : DEFAULT_ROLE_FILTER_ORGS;

  const handleCreateRole = () => {
    if (onCreate) onCreate();
    else if (navigate) navigate('/admin/roles/new');
  };

  const handleAssignUserRole = (roleId?: string) => {
    if (navigate) {
      if (roleId) {
        navigate(`/admin/roles/assign?roleId=${roleId}`);
      } else {
        navigate('/admin/roles/assign');
      }
    }
  };

  const handleOpenRole = (r: RoleItem) => {
    if (onOpen) onOpen(r);
    else if (navigate) navigate(`/admin/roles/${r.id}/edit`);
  };

  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [draftOrgId, setDraftOrgId] = useState<string>(filters.organizationId || 'All');
  const [draftRoleType, setDraftRoleType] = useState<string>(filters.roleType || 'All');

  useEffect(() => {
    setSearchInput(filters.search || '');
    setDraftOrgId(filters.organizationId || 'All');
    setDraftRoleType(filters.roleType || 'All');
  }, [filters]);

  const pagination = usePagination(items, serverPageSize, meta.total);

  const hasActiveDropdownFilters =
    filters.organizationId !== 'All' || filters.roleType !== 'All';

  const handleExecuteSearch = () => {
    setFilters({ ...filters, search: searchInput.trim() });
    pagination.resetPage();
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setFilters({ ...filters, search: '' });
    pagination.resetPage();
  };

  const handleApplyFilters = () => {
    setFilters({
      ...filters,
      search: searchInput.trim(),
      organizationId: draftOrgId,
      roleType: draftRoleType as any,
    });
    pagination.resetPage();
  };

  const handleResetFilterDirectory = () => {
    setDraftOrgId('All');
    setDraftRoleType('All');
    setFilters({
      ...filters,
      organizationId: 'All',
      roleType: 'All',
    });
    pagination.resetPage();
  };

  const handleClearAll = () => {
    setSearchInput('');
    setDraftOrgId('All');
    setDraftRoleType('All');
    resetFilters();
    pagination.resetPage();
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await removeRole(pendingDelete.id);
      toast.success('users.role_deleted', { name: pendingDelete.name });
      setPendingDelete(null);
      await refresh();
    } catch (err: any) {
      toast.fromError(err, `Failed to delete role '${pendingDelete.name}'`);
      setPendingDelete(null);
    }
  };

  return (
    <div className="space-y-6 pb-12 text-[#111827] dark:text-[#F8FAFC] font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E7EB] dark:border-white/10">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="text-xs font-semibold text-[#6B7280] dark:text-[#64748B]">Roles</span>
            <span className="text-xs text-[#E5E7EB] dark:text-white/10">/</span>
            <span className="text-xs font-semibold text-[#111827] dark:text-[#CBD5E1]">Role Directory</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F8FAFC]">Role Directory</h1>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">Directory of system and custom authorization roles, access tiers, and operational permissions.</p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={handleCreateRole}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Role
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => handleAssignUserRole()}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Assign Users to Role
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Total Roles"
          value={meta.total}
          suffix="roles"
          tone="slate"
          icon={<Shield className="w-4 h-4" />}
        />
        <KpiCard
          label="System Roles"
          value={meta.systemCount}
          suffix="platform"
          tone="blue"
          icon={<Globe2 className="w-4 h-4" />}
        />
        <KpiCard
          label="Custom Roles"
          value={meta.customCount}
          suffix="tenant-scoped"
          tone="purple"
          icon={<Building2 className="w-4 h-4" />}
        />
      </div>

      {/* Two-Panel Toolbar & Filter Directory */}
      <div className="space-y-3">
        {/* Panel 1: Search Box + SearchButton + Filter Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-[#121620] rounded-xl border border-[#E5E7EB] dark:border-white/10 shadow-2xs">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex-1">
              <Input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleExecuteSearch();
                  }
                }}
                placeholder="Search by role name, code or organization..."
                leftIcon={<Search className="w-4 h-4" />}
                rightElement={
                  searchInput ? (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="p-1 text-[#6B7280] hover:text-[#111827] dark:text-[#64748B] dark:hover:text-[#F8FAFC] transition-colors cursor-pointer"
                      title="Clear search query"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : undefined
                }
              />
            </div>

            <SearchButton onClick={handleExecuteSearch} />
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto flex-shrink-0">
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen((prev) => !prev)}
              className={`h-10 px-3.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all flex-shrink-0 cursor-pointer ${
                isFilterPanelOpen || hasActiveDropdownFilters
                  ? 'border-[#0F172A] bg-[#0F172A]/5 text-[#0F172A] dark:border-white/20 dark:bg-white/10 dark:text-[#F8FAFC]'
                  : 'border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-[#181D2A] hover:bg-[#F8FAFC] dark:hover:bg-[#202637] text-[#475569] dark:text-[#94A3B8]'
              }`}
              title="Filter Roles"
            >
              <Filter className="w-4 h-4 text-[#6B7280] dark:text-[#64748B]" />
              <span>Filter</span>
              {hasActiveDropdownFilters && (
                <span className="w-2 h-2 rounded-full bg-[#0F172A] dark:bg-[#CBD5E1]" />
              )}
            </button>
          </div>
        </div>

        {/* Active Filter Chips */}
        {(filters.search || hasActiveDropdownFilters) && (
          <div className="flex items-center flex-wrap gap-1.5 py-1 text-xs">
            <span className="text-[11px] font-semibold text-[#6B7280] dark:text-[#64748B] mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-[#6B7280] dark:text-[#64748B]" />
              <span>Active Filters:</span>
            </span>
            {filters.search && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F1F5F9] dark:bg-[#181D2A] text-[#0F172A] dark:text-[#CBD5E1] border border-[#E5E7EB] dark:border-white/10">
                <span>Search: &quot;{filters.search}&quot;</span>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[#6B7280] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] cursor-pointer"
                >
                  ✕
                </button>
              </span>
            )}
            {filters.organizationId !== 'All' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F1F5F9] dark:bg-[#181D2A] text-[#0F172A] dark:text-[#CBD5E1] border border-[#E5E7EB] dark:border-white/10">
                <span>
                  Organization:{' '}
                  {filters.organizationId === 'GLOBAL'
                    ? 'Global (System)'
                    : orgOptionsList.find((o) => o.id === filters.organizationId)?.name ||
                      'Selected Organization'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDraftOrgId('All');
                    setFilters({ ...filters, organizationId: 'All' });
                  }}
                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[#6B7280] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] cursor-pointer"
                >
                  ✕
                </button>
              </span>
            )}
            {filters.roleType !== 'All' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F1F5F9] dark:bg-[#181D2A] text-[#0F172A] dark:text-[#CBD5E1] border border-[#E5E7EB] dark:border-white/10">
                <span>Type: {filters.roleType}</span>
                <button
                  type="button"
                  onClick={() => {
                    setDraftRoleType('All');
                    setFilters({ ...filters, roleType: 'All' });
                  }}
                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[#6B7280] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] cursor-pointer"
                >
                  ✕
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs font-semibold text-[#0F172A] dark:text-[#CBD5E1] dark:hover:text-[#F8FAFC] hover:underline ml-1.5 cursor-pointer"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Panel 2: Collapsible Filter Directory */}
        {isFilterPanelOpen && (
          <div className="p-4 bg-white dark:bg-[#181D2A] rounded-xl border border-[#E5E7EB] dark:border-white/10 space-y-3 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E7EB] dark:border-white/10">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#475569] dark:text-[#94A3B8]" />
                <span className="text-xs font-bold text-[#111827] dark:text-[#F8FAFC]">
                  Filter Directory
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetFilterDirectory}
                  className="h-8 px-3 rounded-lg border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-[#121620] hover:bg-[#F8FAFC] dark:hover:bg-[#202637] text-xs font-semibold text-[#475569] dark:text-[#94A3B8] transition-all cursor-pointer"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="h-8 px-4 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white dark:bg-[#CBD5E1] dark:text-[#0F172A] dark:hover:bg-[#E2E8F0] text-xs font-semibold flex items-center justify-center transition-all cursor-pointer"
                >
                  <span>Apply</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <SearchableSelect
                  label="Organization"
                  value={draftOrgId}
                  onChange={(v) => setDraftOrgId(v)}
                  searchPlaceholder="Search organizations..."
                  options={[
                    { value: 'All', label: 'All Organizations' },
                    { value: 'GLOBAL', label: 'Global (System)', avatarText: 'GL', avatarColor: 'bg-[#0F172A]' },
                    ...orgOptionsList.map((o: any) => ({
                      value: o.id,
                      label: o.name,
                      sublabel: o.code,
                      avatarText: String(o.name || '?').slice(0, 2).toUpperCase(),
                      avatarColor: 'bg-purple-600',
                    })),
                  ]}
                />
              </div>

              <div>
                <CustomSelect
                  label="Role Type"
                  value={draftRoleType}
                  onChange={(v) => setDraftRoleType(v)}
                  options={[
                    { value: 'All', label: 'All Types' },
                    { value: 'SYSTEM', label: 'System' },
                    { value: 'CUSTOM', label: 'Custom' },
                  ]}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {(error || mutationError) && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error || mutationError}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-[#121620] rounded-xl border border-[#E5E7EB] dark:border-white/10 shadow-xs">
        <div className="overflow-x-auto rounded-t-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FBFBFC] dark:bg-[#141924] border-b border-[#E5E7EB] dark:border-white/10 text-[11px] font-semibold text-[#6B7280] dark:text-[#64748B] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3 text-center w-12 font-mono">#</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Organization</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Users</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-white/10">
              {(isLoading || pagination.isPaging) && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#6B7280] dark:text-[#94A3B8]">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#0F172A] dark:border-[#CBD5E1] mb-2"></div>
                    <p>Loading roles...</p>
                  </td>
                </tr>
              )}
              {!(isLoading || pagination.isPaging) && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#6B7280] dark:text-[#94A3B8]">
                    No roles match the current filters.
                  </td>
                </tr>
              )}
              {!(isLoading || pagination.isPaging) &&
                pagination.pageItems.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-[#F8FAFC] dark:hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-3 text-center font-mono text-[11px] text-[#9CA3AF] dark:text-[#64748B] font-medium">
                      {(serverPage - 1) * serverPageSize + idx + 1}
                    </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-[#F8FAFC]">{r.name}</span>
                      {r.isDefault && (
                        <Badge variant="neutral" size="sm">DEFAULT</Badge>
                      )}
                      {!r.isMutable && <Lock className="w-3 h-3 text-[#9CA3AF] dark:text-[#64748B]" />}
                    </div>
                    <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] font-mono">{r.code}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-[#CBD5E1]">{r.organizationName}</td>
                  <td className="py-3 px-4">
                    <Badge variant="neutral" size="sm">
                      {r.roleType}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums font-mono text-slate-900 dark:text-[#F8FAFC]">{r.assignedUsers}</td>
                  <td className="py-3 px-4 text-right">
                    <TableActionMenu
                      actions={[
                        {
                          label: r.isEditable ? 'Edit Role' : 'View Role Details',
                          icon: r.isEditable ? <Pencil className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />,
                          onClick: () => handleOpenRole(r),
                        },
                        {
                          label: 'Assign Users to Role',
                          icon: <UserPlus className="w-3.5 h-3.5 text-indigo-600" />,
                          onClick: () => handleAssignUserRole(r.id),
                        },
                        ...(r.isEditable
                          ? [
                              {
                                label: 'Delete Role',
                                icon: <Trash2 className="w-3.5 h-3.5" />,
                                variant: 'danger' as const,
                                divider: true,
                                onClick: () => setPendingDelete(r),
                              },
                            ]
                          : []),
                      ]}
                      title="Role Actions"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer: Pagination */}
        <Pagination
          page={serverPage}
          pageSize={serverPageSize}
          total={meta.total}
          onPageChange={(nextPage) => {
            pagination.setPage(nextPage);
            setServerPage(nextPage);
          }}
          onPageSizeChange={(nextSize) => {
            pagination.setPageSize(nextSize);
            setServerPageSize(nextSize);
          }}
          itemLabel="roles"
        />
      </div>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete role?"
        description={
          pendingDelete
            ? `"${pendingDelete.name}" will be permanently removed. Roles that are still assigned to users cannot be deleted.`
            : ''
        }
        confirmLabel="Delete Role"
        isDestructive
        isLoading={isSubmitting}
      />
    </div>
  );
};
