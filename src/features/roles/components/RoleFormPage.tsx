// ==============================================================================
// JK-PAYROLL: ROLE UNIFIED FORM PAGE
// Single page-driven form for Create and Edit of role definitions.
// SYSTEM roles are rendered read-only for non-Super-Admin users.
// Design System: Balanced Glossy Graphite
// File: src/features/roles/components/RoleFormPage.tsx
// ==============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  Award,
  Terminal,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { RoleItem } from '../types.js';
import { fetchRoleById } from '../services/role.client.js';
import { useRoleMutations } from '../hooks/useRoleMutations.js';
import { SearchableSelect, type SearchableOption } from '../../../client/components/ui/SearchableSelect.js';
import { Button, Badge, Alert, toast } from '../../../client/components/ui/index.js';
import { useAuth } from '../../auth/hooks/use-auth.js';
import { authFetch } from '../../../client/lib/auth-session.js';

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

const DEFAULT_ROLE_ORGS: RoleFormOrganizationOption[] = [
  {
    id: '00000000-0000-0000-0000-000000000000',
    name: 'SuperAdmin Platform',
    code: 'ROOT',
  },
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Apex Health Systems',
    code: 'APEX-HLTH',
  },
];

export const RoleFormPage: React.FC<RoleFormPageProps> = ({
  roleIdOverride,
  organizations: propOrganizations,
  canManageSystemRoles: propCanManageSystem,
  defaultOrganizationId = null,
  onNavigateBack,
  onSuccess,
}) => {
  const params = useParams<{ id?: string }>();
  const id = roleIdOverride || params.id;
  const isEditMode = Boolean(id);

  const { user, token } = useAuth();
  const canManageSystemRoles =
    propCanManageSystem !== undefined
      ? propCanManageSystem
      : Boolean(user?.isSuperAdmin ?? true);

  let navigate: ((path: string) => void) | undefined;
  try {
    navigate = useNavigate();
  } catch {
    navigate = undefined;
  }

  const handleBack = () => {
    if (onNavigateBack) onNavigateBack();
    else if (navigate) navigate('/admin/roles');
  };

  // Organizations state (seeded with defaults + live fetch from /api/organizations)
  const [orgList, setOrgList] = useState<RoleFormOrganizationOption[]>(
    propOrganizations && propOrganizations.length > 0
      ? propOrganizations
      : DEFAULT_ROLE_ORGS
  );

  useEffect(() => {
    if (propOrganizations && propOrganizations.length > 0) {
      setOrgList(propOrganizations);
      return;
    }
    let isMounted = true;
    const loadOrgs = async () => {
      try {
        const res = await authFetch('/api/organizations');
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json)
            ? json
            : Array.isArray(json.data)
            ? json.data
            : [];
          if (isMounted && list.length > 0) {
            setOrgList(
              list.map((o: any) => ({
                id: o.id,
                name: o.name,
                code: o.code || o.slug || 'ORG',
              }))
            );
          }
        }
      } catch {
        // Keep DEFAULT_ROLE_ORGS fallback
      }
    };
    loadOrgs();
    return () => {
      isMounted = false;
    };
  }, [propOrganizations, token]);

  const defaultOrgId =
    defaultOrganizationId ||
    orgList[1]?.id ||
    orgList[0]?.id ||
    '00000000-0000-0000-0000-000000000001';

  const [isLoadingItem, setIsLoadingItem] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [roleType, setRoleType] = useState<'SYSTEM' | 'CUSTOM'>('CUSTOM');
  const [organizationId, setOrganizationId] = useState<string>(defaultOrgId);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isMutable, setIsMutable] = useState(true);
  const [loaded, setLoaded] = useState<RoleItem | null>(null);

  const { addRole, editRole, isSubmitting, error: mutationError } =
    useRoleMutations();

  const isReadOnly =
    isEditMode &&
    loaded !== null &&
    (loaded.roleType === 'SYSTEM' ? !canManageSystemRoles : !loaded.isEditable);

  const applyItem = (data: RoleItem) => {
    setLoaded(data);
    if (data.roleType === 'SYSTEM' || !data.organizationId) {
      setRoleType('SYSTEM');
    } else {
      setRoleType('CUSTOM');
      setOrganizationId(data.organizationId);
    }
    setCode(data.code);
    setName(data.name);
    setDescription(data.description ?? '');
    setIsDefault(Boolean(data.isDefault));
    setIsMutable(data.isMutable !== false);
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
      setRoleType('CUSTOM');
      setOrganizationId(defaultOrgId);
      setCode('');
      setName('');
      setDescription('');
      setIsDefault(false);
      setIsMutable(true);
    }
  };

  const orgSelectOptions: SearchableOption[] = useMemo(() => {
    return orgList.map((org) => ({
      value: org.id,
      label: `${org.name} (${org.code})`,
      sublabel: org.code,
      avatarText: String(org.name || 'OR')
        .slice(0, 2)
        .toUpperCase(),
      avatarColor:
        org.id === '00000000-0000-0000-0000-000000000000'
          ? 'bg-[#0F172A]'
          : 'bg-purple-600',
    }));
  }, [orgList]);

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
          organizationId: roleType === 'SYSTEM' ? null : organizationId,
          roleType,
          code: code.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim() || undefined,
          isDefault,
          isMutable,
        });
      }
      const successMsg = isEditMode
        ? 'Role updated successfully.'
        : 'Role created successfully.';
      setSuccessMessage(successMsg);
      if (isEditMode) {
        toast.success('common.updated', { description: `Security role "${name}" updated successfully.` });
      } else {
        toast.success('users.role_created', { name, code });
      }
      if (onSuccess) onSuccess(result);
      else setTimeout(handleBack, 700);
    } catch (err: any) {
      toast.fromError(err, isEditMode ? 'Failed to update role' : 'Failed to create role');
    }
  };

  if (isEditMode && isLoadingItem) {
    return (
      <div className="p-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#6B7280]">
          <Loader2 className="w-6 h-6 animate-spin text-[#0F172A]" />
          <span className="text-xs font-medium">Loading role details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 text-[#111827] dark:text-[#F8FAFC]">
      {/* Breadcrumbs & Page Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E7EB] dark:border-white/10">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <button
              type="button"
              onClick={handleBack}
              className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] hover:underline cursor-pointer"
            >
              Roles
            </button>
            <span className="text-xs text-[#E5E7EB] dark:text-white/20">/</span>
            <button
              type="button"
              onClick={handleBack}
              className="text-xs font-semibold text-[#6B7280] dark:text-[#94A3B8] hover:underline cursor-pointer"
            >
              Role Directory
            </button>
            <span className="text-xs text-[#E5E7EB] dark:text-white/20">/</span>
            <span className="text-xs font-semibold text-[#111827] dark:text-[#CBD5E1]">
              {isReadOnly
                ? 'View Role'
                : isEditMode
                ? 'Edit Role'
                : 'Create Role'}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-[#111827] dark:text-white flex items-center gap-2.5 tracking-tight">
            <Shield className="w-6 h-6 text-[#0F172A] dark:text-white" />
            <span>
              {isReadOnly
                ? 'View Role Definition'
                : isEditMode
                ? 'Edit Role Definition'
                : 'Create Role Definition'}
            </span>
          </h1>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
            Configure role identity, organizational scope, permission boundary,
            and system constraints.
          </p>
        </div>
      </div>

      {/* Banners */}
      {successMessage && (
        <Alert variant="success" onDismiss={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {(mutationError || loadError) && (
        <Alert variant="destructive">
          {mutationError || loadError}
        </Alert>
      )}

      {isReadOnly && (
        <Alert variant="info" icon={<Lock className="w-4 h-4" />}>
          {loaded?.roleType === 'SYSTEM'
            ? 'System Global roles can only be edited by Super Admin.'
            : 'This role is locked to prevent administrative lockout and cannot be modified.'}
        </Alert>
      )}

      {/* Clean Role Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* CARD: ROLE DEFINITION & CONSTRAINTS */}
        <div className="bg-white dark:bg-[#181D2A] rounded-2xl p-6 border border-[#E5E7EB] dark:border-white/10 shadow-xs dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)] space-y-6 relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-white/10">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#121620] text-[#0F172A] dark:text-[#CBD5E1] border border-transparent dark:border-white/10 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">
                Role Identity &amp; Scope
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
                Define role identifiers, tenant authorization scope, and
                privilege lifecycle
              </p>
            </div>
          </div>

          {/* Row 1: Role Name & Role Code */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1">
                Role Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Award className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#64748B] pointer-events-none" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isReadOnly}
                  required
                  minLength={2}
                  maxLength={128}
                  placeholder="e.g. Senior Payroll Specialist"
                  className="h-10 w-full pl-9 pr-3 text-xs rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-[#121620] text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 dark:focus:border-white/20 transition-colors disabled:bg-slate-50 dark:disabled:bg-white/[0.02] disabled:text-slate-500 dark:disabled:text-[#64748B]"
                />
              </div>
              <p className="text-[11px] text-[#6B7280] dark:text-[#64748B] mt-1">
                Human-readable display name shown across permissions and user
                profile cards.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1]">
                  Role Code <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-500 dark:text-[#64748B] font-mono">
                  Uppercase identifier
                </span>
              </div>
              <div className="relative">
                <Terminal className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#64748B] pointer-events-none" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) =>
                    setCode(
                      e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '')
                    )
                  }
                  disabled={isEditMode || isReadOnly}
                  required
                  minLength={2}
                  maxLength={64}
                  placeholder="e.g. SENIOR_PAYROLL_SPECIALIST"
                  className="h-10 w-full pl-9 pr-3 text-xs rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-[#121620] text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#64748B] font-mono uppercase focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 dark:focus:border-white/20 transition-colors disabled:bg-slate-50 dark:disabled:bg-white/[0.02] disabled:text-slate-500 dark:disabled:text-[#64748B]"
                />
              </div>
              <p className="text-[11px] text-[#6B7280] dark:text-[#64748B] mt-1">
                Unique uppercase code (letters, numbers, underscores) enforced
                per tenant scope.
              </p>
            </div>
          </div>

          {/* Row 2: Role Type & Organization Scope */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-white/10">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-2">
                Role Type (Multi-Tenancy Model){' '}
                <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* SYSTEM Role Card */}
                <label
                  className={`relative flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${
                    roleType === 'SYSTEM'
                      ? 'border-[#0F172A] bg-slate-50 dark:bg-[#202637] dark:border-white/30 ring-1 ring-slate-900 dark:ring-white/20'
                      : 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#141924] hover:border-slate-400 dark:hover:border-white/20'
                  } ${
                    !canManageSystemRoles || isEditMode || isReadOnly
                      ? 'opacity-60 cursor-not-allowed'
                      : 'cursor-pointer'
                  }`}
                >
                  <input
                    type="radio"
                    name="rf-role-type"
                    value="SYSTEM"
                    checked={roleType === 'SYSTEM'}
                    disabled={!canManageSystemRoles || isEditMode || isReadOnly}
                    onChange={() => setRoleType('SYSTEM')}
                    className="mt-0.5 text-[#0F172A] focus:ring-[#0F172A]"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC]">
                        SYSTEM Role (Global)
                      </span>
                      <Badge variant="neutral" size="sm">
                        Platform-Wide
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5">
                      Global standard role available across all organizations.
                      Managed and editable only by Super Admin.
                    </p>
                  </div>
                </label>

                {/* CUSTOM Role Card */}
                <label
                  className={`relative flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${
                    roleType === 'CUSTOM'
                      ? 'border-[#0F172A] bg-slate-50 dark:bg-[#202637] dark:border-white/30 ring-1 ring-slate-900 dark:ring-white/20'
                      : 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#141924] hover:border-slate-400 dark:hover:border-white/20'
                  } ${
                    isEditMode || isReadOnly
                      ? 'opacity-60 cursor-not-allowed'
                      : 'cursor-pointer'
                  }`}
                >
                  <input
                    type="radio"
                    name="rf-role-type"
                    value="CUSTOM"
                    checked={roleType === 'CUSTOM'}
                    disabled={isEditMode || isReadOnly}
                    onChange={() => setRoleType('CUSTOM')}
                    className="mt-0.5 text-[#0F172A] focus:ring-[#0F172A]"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC]">
                        CUSTOM Role (Tenant-Scoped)
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-transparent dark:border-purple-500/30">
                        Private
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5">
                      Custom role created and managed exclusively for a specific
                      organization.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Organization Selector (Visible for CUSTOM, hidden for SYSTEM) */}
            {roleType === 'CUSTOM' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1]">
                    Organization Scope <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500 dark:text-[#64748B] font-mono">
                    Defaults: SuperAdmin &amp; Admin
                  </span>
                </div>
                <SearchableSelect
                  value={organizationId}
                  onChange={(val) => setOrganizationId(val)}
                  disabled={isEditMode || isReadOnly}
                  searchPlaceholder="Search organizations by name or code..."
                  options={orgSelectOptions}
                />
                <p className="text-[11px] text-[#6B7280] dark:text-[#64748B] mt-1">
                  Select the owning organization boundary. The role code will be
                  unique within this organization.
                </p>
              </div>
            )}
          </div>

          {/* Row 3: Description */}
          <div className="pt-2 border-t border-slate-100 dark:border-white/10">
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isReadOnly}
              maxLength={500}
              rows={3}
              placeholder="Describe the operational responsibilities, permission boundaries, and access levels for this role..."
              className="w-full p-3 text-xs rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-[#121620] text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 dark:focus:border-white/20 transition-colors disabled:bg-slate-50 dark:disabled:bg-white/[0.02] disabled:text-slate-500 dark:disabled:text-[#64748B]"
            />
          </div>

          {/* Row 4: Behavior & Security Guardrails */}
          <div className="pt-2 border-t border-slate-100 dark:border-white/10">
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mb-2">
              Behavior &amp; Security Guardrails
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* is_default */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#141924] flex items-start gap-3">
                <input
                  type="checkbox"
                  id="rf-is-default"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  disabled={isReadOnly}
                  className="mt-1 w-4 h-4 text-[#0F172A] rounded border-slate-300 focus:ring-[#0F172A]"
                />
                <div>
                  <label
                    htmlFor="rf-is-default"
                    className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] cursor-pointer"
                  >
                    Auto-Assign to New Invites (is_default)
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5">
                    Automatically grant this role to newly created or invited
                    users within the organization.
                  </p>
                </div>
              </div>

              {/* is_mutable */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#141924] flex items-start gap-3">
                <input
                  type="checkbox"
                  id="rf-is-mutable"
                  checked={isMutable}
                  onChange={(e) => setIsMutable(e.target.checked)}
                  disabled={isEditMode || isReadOnly}
                  className="mt-1 w-4 h-4 text-[#0F172A] rounded border-slate-300 focus:ring-[#0F172A]"
                />
                <div>
                  <label
                    htmlFor="rf-is-mutable"
                    className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] cursor-pointer"
                  >
                    Mutable Role Definition (is_mutable)
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5">
                    Allow future modifications or deletion. Uncheck to lock this
                    role permanently against administrative tampering.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        {/* BOTTOM ACTION BAR: Right-aligned Cancel, Reset, Save */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB] dark:border-white/10">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={handleBack}
            disabled={isSubmitting}
          >
            {isReadOnly ? 'Back' : 'Cancel'}
          </Button>

          {!isReadOnly && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={handleReset}
                disabled={isSubmitting}
              >
                Reset
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSubmitting}
                isLoading={isSubmitting}
                leftIcon={<Check className="w-4 h-4" />}
              >
                {isEditMode ? 'Update' : 'Save'}
              </Button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default RoleFormPage;
