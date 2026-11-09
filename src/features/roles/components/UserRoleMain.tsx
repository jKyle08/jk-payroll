// ==============================================================================
// JK-PAYROLL: USER ROLE MAIN HUB COMPONENT
// Root page for User Roles: Header + KPI Cards + Toolbar + Table + ConfirmDialog
// Design System: "Midnight & Champagne Steel"
// File: src/features/roles/components/UserRoleMain.tsx
// ==============================================================================

import React, { useState } from 'react';
import {
  ShieldCheck,
  Users,
  Building2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserRoles } from '../hooks/useUserRoles.js';
import { useUserRoleMutations } from '../hooks/useUserRoleMutations.js';
import { UserRoleToolbar } from './UserRoleToolbar.js';
import { UserRoleTable } from './UserRoleTable.js';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.js';
import { KpiCard } from '../../../components/ui/KpiCard.js';
import { Pagination, usePagination } from '../../../components/ui/Pagination.js';

export interface UserRoleMainProps {
  onNavigateToCreate?: () => void;
  onNavigateToEdit?: (id: string) => void;
  onNavigateToAddRole?: () => void;
}

export const UserRoleMain: React.FC<UserRoleMainProps> = ({
  onNavigateToCreate,
  onNavigateToEdit,
  onNavigateToAddRole,
}) => {
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
      navigate('/admin/permissions/new');
    }
  };

  const handleAddRole = () => {
    if (onNavigateToAddRole) {
      onNavigateToAddRole();
    } else if (navigate) {
      navigate('/admin/roles/new');
    }
  };

  const handleEdit = (id: string) => {
    if (onNavigateToEdit) {
      onNavigateToEdit(id);
    } else if (navigate) {
      navigate(`/admin/permissions/${id}/edit`);
    }
  };

  const {
    userRoles,
    totalCount,
    page: serverPage,
    setPage: setServerPage,
    pageSize: serverPageSize,
    setPageSize: setServerPageSize,
    isLoading,
    error,
    filters,
    setFilters,
    kpis,
    refetch,
    updateSearch,
    updateTenantFilter,
    updateRoleFilter,
    updateStatusFilter,
    resetFilters,
  } = useUserRoles();

  const { removeRole } = useUserRoleMutations();

  const pagination = usePagination(userRoles, serverPageSize, totalCount);

  // Confirmation dialog state for deletion
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await removeRole(deleteId);
      setDeleteId(null);
      refetch();
    } catch {
      // Error handled by mutation hook
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar: Midnight & Champagne Steel Aesthetic */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
        <div>
          {/* Breadcrumbs */}
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-semibold text-[#6B7280]">
              User Roles
            </span>
            <span className="text-xs text-[#E5E7EB]">/</span>
            <span className="text-xs font-semibold text-[#111827]">
              User Role Directory
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">
            User Roles
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Assign security roles, audit permissions, and enforce organization-level scoping.
          </p>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total User Roles"
          value={kpis.total}
          suffix="user roles"
          tone="slate"
          icon={<Users className="w-5 h-5" />}
        />
        <KpiCard
          label="Active User Roles"
          value={kpis.active}
          suffix="Live"
          tone="emerald"
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <KpiCard
          label="Organizations Covered"
          value={kpis.uniqueTenants}
          suffix="tenants"
          tone="slate"
          icon={<Building2 className="w-5 h-5" />}
        />
        <KpiCard
          label="Distinct Roles"
          value={kpis.uniqueRoles}
          suffix="roles"
          tone="purple"
          icon={<ShieldCheck className="w-5 h-5" />}
        />
      </div>

      {/* Error banner if query fails */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Filter Toolbar */}
      <UserRoleToolbar
        filters={filters}
        onSearchChange={updateSearch}
        onTenantChange={updateTenantFilter}
        onRoleChange={updateRoleFilter}
        onStatusChange={updateStatusFilter}
        onApplyFilters={(nextFilters) => setFilters(nextFilters)}
        onReset={resetFilters}
        onAddNew={handleAddNew}
        onAddRole={handleAddRole}
      />

      {/* 4. Table */}
      <UserRoleTable
        userRoles={pagination.pageItems}
        startIndex={(serverPage - 1) * serverPageSize}
        pagination={
          <Pagination
            page={serverPage}
            pageSize={serverPageSize}
            total={totalCount}
            onPageChange={(nextPage) => {
              pagination.setPage(nextPage);
              setServerPage(nextPage);
            }}
            onPageSizeChange={(nextSize) => {
              pagination.setPageSize(nextSize);
              setServerPageSize(nextSize);
            }}
            itemLabel="user roles"
          />
        }
        isLoading={isLoading || pagination.isPaging}
        onEdit={handleEdit}
        onDelete={(id) => setDeleteId(id)}
        onAddNew={handleAddNew}
      />

      {/* 5. Universal Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Revoke User Role"
        description="Are you sure you want to delete this user role? The user will immediately lose privileges associated with this role."
        confirmText="Revoke Role"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
};
