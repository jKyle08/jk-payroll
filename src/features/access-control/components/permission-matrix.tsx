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
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {title}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {subtitle}
                </p>
              </div>
            </div>

            {/* Custom Override Indicator Badge */}
            {isCustomUserOverride && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Custom Direct User Override Active (Supercedes Role Template)</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {isCustomUserOverride && onResetToRoleDefault && (
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/80 transition-colors inline-flex items-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset to Role Defaults</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm inline-flex items-center space-x-2 transition-all duration-150 ${
                isDirty
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 cursor-pointer'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Matrix'}</span>
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {saveSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCheck className="w-4 h-4 text-emerald-500" />
            <span>Permissions saved successfully! Changes apply immediately.</span>
          </div>
        )}

        {isDirty && !saveSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>You have unsaved changes in the permission matrix.</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set(initialIds))}
              className="font-semibold underline hover:text-amber-900 dark:hover:text-amber-200"
            >
              Discard Changes
            </button>
          </div>
        )}

        {/* 2. Search & Filter Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search module code or name..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1">
            <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  categoryFilter === cat
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. The Permission Matrix Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 min-w-[220px]">Module Information</th>
                <th className="py-3.5 px-3 min-w-[100px]">Category</th>
                {ACTION_COLUMNS.map((col) => (
                  <th key={col.type} className="py-3.5 px-3 text-center min-w-[110px]">
                    <div className="inline-flex flex-col items-center">
                      <span>{col.label}</span>
                      <span className="text-[9px] font-normal lowercase tracking-normal text-slate-400">
                        {col.description}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="py-3.5 px-4 text-right min-w-[130px]">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {filteredModules.length === 0 ? (
                <tr>
                  <td colSpan={ACTION_COLUMNS.length + 3} className="py-12 text-center text-slate-400">
                    <Layers className="w-10 h-10 mx-auto mb-2 opacity-50 stroke-[1.5]" />
                    <p className="font-medium text-slate-600 dark:text-slate-300">No modules match your filter</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting the search bar or category pills</p>
                  </td>
                </tr>
              ) : (
                filteredModules.map((mod) => {
                  const isMutatingActive = hasMutatingActionActive(mod);

                  return (
                    <tr
                      key={mod.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Module Info */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {mod.name}
                          </span>
                          <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                            {mod.code}
                          </span>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-4 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {mod.category}
                        </span>
                      </td>

                      {/* Action Checkbox Columns */}
                      {ACTION_COLUMNS.map((col) => {
                        const actionItem = mod.actions?.find((a) => a.action === col.type);

                        if (!actionItem) {
                          return (
                            <td key={col.type} className="py-4 px-3 text-center">
                              <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
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
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-700/60 cursor-not-allowed'
                                      : 'bg-blue-600 text-white shadow-sm hover:bg-blue-700 cursor-pointer'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer'
                                }`}
                              >
                                {isLocked ? (
                                  <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                ) : isChecked ? (
                                  <Check className="w-4 h-4 stroke-[2.5]" />
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
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

                      {/* Quick Actions (Grant All / Clear All) */}
                      <td className="py-4 px-4 text-right">
                        <div className="inline-flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleGrantAllForModule(mod)}
                            title="Grant all actions for this module"
                            className="px-2 py-1 rounded text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                          >
                            All
                          </button>
                          <span className="text-slate-300 dark:text-slate-700">|</span>
                          <button
                            type="button"
                            onClick={() => handleClearAllForModule(mod)}
                            title="Clear all actions for this module"
                            className="px-2 py-1 rounded text-[11px] font-medium text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          >
                            None
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Stats */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            <span>
              Showing {filteredModules.length} of {modules.length} modules • {selectedIds.size} granted action keys
            </span>
          </div>
          <div className="font-medium text-slate-700 dark:text-slate-300">
            Cascade Rule: Any Mutating Action Automatically Implies Read/View Access
          </div>
        </div>
      </div>

      {/* 4. Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Reset to Role Defaults?
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              This action will completely delete this user's custom permission overrides in the database.
              The user will immediately inherit permissions from their assigned role.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors"
              >
                Yes, Reset Overrides
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionMatrix;
