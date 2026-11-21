// ==============================================================================
// JK-PAYROLL: PER-TAB ROUTE RESTORATION & OPEN-REDIRECT PROTECTION
// Preserves and securely restores navigation destination for each browser tab.
// File: src/client/core/auth/RouteRestoration.ts
// ==============================================================================

import { getTabId } from '../persistence/TabIdentity.js';

export const ROUTE_RECOVERY_PREFIX = 'paypulse_route_recovery_';
export const DEFAULT_AUTHENTICATED_ROUTE = '/organizations';
export const MAX_ROUTE_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface SavedRouteContext {
  pathname: string;
  search: string;
  tabId: string;
  userId?: string;
  tenantId?: string;
  timestamp: number;
  reason?: string;
}

/**
 * Validates that a candidate route is a strictly internal application path.
 * Defends against open-redirect attacks, protocol injection (javascript:, data:),
 * and redirect loop entry points (/login, /unauthorized, /401).
 */
export function isSafeInternalRoute(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const trimmed = url.trim();

  // Must begin with a single forward slash and not double slashes (//evil.com)
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return false;
  }

  // Reject URL protocols or backslashes
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) || trimmed.includes('\\')) {
    return false;
  }

  // Extract pure pathname part for loop detection
  const pathPart = trimmed.split('?')[0].split('#')[0].toLowerCase();

  // Reject authentication and error loop targets
  const disallowedPaths = ['/login', '/unauthorized', '/401', '/maintenance'];
  if (disallowedPaths.includes(pathPart)) {
    return false;
  }

  return true;
}

/**
 * Builds the sessionStorage key for a specific tab ID.
 */
export function getRouteStorageKey(tabId: string): string {
  return `${ROUTE_RECOVERY_PREFIX}${tabId}`;
}

/**
 * Captures the current browser tab's route context before an auth redirect.
 */
export function saveCurrentRoute(options?: {
  tabId?: string;
  userId?: string;
  tenantId?: string;
  reason?: string;
  customPath?: string;
}): SavedRouteContext | null {
  if (typeof window === 'undefined') return null;

  const tabId = options?.tabId || getTabId();
  let pathname: string;
  let search: string;

  if (options?.customPath) {
    const [pathPart, searchPart] = options.customPath.split('?');
    pathname = pathPart;
    search = searchPart ? `?${searchPart}` : '';
  } else {
    pathname = window.location.pathname;
    search = window.location.search;
  }

  const fullUrl = `${pathname}${search}`;
  if (!isSafeInternalRoute(fullUrl)) {
    return null;
  }

  const context: SavedRouteContext = {
    pathname,
    search,
    tabId,
    userId: options?.userId,
    tenantId: options?.tenantId,
    timestamp: Date.now(),
    reason: options?.reason || 'session_expired',
  };

  try {
    if (window.sessionStorage) {
      window.sessionStorage.setItem(getRouteStorageKey(tabId), JSON.stringify(context));
    }
  } catch {
    // Ignore storage quota or permission exceptions
  }

  return context;
}

/**
 * Retrieves the preserved route context for the given tab ID.
 * Automatically discards expired records.
 */
export function getSavedRoute(tabId?: string): SavedRouteContext | null {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;

  const currentTabId = tabId || getTabId();
  try {
    const raw = window.sessionStorage.getItem(getRouteStorageKey(currentTabId));
    if (!raw) return null;

    const context: SavedRouteContext = JSON.parse(raw);
    if (!context || typeof context !== 'object') {
      clearSavedRoute(currentTabId);
      return null;
    }

    // Check expiration
    if (Date.now() - context.timestamp > MAX_ROUTE_RETENTION_MS) {
      clearSavedRoute(currentTabId);
      return null;
    }

    return context;
  } catch {
    clearSavedRoute(currentTabId);
    return null;
  }
}

/**
 * Clears the saved route record for the given tab ID.
 */
export function clearSavedRoute(tabId?: string): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  const currentTabId = tabId || getTabId();
  try {
    window.sessionStorage.removeItem(getRouteStorageKey(currentTabId));
  } catch {
    // Ignore
  }
}

/**
 * Resolves the destination route following successful login.
 * Validates ownership (preventing account leakage), freshness, and internal route safety.
 * Consumes the recovery record if matched.
 */
export function resolvePostLoginRedirect(
  currentUserId?: string,
  _userTenantId?: string,
  tabId?: string
): string {
  const currentTabId = tabId || getTabId();
  const savedContext = getSavedRoute(currentTabId);

  if (!savedContext) {
    return DEFAULT_AUTHENTICATED_ROUTE;
  }

  // Account Ownership Validation: If the route was saved for a specific user,
  // do NOT restore it if a different account logs into this tab.
  if (savedContext.userId && currentUserId && savedContext.userId !== currentUserId) {
    clearSavedRoute(currentTabId);
    return DEFAULT_AUTHENTICATED_ROUTE;
  }

  const destination = `${savedContext.pathname}${savedContext.search || ''}`;

  if (!isSafeInternalRoute(destination)) {
    clearSavedRoute(currentTabId);
    return DEFAULT_AUTHENTICATED_ROUTE;
  }

  // Successfully consumed
  clearSavedRoute(currentTabId);
  return destination;
}
