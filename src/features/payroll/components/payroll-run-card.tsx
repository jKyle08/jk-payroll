// ==============================================================================
// JK-PAYROLL: PAYROLL RUN CARD COMPONENT
// File: src/features/payroll/components/payroll-run-card.tsx
// ==============================================================================

import React from 'react';
import { PayrollComputation } from '../types.js';
import { Button, Badge } from '../../../client/components/ui/index.js';

export interface PayrollRunCardProps {
  computation: PayrollComputation;
  onApprove?: (id: string) => void;
}

export const PayrollRunCard: React.FC<PayrollRunCardProps> = ({ computation, onApprove }) => {
  return (
    <div className="p-4 rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-[#181D2A] dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)] space-y-2 relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#111827] dark:text-[#F8FAFC]">
          Batch #{computation.id}
        </span>
        <Badge variant="neutral" size="sm">
          {computation.status || 'Computed'}
        </Badge>
      </div>
      <div className="flex items-baseline justify-between pt-1">
        <span className="text-sm font-bold text-[#111827] dark:text-[#F8FAFC] font-mono tabular-nums">
          ₱{(computation.netPay || 0).toLocaleString()}
        </span>
        <span className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
          {computation.employeeName || 'Active Payroll'}
        </span>
      </div>
      {onApprove && (
        <div className="pt-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            fullWidth
            onClick={() => onApprove(computation.id)}
          >
            Approve Batch
          </Button>
        </div>
      )}
    </div>
  );
};

export default PayrollRunCard;
