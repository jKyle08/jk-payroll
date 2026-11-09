// ==============================================================================
// JK-PAYROLL: ORGANIZATION TABLE COMPONENT
// Table surface (#FFFFFF, 1px #E5E7EB, tabular-nums)
// Design System: "Midnight & Champagne Steel"
// File: src/features/organizations/components/OrganizationTable.tsx
// ==============================================================================

import React from 'react';
import { Building2, Plus, SearchX } from 'lucide-react';
import { Organization } from '../types.js';
import { OrganizationTableRow } from './OrganizationTableRow.js';

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
      <div className="w-full bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-[#F8FAFC] border border-[#E5E7EB] text-[#6B7280] flex items-center justify-center mx-auto mb-3">
          <SearchX className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-[#111827]">No organizations found</h3>
        <p className="text-xs text-[#6B7280] mt-1 max-w-sm mx-auto">
          No organizations match your current search and filter criteria, or none have been provisioned yet.
        </p>
        {onAddNew && (
          <button
            type="button"
            onClick={onAddNew}
            className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Provision First Organization</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-2xl border border-[#E5E7EB] shadow-xs">
      <div className="overflow-x-auto rounded-t-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F8FAFC]/60 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
              <th className="py-3.5 px-3 text-center w-12">#</th>
              <th className="py-3.5 px-6">Organization</th>
              <th className="py-3.5 px-4">Routing Code / Slug</th>
              <th className="py-3.5 px-4">Plan Tier</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Active Headcount</th>
              <th className="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-[#0F172A] dark:border-blue-400 mb-2.5"></div>
                  <p className="text-xs text-[#6B7280] dark:text-slate-400">
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
        <div className="px-6 py-3 border-t border-[#E5E7EB] bg-[#FBFBFC] text-xs text-[#6B7280]">
          Showing <span className="font-semibold text-[#111827] font-mono tabular-nums">{organizations.length}</span>{' '}
          {organizations.length === 1 ? 'organization' : 'organizations'}
        </div>
      )}
    </div>
  );
};

export default OrganizationTable;
