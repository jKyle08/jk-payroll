// ==============================================================================
// JK-PAYROLL: USER ROLE TOOLBAR COMPONENT
// Panel 1: Search Box + SearchButton + Filter Toggle + Actions
// Panel 2: Collapsible Filter Directory (Organization, Security Role, Status) + Active Chips
// Design System: "Midnight & Champagne Steel"
// File: src/features/roles/components/UserRoleToolbar.tsx
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Search, X, Plus, Filter } from 'lucide-react';
import { UserRoleFilterState } from '../types.js';
import { CustomSelect } from '../../../components/ui/CustomSelect.js';
import {
  SearchableSelect,
  SearchableOption,
} from '../../../components/ui/SearchableSelect.js';
import { SearchButton } from '../../../components/ui/SearchButton.js';

const TENANT_OPTIONS: SearchableOption[] = [
  { value: 'All', label: 'All Organizations' },
  {
    value: '00000000-0000-0000-0000-000000000000',
    label: 'SuperAdmin Platform',
    sublabel: 'ROOT',
    avatarText: 'SA',
    avatarColor: 'bg-[#0F172A]',
  },
  {
    value: '00000000-0000-0000-0000-000000000001',
    label: 'Apex Health Systems',
    sublabel: 'APEX-HLTH',
    avatarText: 'AH',
    avatarColor: 'bg-purple-600',
  },
];

const ROLE_OPTIONS: SearchableOption[] = [
  { value: 'All', label: 'All Roles' },
  {
    value: 'c0000000-0000-0000-0000-000000000001',
    label: 'Super Administrator',
  },
  { value: 'c0000000-0000-0000-0000-000000000002', label: 'Administrator' },
  { value: 'c0000000-0000-0000-0000-000000000003', label: 'Payroll Officer' },
  { value: 'c0000000-0000-0000-0000-000000000004', label: 'HR Manager' },
];

export interface UserRoleToolbarProps {
  filters: UserRoleFilterState;
  isSuperAdmin?: boolean;
  onSearchChange: (search: string) => void;
  onTenantChange: (tenantId: string | 'All') => void;
  onRoleChange: (roleId: string | 'All') => void;
  onStatusChange: (status: 'All' | 'Active' | 'Inactive') => void;
  onApplyFilters?: (nextFilters: UserRoleFilterState) => void;
  onReset: () => void;
  onAddNew: () => void;
  onAddRole?: () => void;
}

