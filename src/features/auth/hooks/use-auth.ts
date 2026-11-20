// ==============================================================================
// JK-PAYROLL: CLIENT USE-AUTH HOOK
// Proactive token expiration checking, idle timeout detection, and session management
// File: src/features/auth/hooks/use-auth.ts
// ==============================================================================

import { useState, useCallback, useEffect } from 'react';
import { AuthUser } from '../types.js';
import {
  AUTH_CHANGE_EVENT,
  isTokenExpired,
  getTokenRemainingTime,
  handleSessionTimeout,
} from '../../../client/lib/auth-session.js';

function readStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('token');
  if (!token) return null;
  if (isTokenExpired(token)) {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
    } catch {
      // Ignore
    }
    return null;
  }
  return token;
}

function readStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('token');
  if (!token || isTokenExpired(token)) {
    return null;
  }
  const saved = localStorage.getItem('currentUser');
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(readStoredToken);
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);

  // Sync state with storage and auth-change events
  useEffect(() => {
    const syncAuth = () => {
      setToken(readStoredToken());
      setUser(readStoredUser());
    };
    window.addEventListener(AUTH_CHANGE_EVENT, syncAuth);
    window.addEventListener('storage', syncAuth);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, syncAuth);
      window.removeEventListener('storage', syncAuth);
    };
  }, []);

  // Periodic expiration & timer check: auto-timeout when token reaches expiry
  useEffect(() => {
    if (!token) return;

    if (isTokenExpired(token)) {
      handleSessionTimeout('Your session has timed out. Please sign in again to continue.');
      return;
    }

    const remainingMs = getTokenRemainingTime(token);
    // If we have a known expiration time, schedule auto-timeout
    let timer: NodeJS.Timeout | undefined;
    if (remainingMs !== null && remainingMs > 0) {
      timer = setTimeout(() => {
        handleSessionTimeout('Your session has timed out. Please sign in again to continue.');
      }, remainingMs);
    }

    // Secondary interval check every 30 seconds (or when tab regains focus)
    const interval = setInterval(() => {
      if (isTokenExpired(token)) {
        handleSessionTimeout('Your session has timed out. Please sign in again to continue.');
      }
    }, 30000);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && isTokenExpired(token)) {
        handleSessionTimeout('Your session has timed out. Please sign in again to continue.');
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [token]);

  const effectiveToken = token ?? readStoredToken();
  const effectiveUser = user ?? readStoredUser();
  const isAuthenticated = Boolean(effectiveToken && effectiveUser && !isTokenExpired(effectiveToken));

  const loginWithData = useCallback((newToken: string, newUser: AuthUser) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', newToken);
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
    }
    setToken(newToken);
    setUser(newUser);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || 'Invalid email or password');
    }
    loginWithData(data.token, data.user);
    return data;
  }, [loginWithData]);

  const logout = useCallback((reason?: string) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      if (reason) {
        handleSessionTimeout(reason);
        return;
      }
      window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
    }
    setToken(null);
    setUser(null);
  }, []);

  return {
    user: effectiveUser,
    token: effectiveToken,
    isAuthenticated,
    setUser,
    setToken,
    login,
    loginWithData,
    logout,
  };
}

export default useAuth;
