// ==============================================================================
// JK-PAYROLL: CENTRALIZED AUTHENTICATION SESSION MANAGER
// Orchestrates token expiration detection, single-flight refresh mutex,
// route capture, draft flush, and cross-tab session lifecycle.
// File: src/client/core/auth/AuthSessionManager.ts
// ==============================================================================

import { getTabId } from '../persistence/TabIdentity.js';
import { crossTabAuthSync, AuthSyncEvent } from './CrossTabAuthSync.js';
import { saveCurrentRoute, resolvePostLoginRedirect, clearSavedRoute } from './RouteRestoration.js';
import { draftManager } from '../persistence/DraftManager.js';

export const AUTH_CHANGE_EVENT = 'paypulse-auth-change';
export const SESSION_TIMEOUT_KEY = 'paypulse_session_timeout';
export const DEFAULT_TIMEOUT_MESSAGE = 'Your session has timed out. Please sign in again to continue.';

export interface DecodedTokenPayload {
  sub?: string;
  userId?: string;
  email?: string;
  tenant_id?: string;
  organization_id?: string;
  exp?: number;
  iat?: number;
  [key: string]: any;
}

export class AuthSessionManager {
  private isProcessingExpiration = false;
  private inFlightRefreshPromise: Promise<{ token: string; user: any } | null> | null = null;
  private proactiveTimer: any = null;
  private intervalCheckTimer: any = null;
  private unsubscribeCrossTab: (() => void) | null = null;
  private isInitialized = false;

  constructor() {
    this.init();
  }

  /**
   * Initializes listeners and timer checks.
   */
  public init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // 1. Listen for cross-tab auth state changes
    this.unsubscribeCrossTab = crossTabAuthSync.subscribe((event: AuthSyncEvent) => {
      this.handleCrossTabEvent(event);
    });

