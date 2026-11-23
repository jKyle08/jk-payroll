// ==============================================================================
// JK-PAYROLL: DEPARTMENT TABLE COMPONENT
// Lists departments in high-density table layout with sorting and actions
// File: src/features/departments/components/DepartmentTable.tsx
// ==============================================================================

import React from 'react';
import { DepartmentItem } from '../types.js';
import { DepartmentTableRow } from './DepartmentTableRow.js';
import { Building2 } from 'lucide-react';
import { EmptyState } from '../../../client/components/ui/index.js';

export interface DepartmentTableProps {
  departments: DepartmentItem[];
  isLoading?: boolean;
  onEdit: (dept: DepartmentItem) => void;
  onDelete: (dept: DepartmentItem) => void;
  onAddSubDepartment: (parentDept: DepartmentItem) => void;
  startIndex?: number;
  pagination?: React.ReactNode;
}

export const DepartmentTable: React.FC<DepartmentTableProps> = ({
  departments,
  isLoading = false,
  onEdit,
  onDelete,
  onAddSubDepartment,
  startIndex = 0,
  pagination,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#181D2A] rounded-2xl border border-[#E5E7EB] dark:border-white/10 p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F172A] dark:border-[#CBD5E1] mb-3"></div>
        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">Loading department records...</p>
      </div>
    );
  }

  if (departments.length === 0) {
    return (
      <EmptyState
        icon={<Building2 className="w-6 h-6" />}
        title="No Departments Found"
        description="No department records match your search or filter criteria. Try resetting filters or create a new department."
      />
    );
  }

  return (
    <div className="bg-white dark:bg-[#121620] rounded-2xl border border-[#E5E7EB] dark:border-white/10 shadow-xs">
      <div className="overflow-x-auto rounded-t-2xl">
        <table className="w-full min-w-[840px] text-left border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] dark:bg-[#141924] border-b border-[#E5E7EB] dark:border-white/10 text-[11px] font-bold text-[#6B7280] dark:text-[#64748B] uppercase tracking-wider">
              <th className="py-3 px-3 text-center w-12 font-mono">#</th>
              <th className="py-3 px-4">Department & Code</th>
              <th className="py-3 px-4">Organization</th>
              <th className="py-3 px-4">Hierarchy Depth</th>
              <th className="py-3 px-4">Tree Path</th>
              <th className="py-3 px-4">Department Lead</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB] dark:divide-white/10">
            {departments.map((dept, index) => (
              <DepartmentTableRow
                key={dept.id}
                department={dept}
                index={startIndex + index}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddSubDepartment={onAddSubDepartment}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Footer: Pagination */}
      {pagination ?? (
        <div className="px-6 py-3 border-t border-[#E5E7EB] dark:border-white/10 bg-[#FBFBFC] dark:bg-[#141924] text-xs text-[#6B7280] dark:text-[#64748B]">
          Showing <span className="font-semibold text-[#111827] dark:text-[#F8FAFC] font-mono tabular-nums">{departments.length}</span>{' '}
          {departments.length === 1 ? 'department' : 'departments'}
        </div>
      )}
    </div>
  );
};

export default DepartmentTable;
