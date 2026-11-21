// ==============================================================================
// JK-PAYROLL: CROSS-TAB AUTHENTICATION SYNCHRONIZATION SERVICE
// Communicates auth state changes across browser tabs via BroadcastChannel & storage events.
// SECURITY REQUIREMENT: No sensitive credentials (tokens, passwords) are ever broadcast.
// File: src/client/core/auth/CrossTabAuthSync.ts
// ==============================================================================

import { getTabId } from '../persistence/TabIdentity.js';

export const AUTH_CHANNEL_NAME = 'paypulse_auth_channel';
export const AUTH_STORAGE_SYNC_KEY = 'paypulse_auth_sync_event';

export type AuthSyncEventType =
  | 'SESSION_EXPIRED'
  | 'LOGIN_SUCCESS'
  | 'LOGOUT'
  | 'SESSION_REFRESHED'
  | 'ACCOUNT_CHANGED';

export interface AuthSyncEvent {
  type: AuthSyncEventType;
  originTabId: string;
  timestamp: number;
  userId?: string;
  tenantId?: string;
  previousUserId?: string;
  newUserId?: string;
  reason?: string;
  intentional?: boolean;
}

export type AuthSyncListener = (event: AuthSyncEvent) => void;

export class CrossTabAuthSync {
  private tabId: string;
  private channel: BroadcastChannel | null = null;
  private listeners: Set<AuthSyncListener> = new Set();
  private storageEventListener: ((e: StorageEvent) => void) | null = null;
  private isDestroyed = false;

  constructor(tabId?: string) {
    this.tabId = tabId || getTabId();
    this.initChannel();
    this.initStorageFallback();
  }

  private initChannel(): void {
    if (typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function') {
      try {
        this.channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
        this.channel.onmessage = (event: MessageEvent) => {
          this.handleIncomingRawEvent(event.data);
        };
      } catch (err) {
        // Fallback to storage events if BroadcastChannel constructor fails
        this.channel = null;
      }
    }
  }

  private initStorageFallback(): void {
    if (typeof window === 'undefined') return;

    this.storageEventListener = (event: StorageEvent) => {
      if (event.key === AUTH_STORAGE_SYNC_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          this.handleIncomingRawEvent(parsed);
        } catch {
          // Ignore malformed storage messages
        }
      }
    };

    window.addEventListener('storage', this.storageEventListener);
  }

  private handleIncomingRawEvent(data: any): void {
    if (this.isDestroyed || !data || typeof data !== 'object') return;

    // Prevent echo: ignore events originated from the current tab
    if (data.originTabId === this.tabId) {
      return;
    }

    const event: AuthSyncEvent = {
      type: data.type,
      originTabId: data.originTabId || 'unknown_tab',
      timestamp: typeof data.timestamp === 'number' ? data.timestamp : Date.now(),
      userId: data.userId,
      tenantId: data.tenantId,
      previousUserId: data.previousUserId,
      newUserId: data.newUserId,
      reason: data.reason,
      intentional: data.intentional,
    };

    this.notifyListeners(event);
  }

  private notifyListeners(event: AuthSyncEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[CrossTabAuthSync] Listener error:', err);
      }
    }
  }

  /**
   * Broadcasts a non-sensitive authentication event to all other tabs.
   * Strips any accidentally passed sensitive tokens or secrets.
   */
  public broadcast(payload: {
    type: AuthSyncEventType;
    userId?: string;
    tenantId?: string;
    previousUserId?: string;
    newUserId?: string;
    reason?: string;
    intentional?: boolean;
  }): void {
    if (this.isDestroyed) return;

    const event: AuthSyncEvent = {
      type: payload.type,
      originTabId: this.tabId,
      timestamp: Date.now(),
      userId: payload.userId,
      tenantId: payload.tenantId,
      previousUserId: payload.previousUserId,
      newUserId: payload.newUserId,
      reason: payload.reason,
      intentional: payload.intentional,
    };

    // 1. Send via BroadcastChannel if available
    if (this.channel) {
      try {
        this.channel.postMessage(event);
      } catch {
        // Fall back to storage if postMessage fails
      }
    }

    // 2. Always write to localStorage fallback so tabs that don't support
    // BroadcastChannel or are in differing worker contexts receive the message
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const payloadString = JSON.stringify({
          ...event,
          _seq: `${Date.now()}_${Math.random()}`,
        });
        window.localStorage.setItem(AUTH_STORAGE_SYNC_KEY, payloadString);
      } catch {
        // Ignore storage quota / permissions exceptions
      }
    }
  }

  /**
   * Subscribes a listener to cross-tab auth events.
   * Returns an unsubscribe function.
   */
  public subscribe(listener: AuthSyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Cleans up channel and storage listeners.
   */
  public destroy(): void {
    this.isDestroyed = true;
    this.listeners.clear();

    if (this.channel) {
      try {
        this.channel.close();
      } catch {
        // Ignore
      }
      this.channel = null;
    }

    if (this.storageEventListener && typeof window !== 'undefined') {
      try {
        window.removeEventListener('storage', this.storageEventListener);
      } catch {
        // Ignore
      }
      this.storageEventListener = null;
    }
  }
}

// Singleton cross-tab sync instance
export const crossTabAuthSync = new CrossTabAuthSync();
