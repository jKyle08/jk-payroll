// ==============================================================================
// JK-PAYROLL: DEPARTMENT TABLE COMPONENT
// Lists departments in high-density table layout with sorting and actions
// File: src/features/departments/components/DepartmentTable.tsx
// ==============================================================================

import React from 'react';
import { DepartmentItem } from '../types.js';
import { DepartmentTableRow } from './DepartmentTableRow.js';
import { Building2 } from 'lucide-react';

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
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F172A] mb-3"></div>
        <p className="text-xs text-[#6B7280]">Loading department records...</p>
      </div>
    );
  }

  if (departments.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
          <Building2 className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-[#111827] dark:text-white">No Departments Found</h3>
        <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
          No department records match your search or filter criteria. Try resetting filters or create a new department.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 shadow-xs">
      <div className="overflow-x-auto rounded-t-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] dark:bg-slate-800/80 border-b border-[#E5E7EB] dark:border-slate-700 text-[11px] font-bold text-[#6B7280] dark:text-slate-300 uppercase tracking-wider">
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
          <tbody className="divide-y divide-[#E5E7EB] dark:divide-slate-800">
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
        <div className="px-6 py-3 border-t border-[#E5E7EB] dark:border-slate-800 bg-[#FBFBFC] dark:bg-slate-900/60 text-xs text-[#6B7280]">
          Showing <span className="font-semibold text-[#111827] dark:text-white font-mono tabular-nums">{departments.length}</span>{' '}
          {departments.length === 1 ? 'department' : 'departments'}
        </div>
      )}
    </div>
  );
};

export default DepartmentTable;
