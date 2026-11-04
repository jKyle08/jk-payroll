// ==============================================================================
// JK-PAYROLL: DEPARTMENT TOOLBAR COMPONENT
// Search, Organization filter, Depth filter, Status filter, View switcher, New Dept
// Design System: "Midnight & Champagne Steel"
// File: src/features/departments/components/DepartmentToolbar.tsx
// ==============================================================================

import React from 'react';
import { Search, Plus, Filter, RotateCcw, GitBranch, List } from 'lucide-react';
import { DepartmentFilterState } from '../types.js';

export interface DepartmentToolbarProps {
  filters: DepartmentFilterState;
  isSuperAdmin?: boolean;
  viewMode?: 'tree' | 'table';
  onSearchChange: (search: string) => void;
  onOrganizationChange: (orgId: string | 'All') => void;
  onDepthChange: (depth: number | 'All') => void;
  onStatusChange: (status: 'All' | 'Active' | 'Inactive') => void;
  onViewModeChange?: (mode: 'tree' | 'table') => void;
  onReset: () => void;
  onAddNew: () => void;
}

export const DepartmentToolbar: React.FC<DepartmentToolbarProps> = ({
  filters,
  isSuperAdmin = true,
  viewMode = 'tree',
  onSearchChange,
  onOrganizationChange,
  onDepthChange,
  onStatusChange,
  onViewModeChange,
  onReset,
  onAddNew,
}) => {
  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 shadow-xs">
      {/* Left: Search input */}
      <div className="relative flex-1 min-w-[240px]">
        <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={filters.search || ''}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by department name, code, path (e.g. opg/opg-itd), or lead..."
          className="w-full h-9 pl-9 pr-7 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A] transition-all"
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
        {/* Organization Filter */}
        {isSuperAdmin && (
          <select
            value={filters.organizationId || 'All'}
            onChange={(e) => onOrganizationChange(e.target.value)}
            className="h-9 px-3 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 font-medium cursor-pointer"
          >
            <option value="All">All Organizations</option>
            <option value="00000000-0000-0000-0000-000000000000">SuperAdmin Platform (ROOT)</option>
            <option value="00000000-0000-0000-0000-000000000001">Apex Health Systems (APEX-HLTH)</option>
          </select>
        )}

        {/* Depth Filter */}
        <select
          value={filters.depth !== undefined ? String(filters.depth) : 'All'}
          onChange={(e) => onDepthChange(e.target.value === 'All' ? 'All' : Number(e.target.value))}
          className="h-9 px-3 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 font-medium cursor-pointer"
        >
          <option value="All">All Hierarchy Depths</option>
          <option value="0">Depth 0 (Head Departments)</option>
          <option value="1">Depth 1 (Sub-departments)</option>
          <option value="2">Depth 2+ (Units & Sections)</option>
        </select>

        {/* Status Filter */}
        <select
          value={filters.status || 'All'}
          onChange={(e) => onStatusChange(e.target.value as any)}
          className="h-9 px-3 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 font-medium cursor-pointer"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active Only</option>
          <option value="Inactive">Inactive Only</option>
        </select>

        {/* Reset Filter Button */}
        <button
          onClick={onReset}
          title="Reset all filters"
          className="h-9 w-9 flex items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#6B7280] hover:text-[#111827] dark:hover:text-white transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* View Mode Toggle: Tree vs Table */}
        {onViewModeChange && (
          <div className="h-9 p-0.5 flex items-center bg-[#F8FAFC] dark:bg-slate-800 rounded-xl border border-[#E5E7EB] dark:border-slate-700">
            <button
              type="button"
              onClick={() => onViewModeChange('tree')}
              className={`h-7 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${
                viewMode === 'tree'
                  ? 'bg-white dark:bg-slate-900 text-[#0F172A] dark:text-white shadow-2xs'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
              title="Tree Hierarchy View"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Tree</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              className={`h-7 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-[#0F172A] dark:text-white shadow-2xs'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
              title="Table Directory View"
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        )}
      </div>

      {/* Right: New Department Action */}
      <button
        onClick={onAddNew}
        className="h-9 px-4 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer whitespace-nowrap"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>New Department</span>
      </button>
    </div>
  );
};

export default DepartmentToolbar;
