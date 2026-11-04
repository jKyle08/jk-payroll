// ==============================================================================
// JK-PAYROLL: ORGANIZATION TOOLBAR COMPONENT
// Search input, status filter, tier filter, and "+ Add Organization" action
// Design System: "Midnight & Champagne Steel"
// File: src/features/organizations/components/OrganizationToolbar.tsx
// ==============================================================================

import React from 'react';
import { Search, X, Plus, Filter } from 'lucide-react';
import { OrgFilterState, OrganizationStatus, OrganizationTier } from '../types.js';

export interface OrganizationToolbarProps {
  filters: OrgFilterState;
  onFilterChange: (filters: OrgFilterState) => void;
  onAddNew: () => void;
}

export const OrganizationToolbar: React.FC<OrganizationToolbarProps> = ({
  filters,
  onFilterChange,
  onAddNew,
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, search: e.target.value });
  };

  const handleClearSearch = () => {
    onFilterChange({ ...filters, search: '' });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      status: e.target.value as OrganizationStatus | 'All',
    });
  };

  const handleTierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tier = e.target.value as OrganizationTier | 'All';
    onFilterChange({
      ...filters,
      tier,
      planTier: tier,
    });
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      {/* Left: Search & Filter Controls */}
      <div className="flex flex-1 items-center gap-2.5 max-w-2xl">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
          <input
            type="text"
            value={filters.search}
            onChange={handleSearchChange}
            placeholder="Search organizations by name, slug, code, or admin email..."
            className="w-full h-10 pl-9.5 pr-8 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-all shadow-2xs"
          />
          {filters.search && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={filters.status}
            onChange={handleStatusChange}
            className="h-10 pl-3 pr-8 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-all shadow-2xs appearance-none cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Onboarding">Onboarding</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>

        {/* Tier Filter */}
        <div className="relative">
          <select
            value={filters.tier || filters.planTier || 'All'}
            onChange={handleTierChange}
            className="h-10 pl-3 pr-8 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-all shadow-2xs appearance-none cursor-pointer"
          >
            <option value="All">All Tiers</option>
            <option value="Enterprise">Enterprise</option>
            <option value="Standard">Standard</option>
            <option value="Starter">Starter</option>
          </select>
        </div>
      </div>

      {/* Right: Primary Call to Action */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onAddNew}
          className="h-10 px-4 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold flex items-center justify-center gap-2 border border-[#0F172A] shadow-xs hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Organization</span>
        </button>
      </div>
    </div>
  );
};

export default OrganizationToolbar;
