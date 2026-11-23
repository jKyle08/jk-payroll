// ==============================================================================
// JK-PAYROLL: DEPARTMENT FORM PAGE COMPONENT
// Page-Driven CRUD Form for Creating and Editing Departments
// Design System: Balanced Glossy Graphite
// File: src/features/departments/components/DepartmentFormPage.tsx
// ==============================================================================

import React, { useState } from 'react';
import {
  Building2,
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { SearchableSelect } from '../../../client/components/ui/SearchableSelect.js';
import {
  Button,
  Input,
  Textarea,
  Select,
  Checkbox,
  Alert,
  FormField,
  Card,
} from '../../../client/components/ui/index.js';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E7EB] dark:border-white/10">
        <div>
          <div className="flex items-center space-x-2 mb-1.5 text-xs text-[#6B7280] dark:text-[#64748B]">
            <button onClick={onCancel} className="hover:text-[#111827] dark:hover:text-[#F8FAFC] transition-colors">
              Departments
            </button>
            <span>/</span>
            <span className="font-semibold text-[#111827] dark:text-[#CBD5E1]">
              {mode === 'create' ? 'New Department' : `Edit ${initialData?.code || 'Department'}`}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#111827] dark:text-[#F8FAFC] flex items-center gap-2.5 tracking-tight">
            <span>{mode === 'create' ? 'Create Department' : 'Edit Department'}</span>
          </h1>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
            Define organizational hierarchy, materialized tree path, leadership roles, and operational scope.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onCancel}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Directory
        </Button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <Alert variant="destructive" onDismiss={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-[#181D2A] rounded-2xl border border-[#E5E7EB] dark:border-white/10 p-6 sm:p-8 space-y-6 shadow-xs dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)]">
        {/* Hierarchy Information Section */}
        <div>
          <h3 className="text-sm font-bold text-[#111827] dark:text-[#F8FAFC] flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-indigo-500" />
            <span>Organizational Hierarchy & Placement</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Organization */}
            <div>
              <FormField label="Organization Scope" required>
                <SearchableSelect
                  value={organizationId}
                  onChange={(v) => {
                    setOrganizationId(v);
                    setParentDepartmentId(null);
                  }}
                  disabled={!isSuperAdmin}
                  searchPlaceholder="Search organizations..."
                  options={organizations.map((org: any) => ({
                    value: org.id,
                    label: org.name,
                    sublabel: org.code,
                    avatarText: String(org.name || '?').slice(0, 2).toUpperCase(),
                    avatarColor: 'bg-purple-600',
                  }))}
                />
              </FormField>
            </div>

            {/* Parent Department */}
            <div>
              <FormField
                label="Parent Department (Optional)"
                description="Leave empty if this is an Executive/Head Department (e.g. OPG, HR)."
              >
                <Select
                  value={parentDepartmentId || ''}
                  onChange={(e) => setParentDepartmentId(e.target.value ? e.target.value : null)}
                >
                  <option value="" className="bg-white dark:bg-[#181D2A] text-[#111827] dark:text-[#F8FAFC]">None (Top-Level Head Department, Depth 0)</option>
                  {filteredParents.map((parent) => (
                    <option key={parent.id} value={parent.id} className="bg-white dark:bg-[#181D2A] text-[#111827] dark:text-[#F8FAFC]">
                      {parent.name} ({parent.code}) — Depth {parent.depth}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          </div>
        </div>


        <div className="border-t border-[#E5E7EB] dark:border-white/10 pt-5">
          <h3 className="text-sm font-bold text-[#111827] dark:text-[#F8FAFC] flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-indigo-500" />
            <span>Department Identification & Leadership</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Code */}
            <div>
              <FormField label="Department Code" required>
                <Input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. OPG, OPG-ITD, OPG-PIO"
                  isMonospace
                  className="uppercase"
                />
              </FormField>
            </div>

            {/* Name */}
            <div>
              <FormField label="Department Name" required>
                <Input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Office of the Provincial Governor, IT Division"
                />
              </FormField>
            </div>

            {/* Department Head User */}
            <div>
              <FormField label="Department Head / Lead User">
                <Select
                  value={headUserId || ''}
                  onChange={(e) => setHeadUserId(e.target.value ? e.target.value : null)}
                >
                  <option value="" className="bg-white dark:bg-[#181D2A] text-[#111827] dark:text-[#F8FAFC]">Unassigned (No lead appointed)</option>
                  {leadUserOptions.map((user) => (
                    <option key={user.id} value={user.id} className="bg-white dark:bg-[#181D2A] text-[#111827] dark:text-[#F8FAFC]">
                      {user.fullName} ({user.email})
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center space-x-3 pt-6">
              <Checkbox
                id="dept-active-toggle"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                label="Department is active and operational"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <FormField label="Description & Operational Scope">
                <Textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the department's primary responsibilities, functional jurisdiction, and organizational objectives..."
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="border-t border-[#E5E7EB] dark:border-white/10 pt-5 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isSubmitting}
            isLoading={isSubmitting}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Department' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default DepartmentFormPage;
