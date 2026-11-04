// ==============================================================================
// JK-PAYROLL: DEPARTMENT TABLE ROW COMPONENT
// Displays single department with code, hierarchy depth badge, tree path, and actions
// File: src/features/departments/components/DepartmentTableRow.tsx
// ==============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { Building2, GitBranch, Edit2, Trash2, Plus, User, MoreVertical } from 'lucide-react';
import { DepartmentItem } from '../types.js';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isHead = department.depth === 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <tr className="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/40 transition-colors border-b border-[#E5E7EB] dark:border-slate-800 text-xs">
      {/* Index */}
      <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-400 font-medium">
        {index + 1}
      </td>

      {/* Code & Name */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
              isHead
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {isHead ? <Building2 className="w-4 h-4" /> : <GitBranch className="w-4 h-4" />}
          </div>
          <div>
            <div className="font-bold text-[#111827] dark:text-white flex items-center gap-1.5">
              <span>{department.name}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[10px] font-bold text-[#0F172A] dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded uppercase tracking-wider">
                {department.code}
              </span>
              {department.description && (
                <span className="text-[11px] text-[#6B7280] dark:text-slate-400 truncate max-w-[220px]">
                  {department.description}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Organization */}
      <td className="py-3 px-4 text-[#475569] dark:text-slate-300">
        <div className="font-medium text-xs">{department.organizationName}</div>
        <div className="font-mono text-[10px] text-[#6B7280]">{department.organizationCode}</div>
      </td>

      {/* Depth & Parent Hierarchy */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              isHead
                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                : department.depth === 1
                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
            }`}
          >
            Depth {department.depth}: {department.depthLabel}
          </span>
        </div>
        {department.parentDepartmentName && (
          <div className="text-[11px] text-[#6B7280] mt-1 flex items-center gap-1">
            <span className="text-slate-400">↳ Parent:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{department.parentDepartmentName}</span>
          </div>
        )}
      </td>

      {/* Tree Path */}
      <td className="py-3 px-4">
        <span className="font-mono text-[11px] px-2 py-1 rounded bg-[#F8FAFC] dark:bg-slate-800/80 border border-[#E5E7EB] dark:border-slate-700 text-[#0F172A] dark:text-slate-200 select-all">
          {department.treePath}
        </span>
      </td>

      {/* Department Lead */}
      <td className="py-3 px-4">
        {department.headUserName ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#0F172A] text-white text-[10px] font-bold flex items-center justify-center">
              {department.headUserName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="font-medium text-xs text-[#111827] dark:text-white">{department.headUserName}</div>
              <div className="text-[10px] text-[#6B7280]">{department.headUserEmail}</div>
            </div>
          </div>
        ) : (
          <span className="text-[11px] text-[#9CA3AF] italic">Unassigned</span>
        )}
      </td>

      {/* Status */}
      <td className="py-3 px-4">
        {department.isActive ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-[#047857] bg-[#ECFDF5] border border-[#A7F3D0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#047857]"></span>
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200">
            Inactive
          </span>
        )}
      </td>

      {/* Actions: 3-Dots Dropdown */}
      <td className="py-3 px-4 text-right">
        <div className="relative inline-block text-left" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen((prev) => !prev);
            }}
            title="Department Actions"
            className="h-7 w-7 rounded-lg border border-transparent hover:border-[#E5E7EB] dark:hover:border-slate-700 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 text-[#475569] dark:text-slate-300 inline-flex items-center justify-center transition-colors cursor-pointer"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 z-50 mt-1 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-[#E5E7EB] dark:border-slate-700 py-1 text-xs text-[#111827] dark:text-white divide-y divide-[#E5E7EB] dark:divide-slate-800">
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onAddSubDepartment(department);
                  }}
                  className="w-full text-left px-3.5 py-1.5 flex items-center gap-2 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 font-medium transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Add Sub-Department</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onEdit(department);
                  }}
                  className="w-full text-left px-3.5 py-1.5 flex items-center gap-2 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 font-medium transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#0F172A] dark:text-slate-300" />
                  <span>Edit Department</span>
                </button>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDelete(department);
                  }}
                  className="w-full text-left px-3.5 py-1.5 flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-medium transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Department</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};

export default DepartmentTableRow;
