// ==============================================================================
// JK-PAYROLL: CENTRALIZED FORM DRAFT PERSISTENCE MANAGER
// Manages per-tab, per-user, isolated draft lifecycle with field redaction & TTL.
// File: src/client/core/persistence/DraftManager.ts
// ==============================================================================

import { draftStorage, IDraftStorage } from './DraftStorage.js';

export const DRAFT_KEY_PREFIX = 'paypulse_draft_';
export const DEFAULT_DRAFT_VERSION = 1;
export const DEFAULT_DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const DEFAULT_SENSITIVE_FIELDS: string[] = [
  'password',
  'confirmPassword',
  'currentPassword',
  'newPassword',
  'secret',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'creditCard',
  'cardNumber',
  'cvv',
  'cvc',
  'pin',
  'admin.password',
  'admin.confirmPassword',
];

export interface FormDraft<T = any> {
  userId: string;
  tabId: string;
  formId: string;
  version: number;
  currentStep?: number;
  activeTab?: string;
  values: T;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface SaveDraftOptions<T = any> {
  userId?: string | null;
  tabId: string;
  formId: string;
  values: T;
  currentStep?: number;
  activeTab?: string;
  version?: number;
  metadata?: Record<string, any>;
  excludeFields?: string[];
  ttlMs?: number;
}

export interface LoadDraftOptions {
  expectedVersion?: number;
  ttlMs?: number;
  validator?: (data: any) => boolean;
}

export class DraftManager {
  private storage: IDraftStorage;
  private activeSavers: Map<string, () => void> = new Map();

  constructor(storage: IDraftStorage = draftStorage) {
    this.storage = storage;
  }

  /**
   * Constructs the deterministic, isolated draft key:
   * paypulse_draft_{userId}_{tabId}_{formId}
   */
  public buildKey(userId: string | null | undefined, tabId: string, formId: string): string {
    const cleanUser = (userId && userId.trim()) ? userId.trim() : 'anonymous';
    const cleanTab = tabId ? tabId.trim() : 'unknown_tab';
    const cleanForm = formId.trim();
    return `${DRAFT_KEY_PREFIX}${cleanUser}_${cleanTab}_${cleanForm}`;
  }

  /**
   * Recursively strips sensitive fields (passwords, tokens, CVVs) from values before saving.
   */
  public redactSensitiveFields<T>(values: T, excludeFields: string[] = DEFAULT_SENSITIVE_FIELDS): T {
    if (!values || typeof values !== 'object') {
      return values;
    }

    if (Array.isArray(values)) {
      return values.map((item) => this.redactSensitiveFields(item, excludeFields)) as unknown as T;
    }

    const clone: Record<string, any> = {};
    const excludeSet = new Set(excludeFields.map((f) => f.toLowerCase()));

    for (const [key, value] of Object.entries(values as Record<string, any>)) {
      const lowerKey = key.toLowerCase();
      if (excludeSet.has(lowerKey)) {
        continue;
      }

      if (value !== null && typeof value === 'object') {
        clone[key] = this.redactSensitiveFields(value, excludeFields);
      } else {
        clone[key] = value;
      }
    }

    return clone as T;
  }

