// ==============================================================================
// JK-PAYROLL: STANDARDIZED KPI CARD
// Design System: Balanced Glossy Graphite
// File: src/client/components/ui/KpiCard.tsx
// ==============================================================================

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export type KpiTone =
  | 'slate'
  | 'emerald'
  | 'amber'
  | 'purple'
  | 'rose'
  | 'blue'
  | 'neutral'
  | 'default';

export interface KpiTrend {
  value: string | number;
  direction?: 'up' | 'down' | 'neutral';
  label?: string;
}

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  /** Small neutral suffix pill next to the value (e.g. "tenants" or "Live") */
  suffix?: string;
  icon?: React.ReactNode;
  /** Preserved for backward compatibility, styled neutrally per monochromatic design rules */
  tone?: KpiTone;
  description?: string;
  trend?: KpiTrend;
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  suffix,
  icon,
  description,
  trend,
  className = '',
}) => {
  return (
    <div
      className={`relative overflow-hidden bg-white dark:bg-[#181D2A] dark:bg-gradient-to-b dark:from-[#1A202E] dark:to-[#131722] rounded-xl p-4 sm:p-5 border border-[#E5E7EB] dark:border-white/10 shadow-2xs dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.12)] flex flex-col justify-between transition-all duration-200 hover:border-slate-300 dark:hover:border-white/20 before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:pointer-events-none ${className}`}
    >
      {/* 1. Header: Label + Optional Muted Icon */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8] truncate">
          {label}
        </span>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] dark:bg-white/[0.05] border border-[#E5E7EB] dark:border-white/10 text-[#64748B] dark:text-[#94A3B8] flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        )}
      </div>

      {/* 2. Primary Numerical Value + Suffix Pill */}
      <div className="mt-3 flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl sm:text-3xl font-bold text-[#111827] dark:text-[#F8FAFC] font-mono tabular-nums tracking-tight">
          {value}
        </span>
        {suffix && (
          <span className="text-[11px] font-medium font-sans px-2 py-0.5 rounded-md bg-[#F1F5F9] dark:bg-[#202637] text-[#475569] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-white/10">
            {suffix}
          </span>
        )}
      </div>

      {/* 3. Supporting Description or Trend (semantic colors used sparingly) */}
      {(description || trend) && (
        <div className="mt-2.5 pt-2 border-t border-[#F1F5F9] dark:border-white/10 flex items-center justify-between gap-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
          {description && <span className="truncate">{description}</span>}

          {trend && (
            <div className="inline-flex items-center gap-1 font-medium font-sans ml-auto">
              {trend.direction === 'up' && (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              )}
              {trend.direction === 'down' && (
                <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              )}
              {trend.direction === 'neutral' && (
                <Minus className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span
                className={
                  trend.direction === 'up'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : trend.direction === 'down'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-500 dark:text-[#94A3B8]'
                }
              >
                {trend.value}
              </span>
              {trend.label && (
                <span className="text-[#94A3B8] dark:text-[#64748B] font-normal">
                  {trend.label}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KpiCard;
