// ==============================================================================
// JK-PAYROLL: DEPARTMENT TREE VISUAL COMPONENT
// File: src/features/departments/components/department-tree.tsx
// ==============================================================================

import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Building2,
  FolderTree,
  Plus,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { DepartmentNode } from '../types.js';

export interface DepartmentTreeProps {
  nodes: DepartmentNode[];
  selectedDepartmentId?: string | null;
  onSelectDepartment?: (dept: DepartmentNode) => void;
  onAddSubDepartment?: (parentDept: DepartmentNode) => void;
}

interface TreeNodeItemProps {
  node: DepartmentNode;
  depth?: number;
  selectedId?: string | null;
  onSelect?: (dept: DepartmentNode) => void;
  onAddSub?: (parentDept: DepartmentNode) => void;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  depth = 0,
  selectedId,
  onSelect,
  onAddSub,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div className="flex flex-col select-none">
      <div
        className={`flex items-center justify-between py-2 px-3 rounded-xl transition-all group ${
          isSelected
            ? 'bg-blue-600 text-white shadow-sm'
            : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
        }`}
        style={{ paddingLeft: `${Math.max(12, depth * 24 + 12)}px` }}
      >
        {/* Left: Expander & Info */}
        <div
          className="flex items-center space-x-2.5 flex-1 min-w-0 cursor-pointer"
          onClick={() => onSelect?.(node)}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen((prev) => !prev);
              }}
              className={`p-1 rounded-md transition-colors ${
                isSelected
                  ? 'hover:bg-blue-700 text-white'
                  : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400'
              }`}
            >
              {isOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <span className="w-6" />
          )}

          <div
            className={`p-1.5 rounded-lg ${
              isSelected
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}
          >
            <Building2 className="w-4 h-4" />
          </div>

          <div className="flex flex-col truncate">
            <span className="font-semibold text-xs sm:text-sm truncate leading-tight">
              {node.name}
            </span>
            <span
              className={`font-mono text-[10px] ${
                isSelected ? 'text-blue-100' : 'text-slate-400'
              }`}
            >
              [{node.code}]
            </span>
          </div>
        </div>

        {/* Right: Meta & Actions */}
        <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
          {hasChildren && (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                isSelected
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {node.children.length} sub
            </span>
          )}

          {onAddSub && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddSub(node);
              }}
              title={`Add child department under ${node.name}`}
              className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${
                isSelected
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Children branches */}
      {hasChildren && isOpen && (
        <div className="flex flex-col border-l border-slate-200 dark:border-slate-800 ml-6 pl-2 space-y-0.5 my-0.5">
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onAddSub={onAddSub}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const DepartmentTree: React.FC<DepartmentTreeProps> = ({
  nodes,
  selectedDepartmentId,
  onSelectDepartment,
  onAddSubDepartment,
}) => {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
        <FolderTree className="w-10 h-10 mx-auto mb-2 opacity-50 stroke-[1.5]" />
        <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">
          No departments found
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Create a root department to begin building the organizational tree
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-200">
          <FolderTree className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Organizational Tree Hierarchy
          </h3>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">
          Recursive Cascading Scopes
        </span>
      </div>

      <div className="space-y-1">
        {nodes.map((rootNode) => (
          <TreeNodeItem
            key={rootNode.id}
            node={rootNode}
            selectedId={selectedDepartmentId}
            onSelect={onSelectDepartment}
            onAddSub={onAddSubDepartment}
          />
        ))}
      </div>
    </div>
  );
};

export default DepartmentTree;
