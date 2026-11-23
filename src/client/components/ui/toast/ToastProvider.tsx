// ==============================================================================
// PAYPULSE ENTERPRISE NOTIFICATION INFRASTRUCTURE: PROVIDER & CONTEXT
// Design System: Luxury Translucent Graphite Glassmorphism
// File: src/client/components/ui/toast/ToastProvider.tsx
// ==============================================================================

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  ToastItem,
  ToastPosition,
  ToastOptions,
  ToastInput,
  ToastPromiseMessages,
  BulkSummaryOptions,
  ToastQueueState,
} from './toast-types.js';
import { toast, toastStore } from './toast-store.js';
import { ToastContainer } from './ToastContainer.js';

export interface ToastContextValue {
  toast: typeof toast;
  toasts: ToastItem[];
  queued: ToastItem[];
  queueCount: number;
  dismiss: (id?: string) => void;
  clearQueue: () => void;
  success: (input: ToastInput, options?: ToastOptions | Record<string, any>) => string;
  error: (input: ToastInput, options?: ToastOptions | Record<string, any>) => string;
  warning: (input: ToastInput, options?: ToastOptions | Record<string, any>) => string;
  info: (input: ToastInput, options?: ToastOptions | Record<string, any>) => string;
  loading: (input: ToastInput, options?: ToastOptions | Record<string, any>) => string;
  promise: <T>(
    promise: Promise<T> | (() => Promise<T>),
    messages: ToastPromiseMessages<T>,
    options?: ToastOptions
  ) => Promise<T>;
  fromError: (
    error: unknown,
    fallbackKeyOrMessage?: string,
    options?: ToastOptions
  ) => string;
  bulkSummary: (options: BulkSummaryOptions) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export interface ToastProviderProps {
  children?: React.ReactNode;
  position?: ToastPosition;
  defaultSpacing?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  position = 'top-right',
  defaultSpacing = 16,
}) => {
  const [queueState, setQueueState] = useState<ToastQueueState>(() =>
    toastStore.getState()
  );

  useEffect(() => {
    return toastStore.subscribe((updated) => {
      setQueueState(updated);
    });
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      toasts: queueState.visible,
      queued: queueState.queued,
      queueCount: queueState.queueCount,
      dismiss: toast.dismiss,
      clearQueue: toast.clearQueue,
      success: toast.success,
      error: toast.error,
      warning: toast.warning,
      info: toast.info,
      loading: toast.loading,
      promise: toast.promise,
      fromError: toast.fromError,
      bulkSummary: toast.bulkSummary,
    }),
    [queueState]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer position={position} defaultSpacing={defaultSpacing} />
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    // Graceful fallback to singleton store if outside provider
    const state = toastStore.getState();
    return {
      toast,
      toasts: state.visible,
      queued: state.queued,
      queueCount: state.queueCount,
      dismiss: toast.dismiss,
      clearQueue: toast.clearQueue,
      success: toast.success,
      error: toast.error,
      warning: toast.warning,
      info: toast.info,
      loading: toast.loading,
      promise: toast.promise,
      fromError: toast.fromError,
      bulkSummary: toast.bulkSummary,
    };
  }
  return context;
}
