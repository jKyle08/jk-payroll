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
    <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#111827]">
          Batch #{computation.id}
        </span>
        <Badge variant="neutral" size="sm">
          {computation.status || 'Computed'}
        </Badge>
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
