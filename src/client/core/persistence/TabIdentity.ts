// ==============================================================================
// JK-PAYROLL: PER-TAB IDENTITY SERVICE
// Generates and manages stable, isolated tab identifiers using sessionStorage
// File: src/client/core/persistence/TabIdentity.ts
// ==============================================================================

export const TAB_ID_STORAGE_KEY = 'paypulse_tab_id';

let memoryTabId: string | null = null;

/**
 * Generates a cryptographically random, collision-resistant tab identifier.
 */
export function generateTabId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `tab_${timestamp}_${randomPart}`;
}

/**
 * Checks if browser sessionStorage is available and operational.
 */
export function isSessionStorageAvailable(): boolean {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return false;
  }
  try {
    const testKey = '__paypulse_test_storage__';
    window.sessionStorage.setItem(testKey, '1');
    window.sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Retrieves the current stable tab identifier, or initializes a new one.
 * Uses sessionStorage to ensure the ID persists across reloads in the same tab
 * while maintaining strict isolation from any other browser tab or window.
 */
export function getTabId(): string {
  if (typeof window === 'undefined') {
    if (!memoryTabId) {
      memoryTabId = generateTabId();
    }
    return memoryTabId;
  }

  if (isSessionStorageAvailable()) {
    try {
      let existingId = window.sessionStorage.getItem(TAB_ID_STORAGE_KEY);
      if (!existingId || !existingId.trim()) {
        existingId = generateTabId();
        window.sessionStorage.setItem(TAB_ID_STORAGE_KEY, existingId);
      }
      return existingId;
    } catch {
      // In case of access error, fall through to in-memory fallback
    }
  }

  if (!memoryTabId) {
    memoryTabId = generateTabId();
  }
  return memoryTabId;
}

/**
 * Explicitly initializes and returns the tab identity.
 */
export function initTabIdentity(): string {
  return getTabId();
}

/**
 * Helper strictly for testing scenarios to reset in-memory identity.
 */
export function resetTabIdentityForTesting(): void {
  memoryTabId = null;
  if (isSessionStorageAvailable()) {
    try {
      window.sessionStorage.removeItem(TAB_ID_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}
