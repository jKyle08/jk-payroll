// ==============================================================================
// PAYPULSE ENTERPRISE NOTIFICATION INFRASTRUCTURE: TYPE DEFINITIONS
// Design System: Luxury Translucent Graphite Glassmorphism with Queue Management
// File: src/client/components/ui/toast/toast-types.ts
// ==============================================================================

import React from 'react';
import { MessageCatalogKey } from './toast-catalog.js';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center';

export interface ToastAction {
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>, toast: ToastItem) => void;
  altText?: string;
  primary?: boolean;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: React.ReactNode;
  description?: React.ReactNode;
  duration: number; // in milliseconds; 0 or Infinity for persistent
  createdAt: number;
  catalogKey?: MessageCatalogKey;
  action?: ToastAction;
  cancel?: {
    label: string;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>, toast: ToastItem) => void;
  };
  icon?: React.ReactNode;
  dedupeKey?: string;
  isExiting?: boolean;
  isPaused?: boolean;
  remainingTime?: number;
  pausedAt?: number;
  onDismiss?: (toast: ToastItem) => void;
  onAutoClose?: (toast: ToastItem) => void;
}

export interface ToastOptions {
  title?: React.ReactNode;
  description?: React.ReactNode;
  duration?: number;
  id?: string;
  params?: Record<string, any>;
  action?: ToastAction;
  cancel?: {
    label: string;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>, toast: ToastItem) => void;
  };
  icon?: React.ReactNode;
  dedupeKey?: string;
  dedupe?: boolean;
  onDismiss?: (toast: ToastItem) => void;
  onAutoClose?: (toast: ToastItem) => void;
}

/**
 * Flexible input type: supports catalog keys, plain strings, React elements,
 * or options objects with dynamic interpolation parameters.
 */
export type ToastInput =
  | MessageCatalogKey
  | string
  | React.ReactNode
  | (ToastOptions & {
      message?: React.ReactNode;
      title?: React.ReactNode;
      key?: MessageCatalogKey;
    });

export interface ToastPromiseMessages<T = any> {
  loading: MessageCatalogKey | React.ReactNode | ToastOptions;
  success:
    | MessageCatalogKey
    | React.ReactNode
    | ((data: T) => MessageCatalogKey | React.ReactNode | ToastOptions);
  error:
    | MessageCatalogKey
    | React.ReactNode
    | ((error: any) => MessageCatalogKey | React.ReactNode | ToastOptions);
}

export interface BulkSummaryOptions {
  action: string; // e.g. "assign", "delete", "process", "update", "import"
  entity: string; // e.g. "team member", "role", "department", "payroll record"
  total: number;
  successCount: number;
  failureCount?: number;
  errors?: string[];
  options?: ToastOptions;
}

export interface ToastQueueState {
  visible: ToastItem[];
  queued: ToastItem[];
  queueCount: number;
}
