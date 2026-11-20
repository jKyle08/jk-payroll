// ==============================================================================
// JK-PAYROLL: CLIENT AUTHENTICATION SESSION & TIMEOUT MANAGEMENT
// File: src/client/lib/auth-session.ts
// ==============================================================================

export const AUTH_CHANGE_EVENT = 'paypulse-auth-change';
export const SESSION_TIMEOUT_KEY = 'paypulse_session_timeout';

/**
 * Decodes the payload portion of a JWT token safely in browser or node environments.
 */
export function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

    if (typeof window !== 'undefined' && typeof window.atob === 'function') {
      const decoded = atob(padded);
      return JSON.parse(decoded);
    }
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

/**
 * Checks whether a given JWT token has already expired.
 */
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') {
    // If token has no expiration claim, do not proactively expire it
    return false;
  }
  // payload.exp is in seconds; compare against current time with a 5-second skew window
  return payload.exp * 1000 <= Date.now() + 5000;
}

/**
 * Gets remaining milliseconds before the token expires, or null if no exp claim.
 */
export function getTokenRemainingTime(token: string | null): number | null {
  if (!token) return 0;
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return null;
  return Math.max(0, payload.exp * 1000 - Date.now());
}

/**
 * Centralized session timeout and invalid token handler.
 * Clears stale credentials from localStorage, records a user-facing timeout message,
 * notifies reactive hooks, and smoothly navigates the user to /login.
 */
export function handleSessionTimeout(
  customMessage: string = 'Your session has timed out. Please sign in again to continue.'
): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    sessionStorage.setItem(SESSION_TIMEOUT_KEY, customMessage);
  } catch {
    // Ignore storage quota/permission exceptions
  }

  // Notify active listeners (useAuth hooks, active components)
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));

  // Redirect to login if not already on an unauthenticated entry page
  const currentPath = window.location.pathname;
  if (currentPath !== '/login') {
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('timeout', 'true');
    window.location.href = `/login?${searchParams.toString()}`;
  }
}

/**
 * Consumes and clears any pending session timeout message.
 */
export function consumeSessionTimeoutMessage(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const msg = sessionStorage.getItem(SESSION_TIMEOUT_KEY);
    if (msg) {
      sessionStorage.removeItem(SESSION_TIMEOUT_KEY);
      return msg;
    }
  } catch {
    // Ignore
  }

  // Fallback to URL query parameter (?timeout=true)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('timeout') === 'true') {
      return 'Your session has timed out. Please sign in again to continue.';
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * Authenticated fetch helper with automatic 401 session-timeout handling.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers || {});

  if (!headers.has('Authorization') && typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      // If token is already expired locally, trigger timeout immediately without a wasteful network roundtrip
      if (isTokenExpired(token)) {
        handleSessionTimeout('Your session has timed out. Please sign in again to continue.');
        throw new Error('Unauthorized: Session has expired');
      }
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  if (!headers.has('Content-Type') && init?.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  // Handle 401 Unauthorized across all API responses
  if (response.status === 401) {
    let errorMessage = 'Your session has timed out. Please sign in again to continue.';
    try {
      const cloned = response.clone();
      const body = await cloned.json();
      if (body?.error && typeof body.error === 'string') {
        errorMessage = body.error.includes('Supabase Auth')
          ? 'Your authentication session is invalid or expired. Please sign in again.'
          : body.error;
      }
    } catch {
      // Non-JSON 401 body, use default message
    }

    handleSessionTimeout(errorMessage);
    throw new Error(errorMessage);
  }

  return response;
}
