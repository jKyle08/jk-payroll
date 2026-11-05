// ==============================================================================
// JK-PAYROLL: ORGANIZATION TOOLBAR COMPONENT
// Panel 1: Search Box + SearchButton + View Mode Switcher (Table / Grid) + Filter Toggle
// Panel 2: Collapsible Filter Directory Panel (Status, Plan Tier, Pay Frequency) + Active Chips
// Design System: "Midnight & Champagne Steel"
// File: src/features/organizations/components/OrganizationToolbar.tsx
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  Plus,
  Filter,
  Check,
  LayoutGrid,
  List,
} from 'lucide-react';
import {
  OrgFilterState,
  OrganizationStatus,
  OrganizationTier,
  PayFrequency,
} from '../types.js';
import { CustomSelect } from '../../../components/ui/CustomSelect.js';
import { SearchButton } from '../../../components/ui/SearchButton.js';

export type OrganizationViewMode = 'table' | 'cards';

export interface OrganizationToolbarProps {
  filters: OrgFilterState;
  onFilterChange: (filters: OrgFilterState) => void;
  onAddNew?: () => void;
  viewMode?: OrganizationViewMode;
  onViewModeChange?: (mode: OrganizationViewMode) => void;
}

export const OrganizationToolbar: React.FC<OrganizationToolbarProps> = ({
  filters,
  onFilterChange,
  viewMode = 'table',
  onViewModeChange,
}) => {
  // Local search input state (supports both live typing & clicking Search / pressing Enter)
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Draft filter states inside collapsible Filter Directory panel
  const [draftStatus, setDraftStatus] = useState<OrganizationStatus | 'All'>(
    filters.status || 'All'
  );
  const [draftTier, setDraftTier] = useState<OrganizationTier | 'All'>(
    filters.tier || filters.planTier || 'All'
  );
  const [draftFrequency, setDraftFrequency] = useState<PayFrequency | 'All'>(
    filters.payFrequency || 'All'
  );

  // Sync local states when parent filters change externally
  useEffect(() => {
    setSearchInput(filters.search || '');
    setDraftStatus(filters.status || 'All');
    setDraftTier(filters.tier || filters.planTier || 'All');
    setDraftFrequency(filters.payFrequency || 'All');
  }, [filters]);

  const activeTier =
    filters.tier && filters.tier !== 'All'
      ? filters.tier
      : filters.planTier || 'All';

  const hasActiveDropdownFilters =
    filters.status !== 'All' ||
    activeTier !== 'All' ||
    (filters.payFrequency && filters.payFrequency !== 'All');

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    onFilterChange({ ...filters, search: value });
  };

  const handleExecuteSearch = () => {
    onFilterChange({ ...filters, search: searchInput.trim() });
  };

  const handleClearSearch = () => {
    setSearchInput('');
    onFilterChange({ ...filters, search: '' });
  };

  const handleApplyFilters = () => {
    onFilterChange({
      ...filters,
      status: draftStatus,
      tier: draftTier,
      planTier: draftTier,
      payFrequency: draftFrequency,
    });
  };

  const handleResetFilters = () => {
    setDraftStatus('All');
    setDraftTier('All');
    setDraftFrequency('All');
    onFilterChange({
      ...filters,
      status: 'All',
      tier: 'All',
      planTier: 'All',
      payFrequency: 'All',
    });
  };

  const handleClearAll = () => {
    setSearchInput('');
    setDraftStatus('All');
    setDraftTier('All');
    setDraftFrequency('All');
    onFilterChange({
      search: '',
      status: 'All',
      tier: 'All',
      planTier: 'All',
      payFrequency: 'All',
    });
  };

  const handleRemoveFilterChip = (
    key: 'search' | 'status' | 'tier' | 'payFrequency'
  ) => {
    if (key === 'search') {
      handleClearSearch();
    } else if (key === 'status') {
      setDraftStatus('All');
      onFilterChange({ ...filters, status: 'All' });
    } else if (key === 'tier') {
      setDraftTier('All');
      onFilterChange({ ...filters, tier: 'All', planTier: 'All' });
    } else if (key === 'payFrequency') {
      setDraftFrequency('All');
      onFilterChange({ ...filters, payFrequency: 'All' });
    }
  };

  // Active filter chips list
  const activeChips: {
    key: 'search' | 'status' | 'tier' | 'payFrequency';
    label: string;
  }[] = [];
  if (filters.search.trim()) {
    activeChips.push({
      key: 'search',
      label: `Search: "${filters.search.trim()}"`,
    });
  }
  if (filters.status !== 'All') {
    activeChips.push({
      key: 'status',
      label: `Status: ${filters.status}`,
    });
  }
  if (activeTier !== 'All') {
    activeChips.push({
      key: 'tier',
      label: `Tier: ${activeTier}`,
    });
  }
  if (filters.payFrequency && filters.payFrequency !== 'All') {
    activeChips.push({
      key: 'payFrequency',
      label: `Frequency: ${filters.payFrequency}`,
    });
  }

  return (
    <div className="space-y-3">
      {/* ================================================================== */}
      {/* PANEL 1: ACTION BAR (SEARCH BOX, SEARCH BUTTON, VIEW TOGGLE & FILTER) */}
      {/* ================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-[#E5E7EB] dark:border-slate-800 shadow-2xs">
        {/* Left: Search input box + Search button */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleExecuteSearch();
                }
              }}
              placeholder="Search organizations by legal name, slug, code, or administrator..."
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

        {/* Right: View Switcher (Cards / Table) + Filter Toggle Button */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto flex-shrink-0">
          {/* View Mode Toggle (Default: Table View) */}
          {onViewModeChange && (
            <div className="h-10 p-1 flex items-center bg-[#F8FAFC] dark:bg-slate-800 rounded-lg border border-[#E5E7EB] dark:border-slate-700">
              <button
                type="button"
                onClick={() => onViewModeChange('cards')}
                aria-label="Card View"
                title="Card View"
                className={`w-8 h-8 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'text-[#111827] dark:text-white bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 shadow-2xs'
                    : 'text-[#475569] dark:text-slate-400 hover:text-[#111827] dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('table')}
                aria-label="Table View"
                title="Table View"
                className={`w-8 h-8 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'text-[#111827] dark:text-white bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 shadow-2xs'
                    : 'text-[#475569] dark:text-slate-400 hover:text-[#111827] dark:hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Filter Panel Toggle Button */}
          <button
            type="button"
            onClick={() => setIsFilterPanelOpen((prev) => !prev)}
            className={`h-10 px-3.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all flex-shrink-0 cursor-pointer ${
              isFilterPanelOpen || hasActiveDropdownFilters
                ? 'border-[#0F172A] bg-[#0F172A]/5 text-[#0F172A] dark:border-slate-400 dark:text-white'
                : 'border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#F8FAFC] text-[#475569] dark:text-slate-200'
            }`}
            title="Filter Organizations"
          >
            <Filter className="w-4 h-4 text-[#6B7280]" />
            <span>Filter</span>
            {hasActiveDropdownFilters && (
              <span className="w-2 h-2 rounded-full bg-[#0F172A] dark:bg-blue-400" />
            )}
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
                onClick={() => handleRemoveFilterChip(chip.key)}
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
              {onViewModeChange && (
                <div className="h-8 p-0.5 flex items-center bg-[#F8FAFC] dark:bg-slate-800 rounded-lg border border-[#E5E7EB] dark:border-slate-700 mr-1">
                  <button
                    type="button"
                    onClick={() => onViewModeChange('table')}
                    className={`h-7 px-2.5 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      viewMode === 'table'
                        ? 'text-[#111827] dark:text-white bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 shadow-2xs'
                        : 'text-[#475569] dark:text-slate-400 hover:text-[#111827]'
                    }`}
                    title="List Table View"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Table</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onViewModeChange('cards')}
                    className={`h-7 px-2.5 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      viewMode === 'cards'
                        ? 'text-[#111827] dark:text-white bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 shadow-2xs'
                        : 'text-[#475569] dark:text-slate-400 hover:text-[#111827]'
                    }`}
                    title="Grid Card View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Grid</span>
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-8 px-3 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#F8FAFC] dark:hover:bg-slate-700 text-xs font-semibold text-[#475569] dark:text-slate-300 transition-all cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleApplyFilters}
                className="h-8 px-4 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold flex items-center justify-center transition-all cursor-pointer"
              >
                <span>Apply</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Status Filter */}
            <div>
              <CustomSelect
                label="Status"
                value={draftStatus}
                onChange={(v) => {
                  setDraftStatus(v as OrganizationStatus | 'All');
                }}
                options={[
                  { value: 'All', label: 'All Statuses' },
                  { value: 'Active', label: 'Active Only' },
                  { value: 'Onboarding', label: 'Onboarding Only' },
                  { value: 'Suspended', label: 'Suspended Only' },
                ]}
              />
            </div>

            {/* 2. Plan / Subscription Tier Filter */}
            <div>
              <CustomSelect
                label="Plan / Subscription Tier"
                value={draftTier}
                onChange={(v) => {
                  setDraftTier(v as OrganizationTier | 'All');
                }}
                options={[
                  { value: 'All', label: 'All Tiers' },
                  { value: 'Enterprise', label: 'Enterprise' },
                  { value: 'Standard', label: 'Standard Tier' },
                  { value: 'Starter', label: 'Starter Tier' },
                ]}
              />
            </div>

            {/* 3. Default Pay Frequency Filter */}
            <div>
              <CustomSelect
                label="Default Pay Frequency"
                value={draftFrequency}
                onChange={(v) => {
                  setDraftFrequency(v as PayFrequency | 'All');
                }}
                options={[
                  { value: 'All', label: 'Any Frequency' },
                  { value: 'Semi-Monthly', label: 'Semi-Monthly (15th & 30th)' },
                  { value: 'Monthly', label: 'Monthly' },
                  { value: 'Bi-Weekly', label: 'Bi-Weekly' },
                  { value: 'Weekly', label: 'Weekly' },
                ]}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationToolbar;
