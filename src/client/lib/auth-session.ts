// ==============================================================================
// JK-PAYROLL: CLIENT AUTHENTICATION SESSION & TIMEOUT MANAGEMENT
// Re-exports and integrates centralized AuthSessionManager with backward compatibility.
// File: src/client/lib/auth-session.ts
// ==============================================================================

import {
  authSessionManager,
  AUTH_CHANGE_EVENT,
  SESSION_TIMEOUT_KEY,
  DEFAULT_TIMEOUT_MESSAGE,
} from '../core/auth/AuthSessionManager.js';

export { AUTH_CHANGE_EVENT, SESSION_TIMEOUT_KEY };

/**
 * Decodes the payload portion of a JWT token safely in browser or node environments.
 */
export function decodeJwtPayload(token: string): Record<string, any> | null {
  return authSessionManager.decodeJwtPayload(token);
}

/**
 * Checks whether a given JWT token has already expired.
 */
export function isTokenExpired(token: string | null): boolean {
  return authSessionManager.isTokenExpired(token);
}

/**
 * Gets remaining milliseconds before the token expires, or null if no exp claim.
 */
export function getTokenRemainingTime(token: string | null): number | null {
  return authSessionManager.getTokenRemainingTime(token);
}

/**
 * Centralized session timeout and invalid token handler.
 * Preserves tab route, flushes drafts, cleans credentials, broadcasts event,
 * and navigates to /login.
 */
export function handleSessionTimeout(
  customMessage: string = DEFAULT_TIMEOUT_MESSAGE
): void {
  authSessionManager.handleSessionExpired('Session Expired', customMessage);
}

/**
 * Consumes and clears any pending session timeout message.
 */
export function consumeSessionTimeoutMessage(): string | null {
  return authSessionManager.consumeSessionTimeoutMessage();
}

/**
 * Authenticated fetch helper with automatic single-flight token refresh
 * and fail-closed 401 session-timeout handling.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers || {});

  let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  if (token) {
    // If token is about to expire, attempt single-flight proactive refresh
    if (isTokenExpired(token)) {
      const refreshed = await authSessionManager.refreshToken();
      if (refreshed?.token) {
        token = refreshed.token;
      } else {
        handleSessionTimeout('Your session has timed out. Please sign in again to continue.');
        throw new Error('Unauthorized: Session has expired');
      }
    }

    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  if (!headers.has('Content-Type') && init?.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  let response = await fetch(input, {
    ...init,
    headers,
  });

  // Handle 401 Unauthorized: Attempt token refresh once before expiring
  if (response.status === 401 && token) {
    const refreshed = await authSessionManager.refreshToken();
    if (refreshed?.token) {
      // Retry original request once with fresh token
      headers.set('Authorization', `Bearer ${refreshed.token}`);
      response = await fetch(input, {
        ...init,
        headers,
      });
      if (response.ok) {
        return response;
      }
    }

    // Refresh failed or second attempt still unauthorized
    let errorMessage = DEFAULT_TIMEOUT_MESSAGE;
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
