// ==============================================================================
// JK-PAYROLL: TABLE ACTION MENU COMPONENT
// Standardized 3-dots dropdown menu for table action columns across the app.
// File: src/client/components/ui/TableActionMenu.tsx
// ==============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

export interface TableActionItem {
  key?: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'primary';
  disabled?: boolean;
  hidden?: boolean;
  divider?: boolean;
  title?: string;
  testId?: string;
}

export interface TableActionMenuProps {
  actions: TableActionItem[];
  title?: string;
  align?: 'right' | 'left';
  className?: string;
  triggerTestId?: string;
}

export const TableActionMenu: React.FC<TableActionMenuProps> = ({
  actions,
  title = 'Actions',
  align = 'right',
  className = '',
  triggerTestId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const visibleActions = actions.filter((action) => !action.hidden);

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <div
      className={`relative inline-block text-left ${className}`}
      ref={menuRef}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        title={title}
        aria-label={title}
        aria-haspopup="true"
        aria-expanded={isOpen}
        data-testid={triggerTestId}
        className="h-7 w-7 rounded-lg border border-transparent hover:border-[#E5E7EB] dark:hover:border-slate-700 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 text-[#475569] dark:text-slate-300 inline-flex items-center justify-center transition-colors cursor-pointer"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={`absolute ${
            align === 'left' ? 'left-0' : 'right-0'
          } z-50 mt-1 min-w-[160px] bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-[#E5E7EB] dark:border-slate-700 py-1 text-xs text-[#111827] dark:text-white divide-y divide-[#E5E7EB] dark:divide-slate-800 focus:outline-none`}
        >
          <div className="py-0.5">
            {visibleActions.map((action, idx) => {
              const isDanger = action.variant === 'danger';
              const isPrimary = action.variant === 'primary';

              let textColorClass =
                'text-[#111827] dark:text-white hover:bg-[#F8FAFC] dark:hover:bg-slate-800';
              if (isDanger) {
                textColorClass =
                  'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40';
              } else if (isPrimary) {
                textColorClass =
                  'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40';
              }

              return (
                <React.Fragment key={action.key || `${action.label}-${idx}`}>
                  {action.divider && idx > 0 && (
                    <div className="my-1 border-t border-[#E5E7EB] dark:border-slate-800" />
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={action.disabled}
                    data-testid={action.testId}
                    title={action.title || action.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                      action.onClick();
                    }}
                    className={`w-full text-left px-3.5 py-1.5 flex items-center gap-2 font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${textColorClass}`}
                  >
                    {action.icon && (
                      <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
                        {action.icon}
                      </span>
                    )}
                    <span className="truncate">{action.label}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TableActionMenu;
