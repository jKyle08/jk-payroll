// ==============================================================================
// JK-PAYROLL: ROLE UNIFIED FORM PAGE
// Single page-driven form for Create and Edit of role definitions.
// SYSTEM roles are rendered read-only. Design System: "Midnight & Champagne Steel"
// File: src/features/roles/components/RoleFormPage.tsx
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { RoleItem } from '../types.js';
import { fetchRoleById } from '../services/role.client.js';
import { useRoleMutations } from '../hooks/useRoleMutations.js';

export interface RoleFormOrganizationOption {
  id: string;
  name: string;
  code: string;
}

export interface RoleFormPageProps {
  roleIdOverride?: string;
  /** Organizations the actor may create custom roles for */
  organizations?: RoleFormOrganizationOption[];
  /** Platform admins may also create global SYSTEM roles */
  canManageSystemRoles?: boolean;
  /** Pre-selected organization (e.g. the actor's own organization) */
  defaultOrganizationId?: string | null;
  onNavigateBack?: () => void;
  onSuccess?: (item: RoleItem) => void;
}

const GLOBAL_SCOPE = 'GLOBAL';

const inputClass =
  'w-full h-10 px-3.5 text-xs rounded-xl border border-[#E5E7EB] bg-white text-[#111827] placeholder:text-[#9CA3AF] ' +
  'focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-all ' +
  'disabled:bg-[#F9FAFB] disabled:text-[#6B7280] disabled:cursor-not-allowed';

