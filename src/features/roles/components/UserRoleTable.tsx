// ==============================================================================
// JK-PAYROLL: USER ROLE TABLE COMPONENT
// Table view for User Role assignments
// Design System: "Midnight & Champagne Steel"
// File: src/features/roles/components/UserRoleTable.tsx
// ==============================================================================

import React from 'react';
import { ShieldAlert, Plus, Loader2 } from 'lucide-react';
import { UserRoleItem } from '../types.js';
import { UserRoleTableRow } from './UserRoleTableRow.js';

export interface UserRoleTableProps {
  userRoles: UserRoleItem[];
  isLoading: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
  startIndex?: number;
  pagination?: React.ReactNode;
}

export const UserRoleTable: React.FC<UserRoleTableProps> = ({
  userRoles,
  isLoading,
  onEdit,
  onDelete,
  onAddNew,
  startIndex = 0,
  pagination,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center shadow-xs flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#0F172A]" />
        <span className="text-xs text-[#6B7280]">Loading user roles...</span>
      </div>
    );
  }

  if (userRoles.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center shadow-xs flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-[#111827]">No User Roles Found</h3>
        <p className="text-xs text-[#6B7280] mt-1 max-w-sm">
          No user roles match your current filter criteria.
        </p>
        <button
          onClick={onAddNew}
          className="mt-4 h-9 px-4 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-none"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Assign User Role</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs">
      <div className="overflow-x-auto rounded-t-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#FAFAFB] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
              <th className="py-3 px-3 text-center w-12">#</th>
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">Organization</th>
              <th className="py-3 px-4">Current Role</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Assigned Date</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {userRoles.map((item, idx) => (
              <UserRoleTableRow
                key={item.id}
                item={item}
                index={startIndex + idx}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Footer: Pagination */}
      {pagination ?? (
        <div className="px-4 py-3 border-t border-[#E5E7EB] bg-[#FAFAFB] flex items-center justify-between text-xs text-[#6B7280]">
          <span>
            Showing <span className="font-semibold text-[#111827]">{userRoles.length}</span> user roles
          </span>
          <span className="font-mono text-[11px]">PayPulse RBAC v2</span>
        </div>
      )}
    </div>
  );
};
