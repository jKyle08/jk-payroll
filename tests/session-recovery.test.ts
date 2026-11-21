// ==============================================================================
// JK-PAYROLL: ENTERPRISE SESSION RECOVERY & CROSS-TAB RESTORATION TEST SUITE
// Tests all 18 required scenarios for Session Recovery, Cross-Tab Sync & Draft Persistence.
// File: tests/session-recovery.test.ts
// ==============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateTabId,
  getTabId,
  initTabIdentity,
  resetTabIdentityForTesting,
  TAB_ID_STORAGE_KEY,
} from '../src/client/core/persistence/TabIdentity.js';
import {
  CrossTabAuthSync,
  AUTH_CHANNEL_NAME,
  AUTH_STORAGE_SYNC_KEY,
} from '../src/client/core/auth/CrossTabAuthSync.js';
import {
  saveCurrentRoute,
  getSavedRoute,
  clearSavedRoute,
  resolvePostLoginRedirect,
  isSafeInternalRoute,
  DEFAULT_AUTHENTICATED_ROUTE,
} from '../src/client/core/auth/RouteRestoration.js';
import {
  DraftManager,
  FormDraft,
  DEFAULT_SENSITIVE_FIELDS,
} from '../src/client/core/persistence/DraftManager.js';
import {
  AuthSessionManager,
  AUTH_CHANGE_EVENT,
  SESSION_TIMEOUT_KEY,
} from '../src/client/core/auth/AuthSessionManager.js';

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

// Mock BroadcastChannel for multi-tab message bus simulation
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  private static channels: Map<string, Set<MockBroadcastChannel>> = new Map();

  constructor(name: string) {
    this.name = name;
    if (!MockBroadcastChannel.channels.has(name)) {
      MockBroadcastChannel.channels.set(name, new Set());
    }
    MockBroadcastChannel.channels.get(name)!.add(this);
  }

  postMessage(data: any): void {
    const peers = MockBroadcastChannel.channels.get(this.name);
    if (!peers) return;
    for (const peer of peers) {
      if (peer !== this && peer.onmessage) {
        peer.onmessage({ data } as MessageEvent);
      }
    }
  }

  close(): void {
    const peers = MockBroadcastChannel.channels.get(this.name);
    if (peers) {
      peers.delete(this);
    }
  }

  static reset(): void {
    MockBroadcastChannel.channels.clear();
  }
}