export const RoleFormPage: React.FC<RoleFormPageProps> = ({
  roleIdOverride,
  organizations = [],
  canManageSystemRoles = false,
  defaultOrganizationId = null,
  onNavigateBack,
  onSuccess,
}) => {
  const params = useParams<{ id?: string }>();
  const id = roleIdOverride || params.id;
  const isEditMode = Boolean(id);

  let navigate: ((path: string) => void) | undefined;
  try {
    navigate = useNavigate();
  } catch {
    navigate = undefined;
  }

  const handleBack = () => {
    if (onNavigateBack) onNavigateBack();
    else if (navigate) navigate('/roles');
  };

  const initialScope = defaultOrganizationId ?? organizations[0]?.id ?? (canManageSystemRoles ? GLOBAL_SCOPE : '');

  const [isLoadingItem, setIsLoadingItem] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [scope, setScope] = useState<string>(initialScope);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isMutable, setIsMutable] = useState(true);
  const [loaded, setLoaded] = useState<RoleItem | null>(null);

  const { addRole, editRole, isSubmitting, error: mutationError } = useRoleMutations();

  const isReadOnly = isEditMode && loaded !== null && (loaded.roleType === 'SYSTEM' ? !canManageSystemRoles : !loaded.isEditable);
  const isSystemScope = scope === GLOBAL_SCOPE;

  const applyItem = (data: RoleItem) => {
    setLoaded(data);
    setScope(data.organizationId ?? GLOBAL_SCOPE);
    setCode(data.code);
    setName(data.name);
    setDescription(data.description ?? '');
    setIsDefault(data.isDefault);
    setIsMutable(data.isMutable);
  };

  useEffect(() => {
    if (!isEditMode || !id) return;
    setIsLoadingItem(true);
    setLoadError(null);
    fetchRoleById(id)
      .then((data) => data && applyItem(data))
      .catch((err) => setLoadError(err.message || 'Failed to load role'))
      .finally(() => setIsLoadingItem(false));
  }, [id, isEditMode]);

  const handleReset = () => {
    if (isEditMode && loaded) {
      applyItem(loaded);
    } else {
      setScope(initialScope);
      setCode('');
      setName('');
      setDescription('');
      setIsDefault(false);
      setIsMutable(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    if (isReadOnly) return;

    try {
      let result: RoleItem;
      if (isEditMode && id) {
        result = await editRole(id, { name, description, isDefault });
      } else {
        result = await addRole({
          organizationId: isSystemScope ? null : scope,
          roleType: isSystemScope ? 'SYSTEM' : 'CUSTOM',
          code,
          name,
          description: description || undefined,
          isDefault,
          isMutable,
        });
      }
      setSuccessMessage(isEditMode ? 'Role updated successfully.' : 'Role created successfully.');
      if (onSuccess) onSuccess(result);
      else setTimeout(handleBack, 700);
    } catch {
      // surfaced through mutationError
    }
  };

  if (isEditMode && isLoadingItem) {
    return (
      <div className="min-h-screen bg-[#FBFBFC] p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#6B7280]">
          <Loader2 className="w-6 h-6 animate-spin text-[#0F172A]" />
          <span className="text-xs font-medium">Loading role details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-[#111827] pb-16 font-sans">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#E5E7EB] px-6 lg:px-8 py-4">
        <div className="flex items-center space-x-2">
          <button type="button" onClick={handleBack} className="text-xs font-semibold text-[#6B7280] hover:underline cursor-pointer">
            Roles
          </button>
          <span className="text-xs text-[#E5E7EB]">/</span>
          <span className="text-xs font-semibold text-[#111827]">Role Form</span>
        </div>
        <h1 className="text-lg font-bold tracking-tight text-[#111827] mt-1">
          {isReadOnly ? 'View Role' : isEditMode ? 'Edit Role' : 'Create Role'}
        </h1>
      </header>

      <main className="w-full px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
          {(mutationError || loadError) && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{mutationError || loadError}</span>
            </div>
          )}
          {isReadOnly && (
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] text-[#475569] text-xs font-medium flex items-center gap-2">
              <Lock className="w-4 h-4 flex-shrink-0" />
              <span>
                {loaded?.roleType === 'SYSTEM'
                  ? 'System Global roles can only be edited by Super Admin.'
                  : 'This role is locked to prevent administrative lockout and cannot be modified.'}
              </span>
            </div>
          )}

          {/* CARD 1: ROLE DEFINITION */}
          <section className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-[#E5E7EB]">
              <div className="w-9 h-9 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] text-[#0F172A] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#111827]">Role Definition</h2>
                <p className="text-xs text-[#6B7280]">Identity and ownership of this role.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Scope */}
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Organization <span className="text-rose-500">*</span>
                </label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  disabled={isEditMode || isReadOnly || (!canManageSystemRoles && organizations.length <= 1)}
                  className={inputClass}
                >
                  {canManageSystemRoles && <option value={GLOBAL_SCOPE}>Global — all organizations (System role)</option>}
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.code})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#6B7280] mt-1">
                  {isSystemScope
                    ? 'System roles are available to every organization and cannot be changed by them.'
                    : 'Custom roles are private to the selected organization.'}
                </p>
              </div>

              {/* Role type (read-only, derived from scope) */}
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">Role Type</label>
                <div className="h-10 px-3.5 flex items-center text-xs rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isSystemScope ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {isSystemScope ? 'SYSTEM' : 'CUSTOM'}
                  </span>
                </div>
                <p className="text-[11px] text-[#6B7280] mt-1">Determined automatically by the organization selected.</p>
              </div>

              {/* Code */}
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Role Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  disabled={isEditMode || isReadOnly}
                  required
                  minLength={2}
                  maxLength={64}
                  pattern="[A-Za-z][A-Za-z0-9_]*"
                  placeholder="Enter role code"
                  className={`${inputClass} font-mono`}
                />
                <p className="text-[11px] text-[#6B7280] mt-1">
                  Unique identifier. Letters, numbers and underscores only. Cannot be changed after creation.
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Role Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isReadOnly}
                  required
                  minLength={2}
                  maxLength={128}
                  placeholder="Enter role name"
                  className={inputClass}
                />
                <p className="text-[11px] text-[#6B7280] mt-1">Display name shown when assigning this role.</p>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#374151] mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isReadOnly}
                  maxLength={500}
                  rows={3}
                  placeholder="Describe the responsibilities and access this role grants"
                  className={`${inputClass} h-auto py-2.5 resize-none`}
                />
                <p className="text-[11px] text-[#6B7280] mt-1 tabular-nums">{description.length}/500</p>
              </div>
            </div>
          </section>

          {/* CARD 2: BEHAVIOUR */}
          <section className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs space-y-4">
            <div className="pb-4 border-b border-[#E5E7EB]">
              <h2 className="text-sm font-bold text-[#111827]">Behaviour</h2>
              <p className="text-xs text-[#6B7280]">How this role is applied to users.</p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                disabled={isReadOnly}
                className="mt-0.5 rounded text-[#0F172A] focus:ring-[#0F172A]"
              />
              <span>
                <span className="block text-xs font-semibold text-[#111827]">Default role</span>
                <span className="block text-[11px] text-[#6B7280]">Automatically assigned to newly invited users. Only one default role per organization.</span>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!isMutable}
                onChange={(e) => setIsMutable(!e.target.checked)}
                disabled={isEditMode || isReadOnly}
                className="mt-0.5 rounded text-[#0F172A] focus:ring-[#0F172A]"
              />
              <span>
                <span className="block text-xs font-semibold text-[#111827]">Lock role</span>
                <span className="block text-[11px] text-[#6B7280]">
                  Prevents any further edits or deletion to avoid administrative lockout. This cannot be undone from this form.
                </span>
              </span>
            </label>
          </section>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className="h-10 px-5 text-xs font-semibold text-[#4B5563] bg-white hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl transition-all cursor-pointer"
            >
              {isReadOnly ? 'Back' : 'Cancel'}
            </button>
            {!isReadOnly && (
              <>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isSubmitting}
                  className="h-10 px-5 text-xs font-semibold text-[#4B5563] bg-white hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl transition-all cursor-pointer"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 px-6 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{isEditMode ? 'Updating...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <span>{isEditMode ? 'Update' : 'Save'}</span>
                  )}
                </button>
              </>
            )}
          </div>
        </form>
      </main>
    </div>
  );
};