    // 2. Set up visibility & focus re-validation
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        const token = this.getStoredToken();
        if (token && this.isTokenExpired(token)) {
          this.handleSessionExpired('Token expired while inactive');
        }
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // 3. Start proactive timers
    this.scheduleProactiveExpirationCheck();
  }

  /**
   * Safe JWT payload decoder.
   */
  public decodeJwtPayload(token: string): DecodedTokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

      if (typeof window !== 'undefined' && typeof window.atob === 'function') {
        return JSON.parse(window.atob(padded));
      }
      return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'));
    } catch {
      return null;
    }
  }

  /**
   * Checks whether a given JWT token has already expired (with 5-second skew window).
   */
  public isTokenExpired(token: string | null): boolean {
    if (!token) return true;
    const payload = this.decodeJwtPayload(token);
    if (!payload || typeof payload.exp !== 'number') {
      return false;
    }
    return payload.exp * 1000 <= Date.now() + 5000;
  }

  /**
   * Returns remaining milliseconds before token expiration.
   */
  public getTokenRemainingTime(token: string | null): number | null {
    if (!token) return 0;
    const payload = this.decodeJwtPayload(token);
    if (!payload || typeof payload.exp !== 'number') return null;
    return Math.max(0, payload.exp * 1000 - Date.now());
  }

  public getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('token');
    } catch {
      return null;
    }
  }

  public getStoredUser(): any | null {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  /**
   * Single-flight token refresh mutex.
   * If multiple requests trigger 401 or detect upcoming expiration simultaneously,
   * only ONE network refresh request is made.
   */
  public async refreshToken(): Promise<{ token: string; user: any } | null> {
    if (this.inFlightRefreshPromise) {
      return this.inFlightRefreshPromise;
    }

    const currentToken = this.getStoredToken();
    if (!currentToken) {
      return null;
    }

    this.inFlightRefreshPromise = (async () => {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({ token: currentToken }),
        });

        if (!response.ok) {
          throw new Error('Refresh rejected by server');
        }

        const data = await response.json();
        if (!data.token) {
          throw new Error('Invalid refresh response payload');
        }

        // Update local session
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', data.token);
          if (data.user) {
            localStorage.setItem('currentUser', JSON.stringify(data.user));
          }
        }

        // Broadcast refresh event to other tabs
        crossTabAuthSync.broadcast({
          type: 'SESSION_REFRESHED',
          userId: data.user?.userId || data.user?.id,
        });

        // Reschedule timers
        this.scheduleProactiveExpirationCheck();

        return { token: data.token, user: data.user };
      } catch (err) {
        // Refresh failed; trigger full session expiration
        return null;
      } finally {
        this.inFlightRefreshPromise = null;
      }
    })();

    return this.inFlightRefreshPromise;
  }

  /**
   * Centralized session expiration workflow:
   * 1. Guards against duplicate/concurrent execution.
   * 2. Flushes active form drafts synchronously.
   * 3. Captures current route for the tab.
   * 4. Broadcasts expiration event to other tabs.
   * 5. Clears tokens and smoothly redirects to /login.
   */
  public handleSessionExpired(
    reason: string = 'Session Expired',
    customMessage: string = DEFAULT_TIMEOUT_MESSAGE
  ): void {
    if (this.isProcessingExpiration) {
      return;
    }
    this.isProcessingExpiration = true;

    if (typeof window === 'undefined') return;

    try {
      const currentUser = this.getStoredUser();
      const tabId = getTabId();

      // 1. Flush any active form draft savers immediately
      draftManager.flushAllActiveSavers();

      // 2. Capture the current tab's destination route
      saveCurrentRoute({
        tabId,
        userId: currentUser?.userId || currentUser?.id,
        tenantId: currentUser?.tenantId,
        reason,
      });

      // 3. Clear sensitive authentication credentials
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        sessionStorage.setItem(SESSION_TIMEOUT_KEY, customMessage);
      } catch {
        // Ignore quota/permission errors
      }

      // 4. Broadcast expiration to all other open tabs
      crossTabAuthSync.broadcast({
        type: 'SESSION_EXPIRED',
        reason,
        userId: currentUser?.userId || currentUser?.id,
        tenantId: currentUser?.tenantId,
      });

      // 5. Notify reactive hooks in this window
      window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));

      // 6. Navigate to /login without creating redirect loops
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        const searchParams = new URLSearchParams(window.location.search);
        searchParams.set('timeout', 'true');
        window.location.href = `/login?${searchParams.toString()}`;
      }
    } finally {
      // Release lock after navigation delay
      setTimeout(() => {
        this.isProcessingExpiration = false;
      }, 1000);
    }
  }

  /**
   * Handles incoming cross-tab authentication synchronization events.
   */
  private handleCrossTabEvent(event: AuthSyncEvent): void {
    const tabId = getTabId();

    switch (event.type) {
      case 'SESSION_EXPIRED': {
        // Another tab detected session expiration
        draftManager.flushAllActiveSavers();

        const currentUser = this.getStoredUser();
        saveCurrentRoute({
          tabId,
          userId: currentUser?.userId || currentUser?.id,
          tenantId: currentUser?.tenantId,
          reason: event.reason || 'cross_tab_expiration',
        });

        // Notify in-window hooks
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
          if (window.location.pathname !== '/login') {
            window.location.href = '/login?timeout=true';
          }
        }
        break;
      }

      case 'LOGIN_SUCCESS': {
        // Another tab logged in: check if this tab has a saved route to restore
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));

          if (window.location.pathname === '/login') {
            const restoredRoute = resolvePostLoginRedirect(event.userId, event.tenantId, tabId);
            window.location.href = restoredRoute;
          }
        }
        break;
      }

      case 'LOGOUT': {
        // Another tab logged out
        if (event.intentional) {
          clearSavedRoute(tabId);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        break;
      }

      case 'ACCOUNT_CHANGED': {
        // Authenticated user identity changed
        draftManager.clearTabDrafts(tabId);
        clearSavedRoute(tabId);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
        }
        break;
      }

      case 'SESSION_REFRESHED': {
        // Another tab refreshed tokens
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
        }
        this.scheduleProactiveExpirationCheck();
        break;
      }
    }
  }

  /**
   * Schedules proactive timers for token expiration.
   */
  public scheduleProactiveExpirationCheck(): void {
    if (this.proactiveTimer) {
      clearTimeout(this.proactiveTimer);
      this.proactiveTimer = null;
    }
    if (this.intervalCheckTimer) {
      clearInterval(this.intervalCheckTimer);
      this.intervalCheckTimer = null;
    }

    const token = this.getStoredToken();
    if (!token) return;

    if (this.isTokenExpired(token)) {
      this.handleSessionExpired('Token already expired on evaluation');
      return;
    }

    const remainingMs = this.getTokenRemainingTime(token);
    if (remainingMs !== null && remainingMs > 0) {
      // Proactively attempt refresh 30 seconds before expiration, or trigger expiration
      this.proactiveTimer = setTimeout(async () => {
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          this.handleSessionExpired('Token reached expiration without successful refresh');
        }
      }, Math.max(100, remainingMs - 30000));
    }

    // Interval check every 30 seconds
    this.intervalCheckTimer = setInterval(() => {
      const activeToken = this.getStoredToken();
      if (activeToken && this.isTokenExpired(activeToken)) {
        this.handleSessionExpired('Token expired during interval check');
      }
    }, 30000);
  }

  /**
   * Consumes and clears any pending session timeout message.
   */
  public consumeSessionTimeoutMessage(): string | null {
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

    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('timeout') === 'true') {
        return DEFAULT_TIMEOUT_MESSAGE;
      }
    } catch {
      // Ignore
    }

    return null;
  }

  /**
   * Broadcasts login success event to synchronize other tabs.
   */
  public notifyLoginSuccess(userId: string, tenantId?: string): void {
    crossTabAuthSync.broadcast({
      type: 'LOGIN_SUCCESS',
      userId,
      tenantId,
    });
  }

  /**
   * Broadcasts intentional logout event to synchronize other tabs.
   */
  public notifyLogout(intentional: boolean = true): void {
    const tabId = getTabId();
    if (intentional) {
      clearSavedRoute(tabId);
    }
    crossTabAuthSync.broadcast({
      type: 'LOGOUT',
      intentional,
    });
  }

  /**
   * Cleans up resources.
   */
  public destroy(): void {
    if (this.proactiveTimer) clearTimeout(this.proactiveTimer);
    if (this.intervalCheckTimer) clearInterval(this.intervalCheckTimer);
    if (this.unsubscribeCrossTab) this.unsubscribeCrossTab();
    this.isInitialized = false;
  }
}

export const authSessionManager = new AuthSessionManager();
