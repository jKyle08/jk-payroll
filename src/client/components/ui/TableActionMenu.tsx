// ==============================================================================
// JK-PAYROLL: TABLE ACTION MENU COMPONENT
// Design System: Balanced Glossy Graphite
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
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const visibleActions = actions.filter((action) => !action.hidden);

  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightedIndex((prev) => {
          const len = visibleActions.length;
          if (len === 0) return -1;
          let next = prev;
          for (let i = 0; i < len; i++) {
            next = (next + 1) % len;
            if (!visibleActions[next].disabled) return next;
          }
          return prev;
        });
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightedIndex((prev) => {
          const len = visibleActions.length;
          if (len === 0) return -1;
          let next = prev <= 0 ? len - 1 : prev - 1;
          for (let i = 0; i < len; i++) {
            if (!visibleActions[next].disabled) return next;
            next = next <= 0 ? len - 1 : next - 1;
          }
          return prev;
        });
      } else if (event.key === 'Home') {
        event.preventDefault();
        const firstEnabled = visibleActions.findIndex((a) => !a.disabled);
        if (firstEnabled >= 0) setHighlightedIndex(firstEnabled);
      } else if (event.key === 'End') {
        event.preventDefault();
        for (let i = visibleActions.length - 1; i >= 0; i--) {
          if (!visibleActions[i].disabled) {
            setHighlightedIndex(i);
            break;
          }
        }
      } else if (event.key === 'Enter' || event.key === ' ') {
        if (
          highlightedIndex >= 0 &&
          highlightedIndex < visibleActions.length &&
          !visibleActions[highlightedIndex].disabled
        ) {
          event.preventDefault();
          setIsOpen(false);
          visibleActions[highlightedIndex].onClick();
          triggerRef.current?.focus();
        }
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
  }, [isOpen, highlightedIndex, visibleActions]);

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
        ref={triggerRef}
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
        className="h-7 w-7 rounded-lg border border-transparent hover:border-[#E5E7EB] dark:hover:border-white/10 hover:bg-[#F8FAFC] dark:hover:bg-white/[0.06] text-[#475569] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] inline-flex items-center justify-center transition-colors cursor-pointer"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={`absolute ${
            align === 'left' ? 'left-0' : 'right-0'
          } z-40 mt-1 min-w-[160px] bg-white dark:bg-[#181D2A] rounded-xl shadow-xl dark:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.15)] border border-[#E5E7EB] dark:border-white/12 py-1 text-xs text-[#111827] dark:text-[#F8FAFC] divide-y divide-[#E5E7EB] dark:divide-white/10 focus:outline-none`}
        >
          <div className="py-0.5">
            {visibleActions.map((action, idx) => {
              const isDanger = action.variant === 'danger';
              const isPrimary = action.variant === 'primary';
              const isHighlighted = idx === highlightedIndex;

              let textColorClass =
                'text-[#111827] dark:text-[#F8FAFC] hover:bg-[#F8FAFC] dark:hover:bg-white/[0.06]';
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
                    <div className="my-1 border-t border-[#E5E7EB] dark:border-white/10" />
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={action.disabled}
                    aria-disabled={action.disabled}
                    data-testid={action.testId}
                    title={action.title || action.label}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                      action.onClick();
                    }}
                    className={`w-full text-left px-3.5 py-1.5 flex items-center gap-2 font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${textColorClass} ${
                      isHighlighted ? 'bg-slate-100 dark:bg-white/[0.08]' : ''
                    }`}
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
