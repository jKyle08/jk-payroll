// ==============================================================================
// JK-PAYROLL: ORGANIZATION MAIN HUB COMPONENT
// Root page (/organizations): Header + KPI Cards + Toolbar (Search/Filter/View) + Table/Grid + Pagination + ConfirmDialog
// Design System: "Midnight & Champagne Steel"
// File: src/features/organizations/components/OrganizationMain.tsx
// ==============================================================================

import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  Users,
  AlertCircle,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Organization } from '../types.js';
import { useOrganizations } from '../hooks/useOrganizations.js';
import { useOrganizationMutations } from '../hooks/useOrganizationMutations.js';
import {
  OrganizationToolbar,
  OrganizationViewMode,
} from './OrganizationToolbar.js';
import { OrganizationTable } from './OrganizationTable.js';
import { OrganizationCardGrid } from './OrganizationCardGrid.js';
import { OrganizationTableSkeleton } from './OrganizationTableSkeleton.js';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.js';
import { KpiCard } from '../../../components/ui/KpiCard.js';
import { Pagination, usePagination } from '../../../components/ui/Pagination.js';

export interface OrganizationMainProps {
  onNavigateToCreate?: () => void;
  onNavigateToEdit?: (id: string) => void;
}

export const OrganizationMain: React.FC<OrganizationMainProps> = ({
  onNavigateToCreate,
  onNavigateToEdit,
}) => {
  // Safe react-router-dom navigate hook with prop fallback
  let navigate: ((path: string) => void) | undefined;
  try {
    navigate = useNavigate();
  } catch {
    navigate = undefined;
  }

  const handleAddNew = () => {
    if (onNavigateToCreate) {
      onNavigateToCreate();
    } else if (navigate) {
      navigate('/organizations/new');
    }
  };

  const handleEdit = (id: string) => {
    if (onNavigateToEdit) {
      onNavigateToEdit(id);
    } else if (navigate) {
      navigate(`/organizations/${id}/edit`);
    }
  };

  // Default view mode is 'table' (List Table View)
  const [viewMode, setViewMode] = useState<OrganizationViewMode>('table');

  const {
    filteredOrganizations,
    kpis,
    totalCount,
    page: serverPage,
    setPage: setServerPage,
    pageSize: serverPageSize,
    setPageSize: setServerPageSize,
    filters,
    setFilters,
    isLoading,
    error,
    refetch,
    removeOrganizationFromState,
  } = useOrganizations();

  const { deleteOrg, isSubmitting: isDeleting } = useOrganizationMutations();

  const pagination = usePagination(filteredOrganizations, serverPageSize, totalCount);

  const handlePageChange = (nextPage: number) => {
    pagination.setPage(nextPage);
    setServerPage(nextPage);
  };

  const handlePageSizeChange = (nextSize: number) => {
    pagination.setPageSize(nextSize);
    setServerPageSize(nextSize);
  };

  // State for universal ConfirmDialog
  const [targetOrgToDelete, setTargetOrgToDelete] = useState<Organization | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeletePrompt = (org: Organization) => {
    setDeleteError(null);
    setTargetOrgToDelete(org);
  };

  const handleConfirmDelete = async () => {
    if (!targetOrgToDelete) return;
    try {
      await deleteOrg(targetOrgToDelete.id);
      removeOrganizationFromState(targetOrgToDelete.id);
      setTargetOrgToDelete(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete organization');
    }
  };

  const paginationNode = (
    <Pagination
      page={serverPage}
      pageSize={serverPageSize}
      total={totalCount}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
      itemLabel="organizations"
    />
  );

  return (
    <div className="space-y-6 pb-12 text-[#111827] dark:text-white font-sans">
      {/* 1. Top Header Bar: Midnight & Champagne Steel Aesthetic */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E7EB] dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="text-xs font-semibold text-[#6B7280]">
              Organizations
            </span>
            <span className="text-xs text-[#E5E7EB] dark:text-slate-700">/</span>
            <span className="text-xs font-semibold text-[#111827] dark:text-slate-200">
              Organization Directory
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-white">
            Organizations
          </h1>
          <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">
            Manage client organizations, billing entities, isolation domains, and subscription tiers.
          </p>
        </div>

        {/* Header CTA */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleAddNew}
            className="h-10 px-4 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold flex items-center justify-center gap-2 border border-[#0F172A] dark:border-slate-100 transition-all cursor-pointer"
            title="Create New Organization"
          >
            <Plus className="w-4 h-4" />
            <span>New Organization</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Organizations"
          value={kpis.total}
          suffix="tenants"
          tone="slate"
          icon={<Building2 className="w-5 h-5" />}
        />
        <KpiCard
          label="Active Organizations"
          value={kpis.active}
          suffix="Live"
          tone="emerald"
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <KpiCard
          label="Pending Setup"
          value={kpis.pending}
          suffix="Onboarding"
          tone="amber"
          icon={<Clock className="w-5 h-5" />}
        />
        <KpiCard
          label="Managed Employees"
          value={kpis.totalHeadcount}
          suffix="headcount"
          tone="purple"
          icon={<Users className="w-5 h-5" />}
        />
      </div>

      {/* 3. Action Bar Panel (Search Box + Search Button + View Toggle + Filter Button) & Collapsible Filter Panel */}
      <OrganizationToolbar
        filters={filters}
        onFilterChange={setFilters}
        onAddNew={handleAddNew}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* 4. Error Display */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-1.5 font-semibold text-rose-800 hover:underline cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 5. Organization Directory Data View: List Table (default) or Grid Cards, with Pagination */}
      {viewMode === 'cards' ? (
        <OrganizationCardGrid
          organizations={pagination.pageItems}
          isLoading={isLoading || pagination.isPaging}
          startIndex={(serverPage - 1) * serverPageSize}
          pagination={paginationNode}
          onEdit={handleEdit}
          onDelete={handleDeletePrompt}
          onAddNew={handleAddNew}
        />
      ) : (
        <OrganizationTable
          organizations={pagination.pageItems}
          isLoading={isLoading || pagination.isPaging}
          startIndex={(serverPage - 1) * serverPageSize}
          pagination={paginationNode}
          onEdit={handleEdit}
          onDelete={handleDeletePrompt}
          onAddNew={handleAddNew}
        />
      )}

      {/* 6. Universal ConfirmDialog for Deletions */}
      <ConfirmDialog
        isOpen={!!targetOrgToDelete}
        isDestructive
        isLoading={isDeleting}
        title="Delete Organization"
        description={
          <div className="space-y-2">
            <p>
              Are you sure you want to permanently delete{' '}
              <strong className="text-[#111827]">
                {targetOrgToDelete?.name}
              </strong>{' '}
              (<span className="font-mono text-xs">{targetOrgToDelete?.slug}</span>)?
            </p>
            <p className="text-[11px] text-rose-600 font-medium">
              This action cannot be undone. All tenant isolation policies, departmental mappings, and assigned entitlements will be removed.
            </p>
            {deleteError && (
              <p className="p-2 rounded bg-rose-50 text-rose-700 text-xs font-semibold">
                {deleteError}
              </p>
            )}
          </div>
        }
        confirmLabel="Delete Organization"
        cancelLabel="Keep Organization"
        onConfirm={handleConfirmDelete}
        onClose={() => {
          if (!isDeleting) setTargetOrgToDelete(null);
        }}
      />
    </div>
  );
};

export default OrganizationMain;
