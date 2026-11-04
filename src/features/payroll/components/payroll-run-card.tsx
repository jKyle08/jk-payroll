// ==============================================================================
// JK-PAYROLL: PAYROLL RUN CARD COMPONENT
// File: src/features/payroll/components/payroll-run-card.tsx
// ==============================================================================

import React from 'react';
import { PayrollComputation } from '../types.js';

export interface PayrollRunCardProps {
  computation: PayrollComputation;
  onApprove?: (id: string) => void;
}

export const PayrollRunCard: React.FC<PayrollRunCardProps> = ({ computation, onApprove }) => {
  return (
    <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#111827]">
          Batch #{computation.id}
        </span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          {computation.status || 'Computed'}
        </span>
      </div>
      <div className="flex items-baseline justify-between pt-1">
        <span className="text-sm font-bold text-[#111827] tabular-nums">
          ₱{(computation.netPay || 0).toLocaleString()}
        </span>
        <span className="text-xs text-[#6B7280]">
          {computation.employeeName || 'Active Payroll'}
        </span>
      </div>
      {onApprove && (
        <button
          type="button"
          onClick={() => onApprove(computation.id)}
          className="w-full mt-2 h-8 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold transition-colors"
        >
          Approve Batch
        </button>
      )}
    </div>
  );
};

export default PayrollRunCard;
