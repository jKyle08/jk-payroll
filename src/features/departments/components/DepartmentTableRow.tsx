// ==============================================================================
// JK-PAYROLL: DEPARTMENT TABLE ROW COMPONENT
// Displays single department with code, hierarchy depth badge, tree path, and actions
// File: src/features/departments/components/DepartmentTableRow.tsx
// ==============================================================================

import React from 'react';
import { Building2, GitBranch, Edit2, Trash2, Plus, User } from 'lucide-react';
import { DepartmentItem } from '../types.js';
import { Badge, StatusIndicator, TableActionMenu } from '../../../client/components/ui/index.js';

export interface DepartmentTableRowProps {
  department: DepartmentItem;
  index: number;
  onEdit: (dept: DepartmentItem) => void;
  onDelete: (dept: DepartmentItem) => void;
  onAddSubDepartment: (parentDept: DepartmentItem) => void;
}

export const DepartmentTableRow: React.FC<DepartmentTableRowProps> = ({
  department,
  index,
  onEdit,
  onDelete,
  onAddSubDepartment,
}) => {
  const isHead = department.depth === 0;

  return (
    <tr className="hover:bg-[#F8FAFC] dark:hover:bg-white/[0.03] transition-colors border-b border-[#E5E7EB] dark:border-white/10 text-xs">
      {/* Index */}
      <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-400 dark:text-[#64748B] font-medium">
        {index + 1}
      </td>

      {/* Code & Name */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
              isHead
                ? 'bg-slate-100 dark:bg-[#181D2A] text-slate-900 dark:text-[#CBD5E1] border border-slate-200 dark:border-white/10'
                : 'bg-slate-100 dark:bg-[#141924] text-slate-600 dark:text-[#94A3B8] border border-transparent dark:border-white/5'
            }`}
          >
            {isHead ? <Building2 className="w-4 h-4" /> : <GitBranch className="w-4 h-4" />}
          </div>
          <div>
            <div className="font-bold text-[#111827] dark:text-[#F8FAFC] flex items-center gap-1.5">
              <span>{department.name}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[10px] font-bold text-[#0F172A] dark:text-[#CBD5E1] bg-slate-100 dark:bg-[#181D2A] border border-transparent dark:border-white/10 px-1.5 py-0.2 rounded uppercase tracking-wider">
                {department.code}
              </span>
              {department.description && (
                <span className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] truncate max-w-[220px]">
                  {department.description}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Organization */}
      <td className="py-3 px-4 text-[#475569] dark:text-[#CBD5E1]">
        <div className="font-medium text-xs">{department.organizationName}</div>
        <div className="font-mono text-[10px] text-[#6B7280] dark:text-[#64748B]">{department.organizationCode}</div>
      </td>

      {/* Depth & Parent Hierarchy */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5">
          <Badge variant="neutral" size="sm">
            Depth {department.depth}: {department.depthLabel}
          </Badge>
        </div>
        {department.parentDepartmentName && (
          <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-1 flex items-center gap-1">
            <span className="text-slate-400 dark:text-[#64748B]">↳ Parent:</span>
            <span className="font-medium text-slate-700 dark:text-[#CBD5E1]">{department.parentDepartmentName}</span>
          </div>
        )}
      </td>

      {/* Tree Path */}
      <td className="py-3 px-4">
        <span className="font-mono text-[11px] px-2 py-1 rounded bg-[#F8FAFC] dark:bg-[#181D2A] border border-[#E5E7EB] dark:border-white/10 text-[#0F172A] dark:text-[#CBD5E1] select-all">
          {department.treePath}
        </span>
      </td>

      {/* Department Lead */}
      <td className="py-3 px-4">
        {department.headUserName ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#0F172A] dark:bg-[#121620] text-white dark:text-[#CBD5E1] border border-transparent dark:border-white/10 text-[10px] font-bold flex items-center justify-center">
              {department.headUserName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="font-medium text-xs text-[#111827] dark:text-[#F8FAFC]">{department.headUserName}</div>
              <div className="text-[10px] text-[#6B7280] dark:text-[#64748B]">{department.headUserEmail}</div>
            </div>
          </div>
        ) : (
          <span className="text-[11px] text-[#9CA3AF] dark:text-[#64748B] italic">Unassigned</span>
        )}
      </td>

      {/* Status */}
      <td className="py-3 px-4">
        <StatusIndicator isActive={department.isActive} />
      </td>

      {/* Actions: 3-Dots Dropdown */}
      <td className="py-3 px-4 text-right">
        <TableActionMenu
          actions={[
            {
              label: 'Add Sub-Department',
              icon: <Plus className="w-3.5 h-3.5 text-indigo-600" />,
              onClick: () => onAddSubDepartment(department),
            },
            {
              label: 'Edit Department',
              icon: <Edit2 className="w-3.5 h-3.5" />,
              onClick: () => onEdit(department),
            },
            {
              label: 'Delete Department',
              icon: <Trash2 className="w-3.5 h-3.5" />,
              variant: 'danger',
              divider: true,
              onClick: () => onDelete(department),
            },
          ]}
          title="Department Actions"
        />
      </td>
    </tr>
  );
};

export default DepartmentTableRow;
