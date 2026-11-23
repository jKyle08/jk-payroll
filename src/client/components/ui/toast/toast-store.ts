// ==============================================================================
// PAYPULSE ENTERPRISE NOTIFICATION INFRASTRUCTURE: NOTIFICATION STORE & QUEUE
// Managed Stacking (Max 3 Visible), FIFO Promotion Queue, and Bulk Consolidation
// File: src/client/components/ui/toast/toast-store.ts
// ==============================================================================

import React from 'react';
import {
  ToastItem,
  ToastType,
  ToastOptions,
  ToastInput,
  ToastPromiseMessages,
  BulkSummaryOptions,
  ToastQueueState,
} from './toast-types.js';
import {
  isCatalogKey,
  resolveCatalogMessage,
  MessageCatalogKey,
} from './toast-catalog.js';
import { interpolate } from './toast-interpolate.js';
import { parseApiError, isDuplicateError } from './toast-error-handler.js';

export const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 3500,
  info: 4000,
  warning: 5000,
  error: 5000,
  loading: 0, // 0 = persistent until resolved
};

export const DEFAULT_MAX_VISIBLE = 3;
export const MAX_QUEUE_SIZE = 25;
const EXIT_ANIMATION_DURATION = 200; // ms
const RECENT_DEDUPE_WINDOW = 1500; // ms

type Listener = (state: ToastQueueState) => void;

class ToastStore {
  private visibleToasts: ToastItem[] = [];
  private queuedToasts: ToastItem[] = [];
  private listeners: Set<Listener> = new Set();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private recentToasts: Map<string, number> = new Map();
  private maxVisible = DEFAULT_MAX_VISIBLE;
  private idCounter = 0;

  public setMaxVisible(count: number): void {
    this.maxVisible = Math.max(1, count);
    this.promoteFromQueue();
  }

  public getMaxVisible(): number {
    return this.maxVisible;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): ToastQueueState {
    return {
      visible: [...this.visibleToasts],
      queued: [...this.queuedToasts],
      queueCount: this.queuedToasts.length,
    };
  }

  public getSnapshot(): ToastItem[] {
    return [...this.visibleToasts];
  }

  public getQueue(): ToastItem[] {
    return [...this.queuedToasts];
  }