export const UserRoleToolbar: React.FC<UserRoleToolbarProps> = ({
  filters,
  isSuperAdmin = true,
  onSearchChange,
  onTenantChange,
  onRoleChange,
  onStatusChange,
  onApplyFilters,
  onReset,
  onAddNew,
  onAddRole,
}) => {
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Draft states inside Filter Directory (only applied when clicking Apply)
  const [draftTenantId, setDraftTenantId] = useState<string>(
    filters.tenantId || 'All'
  );
  const [draftRoleId, setDraftRoleId] = useState<string>(
    filters.roleId || 'All'
  );
  const [draftStatus, setDraftStatus] = useState<'All' | 'Active' | 'Inactive'>(
    filters.status || 'All'
  );

  // Sync draft state when parent filters change externally
  useEffect(() => {
    setSearchInput(filters.search || '');
    setDraftTenantId(filters.tenantId || 'All');
    setDraftRoleId(filters.roleId || 'All');
    setDraftStatus(filters.status || 'All');
  }, [filters]);

  const hasActiveDropdownFilters =
    filters.tenantId !== 'All' ||
    filters.roleId !== 'All' ||
    filters.status !== 'All';

  const handleExecuteSearch = () => {
    onSearchChange(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    onSearchChange('');
  };

  const handleApply = () => {
    if (onApplyFilters) {
      onApplyFilters({
        ...filters,
        search: searchInput.trim(),
        tenantId: draftTenantId,
        roleId: draftRoleId,
        status: draftStatus,
      });
    } else {
      onTenantChange(draftTenantId);
      onRoleChange(draftRoleId);
      onStatusChange(draftStatus);
    }
  };

  const handleResetFilterDirectory = () => {
    setDraftTenantId('All');
    setDraftRoleId('All');
    setDraftStatus('All');
    if (onApplyFilters) {
      onApplyFilters({
        ...filters,
        tenantId: 'All',
        roleId: 'All',
        status: 'All',
      });
    } else {
      onReset();
    }
  };

  const handleClearAll = () => {
    setSearchInput('');
    setDraftTenantId('All');
    setDraftRoleId('All');
    setDraftStatus('All');
    onReset();
  };

  // Active Filter Chips
  const activeChips: {
    key: 'search' | 'tenant' | 'role' | 'status';
    label: string;
  }[] = [];

  if (filters.search && filters.search.trim()) {
    activeChips.push({
      key: 'search',
      label: `Search: "${filters.search.trim()}"`,
    });
  }
  if (filters.tenantId !== 'All') {
    const orgLabel =
      TENANT_OPTIONS.find((t) => t.value === filters.tenantId)?.label ||
      filters.tenantId;
    activeChips.push({
      key: 'tenant',
      label: `Organization: ${orgLabel}`,
    });
  }
  if (filters.roleId !== 'All') {
    const roleLabel =
      ROLE_OPTIONS.find((r) => r.value === filters.roleId)?.label ||
      filters.roleId;
    activeChips.push({
      key: 'role',
      label: `Role: ${roleLabel}`,
    });
  }
  if (filters.status !== 'All') {
    activeChips.push({
      key: 'status',
      label: `Status: ${filters.status}`,
    });
  }

  const handleRemoveChip = (key: 'search' | 'tenant' | 'role' | 'status') => {
    if (key === 'search') {
      handleClearSearch();
    } else if (key === 'tenant') {
      setDraftTenantId('All');
      if (onApplyFilters) {
        onApplyFilters({ ...filters, tenantId: 'All' });
      } else {
        onTenantChange('All');
      }
    } else if (key === 'role') {
      setDraftRoleId('All');
      if (onApplyFilters) {
        onApplyFilters({ ...filters, roleId: 'All' });
      } else {
        onRoleChange('All');
      }
    } else if (key === 'status') {
      setDraftStatus('All');
      if (onApplyFilters) {
        onApplyFilters({ ...filters, status: 'All' });
      } else {
        onStatusChange('All');
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* ================================================================== */}
      {/* PANEL 1: SEARCH BOX + SEARCH BUTTON + FILTER BUTTON + ACTIONS      */}
      {/* ================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-[#E5E7EB] dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleExecuteSearch();
                }
              }}
              placeholder="Search by user, email, role, or organization..."
              className="h-10 w-full pl-10 pr-9 text-xs rounded-lg bg-[#FBFBFC] dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 text-[#111827] dark:text-white placeholder-[#6B7280] focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111827] dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <SearchButton onClick={handleExecuteSearch} />
        </div>

        {/* Right: Filter Toggle + Actions */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsFilterPanelOpen((prev) => !prev)}
            className={`h-10 px-3.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all flex-shrink-0 cursor-pointer ${
              isFilterPanelOpen || hasActiveDropdownFilters
                ? 'border-[#0F172A] bg-[#0F172A]/5 text-[#0F172A] dark:border-slate-400 dark:text-white'
                : 'border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#F8FAFC] text-[#475569] dark:text-slate-200'
            }`}
            title="Filter User Roles"
          >
            <Filter className="w-4 h-4 text-[#6B7280]" />
            <span>Filter</span>
            {hasActiveDropdownFilters && (
              <span className="w-2 h-2 rounded-full bg-[#0F172A] dark:bg-blue-400" />
            )}
          </button>

          {onAddRole && (
            <button
              type="button"
              onClick={onAddRole}
              className="h-10 px-3.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#F8FAFC] text-[#111827] dark:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Role</span>
            </button>
          )}

          <button
            type="button"
            onClick={onAddNew}
            className="h-10 px-4 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Assign User Role</span>
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* ACTIVE FILTER DISMISSAL CHIPS                                      */}
      {/* ================================================================== */}
      {activeChips.length > 0 && (
        <div className="flex items-center flex-wrap gap-1.5 py-1 text-xs">
          <span className="text-[11px] font-semibold text-[#6B7280] dark:text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-[#6B7280]" />
            <span>Active Filters:</span>
          </span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F1F5F9] dark:bg-slate-800 text-[#0F172A] dark:text-white border border-[#E5E7EB] dark:border-slate-700 shadow-2xs"
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={() => handleRemoveChip(chip.key)}
                className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[#6B7280] hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Remove filter"
              >
                ✕
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs font-semibold text-[#0F172A] dark:text-blue-400 hover:underline ml-1.5 cursor-pointer"
          >
            Clear All
          </button>
        </div>
      )}

      {/* ================================================================== */}
      {/* PANEL 2: COLLAPSIBLE FILTER DIRECTORY PANEL                        */}
      {/* ================================================================== */}
      {isFilterPanelOpen && (
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-[#E5E7EB] dark:border-slate-800 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E7EB] dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#475569] dark:text-slate-300" />
              <span className="text-xs font-bold text-[#111827] dark:text-white">
                Filter Directory
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetFilterDirectory}
                className="h-8 px-3 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#F8FAFC] dark:hover:bg-slate-700 text-xs font-semibold text-[#475569] dark:text-slate-300 transition-all cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="h-8 px-4 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold flex items-center justify-center transition-all cursor-pointer"
              >
                <span>Apply</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Organization Filter (searchable, updates draft state only) */}
            {isSuperAdmin && (
              <div>
                <SearchableSelect
                  label="Organization"
                  value={draftTenantId}
                  onChange={(v) => setDraftTenantId(v)}
                  searchPlaceholder="Search organizations..."
                  options={TENANT_OPTIONS}
                />
              </div>
            )}

            {/* 2. Role Filter (searchable, updates draft state only) */}
            <div>
              <SearchableSelect
                label="Security Role"
                value={draftRoleId}
                onChange={(v) => setDraftRoleId(v)}
                searchPlaceholder="Search roles..."
                options={ROLE_OPTIONS}
              />
            </div>

            {/* 3. Status Filter (updates draft state only) */}
            <div>
              <CustomSelect
                label="Status"
                value={draftStatus}
                onChange={(v) =>
                  setDraftStatus(v as 'All' | 'Active' | 'Inactive')
                }
                options={[
                  { value: 'All', label: 'All Status' },
                  { value: 'Active', label: 'Active' },
                  { value: 'Inactive', label: 'Inactive' },
                ]}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserRoleToolbar;
