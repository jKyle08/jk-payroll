// ==============================================================================
// JK-PAYROLL: REUSABLE USE-FORM-DRAFT HOOK
// Enterprise-grade per-tab, per-user form draft persistence with debounce,
// multi-step wizard step retention, sensitive field redaction & RHF integration.
// File: src/client/hooks/useFormDraft.ts
// ==============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import type { UseFormReturn, FieldValues } from 'react-hook-form';
import { getTabId } from '../core/persistence/TabIdentity.js';
import { draftManager, FormDraft } from '../core/persistence/DraftManager.js';
import { useAuth } from '../../features/auth/hooks/use-auth.js';

export interface UseFormDraftOptions<T extends FieldValues = any> {
  formId: string;
  form?: UseFormReturn<T, any, any>;
  version?: number;
  currentStep?: number;
  activeTab?: string;
  debounceMs?: number;
  excludeFields?: string[];
  metadata?: Record<string, any>;
  validator?: (data: any) => boolean;
  onRestored?: (draft: FormDraft<T>) => void;
  autoSave?: boolean;
}

export interface UseFormDraftResult<T extends FieldValues = any> {
  tabId: string;
  isRestored: boolean;
  restoredDraft: FormDraft<T> | null;
  lastSavedAt: Date | null;
  saveDraft: (values?: T, step?: number, activeTab?: string) => FormDraft<T> | null;
  clearDraft: () => void;
  discardDraft: () => void;
}

export function useFormDraft<T extends FieldValues = any>(options: UseFormDraftOptions<T>): UseFormDraftResult<T> {
  const {
    formId,
    form,
    version = 1,
    currentStep,
    activeTab,
    debounceMs = 600,
    excludeFields,
    metadata,
    validator,
    onRestored,
    autoSave = true,
  } = options;

  const { user } = useAuth();
  const userId = user?.userId || null;
  const tabId = getTabId();

  const [isRestored, setIsRestored] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState<FormDraft<T> | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const debounceTimerRef = useRef<any>(null);
  const latestValuesRef = useRef<T | null>(null);
  const latestStepRef = useRef<number | undefined>(currentStep);
  const latestTabRef = useRef<string | undefined>(activeTab);

  latestStepRef.current = currentStep;
  latestTabRef.current = activeTab;

  // 1. Initial Load & Restore Draft on Mount
  useEffect(() => {
    const existingDraft = draftManager.loadDraft<T>(userId, tabId, formId, {
      expectedVersion: version,
      validator,
    });

    if (existingDraft && existingDraft.values) {
      setRestoredDraft(existingDraft);
      setIsRestored(true);
      setLastSavedAt(new Date(existingDraft.updatedAt));
      latestValuesRef.current = existingDraft.values;

      // Automatically populate React Hook Form if connected
      if (form && typeof form.reset === 'function') {
        form.reset(existingDraft.values as any);
      }

      if (onRestored) {
        onRestored(existingDraft);
      }
    }
  }, [formId, tabId, userId, version]);

  // 2. Perform Immediate / Synchronous Save
  const performSave = useCallback(
    (valuesToSave?: T, stepToSave?: number, tabToSave?: string): FormDraft<T> | null => {
      const values = valuesToSave ?? latestValuesRef.current;
      if (!values || typeof values !== 'object') {
        return null;
      }

      const step = stepToSave ?? latestStepRef.current;
      const tab = tabToSave ?? latestTabRef.current;

      const saved = draftManager.saveDraft<T>({
        userId,
        tabId,
        formId,
        values,
        currentStep: step,
        activeTab: tab,
        version,
        metadata,
        excludeFields,
      });

      if (saved) {
        setLastSavedAt(new Date(saved.updatedAt));
      }
      return saved;
    },
    [userId, tabId, formId, version, metadata, excludeFields]
  );

  // 3. Register active saver with DraftManager so session expiration synchronously flushes it
  useEffect(() => {
    const saverKey = `${tabId}_${formId}`;
    const unregister = draftManager.registerActiveSaver(saverKey, () => {
      if (latestValuesRef.current) {
        performSave();
      }
    });

    return () => {
      unregister();
      // Synchronously flush on unmount if dirty
      if (latestValuesRef.current) {
        performSave();
      }
    };
  }, [tabId, formId, performSave]);

  // 4. React Hook Form Watch Subscription for Auto-Save
  useEffect(() => {
    if (!form || !autoSave || typeof form.watch !== 'function') return;

    const subscription = form.watch((values) => {
      latestValuesRef.current = values as T;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        performSave(values as T);
      }, debounceMs);
    });

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [form, autoSave, debounceMs, performSave]);

  // 5. Clear / Discard Draft
  const clearDraft = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    latestValuesRef.current = null;
    draftManager.clearDraft(userId, tabId, formId);
    setRestoredDraft(null);
    setIsRestored(false);
    setLastSavedAt(null);
  }, [userId, tabId, formId]);

  const discardDraft = useCallback(() => {
    clearDraft();
    if (form && typeof form.reset === 'function') {
      form.reset();
    }
  }, [clearDraft, form]);

  return {
    tabId,
    isRestored,
    restoredDraft,
    lastSavedAt,
    saveDraft: performSave,
    clearDraft,
    discardDraft,
  };
}

export default useFormDraft;
