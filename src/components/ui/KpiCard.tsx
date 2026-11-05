// ==============================================================================
// JK-PAYROLL: KPI CARD
// Design System: "Midnight & Champagne Steel"
// File: src/components/ui/KpiCard.tsx
// ==============================================================================

import React from 'react';

export type KpiTone = 'slate' | 'emerald' | 'amber' | 'purple' | 'rose' | 'blue';

const TONES: Record<KpiTone, { icon: string; badge: string }> = {
  slate: {
    icon: 'bg-[#F8FAFC] dark:bg-slate-800 border-[#E5E7EB] dark:border-slate-700 text-[#0F172A] dark:text-slate-200',
    badge: 'text-[#6B7280] dark:text-slate-400',
  },
  emerald: {
    icon: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-100 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400',
    badge: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 font-semibold',
  },
  amber: {
    icon: 'bg-amber-50 dark:bg-amber-950/60 border-amber-100 dark:border-amber-800/60 text-amber-600 dark:text-amber-400',
    badge: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 font-medium',
  },
  purple: {
    icon: 'bg-purple-50 dark:bg-purple-950/60 border-purple-100 dark:border-purple-800/60 text-purple-600 dark:text-purple-400',
    badge: 'text-[#6B7280] dark:text-slate-400',
  },
  rose: {
    icon: 'bg-rose-50 dark:bg-rose-950/60 border-rose-100 dark:border-rose-800/60 text-rose-600 dark:text-rose-400',
    badge: 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 font-medium',
  },
  blue: {
    icon: 'bg-blue-50 dark:bg-blue-950/60 border-blue-100 dark:border-blue-800/60 text-blue-600 dark:text-blue-400',
    badge: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 font-medium',
  },
};

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  /** Small suffix next to the value, e.g. "tenants" or "Live" */
  suffix?: string;
  icon?: React.ReactNode;
  tone?: KpiTone;
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  suffix,
  icon,
  tone = 'slate',
  className = '',
}) => {
  const t = TONES[tone];
  return (
    <div
      className={`bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-xs flex items-center justify-between ${className}`}
    >
      <div>
        <span className="text-xs font-medium text-[#6B7280]">{label}</span>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-[#111827] font-mono tabular-nums">{value}</span>
          {suffix && <span className={`text-[11px] px-1.5 rounded ${t.badge}`}>{suffix}</span>}
        </div>
      </div>
      {icon && (
        <div
          className={`w-10 h-10 rounded-xl border flex items-center justify-center ${t.icon}`}
        >
          {icon}
        </div>
      )}
    </div>
  );
};

export default KpiCard;