  public getQueueCount(): number {
    return this.queuedToasts.length;
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  private generateId(): string {
    this.idCounter += 1;
    return `paypulse-toast-${Date.now()}-${this.idCounter}`;
  }

  public normalizeInput(
    type: ToastType,
    input: ToastInput,
    options?: ToastOptions | Record<string, any>
  ): {
    resolvedType: ToastType;
    title?: React.ReactNode;
    description?: React.ReactNode;
    duration: number;
    catalogKey?: MessageCatalogKey;
    opts: ToastOptions;
  } {
    let resolvedType = type;
    let title: React.ReactNode | undefined;
    let description: React.ReactNode | undefined;
    let catalogKey: MessageCatalogKey | undefined;
    let duration = DEFAULT_DURATIONS[type];

    let rawOptions: ToastOptions = {};
    let interpolationParams: Record<string, any> | undefined;

    if (options && typeof options === 'object') {
      const { params, title: optTitle, description: optDesc, ...rest } = options as any;
      rawOptions = rest;
      if (optTitle !== undefined) rawOptions.title = optTitle;
      if (optDesc !== undefined) rawOptions.description = optDesc;
      interpolationParams = { ...options, ...(params || {}) };
    }

    // Case A: Catalog Key
    if (typeof input === 'string' && isCatalogKey(input)) {
      catalogKey = input;
      const catalogItem = resolveCatalogMessage(input, interpolationParams);
      resolvedType = catalogItem.type || type;
      title = catalogItem.title;
      description = catalogItem.description;
      duration = catalogItem.duration ?? DEFAULT_DURATIONS[resolvedType];
    }
    // Case B: Direct message string
    else if (typeof input === 'string') {
      title = interpolationParams ? interpolate(input, interpolationParams) : input;
      description = rawOptions.description
        ? typeof rawOptions.description === 'string' && interpolationParams
          ? interpolate(rawOptions.description, interpolationParams)
          : rawOptions.description
        : undefined;
    }
    // Case C: React element
    else if (React.isValidElement(input)) {
      title = input;
      description = rawOptions.description;
    }
    // Case D: Object input
    else if (input && typeof input === 'object') {
      const {
        key: objKey,
        message,
        title: objTitle,
        description: objDesc,
        duration: objDuration,
        ...rest
      } = input as any;

      rawOptions = { ...rest, ...rawOptions };
      const mergedParams = { ...(input as any), ...(interpolationParams || {}) };

      if (objKey && isCatalogKey(objKey)) {
        catalogKey = objKey;
        const catalogItem = resolveCatalogMessage(objKey, mergedParams);
        resolvedType = catalogItem.type || type;
        title = catalogItem.title;
        description = catalogItem.description;
        duration = catalogItem.duration ?? DEFAULT_DURATIONS[resolvedType];
      }

      if (objTitle || message) {
        title = typeof (objTitle || message) === 'string'
          ? interpolate(objTitle || message, mergedParams)
          : objTitle || message;
      }
      if (objDesc) {
        description = typeof objDesc === 'string'
          ? interpolate(objDesc, mergedParams)
          : objDesc;
      }
      if (objDuration !== undefined) {
        duration = objDuration;
      }
    }

    // Apply explicit user overrides
    if (rawOptions.title !== undefined) {
      title = typeof rawOptions.title === 'string' && interpolationParams
        ? interpolate(rawOptions.title, interpolationParams)
        : rawOptions.title;
    }
    if (rawOptions.description !== undefined) {
      description = typeof rawOptions.description === 'string' && interpolationParams
        ? interpolate(rawOptions.description, interpolationParams)
        : rawOptions.description;
    }
    if (rawOptions.duration !== undefined) {
      duration = rawOptions.duration;
    }

    return {
      resolvedType,
      title,
      description,
      duration,
      catalogKey,
      opts: rawOptions,
    };
  }

  public add(
    type: ToastType,
    input: ToastInput,
    options?: ToastOptions | Record<string, any>
  ): string {
    const { resolvedType, title, description, duration, catalogKey, opts } =
      this.normalizeInput(type, input, options);

    const existingId = opts.id;

    // Transition existing toast in visible stack or queue
    if (existingId) {
      const visibleIndex = this.visibleToasts.findIndex((t) => t.id === existingId);
      if (visibleIndex !== -1) {
        this.clearTimer(existingId);
        const existing = this.visibleToasts[visibleIndex];

        const updatedToast: ToastItem = {
          ...existing,
          type: resolvedType,
          title: title ?? existing.title,
          description: description ?? opts.description ?? existing.description,
          duration,
          catalogKey: catalogKey ?? existing.catalogKey,
          action: opts.action ?? existing.action,
          cancel: opts.cancel ?? existing.cancel,
          icon: opts.icon,
          isExiting: false,
          isPaused: false,
          remainingTime: duration,
          pausedAt: undefined,
          onDismiss: opts.onDismiss ?? existing.onDismiss,
          onAutoClose: opts.onAutoClose ?? existing.onAutoClose,
        };

        this.visibleToasts[visibleIndex] = updatedToast;
        this.notify();

        if (duration > 0 && duration !== Infinity) {
          this.startTimer(existingId, duration);
        }

        return existingId;
      }

      // Check queued items
      const queueIndex = this.queuedToasts.findIndex((t) => t.id === existingId);
      if (queueIndex !== -1) {
        const existing = this.queuedToasts[queueIndex];
        this.queuedToasts[queueIndex] = {
          ...existing,
          type: resolvedType,
          title: title ?? existing.title,
          description: description ?? opts.description ?? existing.description,
          duration,
          catalogKey: catalogKey ?? existing.catalogKey,
        };
        this.notify();
        return existingId;
      }
    }

    // Deduplication check across visible AND queued
    const shouldDedupe = opts.dedupe !== false;
    const dedupeKey =
      opts.dedupeKey ||
      `${resolvedType}:${typeof title === 'string' ? title : ''}:${
        typeof description === 'string' ? description : ''
      }`;

    if (shouldDedupe && dedupeKey) {
      const lastSeen = this.recentToasts.get(dedupeKey);
      const now = Date.now();
      if (lastSeen && now - lastSeen < RECENT_DEDUPE_WINDOW) {
        const activeToast =
          this.visibleToasts.find((t) => t.dedupeKey === dedupeKey && !t.isExiting) ||
          this.queuedToasts.find((t) => t.dedupeKey === dedupeKey);
        if (activeToast) {
          return activeToast.id;
        }
      }
      this.recentToasts.set(dedupeKey, now);
    }

    const id = existingId || this.generateId();

    const newToast: ToastItem = {
      id,
      type: resolvedType,
      title,
      description,
      duration,
      createdAt: Date.now(),
      catalogKey,
      action: opts.action,
      cancel: opts.cancel,
      icon: opts.icon,
      dedupeKey,
      isExiting: false,
      isPaused: false,
      remainingTime: duration,
      onDismiss: opts.onDismiss,
      onAutoClose: opts.onAutoClose,
    };

    const activeVisibleCount = this.visibleToasts.filter((t) => !t.isExiting).length;

    if (activeVisibleCount < this.maxVisible) {
      // New notifications appear at the TOP (index 0) of the visible stack
      this.visibleToasts = [newToast, ...this.visibleToasts];
      this.notify();

      if (duration > 0 && duration !== Infinity) {
        this.startTimer(id, duration);
      }
    } else {
      // Place in managed queue
      if (this.queuedToasts.length >= MAX_QUEUE_SIZE) {
        // Drop oldest queued non-persistent item to prevent unbounded accumulation
        const dropIndex = this.queuedToasts.findIndex((t) => t.duration > 0);
        if (dropIndex !== -1) {
          this.queuedToasts.splice(dropIndex, 1);
        } else {
          this.queuedToasts.shift();
        }
      }
      this.queuedToasts.push(newToast);
      this.notify();
    }

    return id;
  }

  public dismiss(id?: string): void {
    if (!id) {
      // Dismiss all visible and clear queue
      this.queuedToasts = [];
      this.visibleToasts.forEach((t) => this.dismiss(t.id));
      return;
    }

    // If item is in queue, remove immediately
    const queueIndex = this.queuedToasts.findIndex((t) => t.id === id);
    if (queueIndex !== -1) {
      const removed = this.queuedToasts.splice(queueIndex, 1)[0];
      if (removed?.onDismiss) {
        try {
          removed.onDismiss(removed);
        } catch (err) {
          console.error('Error in queued toast onDismiss callback:', err);
        }
      }
      this.notify();
      return;
    }

    // Visible toast dismissal
    const toast = this.visibleToasts.find((t) => t.id === id);
    if (!toast || toast.isExiting) return;

    this.clearTimer(id);
    toast.isExiting = true;
    this.notify();

    if (toast.onDismiss) {
      try {
        toast.onDismiss(toast);
      } catch (err) {
        console.error('Error in toast onDismiss callback:', err);
      }
    }

    setTimeout(() => {
      this.visibleToasts = this.visibleToasts.filter((t) => t.id !== id);
      this.promoteFromQueue();
      this.notify();
    }, EXIT_ANIMATION_DURATION);
  }

  /**
   * Promotes the next queued notification to the visible stack
   * when capacity allows.
   */
  private promoteFromQueue(): void {
    const activeVisibleCount = this.visibleToasts.filter((t) => !t.isExiting).length;
    const slotsAvailable = this.maxVisible - activeVisibleCount;

    if (slotsAvailable > 0 && this.queuedToasts.length > 0) {
      const promotedItems = this.queuedToasts.splice(0, slotsAvailable);
      promotedItems.forEach((promoted) => {
        // Appears at the top of the stack
        this.visibleToasts = [promoted, ...this.visibleToasts];
        if (promoted.duration > 0 && promoted.duration !== Infinity) {
          this.startTimer(promoted.id, promoted.duration);
        }
      });
      this.notify();
    }
  }

  public clearQueue(): void {
    this.queuedToasts = [];
    this.notify();
  }

  public pause(id: string): void {
    const toast = this.visibleToasts.find((t) => t.id === id);
    if (!toast || toast.isExiting || toast.isPaused || toast.duration <= 0) return;

    this.clearTimer(id);
    const now = Date.now();
    const elapsed = now - (toast.pausedAt || toast.createdAt);
    const remaining = Math.max(0, (toast.remainingTime ?? toast.duration) - elapsed);

    toast.isPaused = true;
    toast.remainingTime = remaining;
    toast.pausedAt = now;
    this.notify();
  }

  public resume(id: string): void {
    const toast = this.visibleToasts.find((t) => t.id === id);
    if (!toast || toast.isExiting || !toast.isPaused || toast.duration <= 0) return;

    const remaining = toast.remainingTime ?? toast.duration;
    toast.isPaused = false;
    toast.pausedAt = undefined;
    this.notify();

    if (remaining > 0) {
      this.startTimer(id, remaining);
    } else {
      this.dismiss(id);
    }
  }

  private startTimer(id: string, duration: number): void {
    this.clearTimer(id);
    const timer = setTimeout(() => {
      const toast = this.visibleToasts.find((t) => t.id === id);
      if (toast && toast.onAutoClose) {
        try {
          toast.onAutoClose(toast);
        } catch (err) {
          console.error('Error in toast onAutoClose callback:', err);
        }
      }
      this.dismiss(id);
    }, duration);
    this.timers.set(id, timer);
  }

  private clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  public promise<T>(
    promise: Promise<T> | (() => Promise<T>),
    messages: ToastPromiseMessages<T>,
    options?: ToastOptions
  ): Promise<T> {
    const loadingInput = messages.loading;
    const toastId = this.add('loading', loadingInput as ToastInput, options);

    const actualPromise = typeof promise === 'function' ? promise() : promise;

    return actualPromise
      .then((data) => {
        const successMsg =
          typeof messages.success === 'function'
            ? messages.success(data)
            : messages.success;
        this.add('success', successMsg as ToastInput, { ...options, id: toastId });
        return data;
      })
      .catch((err) => {
        if (typeof messages.error === 'function') {
          const customErrorMsg = messages.error(err);
          this.add('error', customErrorMsg as ToastInput, { ...options, id: toastId });
        } else if (messages.error) {
          this.add('error', messages.error as ToastInput, { ...options, id: toastId });
        } else {
          const parsed = parseApiError(err);
          this.add('error', parsed.title, {
            ...options,
            id: toastId,
            description: parsed.description,
          });
        }
        throw err;
      });
  }

  public fromError(
    error: unknown,
    fallbackKeyOrMessage?: string,
    options?: ToastOptions
  ): string {
    const parsed = parseApiError(error, fallbackKeyOrMessage);
    const signature = `${parsed.title}:${parsed.description}`;

    if (isDuplicateError(error, signature)) {
      const activeToast =
        this.visibleToasts.find(
          (t) => t.type === 'error' && !t.isExiting && t.title === parsed.title
        ) ||
        this.queuedToasts.find(
          (t) => t.type === 'error' && t.title === parsed.title
        );
      if (activeToast) return activeToast.id;
    }

    return this.add('error', parsed.title, {
      ...options,
      description: options?.description ?? parsed.description,
      duration: options?.duration ?? (parsed.isValidationError ? 4500 : 5000),
      dedupeKey: signature,
    });
  }

  /**
   * Consolidates repetitive bulk operations into a single summarized toast
   * with success/failure statistics.
   */
  public bulkSummary(options: BulkSummaryOptions): string {
    const { action, entity, total, successCount, failureCount: rawFailure, errors, options: toastOpts } = options;
    const failureCount = rawFailure !== undefined ? rawFailure : Math.max(0, total - successCount);

    if (failureCount === 0 || successCount === total) {
      return this.add('success', 'common.bulk_success', {
        ...toastOpts,
        action,
        entity,
        successCount,
        total,
      });
    }

    if (successCount > 0 && failureCount > 0) {
      let description = `${successCount} of ${total} ${entity}(s) ${action}ed. ${failureCount} failed.`;
      if (errors && errors.length > 0) {
        description += ` (${errors.slice(0, 2).join('; ')})`;
      }
      return this.add('warning', 'common.bulk_partial', {
        ...toastOpts,
        action,
        entity,
        successCount,
        failureCount,
        total,
        description: toastOpts?.description || description,
      });
    }

    let failDesc = `Failed to ${action} ${total} ${entity}(s).`;
    if (errors && errors.length > 0) {
      failDesc += ` Details: ${errors.slice(0, 2).join('; ')}`;
    }
    return this.add('error', 'common.bulk_failed', {
      ...toastOpts,
      action,
      entity,
      total,
      failureCount,
      description: toastOpts?.description || failDesc,
    });
  }

  public clear(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.visibleToasts = [];
    this.queuedToasts = [];
    this.notify();
  }
}

export const toastStore = new ToastStore();

/**
 * Enterprise Toast Notification API for PayPulse
 */
export const toast = {
  success: (
    input: ToastInput,
    options?: ToastOptions | Record<string, any>
  ) => toastStore.add('success', input, options),
  error: (
    input: ToastInput,
    options?: ToastOptions | Record<string, any>
  ) => toastStore.add('error', input, options),
  warning: (
    input: ToastInput,
    options?: ToastOptions | Record<string, any>
  ) => toastStore.add('warning', input, options),
  info: (
    input: ToastInput,
    options?: ToastOptions | Record<string, any>
  ) => toastStore.add('info', input, options),
  loading: (
    input: ToastInput,
    options?: ToastOptions | Record<string, any>
  ) => toastStore.add('loading', input, options),
  dismiss: (id?: string) => toastStore.dismiss(id),
  clearQueue: () => toastStore.clearQueue(),
  promise: <T>(
    promise: Promise<T> | (() => Promise<T>),
    messages: ToastPromiseMessages<T>,
    options?: ToastOptions
  ) => toastStore.promise(promise, messages, options),
  fromError: (
    error: unknown,
    fallbackKeyOrMessage?: string,
    options?: ToastOptions
  ) => toastStore.fromError(error, fallbackKeyOrMessage, options),
  bulkSummary: (options: BulkSummaryOptions) => toastStore.bulkSummary(options),
  clear: () => toastStore.clear(),
};
