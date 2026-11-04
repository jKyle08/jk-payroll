// ==============================================================================
// JK-PAYROLL: CLIENT USE-AUTH HOOK
// File: src/features/auth/hooks/use-auth.ts
// ==============================================================================

import { useState, useCallback } from 'react';
import { AuthUser } from '../types.js';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
  }, []);

  return {
    user,
    token,
    isAuthenticated,
    setUser,
    setToken,
    setIsAuthenticated,
    logout,
  };
}

export default useAuth;
