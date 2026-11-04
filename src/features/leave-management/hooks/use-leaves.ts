// ==============================================================================
// JK-PAYROLL: CLIENT USE-LEAVES HOOK
// File: src/features/leave-management/hooks/use-leaves.ts
// ==============================================================================

import { useState, useCallback } from 'react';
import { LeaveRequest, TypeOfLeave } from '../types.js';

export function useLeaves() {
  const [leaveTypes, setLeaveTypes] = useState<TypeOfLeave[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const addRequest = useCallback((req: LeaveRequest) => {
    setRequests((prev) => [req, ...prev]);
  }, []);

  return {
    leaveTypes,
    setLeaveTypes,
    requests,
    setRequests,
    addRequest,
    isLoading,
    setIsLoading,
  };
}

export default useLeaves;
