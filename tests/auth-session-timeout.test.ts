import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isTokenExpired,
  getTokenRemainingTime,
  decodeJwtPayload,
  handleSessionTimeout,
  consumeSessionTimeoutMessage,
  AUTH_CHANGE_EVENT,
  SESSION_TIMEOUT_KEY,
} from '../src/client/lib/auth-session.js';

class MockStorage implements Storage {
  private store: Record<string, string> = {};
  get length(): number {
    return Object.keys(this.store).length;
  }
  clear(): void {
    this.store = {};
  }
  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }
  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null;
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
}

describe('Client Auth Session & Timeout Management', () => {
  const mockLocalStorage = new MockStorage();
  const mockSessionStorage = new MockStorage();

  beforeEach(() => {
    mockLocalStorage.clear();
    mockSessionStorage.clear();

    const mockListeners: Record<string, ((e?: any) => void)[]> = {};

    const mockWindow = {
      localStorage: mockLocalStorage,
      sessionStorage: mockSessionStorage,
      location: {
        pathname: '/dashboard',
        search: '',
        href: '/dashboard',
      },
      atob: (str: string) => Buffer.from(str, 'base64').toString('binary'),
      btoa: (str: string) => Buffer.from(str, 'binary').toString('base64'),
      addEventListener: (event: string, cb: any) => {
        if (!mockListeners[event]) mockListeners[event] = [];
        mockListeners[event].push(cb);
      },
      removeEventListener: (event: string, cb: any) => {
        if (mockListeners[event]) {
          mockListeners[event] = mockListeners[event].filter((l) => l !== cb);
        }
      },
      dispatchEvent: (e: any) => {
        const list = mockListeners[e.type] || [];
        list.forEach((fn) => fn(e));
        return true;
      },
    };

    vi.stubGlobal('window', mockWindow);
    vi.stubGlobal('localStorage', mockLocalStorage);
    vi.stubGlobal('sessionStorage', mockSessionStorage);
    vi.stubGlobal('Event', class MockEvent {
      type: string;
      constructor(type: string) {
        this.type = type;
      }
    });
  });

  // Helper to create simple test JWT with expiration
  function createTestJwt(expSeconds: number): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({ sub: 'usr-123', email: 'test@paypulse.internal', exp: expSeconds })).toString('base64');
    const sig = 'mock_signature';
    return `${header}.${payload}.${sig}`;
  }

  it('correctly identifies expired tokens', () => {
    expect(isTokenExpired(null)).toBe(true);
    expect(isTokenExpired('')).toBe(true);

    const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const expiredToken = createTestJwt(pastExp);
    expect(isTokenExpired(expiredToken)).toBe(true);
  });

  it('correctly identifies valid active tokens', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future
    const activeToken = createTestJwt(futureExp);
    expect(isTokenExpired(activeToken)).toBe(false);
  });

  it('calculates remaining milliseconds until expiration', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 60; // 60 seconds
    const activeToken = createTestJwt(futureExp);
    const remaining = getTokenRemainingTime(activeToken);
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(61000);
  });

  it('decodes JWT payload claims accurately', () => {
    const token = createTestJwt(1893456000);
    const payload = decodeJwtPayload(token);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe('usr-123');
    expect(payload?.email).toBe('test@paypulse.internal');
  });

  it('handleSessionTimeout clears storage and dispatches auth-change event', () => {
    localStorage.setItem('token', 'stale_token_123');
    localStorage.setItem('currentUser', JSON.stringify({ userId: 'usr-123' }));

    let eventFired = false;
    window.addEventListener(AUTH_CHANGE_EVENT, () => {
      eventFired = true;
    }, { once: true });

    handleSessionTimeout('Custom timeout reason');

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('currentUser')).toBeNull();
    expect(sessionStorage.getItem(SESSION_TIMEOUT_KEY)).toBe('Custom timeout reason');
    expect(eventFired).toBe(true);
  });

  it('consumeSessionTimeoutMessage retrieves and clears message', () => {
    sessionStorage.setItem(SESSION_TIMEOUT_KEY, 'Session expired. Please re-login.');

    const msg = consumeSessionTimeoutMessage();
    expect(msg).toBe('Session expired. Please re-login.');
    expect(sessionStorage.getItem(SESSION_TIMEOUT_KEY)).toBeNull();
  });
});
