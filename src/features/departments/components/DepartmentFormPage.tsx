// ==============================================================================
// JK-PAYROLL: DEPARTMENT FORM PAGE COMPONENT
// Page-Driven CRUD Form for Creating and Editing Departments
// File: src/features/departments/components/DepartmentFormPage.tsx
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  Building2,
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { DepartmentItem, CreateDepartmentInput, UpdateDepartmentInput } from '../types.js';

export interface DepartmentFormPageProps {
  mode: 'create' | 'edit';
  initialData?: DepartmentItem | null;
  defaultParentId?: string | null;
  organizations?: Array<{ id: string; name: string; code: string }>;
  parentDepartmentOptions?: DepartmentItem[];
  leadUserOptions?: Array<{ id: string; fullName: string; email: string }>;
  isSuperAdmin?: boolean;
  onSave: (data: CreateDepartmentInput | UpdateDepartmentInput) => Promise<void>;
  onCancel: () => void;
}

export const DepartmentFormPage: React.FC<DepartmentFormPageProps> = ({
  mode,
  initialData,
  defaultParentId,
  organizations = [
    { id: '00000000-0000-0000-0000-000000000000', name: 'SuperAdmin Platform', code: 'ROOT' },
    { id: '00000000-0000-0000-0000-000000000001', name: 'Apex Health Systems', code: 'APEX-HLTH' },
  ],
  parentDepartmentOptions = [],
  leadUserOptions = [],
  isSuperAdmin = true,
  onSave,
  onCancel,
}) => {
  const [organizationId, setOrganizationId] = useState(
    initialData?.organizationId || organizations[1]?.id || organizations[0]?.id || ''
  );
  const [parentDepartmentId, setParentDepartmentId] = useState<string | null>(
    initialData?.parentDepartmentId || defaultParentId || null
  );
  const [code, setCode] = useState(initialData?.code || '');
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [headUserId, setHeadUserId] = useState<string | null>(initialData?.headUserId || null);
  const [isActive, setIsActive] = useState<boolean>(initialData ? initialData.isActive : true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Available parent departments in the selected organization, excluding current department
  const filteredParents = parentDepartmentOptions.filter(
    (d) =>
      (d.organizationId === organizationId || (d as any).tenantId === organizationId) &&
      (!initialData || d.id !== initialData.id)
  );


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!code.trim()) {
      setErrorMessage('Department code is required');
      return;
    }

    if (!name.trim()) {
      setErrorMessage('Department name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        await onSave({
          organizationId,
          parentDepartmentId: parentDepartmentId || null,
          code: code.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim() || undefined,
          headUserId: headUserId || null,
          isActive,
        });
      } else {
        await onSave({
          organizationId,
          parentDepartmentId: parentDepartmentId || null,
          code: code.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim() || undefined,
          headUserId: headUserId || null,
          isActive,
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save department');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E7EB] dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2 mb-1.5 text-xs text-[#6B7280]">
            <button onClick={onCancel} className="hover:text-[#111827] dark:hover:text-white transition-colors">
              Departments
            </button>
            <span>/</span>
            <span className="font-semibold text-[#111827] dark:text-slate-200">
              {mode === 'create' ? 'New Department' : `Edit ${initialData?.code || 'Department'}`}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#111827] dark:text-white flex items-center gap-2.5 tracking-tight">
            <span>{mode === 'create' ? 'Create Department' : 'Edit Department'}</span>
          </h1>
          <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">
            Define organizational hierarchy, materialized tree path, leadership roles, and operational scope.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="h-10 px-4 rounded-xl border border-[#E5E7EB] dark:border-slate-700 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 text-[#475569] dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Directory</span>
        </button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
        {/* Hierarchy Information Section */}
        <div>
          <h3 className="text-sm font-bold text-[#111827] dark:text-white flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Organizational Hierarchy & Placement</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Organization */}
            <div>
              <label className="block text-xs font-semibold text-[#475569] dark:text-slate-300 mb-1.5">
                Organization Scope <span className="text-rose-500">*</span>
              </label>
              <select
                value={organizationId}
                onChange={(e) => {
                  setOrganizationId(e.target.value);
                  setParentDepartmentId(null);
                }}
                disabled={!isSuperAdmin}
                className="w-full h-10 px-3 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 font-medium cursor-pointer disabled:bg-slate-50 disabled:cursor-not-allowed"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Parent Department */}
            <div>
              <label className="block text-xs font-semibold text-[#475569] dark:text-slate-300 mb-1.5">
                Parent Department (Optional)
              </label>
              <select
                value={parentDepartmentId || ''}
                onChange={(e) => setParentDepartmentId(e.target.value ? e.target.value : null)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 font-medium cursor-pointer"
              >
                <option value="">None (Top-Level Head Department, Depth 0)</option>
                {filteredParents.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.name} ({parent.code}) — Depth {parent.depth}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[#6B7280] mt-1">
                Leave empty if this is an Executive/Head Department (e.g. OPG, HR).
              </p>
            </div>
          </div>
        </div>


        <div className="border-t border-[#E5E7EB] dark:border-slate-800 pt-5">
          <h3 className="text-sm font-bold text-[#111827] dark:text-white flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Department Identification & Leadership</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Code */}
            <div>
              <label className="block text-xs font-semibold text-[#475569] dark:text-slate-300 mb-1.5">
                Department Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. OPG, OPG-ITD, OPG-PIO"
                className="w-full h-10 px-3 text-xs uppercase font-mono rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A] transition-all"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-[#475569] dark:text-slate-300 mb-1.5">
                Department Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Office of the Provincial Governor, IT Division"
                className="w-full h-10 px-3 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A] transition-all"
              />
            </div>

            {/* Department Head User */}
            <div>
              <label className="block text-xs font-semibold text-[#475569] dark:text-slate-300 mb-1.5">
                Department Head / Lead User
              </label>
              <select
                value={headUserId || ''}
                onChange={(e) => setHeadUserId(e.target.value ? e.target.value : null)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 font-medium cursor-pointer"
              >
                <option value="">Unassigned (No lead appointed)</option>
                {leadUserOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center space-x-3 pt-6">
              <input
                type="checkbox"
                id="dept-active-toggle"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-[#0F172A] focus:ring-[#0F172A] cursor-pointer"
              />
              <label htmlFor="dept-active-toggle" className="text-xs font-semibold text-[#111827] dark:text-white cursor-pointer">
                Department is active and operational
              </label>
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#475569] dark:text-slate-300 mb-1.5">
                Description & Operational Scope
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the department's primary responsibilities, functional jurisdiction, and organizational objectives..."
                className="w-full p-3 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-white placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A] transition-all"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="border-t border-[#E5E7EB] dark:border-slate-800 pt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-10 px-4 rounded-xl border border-[#E5E7EB] dark:border-slate-700 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 text-[#475569] dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Department' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default DepartmentFormPage;
