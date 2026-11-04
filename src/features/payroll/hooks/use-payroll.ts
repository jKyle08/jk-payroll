// ==============================================================================
// JK-PAYROLL: CLIENT USE-PAYROLL HOOK
// File: src/features/payroll/hooks/use-payroll.ts
// ==============================================================================

import { useState } from 'react';
import { PayrollComputation } from '../types.js';

export function usePayroll() {
  const [computations, setComputations] = useState<PayrollComputation[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  return {
    computations,
    setComputations,
    isProcessing,
    setIsProcessing,
  };
}

export default usePayroll;
