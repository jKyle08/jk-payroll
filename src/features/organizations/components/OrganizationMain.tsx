// ==============================================================================
// JK-PAYROLL: ORGANIZATION MAIN HUB COMPONENT
// Root page (/organizations): Header + KPI Cards + Toolbar + Table + ConfirmDialog
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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Organization } from '../types.js';
import { useOrganizations } from '../hooks/useOrganizations.js';
import { useOrganizationMutations } from '../hooks/useOrganizationMutations.js';
import { OrganizationToolbar } from './OrganizationToolbar.js';
import { OrganizationTable } from './OrganizationTable.js';
import { OrganizationTableSkeleton } from './OrganizationTableSkeleton.js';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.js';

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

  const {
    filteredOrganizations,
    kpis,
    filters,
    setFilters,
    isLoading,
    error,
    refetch,
    removeOrganizationFromState,
  } = useOrganizations();

  const { deleteOrg, isSubmitting: isDeleting } = useOrganizationMutations();

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

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-[#111827] p-6 lg:p-8 space-y-8 font-sans">
      {/* 1. Page Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-semibold text-[#6B7280]">
              Organizations
            </span>
            <span className="text-xs text-[#E5E7EB]">/</span>
            <span className="text-xs font-semibold text-[#111827]">
              Organization Directory
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">
            Organizations
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Manage client enterprise workspaces, multi-tenant isolation domains, and subscription tiers.
          </p>
        </div>
      </div>

      {/* 2. KPI Summary Cards (Midnight & Champagne Steel) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Organizations */}
        <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#6B7280]">Total Organizations</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#111827] font-mono tabular-nums">
                {kpis.total}
              </span>
              <span className="text-[11px] text-[#6B7280]">tenants</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-center text-[#0F172A]">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Active Organizations */}
        <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#6B7280]">Active Organizations</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#111827] font-mono tabular-nums">
                {kpis.active}
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                Live
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Setup */}
        <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#6B7280]">Pending Setup</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#111827] font-mono tabular-nums">
                {kpis.pending}
              </span>
              <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">
                Onboarding
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Managed Headcount */}
        <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#6B7280]">Managed Employees</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#111827] font-mono tabular-nums">
                {kpis.totalHeadcount}
              </span>
              <span className="text-[11px] text-[#6B7280]">personnel</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Toolbar */}
      <OrganizationToolbar
        filters={filters}
        onFilterChange={setFilters}
        onAddNew={handleAddNew}
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
            className="flex items-center gap-1.5 font-semibold text-rose-800 hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 5. Organization Table or Skeleton */}
      {isLoading ? (
        <OrganizationTableSkeleton rows={4} />
      ) : (
        <OrganizationTable
          organizations={filteredOrganizations}
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
