// ==============================================================================
// JK-PAYROLL: ORGANIZATION TABLE COMPONENT
// Design System: Balanced Glossy Graphite
// File: src/features/organizations/components/OrganizationTable.tsx
// ==============================================================================

import React from 'react';
import { Building2, Plus, SearchX } from 'lucide-react';
import { Organization } from '../types.js';
import { OrganizationTableRow } from './OrganizationTableRow.js';
import { EmptyState } from '../../../client/components/ui/index.js';

export interface OrganizationTableProps {
  organizations: Organization[];
  isLoading?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (org: Organization) => void;
  onAddNew?: () => void;
  startIndex?: number;
  pagination?: React.ReactNode;
}

export const OrganizationTable: React.FC<OrganizationTableProps> = ({
  organizations,
  isLoading = false,
  onEdit,
  onDelete,
  onAddNew,
  startIndex = 0,
  pagination,
}) => {
  if (!isLoading && organizations.length === 0) {
    return (
      <EmptyState
        title="No organizations found"
        description="No organizations match your current search and filter criteria, or none have been provisioned yet."
        actionLabel={onAddNew ? "Provision First Organization" : undefined}
        onAction={onAddNew}
        actionIcon={<Plus className="w-3.5 h-3.5" />}
      />
    );
  }

  return (
    <div className="w-full bg-white dark:bg-[#121620] rounded-2xl border border-[#E5E7EB] dark:border-white/10 shadow-xs">
      <div className="overflow-x-auto rounded-t-2xl">
        <table className="w-full min-w-[840px] text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E5E7EB] dark:border-white/10 bg-[#F8FAFC]/60 dark:bg-[#141924] text-[11px] font-semibold text-[#6B7280] dark:text-[#64748B] uppercase tracking-wider">
              <th className="py-3.5 px-3 text-center w-12">#</th>
              <th className="py-3.5 px-6">Organization</th>
              <th className="py-3.5 px-4">Routing Code / Slug</th>
              <th className="py-3.5 px-4">Plan Tier</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Active Headcount</th>
              <th className="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB] dark:divide-white/10">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-[#0F172A] dark:border-[#CBD5E1] mb-2.5"></div>
                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                    Loading organizations...
                  </p>
                </td>
              </tr>
            ) : (
              organizations.map((org, idx) => (
                <OrganizationTableRow
                  key={org.id}
                  organization={org}
                  index={startIndex + idx}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer: Pagination */}
      {pagination ?? (
        <div className="px-6 py-3 border-t border-[#E5E7EB] dark:border-white/10 bg-[#FBFBFC] dark:bg-[#141924] text-xs text-[#6B7280] dark:text-[#64748B]">
          Showing <span className="font-semibold text-[#111827] dark:text-[#F8FAFC] font-mono tabular-nums">{organizations.length}</span>{' '}
          {organizations.length === 1 ? 'organization' : 'organizations'}
        </div>
      )}
    </div>
  );
};

export default OrganizationTable;
