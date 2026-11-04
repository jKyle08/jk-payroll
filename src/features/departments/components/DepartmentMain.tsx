// ==============================================================================
// JK-PAYROLL: DEPARTMENT MAIN VIEW COMPONENT
// Top-level page container with KPIs, Toolbar, Tree/Table views, and Form switcher
// File: src/features/departments/components/DepartmentMain.tsx
// ==============================================================================

import React, { useState } from 'react';
import {
  Building2,
  GitBranch,
  Layers,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { DepartmentItem, DepartmentNode, CreateDepartmentInput, UpdateDepartmentInput } from '../types.js';
import { useDepartments, useDepartmentMutations } from '../hooks/use-departments.js';
import { DepartmentToolbar } from './DepartmentToolbar.js';
import { DepartmentTable } from './DepartmentTable.js';
import { DepartmentTree } from './department-tree.js';
import { DepartmentFormPage } from './DepartmentFormPage.js';

export interface DepartmentMainProps {
  isSuperAdmin?: boolean;
}

export const DepartmentMain: React.FC<DepartmentMainProps> = ({ isSuperAdmin = true }) => {
  const {
    departments,
    departmentTree,
    meta,
    filters,
    setFilters,
    isLoading,
    error,
    refresh,
  } = useDepartments();

  const { create, update, remove } = useDepartmentMutations();

  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');
  const [pageState, setPageState] = useState<'list' | 'create' | 'edit'>('list');
  const [activeEditingDept, setActiveEditingDept] = useState<DepartmentItem | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const handleOpenCreate = (parentDeptId?: string | null) => {
    setActiveEditingDept(null);
    setDefaultParentId(parentDeptId || null);
    setPageState('create');
  };

  const handleOpenEdit = (dept: DepartmentItem) => {
    setActiveEditingDept(dept);
    setDefaultParentId(dept.parentDepartmentId);
    setPageState('edit');
  };

  const handleDelete = async (dept: DepartmentItem) => {
    if (dept.childrenCount > 0) {
      alert(`Cannot delete '${dept.name}' because it has active sub-departments. Please reassign or delete sub-departments first.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete department '${dept.name}' (${dept.code})?`)) {
      return;
    }

    try {
      await remove(dept.id);
      setSuccessBanner(`Department '${dept.name}' deleted successfully`);
      setTimeout(() => setSuccessBanner(null), 4000);
      refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete department');
    }
  };

  const handleSaveForm = async (data: CreateDepartmentInput | UpdateDepartmentInput) => {
    if (pageState === 'create') {
      await create(data);
      setSuccessBanner('Department created successfully');
    } else if (activeEditingDept) {
      await update(activeEditingDept.id, data);
      setSuccessBanner('Department updated successfully');
    }
    setTimeout(() => setSuccessBanner(null), 4000);
    setPageState('list');
    refresh();
  };

  if (pageState === 'create' || pageState === 'edit') {
    return (
      <DepartmentFormPage
        mode={pageState}
        initialData={activeEditingDept}
        defaultParentId={defaultParentId}
        parentDepartmentOptions={departments}
        isSuperAdmin={isSuperAdmin}
        onSave={handleSaveForm}
        onCancel={() => setPageState('list')}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E7EB] dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2 mb-1.5 text-xs text-[#6B7280]">
            <span className="font-semibold text-[#6B7280]">Administration</span>
            <span>/</span>
            <span className="font-semibold text-[#111827] dark:text-slate-200">Department Directory</span>
          </div>
          <h1 className="text-2xl font-bold text-[#111827] dark:text-white flex items-center gap-2.5 tracking-tight">
            <span>Department Hierarchy</span>
          </h1>
          <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">
            Manage organizational divisions, parent-child relationships, materialized tree paths, and department leadership.
          </p>
        </div>

        <button
          onClick={() => handleOpenCreate()}
          className="h-10 px-4 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Department</span>
        </button>
      </div>

      {/* Success Banner */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Departments */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-[#E5E7EB] dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#6B7280] dark:text-slate-400">Total Departments</span>
            <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] dark:bg-slate-800 text-[#475569] dark:text-slate-300 flex items-center justify-center border border-[#E5E7EB] dark:border-slate-700">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#111827] dark:text-white tabular-nums">{meta.total}</span>
            <span className="text-[11px] font-medium text-[#6B7280]">units</span>
          </div>
        </div>

        {/* Active Departments */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-[#E5E7EB] dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#6B7280] dark:text-slate-400">Active Departments</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-[#047857] bg-[#ECFDF5] border border-[#A7F3D0]">
              Operational
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#047857] dark:text-emerald-400 tabular-nums">{meta.activeCount}</span>
            <span className="text-[11px] font-medium text-[#6B7280]">live</span>
          </div>
        </div>

        {/* Head Departments (Depth 0) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-[#E5E7EB] dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#6B7280] dark:text-slate-400">Head Departments</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200">
              Depth 0
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 tabular-nums">{meta.rootCount}</span>
            <span className="text-[11px] font-medium text-[#6B7280]">executive</span>
          </div>
        </div>

        {/* Sub-departments & Units */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-[#E5E7EB] dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#6B7280] dark:text-slate-400">Sub-Departments</span>
            <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] dark:bg-slate-800 text-[#475569] dark:text-slate-300 flex items-center justify-center border border-[#E5E7EB] dark:border-slate-700">
              <GitBranch className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#111827] dark:text-white tabular-nums">{meta.subCount}</span>
            <span className="text-[11px] font-medium text-[#6B7280]">sub-branches</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <DepartmentToolbar
        filters={filters}
        isSuperAdmin={isSuperAdmin}
        viewMode={viewMode}
        onSearchChange={(search) => setFilters({ ...filters, search })}
        onOrganizationChange={(organizationId) => setFilters({ ...filters, organizationId })}
        onDepthChange={(depth) => setFilters({ ...filters, depth })}
        onStatusChange={(status) => setFilters({ ...filters, status })}
        onViewModeChange={setViewMode}
        onReset={() => setFilters({})}
        onAddNew={() => handleOpenCreate()}
      />

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* View Display: Tree vs Table */}
      {viewMode === 'tree' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-[#111827] dark:text-white flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-indigo-600" />
                <span>Interactive Organization Tree</span>
              </h3>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Hierarchical branch diagram with depth, path markers, and fast subtree navigation.
              </p>
            </div>
          </div>

          <DepartmentTree
            nodes={departmentTree}
            onAddSubDepartment={(parent) => handleOpenCreate(parent.id)}
          />
        </div>
      ) : (
        <DepartmentTable
          departments={departments}
          isLoading={isLoading}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          onAddSubDepartment={(parent) => handleOpenCreate(parent.id)}
        />
      )}
    </div>
  );
};

export default DepartmentMain;
