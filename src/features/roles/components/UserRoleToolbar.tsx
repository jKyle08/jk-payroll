// ==============================================================================
// JK-PAYROLL: USER ROLE TOOLBAR COMPONENT
// Search, Organization filter, Role filter, Status filter, and Assign Role button
// Design System: "Midnight & Champagne Steel"
// File: src/features/roles/components/UserRoleToolbar.tsx
// ==============================================================================

import React from 'react';
import { Search, Plus, Filter, RotateCcw } from 'lucide-react';
import { UserRoleFilterState } from '../types.js';

export interface UserRoleToolbarProps {
  filters: UserRoleFilterState;
  isSuperAdmin?: boolean;
  onSearchChange: (search: string) => void;
  onTenantChange: (tenantId: string | 'All') => void;
  onRoleChange: (roleId: string | 'All') => void;
  onStatusChange: (status: 'All' | 'Active' | 'Inactive') => void;
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
  onReset,
  onAddNew,
  onAddRole,
}) => {
  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E5E7EB] shadow-xs">
      {/* Left: Search input */}
      <div className="relative flex-1 min-w-[240px]">
        <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by user, email, role, or organization..."
          className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A] transition-all"
        />
        {filters.search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#9CA3AF] hover:text-[#111827]"
          >
            ×
          </button>
        )}
      </div>

      {/* Center: Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Organization Filter (SuperAdmin Only) */}
        {isSuperAdmin && (
          <select
            value={filters.tenantId}
            onChange={(e) => onTenantChange(e.target.value)}
            className="h-9 px-3 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 font-medium cursor-pointer"
          >
            <option value="All">All Organizations</option>
            <option value="00000000-0000-0000-0000-000000000000">SuperAdmin Platform (ROOT)</option>
            <option value="00000000-0000-0000-0000-000000000001">Apex Health Systems (APEX-HLTH)</option>
          </select>
        )}

        {/* Role Filter */}
        <select
          value={filters.roleId}
          onChange={(e) => onRoleChange(e.target.value)}
          className="h-9 px-3 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 font-medium cursor-pointer"
        >
          <option value="All">All Roles</option>
          <option value="c0000000-0000-0000-0000-000000000001">Super Administrator</option>
          <option value="c0000000-0000-0000-0000-000000000002">Administrator</option>
          <option value="c0000000-0000-0000-0000-000000000003">Payroll Officer</option>
          <option value="c0000000-0000-0000-0000-000000000004">HR Manager</option>
        </select>

        {/* Status Filter */}
        <select
          value={filters.status}
          onChange={(e) => onStatusChange(e.target.value as any)}
          className="h-9 px-3 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 font-medium cursor-pointer"
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>

        {/* Reset button */}
        {(filters.search || filters.tenantId !== 'All' || filters.roleId !== 'All' || filters.status !== 'All') && (
          <button
            onClick={onReset}
            className="h-9 px-2.5 rounded-xl border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] text-xs flex items-center gap-1 transition-all"
            title="Reset Filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {onAddRole && (
          <button
            type="button"
            onClick={onAddRole}
            className="w-full sm:w-auto h-9 px-3.5 rounded-xl border border-[#E5E7EB] hover:bg-[#F8FAFC] text-[#111827] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-none cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Role</span>
          </button>
        )}
        <button
          type="button"
          onClick={onAddNew}
          className="w-full sm:w-auto h-9 px-4 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-none cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Assign User Role</span>
        </button>
      </div>
    </div>
  );
};