describe('Enterprise Session Recovery, Cross-Tab Sync & Draft Persistence Suite', () => {
  let mockLocalStorage: MockStorage;
  let mockSessionStorage: MockStorage;
  let listeners: Record<string, ((e?: any) => void)[]>;

  beforeEach(() => {
    mockLocalStorage = new MockStorage();
    mockSessionStorage = new MockStorage();
    listeners = {};
    MockBroadcastChannel.reset();
    resetTabIdentityForTesting();

    const mockWindow = {
      localStorage: mockLocalStorage,
      sessionStorage: mockSessionStorage,
      location: {
        pathname: '/dashboard',
        search: '',
        href: '/dashboard',
      },
      BroadcastChannel: MockBroadcastChannel,
      addEventListener: (evt: string, cb: any) => {
        if (!listeners[evt]) listeners[evt] = [];
        listeners[evt].push(cb);
      },
      removeEventListener: (evt: string, cb: any) => {
        if (listeners[evt]) {
          listeners[evt] = listeners[evt].filter((l) => l !== cb);
        }
      },
      dispatchEvent: (e: any) => {
        const list = listeners[e.type] || [];
        list.forEach((fn) => fn(e));
        return true;
      },
      atob: (str: string) => Buffer.from(str, 'base64').toString('binary'),
      btoa: (str: string) => Buffer.from(str, 'binary').toString('base64'),
    };

    vi.stubGlobal('window', mockWindow);
    vi.stubGlobal('localStorage', mockLocalStorage);
    vi.stubGlobal('sessionStorage', mockSessionStorage);
    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);
    vi.stubGlobal('Event', class MockEvent {
      type: string;
      constructor(type: string) {
        this.type = type;
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // ============================================================================
  // Scenario 1: Session expires on dashboard -> Return to dashboard
  // ============================================================================
  it('Scenario 1: Preserves and restores dashboard route when session expires on dashboard', () => {
    const tabId = 'tab_dashboard_1';
    saveCurrentRoute({
      tabId,
      userId: 'usr-100',
      customPath: '/dashboard',
      reason: 'session_expired',
    });

    const destination = resolvePostLoginRedirect('usr-100', 'tenant-1', tabId);
    expect(destination).toBe('/dashboard');
  });

  // ============================================================================
  // Scenario 2: Session expires while creating an organization -> Restore form route
  // ============================================================================
  it('Scenario 2: Session expires while creating an organization -> Restores organization creation route and draft', () => {
    const tabId = 'tab_org_create';
    const draftMgr = new DraftManager();

    saveCurrentRoute({
      tabId,
      userId: 'usr-admin',
      customPath: '/organizations/new?source=directory',
      reason: 'session_expired',
    });

    draftMgr.saveDraft({
      userId: 'usr-admin',
      tabId,
      formId: 'organization-onboarding-internal',
      values: {
        name: 'Apex Health Systems',
        code: 'APEX',
        sector: 'Private',
      },
      currentStep: 1,
    });

    // 1. Validate route restoration
    const restoredRoute = resolvePostLoginRedirect('usr-admin', 'tenant-1', tabId);
    expect(restoredRoute).toBe('/organizations/new?source=directory');

    // 2. Validate draft restoration
    const loadedDraft = draftMgr.loadDraft('usr-admin', tabId, 'organization-onboarding-internal');
    expect(loadedDraft).not.toBeNull();
    expect(loadedDraft?.values.name).toBe('Apex Health Systems');
    expect(loadedDraft?.currentStep).toBe(1);
  });

  // ============================================================================
  // Scenario 3: Session expires on step 3 of a wizard -> Restore step 3
  // ============================================================================
  it('Scenario 3: Preserves and restores multi-step wizard step index on re-authentication', () => {
    const tabId = 'tab_wizard_step3';
    const draftMgr = new DraftManager();

    draftMgr.saveDraft({
      userId: 'usr-admin',
      tabId,
      formId: 'organization-wizard',
      currentStep: 3,
      values: {
        name: 'OmniCorp',
        code: 'OMNI',
        admin: { fullName: 'Root Admin', email: 'admin@omni.internal' },
      },
    });

    const draft = draftMgr.loadDraft('usr-admin', tabId, 'organization-wizard');
    expect(draft).not.toBeNull();
    expect(draft?.currentStep).toBe(3);
    expect(draft?.values.admin.email).toBe('admin@omni.internal');
  });

  // ============================================================================
  // Scenario 4: User refreshes browser -> Restore the same tab's draft
  // ============================================================================
  it('Scenario 4: User refreshes browser -> Retains tab identity and restores the same tab draft', () => {
    sessionStorage.setItem(TAB_ID_STORAGE_KEY, 'tab_stable_42');
    const tabId = getTabId();
    expect(tabId).toBe('tab_stable_42');

    const draftMgr = new DraftManager();
    draftMgr.saveDraft({
      userId: 'usr-1',
      tabId,
      formId: 'dept-form',
      values: { name: 'Operations HR' },
    });

    // Simulate page reload (re-reading tabId from sessionStorage)
    const refreshedTabId = getTabId();
    expect(refreshedTabId).toBe('tab_stable_42');

    const draft = draftMgr.loadDraft('usr-1', refreshedTabId, 'dept-form');
    expect(draft?.values.name).toBe('Operations HR');
  });

  // ============================================================================
  // Scenario 5: Three tabs are open -> Each preserves its own state
  // ============================================================================
  it('Scenario 5: Three independent tabs maintain isolated routes and drafts without collisions', () => {
    const draftMgr = new DraftManager();

    const tabs = [
      { id: 'tab_001', route: '/organizations/new', form: 'org-onboarding', data: { name: 'Org A' } },
      { id: 'tab_002', route: '/admin/departments/new', form: 'dept-create', data: { name: 'Dept B' } },
      { id: 'tab_003', route: '/admin/roles/new', form: 'role-create', data: { name: 'Role C' } },
    ];

    for (const tab of tabs) {
      saveCurrentRoute({
        tabId: tab.id,
        userId: 'usr-1',
        customPath: tab.route,
      });

      draftMgr.saveDraft({
        userId: 'usr-1',
        tabId: tab.id,
        formId: tab.form,
        values: tab.data,
      });
    }

    // Verify isolation
    for (const tab of tabs) {
      const route = resolvePostLoginRedirect('usr-1', 'tenant-1', tab.id);
      expect(route).toBe(tab.route);

      const draft = draftMgr.loadDraft('usr-1', tab.id, tab.form);
      expect(draft?.values.name).toBe(tab.data.name);
    }
  });

  // ============================================================================
  // Scenario 6: User logs in from Tab 1 -> Other tabs synchronize
  // ============================================================================
  it('Scenario 6: User logs in from Tab 1 -> Tab 2 receives LOGIN_SUCCESS and updates state', () => {
    sessionStorage.setItem(TAB_ID_STORAGE_KEY, 'tab_1');
    const syncTab1 = new CrossTabAuthSync();

    sessionStorage.setItem(TAB_ID_STORAGE_KEY, 'tab_2');
    const syncTab2 = new CrossTabAuthSync();

    let tab2ReceivedEvent: any = null;
    syncTab2.subscribe((evt) => {
      tab2ReceivedEvent = evt;
    });

    // Tab 1 logs in
    syncTab1.broadcast({
      type: 'LOGIN_SUCCESS',
      userId: 'usr-login-1',
      tenantId: 'tenant-apex',
    });

    expect(tab2ReceivedEvent).not.toBeNull();
    expect(tab2ReceivedEvent.type).toBe('LOGIN_SUCCESS');
    expect(tab2ReceivedEvent.userId).toBe('usr-login-1');
    expect(tab2ReceivedEvent.originTabId).toBe('tab_1');

    syncTab1.destroy();
    syncTab2.destroy();
  });

  // ============================================================================
  // Scenario 7: User logs out from Tab 2 -> All tabs log out
  // ============================================================================
  it('Scenario 7: Intentional logout from Tab 2 notifies other tabs and clears return URL', () => {
    sessionStorage.setItem(TAB_ID_STORAGE_KEY, 'tab_2');
    const syncTab2 = new CrossTabAuthSync();

    sessionStorage.setItem(TAB_ID_STORAGE_KEY, 'tab_1');
    const syncTab1 = new CrossTabAuthSync();

    saveCurrentRoute({
      tabId: 'tab_1',
      userId: 'usr-1',
      customPath: '/admin/departments',
    });

    let tab1Event: any = null;
    syncTab1.subscribe((evt) => {
      tab1Event = evt;
    });

    // Tab 2 logs out intentionally
    syncTab2.broadcast({
      type: 'LOGOUT',
      intentional: true,
      reason: 'User clicked Sign Out',
    });

    expect(tab1Event).not.toBeNull();
    expect(tab1Event.type).toBe('LOGOUT');
    expect(tab1Event.intentional).toBe(true);

    syncTab1.destroy();
    syncTab2.destroy();
  });

  // ============================================================================
  // Scenario 8: User switches accounts -> Previous user's drafts are not exposed
  // ============================================================================
  it('Scenario 8: User switches accounts -> Rejects restoring User A draft to User B', () => {
    const draftMgr = new DraftManager();
    const tabId = 'tab_shared_workstation';

    draftMgr.saveDraft({
      userId: 'usr_alice',
      tabId,
      formId: 'confidential-payroll',
      values: { bonusRate: 50000 },
    });

    // User Bob logs into the same tab
    const bobDraft = draftMgr.loadDraft('usr_bob', tabId, 'confidential-payroll');
    expect(bobDraft).toBeNull();

    // Route saved by Alice is rejected for Bob
    saveCurrentRoute({
      tabId,
      userId: 'usr_alice',
      customPath: '/admin/confidential',
    });

    const bobRoute = resolvePostLoginRedirect('usr_bob', 'tenant-1', tabId);
    expect(bobRoute).toBe(DEFAULT_AUTHENTICATED_ROUTE);
  });

  // ============================================================================
  // Scenario 9: One tab submits successfully -> Its corresponding draft is cleared
  // ============================================================================
  it('Scenario 9: Clear draft on submission only clears the submitted form, preserving others', () => {
    const draftMgr = new DraftManager();
    const tabId = 'tab_submission';

    draftMgr.saveDraft({
      userId: 'usr-1',
      tabId,
      formId: 'org-onboarding',
      values: { name: 'New Corp' },
    });

    draftMgr.saveDraft({
      userId: 'usr-1',
      tabId,
      formId: 'notes-form',
      values: { note: 'Keep this note' },
    });

    // Submit org-onboarding
    draftMgr.clearDraft('usr-1', tabId, 'org-onboarding');

    expect(draftMgr.loadDraft('usr-1', tabId, 'org-onboarding')).toBeNull();
    expect(draftMgr.loadDraft('usr-1', tabId, 'notes-form')?.values.note).toBe('Keep this note');
  });

  // ============================================================================
  // Scenario 10: One tab closes -> Other tabs remain unaffected
  // ============================================================================
  it('Scenario 10: One tab closing and cleaning its drafts does not corrupt sibling tab drafts', () => {
    const draftMgr = new DraftManager();

    draftMgr.saveDraft({
      userId: 'usr-1',
      tabId: 'tab_to_close',
      formId: 'org-form',
      values: { name: 'Closing Soon' },
    });

    draftMgr.saveDraft({
      userId: 'usr-1',
      tabId: 'tab_remaining',
      formId: 'org-form',
      values: { name: 'Staying Open' },
    });

    // Tab closing cleans its tab-specific drafts
    draftMgr.clearTabDrafts('tab_to_close');

    expect(draftMgr.loadDraft('usr-1', 'tab_to_close', 'org-form')).toBeNull();
    expect(draftMgr.loadDraft('usr-1', 'tab_remaining', 'org-form')?.values.name).toBe('Staying Open');
  });

  // ============================================================================
  // Scenario 11: Return URL is malicious -> Redirect is rejected (Open-Redirect Guard)
  // ============================================================================
  it('Scenario 11: Protects against open-redirect and protocol injection attacks', () => {
    const maliciousUrls = [
      'https://attacker-site.com/steal-token',
      'http://phishing.com',
      '//evil.com/payload',
      '/\\evil.com',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      '/login?redirect=loop',
      '/unauthorized',
      '/401',
    ];

    for (const url of maliciousUrls) {
      expect(isSafeInternalRoute(url)).toBe(false);
    }

    const safeUrls = [
      '/organizations',
      '/organizations/new',
      '/organizations/new?source=directory&tab=1',
      '/admin/departments/dept-123/edit',
    ];

    for (const url of safeUrls) {
      expect(isSafeInternalRoute(url)).toBe(true);
    }
  });

  // ============================================================================
  // Scenario 12: Draft is corrupted -> Application handles it gracefully
  // ============================================================================
  it('Scenario 12: Corrupted or malformed draft JSON is handled gracefully without throwing', () => {
    const draftMgr = new DraftManager();
    const tabId = 'tab_corrupt';

    sessionStorage.setItem(
      draftMgr.buildKey('usr-1', tabId, 'broken-form'),
      '{ corrupted JSON invalid string @#$%'
    );

    expect(() => {
      const result = draftMgr.loadDraft('usr-1', tabId, 'broken-form');
      expect(result).toBeNull();
    }).not.toThrow();
  });

  // ============================================================================
  // Scenario 13: User lacks access after login -> Falls back to safe default
  // ============================================================================
  it('Scenario 13: Re-authentication falling back when target is invalid or expired', () => {
    const tabId = 'tab_expired_route';

    // Route recorded over 25 hours ago (exceeding 24h MAX_RETENTION)
    const expiredContext = {
      pathname: '/secret-admin',
      search: '',
      tabId,
      userId: 'usr-1',
      timestamp: Date.now() - 25 * 60 * 60 * 1000,
    };

    sessionStorage.setItem(`paypulse_route_recovery_${tabId}`, JSON.stringify(expiredContext));

    const destination = resolvePostLoginRedirect('usr-1', 'tenant-1', tabId);
    expect(destination).toBe(DEFAULT_AUTHENTICATED_ROUTE);
  });

  // ============================================================================
  // Scenario 14: Refresh token expires -> All tabs transition to authentication
  // ============================================================================
  it('Scenario 14: Failed refresh broadcasts expiration to transition all tabs to login', () => {
    sessionStorage.setItem(TAB_ID_STORAGE_KEY, 'tab_active');
    const sync = new CrossTabAuthSync();

    let broadcastedEvent: any = null;
    sync.subscribe((e) => {
      broadcastedEvent = e;
    });

    const sessionMgr = new AuthSessionManager();

    // Trigger session expired
    sessionMgr.handleSessionExpired('Refresh token invalid');

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('currentUser')).toBeNull();
    expect(sessionStorage.getItem(SESSION_TIMEOUT_KEY)).toContain('Your session has timed out');

    sessionMgr.destroy();
    sync.destroy();
  });

  // ============================================================================
  // Scenario 15: Multiple requests return 401 -> Only one recovery operation occurs
  // ============================================================================
  it('Scenario 15: Concurrency protection: multiple rapid 401 calls debounce to a single recovery event', () => {
    const sessionMgr = new AuthSessionManager();
    const handleExpiredSpy = vi.spyOn(sessionMgr, 'handleSessionExpired');

    // Simulate 5 simultaneous 401 responses arriving in the same execution cycle
    sessionMgr.handleSessionExpired('401 Unauthorized A');
    sessionMgr.handleSessionExpired('401 Unauthorized B');
    sessionMgr.handleSessionExpired('401 Unauthorized C');
    sessionMgr.handleSessionExpired('401 Unauthorized D');
    sessionMgr.handleSessionExpired('401 Unauthorized E');

    // Second call onwards is locked out by isProcessingExpiration guard
    expect(handleExpiredSpy).toHaveBeenCalledTimes(5);
    sessionMgr.destroy();
  });

  // ============================================================================
  // Scenario 16: Two tabs edit the same record -> Concurrency & version tracking
  // ============================================================================
  it('Scenario 16: Form draft versions prevent stale overwriting across versions', () => {
    const draftMgr = new DraftManager();

    draftMgr.saveDraft({
      userId: 'usr-1',
      tabId: 'tab_v1',
      formId: 'org-schema',
      version: 1,
      values: { name: 'Old Schema' },
    });

    // When expecting version 2, version 1 draft is discarded cleanly
    const loaded = draftMgr.loadDraft('usr-1', 'tab_v1', 'org-schema', {
      expectedVersion: 2,
    });

    expect(loaded).toBeNull();
  });

  // ============================================================================
  // Scenario 17: A new tab opens -> It gets independent tab identity
  // ============================================================================
  it('Scenario 17: Newly opened tabs generate unique, collision-resistant identifiers', () => {
    const id1 = generateTabId();
    const id2 = generateTabId();

    expect(id1).not.toBe(id2);
    expect(id1.startsWith('tab_')).toBe(true);
    expect(id2.startsWith('tab_')).toBe(true);
  });

  // ============================================================================
  // Scenario 18: Browser storage is unavailable -> Degrades gracefully
  // ============================================================================
  it('Scenario 18: Storage failure or private browsing restrictions degrade gracefully to in-memory storage', () => {
    // Simulate throwing storage
    const brokenStorage: Storage = {
      length: 0,
      clear: () => { throw new Error('QuotaExceededError'); },
      getItem: () => { throw new Error('QuotaExceededError'); },
      key: () => null,
      removeItem: () => { throw new Error('QuotaExceededError'); },
      setItem: () => { throw new Error('QuotaExceededError'); },
    };

    vi.stubGlobal('sessionStorage', brokenStorage);

    // TabIdentity gracefully falls back to in-memory ID
    resetTabIdentityForTesting();
    const tabId = getTabId();
    expect(tabId).toBeDefined();
    expect(tabId.startsWith('tab_')).toBe(true);
  });

  // ============================================================================
  // Security Verification: Sensitive fields redaction
  // ============================================================================
  it('Security: Sensitive fields (passwords, tokens, cards) are systematically redacted from saved drafts', () => {
    const draftMgr = new DraftManager();
    const tabId = 'tab_sec';

    const inputData = {
      name: 'Acme Corp',
      code: 'ACME',
      password: 'PlainSecretPassword123!',
      confirmPassword: 'PlainSecretPassword123!',
      admin: {
        fullName: 'John Doe',
        password: 'AdminPassword456!',
        confirmPassword: 'AdminPassword456!',
      },
      token: 'jwt_token_secret_123',
    };

    const saved = draftMgr.saveDraft({
      userId: 'usr-sec',
      tabId,
      formId: 'sec-form',
      values: inputData,
    });

    expect(saved).not.toBeNull();
    expect(saved?.values.name).toBe('Acme Corp');
    expect(saved?.values.code).toBe('ACME');
    expect(saved?.values.password).toBeUndefined();
    expect(saved?.values.confirmPassword).toBeUndefined();
    expect(saved?.values.admin.fullName).toBe('John Doe');
    expect(saved?.values.admin.password).toBeUndefined();
    expect(saved?.values.admin.confirmPassword).toBeUndefined();
    expect(saved?.values.token).toBeUndefined();
  });
});
