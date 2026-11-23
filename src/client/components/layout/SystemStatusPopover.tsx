// ==============================================================================
// JK-PAYROLL: SYSTEM OPERATIONAL STATUS & HEALTH POPOVER
// File: src/client/components/layout/SystemStatusPopover.tsx
// ==============================================================================

import React, { useRef, useEffect } from 'react';
import { Activity, CheckCircle2, Server, Database, ShieldCheck, Cpu } from 'lucide-react';

export interface SystemStatusPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  version?: string;
  statusText?: string;
  isOperational?: boolean;
  triggerRef?: React.RefObject<HTMLElement | null>;
  id?: string;
}

export const SystemStatusPopover: React.FC<SystemStatusPopoverProps> = ({
  isOpen,
  onClose,
  version = 'v2.4.0',
  statusText = 'All Systems Operational',
  isOperational = true,
  triggerRef,
  id = 'topbar-system-status-popover',
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      // Do nothing if clicking inside the popover itself
      if (popoverRef.current && popoverRef.current.contains(target)) {
        return;
      }
      // Do nothing if clicking the trigger button (the trigger's own onClick toggles it)
      if (triggerRef?.current && triggerRef.current.contains(target)) {
        return;
      }
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      id={id}
      className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl bg-white dark:bg-[#181D2A] border border-slate-200 dark:border-white/12 shadow-xl dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.75)] overflow-hidden z-40 animate-in fade-in zoom-in-95 duration-150 select-none text-xs before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent"
      role="dialog"
      aria-label="System Health and Status"
    >
      {/* Header */}
      <div className="p-3 bg-slate-50/80 dark:bg-[#141924] border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isOperational ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span className="font-semibold text-slate-800 dark:text-[#F8FAFC]">
            {statusText}
          </span>
        </div>
        <span className="font-mono text-[10px] text-slate-500 dark:text-[#94A3B8] bg-slate-200/60 dark:bg-[#202637] px-1.5 py-0.5 rounded border border-slate-300 dark:border-white/10">
          {version}
        </span>
      </div>

      {/* Subsystem Metrics */}
      <div className="p-3 space-y-2.5">
        <div className="flex items-center justify-between text-slate-600 dark:text-[#CBD5E1]">
          <div className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-slate-400 dark:text-[#64748B]" />
            <span>API Gateway</span>
          </div>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Operational
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-600 dark:text-[#CBD5E1]">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-slate-400 dark:text-[#64748B]" />
            <span>PostgreSQL & RLS</span>
          </div>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Connected
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-600 dark:text-[#CBD5E1]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400 dark:text-[#64748B]" />
            <span>Cascading RBAC</span>
          </div>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Active
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-600 dark:text-[#CBD5E1]">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-slate-400 dark:text-[#64748B]" />
            <span>Payroll Computation</span>
          </div>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Ready
          </span>
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-3 py-2 bg-slate-50 dark:bg-[#141924] border-t border-slate-100 dark:border-white/10 text-[10px] text-slate-400 dark:text-[#64748B] flex items-center justify-between">
        <span>Uptime: 99.98%</span>
        <span>Strict Multi-Tenant</span>
      </div>
    </div>
  );
};

export default SystemStatusPopover;