  /**
   * Persists a form draft to storage.
   */
  public saveDraft<T>(options: SaveDraftOptions<T>): FormDraft<T> | null {
    const {
      userId,
      tabId,
      formId,
      values,
      currentStep,
      activeTab,
      version = DEFAULT_DRAFT_VERSION,
      metadata,
      excludeFields = DEFAULT_SENSITIVE_FIELDS,
    } = options;

    if (!tabId || !formId) {
      return null;
    }

    const key = this.buildKey(userId, tabId, formId);
    const existing = this.loadDraftRaw(key);

    const nowIso = new Date().toISOString();
    const sanitizedValues = this.redactSensitiveFields(values, excludeFields);

    const draft: FormDraft<T> = {
      userId: (userId && userId.trim()) ? userId.trim() : 'anonymous',
      tabId,
      formId,
      version,
      currentStep,
      activeTab,
      values: sanitizedValues,
      metadata,
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    try {
      const success = this.storage.setItem(key, JSON.stringify(draft));
      return success ? draft : null;
    } catch (err) {
      console.warn(`[DraftManager] Failed to persist draft for ${key}:`, err);
      return null;
    }
  }

  /**
   * Loads a form draft for the specified user, tab, and form ID.
   * Enforces account isolation, TTL expiration, and optional schema validation.
   */
  public loadDraft<T>(
    userId: string | null | undefined,
    tabId: string,
    formId: string,
    options?: LoadDraftOptions
  ): FormDraft<T> | null {
    const key = this.buildKey(userId, tabId, formId);
    const rawDraft = this.loadDraftRaw<T>(key);

    if (!rawDraft) {
      return null;
    }

    // Account Isolation Check
    const expectedUser = (userId && userId.trim()) ? userId.trim() : 'anonymous';
    if (rawDraft.userId !== expectedUser) {
      this.clearDraft(userId, tabId, formId);
      return null;
    }

    // TTL Expiration Check
    const ttlMs = options?.ttlMs ?? DEFAULT_DRAFT_TTL_MS;
    const updatedAtTime = new Date(rawDraft.updatedAt).getTime();
    if (Number.isNaN(updatedAtTime) || Date.now() - updatedAtTime > ttlMs) {
      this.clearDraft(userId, tabId, formId);
      return null;
    }

    // Version Mismatch Check
    if (options?.expectedVersion !== undefined && rawDraft.version !== options.expectedVersion) {
      this.clearDraft(userId, tabId, formId);
      return null;
    }

    // Schema / Custom Validator Check
    if (options?.validator && !options.validator(rawDraft.values)) {
      console.warn(`[DraftManager] Draft validation failed for ${key}, discarding corrupted draft.`);
      this.clearDraft(userId, tabId, formId);
      return null;
    }

    return rawDraft;
  }

  private loadDraftRaw<T>(key: string): FormDraft<T> | null {
    try {
      const data = this.storage.getItem(key);
      if (!data) return null;
      return JSON.parse(data) as FormDraft<T>;
    } catch {
      return null;
    }
  }

  /**
   * Explicitly discards a specific form draft (e.g. after successful submission).
   */
  public clearDraft(userId: string | null | undefined, tabId: string, formId: string): void {
    const key = this.buildKey(userId, tabId, formId);
    this.storage.removeItem(key);
  }

  /**
   * Clears all drafts belonging to a specific tab.
   */
  public clearTabDrafts(tabId: string): void {
    const allKeys = this.storage.getAllKeys();
    const token = `_${tabId}_`;
    for (const key of allKeys) {
      if (key.startsWith(DRAFT_KEY_PREFIX) && key.includes(token)) {
        this.storage.removeItem(key);
      }
    }
  }

  /**
   * Clears all drafts belonging to a specific user across tabs.
   */
  public clearUserDrafts(userId: string): void {
    const prefix = `${DRAFT_KEY_PREFIX}${userId}_`;
    const allKeys = this.storage.getAllKeys();
    for (const key of allKeys) {
      if (key.startsWith(prefix)) {
        this.storage.removeItem(key);
      }
    }
  }

  /**
   * Registers an active form's flush callback so pending changes can be immediately saved.
   */
  public registerActiveSaver(key: string, saver: () => void): () => void {
    this.activeSavers.set(key, saver);
    return () => {
      this.activeSavers.delete(key);
    };
  }

  /**
   * Flushes all active form savers synchronously (e.g., on session expiration).
   */
  public flushAllActiveSavers(): void {
    for (const saver of this.activeSavers.values()) {
      try {
        saver();
      } catch (err) {
        console.error('[DraftManager] Error flushing active draft saver:', err);
      }
    }
  }
}

export const draftManager = new DraftManager();
