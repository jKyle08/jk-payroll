// ==============================================================================
// JK-PAYROLL: CLIENT USE-AUTH HOOK
// File: src/features/auth/hooks/use-auth.ts
// ==============================================================================

import { useState, useCallback, useEffect } from 'react';
import { AuthUser } from '../types.js';

const AUTH_CHANGE_EVENT = 'paypulse-auth-change';

function readStoredToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
}

function readStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
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

  const effectiveToken = token ?? readStoredToken();
  const effectiveUser = user ?? readStoredUser();
  const isAuthenticated = Boolean(effectiveToken && effectiveUser);

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

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
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
