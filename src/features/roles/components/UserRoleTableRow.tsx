// ==============================================================================
// JK-PAYROLL: USER ROLE TABLE ROW COMPONENT
// Single row rendering user, organization, role badge, status, and action buttons
// Design System: Balanced Glossy Graphite
// File: src/features/roles/components/UserRoleTableRow.tsx
// ==============================================================================

import React from 'react';
import { Edit2, Trash2, Shield, Building2 } from 'lucide-react';
import { UserRoleItem } from '../types.js';
import { Badge, StatusIndicator, TableActionMenu } from '../../../client/components/ui/index.js';

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
    <tr className="border-b border-[#E5E7EB] dark:border-white/10 hover:bg-[#F8FAFC] dark:hover:bg-white/[0.03] transition-colors group">
      {/* 0. Column Number */}
      <td className="py-3 px-3 text-center font-mono text-[11px] text-[#9CA3AF] dark:text-[#64748B] font-medium">
        {index !== undefined ? index + 1 : '—'}
      </td>

      {/* 1. User Identity */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white dark:text-[#CBD5E1] flex-shrink-0 bg-slate-700 dark:bg-[#121620] dark:border dark:border-white/10">
            {avatarInitials}
          </div>
          <div>
            <div className="text-xs font-semibold text-[#111827] dark:text-[#F8FAFC] group-hover:text-slate-600 dark:group-hover:text-white transition-colors">
              {item.userName}
            </div>
            <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] font-mono mt-0.5">
              {item.userEmail}
            </div>
          </div>
        </div>
      </td>

      {/* 2. Organization (Tenant) */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#64748B] flex-shrink-0" />
          <span className="text-xs font-medium text-[#111827] dark:text-[#CBD5E1]">{item.tenantName}</span>
        </div>
        <div className="text-[10px] font-mono text-[#6B7280] dark:text-[#64748B] mt-0.5">
          {item.tenantCode}
        </div>
      </td>

      {/* 3. Role & Code */}
      <td className="py-3 px-4">
        <Badge variant="neutral" size="sm">
          <Shield className="w-3 h-3 mr-1 text-[#64748B]" />
          <span>{item.roleName}</span>
        </Badge>
        <div className="text-[10px] font-mono text-[#6B7280] dark:text-[#64748B] mt-0.5">
          {item.roleCode}
        </div>
      </td>

      {/* 4. Active Status */}
      <td className="py-3 px-4">
        <StatusIndicator isActive={item.isActive} />
      </td>

      {/* 5. Assigned Date */}
      <td className="py-3 px-4 text-xs font-mono text-[#6B7280] dark:text-[#94A3B8] tabular-nums">
        {item.assignedAt}
      </td>

      {/* 6. Action 3-Dots Menu */}
      <td className="py-3 px-4 text-right">
        <TableActionMenu
          actions={[
            {
              label: 'Edit Assignment',
              icon: <Edit2 className="w-3.5 h-3.5" />,
              onClick: () => onEdit(item.id),
            },
            {
              label: 'Revoke Role',
              icon: <Trash2 className="w-3.5 h-3.5" />,
              variant: 'danger',
              divider: true,
              onClick: () => onDelete(item.id),
            },
          ]}
          title="User Role Actions"
        />
      </td>
    </tr>
  );
};
