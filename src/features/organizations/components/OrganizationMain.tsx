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
  Copy,
  X,
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
import { ConfirmDialog } from '../../../client/components/ui/ConfirmDialog.js';
import { KpiCard } from '../../../client/components/ui/KpiCard.js';
import { Button } from '../../../client/components/ui/index.js';
import { Pagination, usePagination } from '../../../client/components/ui/Pagination.js';
import { useAuth } from '../../auth/hooks/use-auth.js';

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

  const { deleteOrg, createOnboardingInvitation, isSubmitting: isIssuingInvite } = useOrganizationMutations();
  const isDeleting = isIssuingInvite;
  const { user } = useAuth();

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
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteError, setInviteError] = useState('');

  const handleIssueInvitation = async () => {
    setInviteError('');
    try {
      const result = await createOnboardingInvitation(inviteEmail);
      setInviteUrl(result.onboardingUrl);
    } catch (err: any) {
      setInviteError(err.message || 'Could not issue onboarding link');
    }
  };

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
          {user?.isSuperAdmin && (
            <Button type="button" variant="secondary" size="lg" onClick={() => {
              setInviteEmail('');
              setInviteUrl('');
              setInviteError('');
              setShowInviteDialog(true);
            }}>
              Create onboarding link
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={handleAddNew}
            leftIcon={<Plus className="w-4 h-4" />}
            title="Create New Organization"
          >
            New Organization
          </Button>
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
      {showInviteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="onboarding-link-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 id="onboarding-link-title" className="text-lg font-semibold">Create organization onboarding link</h2>
                <p className="mt-1 text-sm text-slate-500">The link is single-use, bound to this email, and expires after 24 hours.</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setShowInviteDialog(false)}><X className="h-4 w-4" /></button>
            </div>
            <label htmlFor="onboarding-invite-email" className="mb-1 block text-sm font-medium">Administrator email</label>
            <input id="onboarding-invite-email" type="email" autoComplete="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-800" />
            {inviteError && <p role="alert" className="mt-2 text-sm text-rose-600">{inviteError}</p>}
            {inviteUrl && (
              <div className="mt-4">
                <label htmlFor="onboarding-invite-link" className="mb-1 block text-sm font-medium">Copy and send this link</label>
                <div className="flex gap-2">
                  <input id="onboarding-invite-link" readOnly value={inviteUrl} className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-xs dark:border-slate-700 dark:bg-slate-800" />
                  <Button type="button" variant="secondary" size="md" leftIcon={<Copy className="h-4 w-4" />} onClick={() => void navigator.clipboard?.writeText(inviteUrl)}>Copy</Button>
                </div>
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" size="md" onClick={() => setShowInviteDialog(false)}>Close</Button>
              {!inviteUrl && <Button type="button" variant="primary" size="md" disabled={!inviteEmail || isIssuingInvite} onClick={() => void handleIssueInvitation()}>{isIssuingInvite ? 'Creating…' : 'Create link'}</Button>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default OrganizationMain;
