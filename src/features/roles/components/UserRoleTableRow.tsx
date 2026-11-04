// ==============================================================================
// JK-PAYROLL: USER ROLE TABLE ROW COMPONENT
// Single row rendering user, organization, role badge, status, and action buttons
// Design System: "Midnight & Champagne Steel"
// File: src/features/roles/components/UserRoleTableRow.tsx
// ==============================================================================

import React from 'react';
import { Edit2, Trash2, Shield, Building2 } from 'lucide-react';
import { UserRoleItem } from '../types.js';

export interface UserRoleTableRowProps {
  item: UserRoleItem;
  index?: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const UserRoleTableRow: React.FC<UserRoleTableRowProps> = ({
  item,
  index,
  onEdit,
  onDelete,
}) => {
  const avatarInitials =
    item.userName
      ?.split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'UR';

  const isSuperAdminRole = item.roleCode === 'SUPER_ADMIN';

  return (
    <tr className="border-b border-[#E5E7EB] hover:bg-[#F8FAFC] transition-colors group">
      {/* 0. Column Number */}
      <td className="py-3 px-3 text-center font-mono text-[11px] text-[#9CA3AF] font-medium">
        {index !== undefined ? index + 1 : '—'}
      </td>

      {/* 1. User Identity */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 ${
              isSuperAdminRole ? 'bg-purple-600' : 'bg-slate-700'
            }`}
          >
            {avatarInitials}
          </div>
          <div>
            <div className="text-xs font-semibold text-[#111827] group-hover:text-blue-600 transition-colors">
              {item.userName}
            </div>
            <div className="text-[11px] text-[#6B7280] font-mono mt-0.5">
              {item.userEmail}
            </div>
          </div>
        </div>
      </td>

      {/* 2. Organization (Tenant) */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-[#6B7280] flex-shrink-0" />
          <span className="text-xs font-medium text-[#111827]">{item.tenantName}</span>
        </div>
        <div className="text-[10px] font-mono text-[#6B7280] mt-0.5">
          {item.tenantCode}
        </div>
      </td>

      {/* 3. Role & Code */}
      <td className="py-3 px-4">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0]">
          <Shield className="w-3 h-3 text-[#64748B]" />
          <span>{item.roleName}</span>
        </div>
        <div className="text-[10px] font-mono text-[#6B7280] mt-0.5">
          {item.roleCode}
        </div>
      </td>

      {/* 4. Active Status */}
      <td className="py-3 px-4">
        {item.isActive ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Inactive
          </span>
        )}
      </td>

      {/* 5. Assigned Date */}
      <td className="py-3 px-4 text-xs font-mono text-[#6B7280] tabular-nums">
        {item.assignedAt}
      </td>

      {/* 6. Action Buttons */}
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => onEdit(item.id)}
            className="w-7 h-7 rounded-lg text-[#6B7280] hover:text-[#111827] hover:bg-[#E5E7EB]/60 flex items-center justify-center transition-all cursor-pointer"
            title="Edit User Role"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="w-7 h-7 rounded-lg text-[#6B7280] hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-all cursor-pointer"
            title="Delete User Role"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};
