// ==============================================================================
// JK-PAYROLL: VISUAL PERMISSION MATRIX COMPONENT
// File: src/features/access-control/components/permission-matrix.tsx
// ==============================================================================

import React, { useState, useMemo } from 'react';
import {
  Shield,
  ShieldAlert,
  Lock,
  Check,
  RotateCcw,
  Save,
  Search,
  Filter,
  CheckCheck,
  X,
  AlertTriangle,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ModuleData, ModuleActionItem, ActionType } from '../types.js';
import { Button, Badge, TableActionMenu, Input, Alert } from '../../../client/components/ui/index.js';

export interface PermissionMatrixProps {
  title: string;
  subtitle: string;
  modules: ModuleData[];
  initialGrantedActionIds: string[];
  isCustomUserOverride?: boolean;
  onSave: (grantedActionIds: string[]) => void | Promise<void>;
  onResetToRoleDefault?: () => void | Promise<void>;
}

const ACTION_COLUMNS: { type: ActionType; label: string; description: string }[] = [
  { type: 'View', label: 'View', description: 'Read-only visibility for records' },
  { type: 'Add', label: 'Add', description: 'Create new records' },
  { type: 'Edit', label: 'Edit', description: 'Modify existing records' },
  { type: 'Delete', label: 'Delete', description: 'Remove or archive records' },
  { type: 'Approval.Create', label: 'Approve', description: 'Authorize and approve workflows' },
];

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  title,
  subtitle,
  modules,
  initialGrantedActionIds = [],
  isCustomUserOverride = false,
  onSave,
  onResetToRoleDefault,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialGrantedActionIds)
  );
  const [initialIds] = useState<Set<string>>(() => new Set(initialGrantedActionIds));
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Extract unique categories from modules
  const categories = useMemo(() => {
    const set = new Set<string>();
    modules.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return ['All', ...Array.from(set)];
  }, [modules]);

  // Compute if any mutating actions are active for a given module
  const hasMutatingActionActive = (module: ModuleData): boolean => {
    if (!module.actions) return false;
    return module.actions.some(
      (a) => a.action !== 'View' && selectedIds.has(a.id)
    );
  };

  // Determine whether a specific action is checked and whether it is locked
  const getActionState = (
    module: ModuleData,
    actionItem: ModuleActionItem
  ): { isChecked: boolean; isLocked: boolean; lockReason?: string } => {
    const isMutatingActive = hasMutatingActionActive(module);

    if (actionItem.action === 'View') {
      if (isMutatingActive) {
        // Locked ON because of mutating actions (.Add, .Edit, .Delete, .Approval.Create)
        return {
          isChecked: true,
          isLocked: true,
          lockReason: 'Implicitly granted and locked by mutating permissions (Add/Edit/Delete/Approve)',
        };
      }
      return {
        isChecked: selectedIds.has(actionItem.id),
        isLocked: false,
      };
    }

    // Mutating actions are checked if present in selectedIds
    return {
      isChecked: selectedIds.has(actionItem.id),
      isLocked: false,
    };
  };

  // Toggle single action checkbox
  const handleToggleAction = (module: ModuleData, actionItem: ModuleActionItem) => {
    const next = new Set(selectedIds);
    const viewItem = module.actions?.find((a) => a.action === 'View');

    if (actionItem.action === 'View') {
      // If View is locked due to mutating actions, prevent toggle
      if (hasMutatingActionActive(module)) {
        return;
      }
      if (next.has(actionItem.id)) {
        next.delete(actionItem.id);
      } else {
        next.add(actionItem.id);
      }
    } else {
      // Mutating action toggled
      if (next.has(actionItem.id)) {
        next.delete(actionItem.id);
      } else {
        next.add(actionItem.id);
        // Automatically ensure View action ID is included
        if (viewItem) {
          next.add(viewItem.id);
        }
      }
    }

    setSelectedIds(next);
    setSaveSuccess(false);
  };

  // Quick action: Grant all actions for a specific module
  const handleGrantAllForModule = (module: ModuleData) => {
    const next = new Set(selectedIds);
    module.actions?.forEach((action) => {
      next.add(action.id);
    });
    setSelectedIds(next);
    setSaveSuccess(false);
  };

  // Quick action: Clear all actions for a specific module
  const handleClearAllForModule = (module: ModuleData) => {
    const next = new Set(selectedIds);
    module.actions?.forEach((action) => {
      next.delete(action.id);
    });
    setSelectedIds(next);
    setSaveSuccess(false);
  };

  // Calculate dirty state
  const isDirty = useMemo(() => {
    if (selectedIds.size !== initialIds.size) return true;
    for (const id of selectedIds) {
      if (!initialIds.has(id)) return true;
    }
    return false;
  }, [selectedIds, initialIds]);

  // Handle Save
  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      // Normalize effective permissions: ensure any module with active mutating actions includes View ID
      const effectiveIds = new Set(selectedIds);
      modules.forEach((mod) => {
        if (hasMutatingActionActive(mod)) {
          const viewItem = mod.actions?.find((a) => a.action === 'View');
          if (viewItem) effectiveIds.add(viewItem.id);
        }
      });

      await onSave(Array.from(effectiveIds));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Reset to Role Default
  const handleConfirmReset = async () => {
    setShowResetModal(false);
    if (onResetToRoleDefault) {
      setIsSaving(true);
      try {
        await onResetToRoleDefault();
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Filter modules
  const filteredModules = useMemo(() => {
    return modules.filter((mod) => {
      const matchesSearch =
        mod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mod.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === 'All' || mod.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [modules, searchQuery, categoryFilter]);

  // Total active count
  const totalActionsCount = useMemo(() => {
    return modules.reduce((sum, m) => sum + (m.actions?.length || 0), 0);
  }, [modules]);

  return (
    <div className="space-y-6">
      {/* 1. Header Card */}
      <div className="bg-white dark:bg-[#181D2A] rounded-2xl p-6 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)] relative before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#121620] border border-transparent dark:border-white/10 text-slate-800 dark:text-[#CBD5E1]">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
                  {title}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-0.5">
                  {subtitle}
                </p>
              </div>
            </div>

            {/* Custom Override Indicator Badge */}
            {isCustomUserOverride && (
              <div className="mt-3">
                <Badge variant="warning" size="md">
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
                  <span>Custom Direct User Override Active (Supercedes Role Template)</span>
                </Badge>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {isCustomUserOverride && onResetToRoleDefault && (
              <Button
                type="button"
                variant="destructive"
                size="md"
                onClick={() => setShowResetModal(true)}
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                <span>Reset to Role Defaults</span>
              </Button>
            )}

            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              isLoading={isSaving}
            >
              <Save className="w-4 h-4 mr-1.5" />
              <span>{isSaving ? 'Saving...' : 'Save Matrix'}</span>
            </Button>
          </div>
        </div>

        {/* Status Alerts */}
        {saveSuccess && (
          <Alert variant="success" className="mt-4" icon={<CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}>
            <span>Permissions saved successfully! Changes apply immediately.</span>
          </Alert>
        )}

        {isDirty && !saveSuccess && (
          <Alert
            variant="warning"
            className="mt-4 flex items-center justify-between"
            icon={<AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
          >
            <div className="flex items-center justify-between w-full">
              <span>You have unsaved changes in the permission matrix.</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set(initialIds))}
                className="font-semibold underline hover:text-amber-900 dark:hover:text-amber-200"
              >
                Discard Changes
              </Button>
            </div>
          </Alert>
        )}

        {/* 2. Search & Filter Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:w-80">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search module code or name..."
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1">
            <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-[#64748B] flex-shrink-0" />
            {categories.map((cat) => (
              <Button
                key={cat}
                type="button"
                size="sm"
                variant={categoryFilter === cat ? 'primary' : 'secondary'}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. The Permission Matrix Table */}
      <div className="bg-white dark:bg-[#121620] rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-[#141924] border-b border-slate-200 dark:border-white/10 text-[11px] font-semibold text-slate-500 dark:text-[#64748B] uppercase tracking-wider">
                <th className="py-3.5 px-4 min-w-[220px]">Module Information</th>
                <th className="py-3.5 px-3 min-w-[100px]">Category</th>
                {ACTION_COLUMNS.map((col) => (
                  <th key={col.type} className="py-3.5 px-3 text-center min-w-[110px]">
                    <div className="inline-flex flex-col items-center">
                      <span className="dark:text-[#CBD5E1]">{col.label}</span>
                      <span className="text-[9px] font-normal lowercase tracking-normal text-slate-400 dark:text-[#64748B]">
                        {col.description}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="py-3.5 px-4 text-right min-w-[130px]">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10 text-sm">
              {filteredModules.length === 0 ? (
                <tr>
                  <td colSpan={ACTION_COLUMNS.length + 3} className="py-12 text-center text-slate-400 dark:text-[#64748B]">
                    <Layers className="w-10 h-10 mx-auto mb-2 opacity-50 stroke-[1.5]" />
                    <p className="font-medium text-slate-600 dark:text-[#CBD5E1]">No modules match your filter</p>
                    <p className="text-xs text-slate-400 dark:text-[#64748B] mt-1">Try resetting the search bar or category pills</p>
                  </td>
                </tr>
              ) : (
                filteredModules.map((mod) => {
                  const isMutatingActive = hasMutatingActionActive(mod);

                  return (
                    <tr
                      key={mod.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-white/[0.03] transition-colors"
                    >
                      {/* Module Info */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 dark:text-[#F8FAFC]">
                            {mod.name}
                          </span>
                          <span className="font-mono text-[11px] text-slate-600 dark:text-[#CBD5E1]">
                            {mod.code}
                          </span>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-4 px-3">
                        <Badge variant="neutral" size="sm">
                          {mod.category}
                        </Badge>
                      </td>

                      {/* Action Checkbox Columns */}
                      {ACTION_COLUMNS.map((col) => {
                        const actionItem = mod.actions?.find((a) => a.action === col.type);

                        if (!actionItem) {
                          return (
                            <td key={col.type} className="py-4 px-3 text-center">
                              <span className="text-slate-300 dark:text-white/10 text-xs">—</span>
                            </td>
                          );
                        }

                        const { isChecked, isLocked, lockReason } = getActionState(
                          mod,
                          actionItem
                        );

                        return (
                          <td key={col.type} className="py-4 px-3 text-center">
                            <div className="inline-flex flex-col items-center group relative">
                              <button
                                type="button"
                                disabled={isLocked}
                                onClick={() => handleToggleAction(mod, actionItem)}
                                aria-label={`${col.label} for ${mod.name}`}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                  isChecked
                                    ? isLocked
                                      ? 'bg-slate-200 text-slate-700 dark:bg-[#202637] dark:text-[#94A3B8] border border-slate-300 dark:border-white/10 cursor-not-allowed'
                                      : 'bg-[#0F172A] text-white dark:bg-[#CBD5E1] dark:text-[#0F172A] shadow-sm hover:opacity-90 cursor-pointer'
                                    : 'bg-slate-100 dark:bg-[#141924] dark:border dark:border-white/5 text-slate-400 hover:bg-slate-200 dark:hover:bg-[#202637] cursor-pointer'
                                }`}
                              >
                                {isLocked ? (
                                  <Lock className="w-4 h-4 text-slate-600 dark:text-[#94A3B8]" />
                                ) : isChecked ? (
                                  <Check className="w-4 h-4 stroke-[2.5]" />
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-[#202637]" />
                                )}
                              </button>

                              {/* Tooltip for Locked View */}
                              {isLocked && (
                                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                                  <div className="bg-slate-900 text-white text-[11px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-xl max-w-xs text-center">
                                    <div className="flex items-center gap-1 font-semibold text-blue-300 mb-0.5">
                                      <Lock className="w-3 h-3" />
                                      <span>Locked (Implicit View)</span>
                                    </div>
                                    <p className="text-[10px] text-slate-300">{lockReason}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Quick Actions (3-Dots Menu) */}
                      <td className="py-4 px-4 text-right">
                        <TableActionMenu
                          actions={[
                            {
                              label: 'Grant All Actions',
                              icon: <CheckCheck className="w-3.5 h-3.5 text-indigo-600" />,
                              onClick: () => handleGrantAllForModule(mod),
                            },
                            {
                              label: 'Clear All Actions',
                              icon: <X className="w-3.5 h-3.5" />,
                              variant: 'danger',
                              divider: true,
                              onClick: () => handleClearAllForModule(mod),
                            },
                          ]}
                          title="Module Actions"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Stats */}
        <div className="p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-[#141924] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-[#94A3B8] gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            <span>
              Showing {filteredModules.length} of {modules.length} modules • {selectedIds.size} granted action keys
            </span>
          </div>
          <div className="font-medium text-slate-700 dark:text-[#CBD5E1]">
            Cascade Rule: Any Mutating Action Automatically Implies Read/View Access
          </div>
        </div>
      </div>

      {/* 4. Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#181D2A] rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-white/12 shadow-2xl dark:shadow-[0_24px_50px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.15)] space-y-4">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-[#F8FAFC]">
                Reset to Role Defaults?
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8]">
              This action will completely delete this user's custom permission overrides in the database.
              The user will immediately inherit permissions from their assigned role.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowResetModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleConfirmReset}
              >
                Yes, Reset Overrides
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionMatrix;
