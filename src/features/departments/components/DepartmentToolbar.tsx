// ==============================================================================
// JK-PAYROLL: DEPARTMENT TOOLBAR COMPONENT
// Panel 1: Search Box + SearchButton + View Switcher (Tree / Table) + Filter Button
// Panel 2: Collapsible Filter Directory (Organization, Hierarchy Depth, Status) + Active Chips
// Design System: Balanced Glossy Graphite
// File: src/features/departments/components/DepartmentToolbar.tsx
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Search, X, Filter, GitBranch, List } from 'lucide-react';
import { DepartmentFilterState } from '../types.js';
import { CustomSelect } from '../../../client/components/ui/CustomSelect.js';
import {
  SearchableSelect,
  SearchableOption,
} from '../../../client/components/ui/SearchableSelect.js';
import { SearchButton } from '../../../client/components/ui/SearchButton.js';
import { Button, Badge, Input } from '../../../client/components/ui/index.js';

const ORGANIZATION_FILTER_OPTIONS: SearchableOption[] = [
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

export interface DepartmentToolbarProps {
  filters: DepartmentFilterState;
  isSuperAdmin?: boolean;
  viewMode?: 'tree' | 'table';
  onSearchChange: (search: string) => void;
  onOrganizationChange: (orgId: string | 'All') => void;
  onDepthChange: (depth: number | 'All') => void;
  onStatusChange: (status: 'All' | 'Active' | 'Inactive') => void;
  onApplyFilters?: (nextFilters: DepartmentFilterState) => void;
  onViewModeChange?: (mode: 'tree' | 'table') => void;
  onReset: () => void;
  onAddNew?: () => void;
}

export const DepartmentToolbar: React.FC<DepartmentToolbarProps> = ({
  filters,
  isSuperAdmin = true,
  viewMode = 'tree',
  onSearchChange,
  onOrganizationChange,
  onDepthChange,
  onStatusChange,
  onApplyFilters,
  onViewModeChange,
  onReset,
}) => {
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Draft filter states inside collapsible Filter Directory (applied ONLY when clicking Apply)
  const [draftOrgId, setDraftOrgId] = useState<string>(
    filters.organizationId || 'All'
  );
  const [draftDepth, setDraftDepth] = useState<string>(
    filters.depth !== undefined ? String(filters.depth) : 'All'
  );
  const [draftStatus, setDraftStatus] = useState<'All' | 'Active' | 'Inactive'>(
    filters.status || 'All'
  );

  // Sync draft state when parent filters change externally
  useEffect(() => {
    setSearchInput(filters.search || '');
    setDraftOrgId(filters.organizationId || 'All');
    setDraftDepth(filters.depth !== undefined ? String(filters.depth) : 'All');
    setDraftStatus(filters.status || 'All');
  }, [filters]);

  const activeOrgId = filters.organizationId || 'All';
  const activeDepth =
    filters.depth !== undefined ? String(filters.depth) : 'All';
  const activeStatus = filters.status || 'All';

  const hasActiveDropdownFilters =
    activeOrgId !== 'All' || activeDepth !== 'All' || activeStatus !== 'All';

  const handleExecuteSearch = () => {
    onSearchChange(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    onSearchChange('');
  };

  const handleApply = () => {
    const parsedDepth: number | 'All' =
      draftDepth === 'All' ? 'All' : Number(draftDepth);
    if (onApplyFilters) {
      onApplyFilters({
        ...filters,
        search: searchInput.trim(),
        organizationId: draftOrgId,
        depth: parsedDepth,
        status: draftStatus,
      });
    } else {
      onOrganizationChange(draftOrgId);
      onDepthChange(parsedDepth);
      onStatusChange(draftStatus);
    }
  };

  const handleResetFilterDirectory = () => {
    setDraftOrgId('All');
    setDraftDepth('All');
    setDraftStatus('All');
    if (onApplyFilters) {
      onApplyFilters({
        ...filters,
        organizationId: 'All',
        depth: 'All',
        status: 'All',
      });
    } else {
      onReset();
    }
  };

  const handleClearAll = () => {
    setSearchInput('');
    setDraftOrgId('All');
    setDraftDepth('All');
    setDraftStatus('All');
    onReset();
  };

  // Active Filter Chips
  const activeChips: {
    key: 'search' | 'org' | 'depth' | 'status';
    label: string;
  }[] = [];

  if (filters.search && filters.search.trim()) {
    activeChips.push({
      key: 'search',
      label: `Search: "${filters.search.trim()}"`,
    });
  }
  if (activeOrgId !== 'All') {
    const orgLabel =
      ORGANIZATION_FILTER_OPTIONS.find((o) => o.value === activeOrgId)?.label ||
      activeOrgId;
    activeChips.push({
      key: 'org',
      label: `Organization: ${orgLabel}`,
    });
  }
  if (activeDepth !== 'All') {
    activeChips.push({
      key: 'depth',
      label: `Depth: Level ${activeDepth}`,
    });
  }
  if (activeStatus !== 'All') {
    activeChips.push({
      key: 'status',
      label: `Status: ${activeStatus}`,
    });
  }

  const handleRemoveChip = (key: 'search' | 'org' | 'depth' | 'status') => {
    if (key === 'search') {
      handleClearSearch();
    } else if (key === 'org') {
      setDraftOrgId('All');
      if (onApplyFilters) {
        onApplyFilters({ ...filters, organizationId: 'All' });
      } else {
        onOrganizationChange('All');
      }
    } else if (key === 'depth') {
      setDraftDepth('All');
      if (onApplyFilters) {
        onApplyFilters({ ...filters, depth: 'All' });
      } else {
        onDepthChange('All');
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
      {/* PANEL 1: SEARCH BOX + SEARCH BUTTON + VIEW TOGGLE + FILTER BUTTON  */}
      {/* ================================================================== */}
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
              placeholder="Search by department name, code, path (e.g. opg/opg-itd), or lead..."
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

        {/* Right: View Mode Toggle (Tree / Table) + Filter Button */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto flex-shrink-0">
          {onViewModeChange && (
            <div className="h-10 p-1 flex items-center bg-[#F8FAFC] dark:bg-[#181D2A] rounded-lg border border-[#E5E7EB] dark:border-white/10">
              <button
                type="button"
                onClick={() => onViewModeChange('tree')}
                className={`h-8 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'tree'
                    ? 'bg-white dark:bg-[#202637] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E5E7EB] dark:border-white/10 shadow-2xs'
                    : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC]'
                }`}
                title="Tree Hierarchy View"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Tree</span>
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('table')}
                className={`h-8 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-[#202637] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E5E7EB] dark:border-white/10 shadow-2xs'
                    : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC]'
                }`}
                title="Table Directory View"
              >
                <List className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
            </div>
          )}

          <Button
            type="button"
            variant={isFilterPanelOpen || hasActiveDropdownFilters ? 'primary' : 'outline'}
            size="lg"
            onClick={() => setIsFilterPanelOpen((prev) => !prev)}
            leftIcon={<Filter className="w-4 h-4" />}
            title="Filter Departments"
          >
            <span>Filter</span>
            {hasActiveDropdownFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-[#0B0E14] ml-1" />
            )}
          </Button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* ACTIVE FILTER DISMISSAL CHIPS                                      */}
      {/* ================================================================== */}
      {activeChips.length > 0 && (
        <div className="flex items-center flex-wrap gap-1.5 py-1 text-xs">
          <span className="text-[11px] font-semibold text-[#6B7280] dark:text-[#64748B] mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-[#6B7280] dark:text-[#64748B]" />
            <span>Active Filters:</span>
          </span>
          {activeChips.map((chip) => (
            <Badge
              key={chip.key}
              variant="neutral"
              size="md"
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={() => handleRemoveChip(chip.key)}
                className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[#6B7280] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer ml-1"
                title="Remove filter"
              >
                ✕
              </button>
            </Badge>
          ))}
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs font-semibold text-[#0F172A] dark:text-[#CBD5E1] dark:hover:text-[#F8FAFC] hover:underline ml-1.5 cursor-pointer"
          >
            Clear All
          </button>
        </div>
      )}

      {/* ================================================================== */}
      {/* PANEL 2: COLLAPSIBLE FILTER DIRECTORY PANEL                        */}
      {/* ================================================================== */}
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
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleResetFilterDirectory}
              >
                Reset
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleApply}
              >
                Apply
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Organization Filter (searchable, updates draft state only) */}
            {isSuperAdmin && (
              <div>
                <SearchableSelect
                  label="Organization"
                  value={draftOrgId}
                  onChange={(v) => setDraftOrgId(v)}
                  searchPlaceholder="Search organizations..."
                  options={ORGANIZATION_FILTER_OPTIONS}
                />
              </div>
            )}

            {/* 2. Hierarchy Depth Filter (updates draft state only) */}
            <div>
              <CustomSelect
                label="Hierarchy Depth"
                value={draftDepth}
                onChange={(v) => setDraftDepth(v)}
                options={[
                  { value: 'All', label: 'All Hierarchy Depths' },
                  { value: '0', label: 'Depth 0 (Head Departments)' },
                  { value: '1', label: 'Depth 1 (Sub-departments)' },
                  { value: '2', label: 'Depth 2+ (Units & Sections)' },
                ]}
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
                  { value: 'All', label: 'All Statuses' },
                  { value: 'Active', label: 'Active Only' },
                  { value: 'Inactive', label: 'Inactive Only' },
                ]}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentToolbar;
