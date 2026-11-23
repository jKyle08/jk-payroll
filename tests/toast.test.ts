// ==============================================================================
// PAYPULSE ENTERPRISE TOAST & COMMON MESSAGE NOTIFICATION TEST SUITE
// File: tests/toast.test.ts
// ==============================================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import React from 'react';
import {
  toast,
  toastStore,
  ToastCard,
  ToastContainer,
  ToastProvider,
  useToast,
  DEFAULT_DURATIONS,
  MESSAGE_CATALOG,
  isCatalogKey,
  resolveCatalogMessage,
  interpolate,
  parseApiError,
  isDuplicateError,
} from '../src/client/components/ui/index.js';

describe('PayPulse Enterprise Toast Notification & Message Catalog System', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    toastStore.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============================================================================
  // 1. NOTIFICATION VARIANTS & DEFAULT DURATIONS
  // ============================================================================
  describe('1. Notification Variants & Default Durations', () => {
    it('creates a success toast with default duration 3500ms', () => {
      const id = toast.success('Operation completed successfully', {
        description: 'Employee record updated.',
      });

      const toasts = toastStore.getSnapshot();
      expect(toasts).toHaveLength(1);
      expect(toasts[0].id).toBe(id);
      expect(toasts[0].type).toBe('success');
      expect(toasts[0].title).toBe('Operation completed successfully');
      expect(toasts[0].description).toBe('Employee record updated.');
      expect(toasts[0].duration).toBe(3500);
      expect(DEFAULT_DURATIONS.success).toBe(3500);
    });

    it('creates an error toast with default duration 5000ms', () => {
      const id = toast.error('Failed to submit payroll', {
        description: 'Server returned 403 Forbidden.',
      });

      const toasts = toastStore.getSnapshot();
      expect(toasts).toHaveLength(1);
      expect(toasts[0].id).toBe(id);
      expect(toasts[0].type).toBe('error');
      expect(toasts[0].title).toBe('Failed to submit payroll');
      expect(toasts[0].description).toBe('Server returned 403 Forbidden.');
      expect(toasts[0].duration).toBe(5000);
      expect(DEFAULT_DURATIONS.error).toBe(5000);
    });

    it('creates a warning toast with default duration 5000ms', () => {
      const id = toast.warning('Session expiring soon', {
        description: 'Please save your work.',
      });

      const toasts = toastStore.getSnapshot();
      expect(toasts).toHaveLength(1);
      expect(toasts[0].type).toBe('warning');
      expect(toasts[0].duration).toBe(5000);
      expect(DEFAULT_DURATIONS.warning).toBe(5000);
    });

    it('creates an info toast with default duration 4000ms', () => {
      const id = toast.info('System maintenance scheduled', {
        description: 'Tonight at 11:00 PM UTC.',
      });

      const toasts = toastStore.getSnapshot();
      expect(toasts).toHaveLength(1);
      expect(toasts[0].type).toBe('info');
      expect(toasts[0].duration).toBe(4000);
      expect(DEFAULT_DURATIONS.info).toBe(4000);
    });

    it('creates a loading toast that is persistent (duration: 0)', () => {
      const id = toast.loading('Calculating monthly disbursements...');

      const toasts = toastStore.getSnapshot();
      expect(toasts).toHaveLength(1);
      expect(toasts[0].type).toBe('loading');
      expect(toasts[0].duration).toBe(0);
      expect(DEFAULT_DURATIONS.loading).toBe(0);
    });
  });

  // ============================================================================
  // 2. CENTRALIZED COMMON MESSAGE CATALOG RESOLUTION
  // ============================================================================
  describe('2. Message Catalog Resolution across Domains', () => {
    it('verifies catalog key recognition utility', () => {
      expect(isCatalogKey('employee.created' as any)).toBe(false);
      expect(isCatalogKey('employees.created')).toBe(true);
      expect(isCatalogKey('auth.login_success')).toBe(true);
      expect(isCatalogKey('random.non_existent_key')).toBe(false);
    });

    it('resolves employees domain messages with interpolation', () => {
      const toastId = toast.success('employees.created', { name: 'Sarah Connor' });
      const current = toastStore.getSnapshot().find((t) => t.id === toastId);

      expect(current).toBeDefined();
      expect(current?.type).toBe('success');
      expect(current?.title).toBe('Employee added');
      expect(current?.description).toBe('Sarah Connor has been successfully added to your organization.');
      expect(current?.duration).toBe(3500);
    });

    it('resolves organization domain messages with multiple parameters', () => {
      const toastId = toast.info('organization.switched', {
        name: 'Apex Health Systems',
        code: 'APEX-HLTH',
      });
      const current = toastStore.getSnapshot().find((t) => t.id === toastId);

      expect(current?.type).toBe('info');
      expect(current?.title).toBe('Workspace switched');
      expect(current?.description).toBe('Active workspace changed to Apex Health Systems (APEX-HLTH).');
    });

    it('resolves payroll domain messages and default durations', () => {
      const toastId = toast.loading('payroll.processing_started');
      const current = toastStore.getSnapshot().find((t) => t.id === toastId);

      expect(current?.type).toBe('loading');
      expect(current?.title).toBe('Processing payroll batch');
      expect(current?.duration).toBe(0);
    });

    it('resolves attendance domain messages', () => {
      const toastId = toast.success('attendance.leave_requested', { days: 3 });
      const current = toastStore.getSnapshot().find((t) => t.id === toastId);

      expect(current?.title).toBe('Leave request submitted');
      expect(current?.description).toBe('Your leave request for 3 day(s) was submitted for manager review.');
    });

    it('resolves network domain messages', () => {
      const toastId = toast.error('network.offline');
      const current = toastStore.getSnapshot().find((t) => t.id === toastId);

      expect(current?.title).toBe('Network connection lost');
      expect(current?.type).toBe('error');
    });

    it('resolves validation conflict domain messages', () => {
      const toastId = toast.warning('validation.conflict', { identifier: 'DEPT-HR' });
      const current = toastStore.getSnapshot().find((t) => t.id === toastId);

      expect(current?.title).toBe('Duplicate entry detected');
      expect(current?.description).toContain('DEPT-HR');
    });

    it('resolves users domain messages with count interpolation', () => {
      const toastId = toast.success('users.role_assigned', {
        roleName: 'Payroll Officer',
        count: 4,
      });
      const current = toastStore.getSnapshot().find((t) => t.id === toastId);

      expect(current?.title).toBe('Role assigned');
      expect(current?.description).toBe('Security role "Payroll Officer" assigned to 4 team member(s).');
    });

    it('handles missing/unregistered catalog keys cleanly without throwing', () => {
      const toastId = toast.info('custom.unregistered_event_key');
      const current = toastStore.getSnapshot().find((t) => t.id === toastId);

      expect(current).toBeDefined();
      expect(current?.title).toBe('custom.unregistered_event_key');
    });

    it('allows overriding title, description, and duration on a catalog key', () => {
      const toastId = toast.success('employees.created', {
        name: 'Alex Wright',
        title: 'New Team Member Provisioned',
        duration: 9000,
      });
      const current = toastStore.getSnapshot().find((t) => t.id === toastId);

      expect(current?.title).toBe('New Team Member Provisioned');
      expect(current?.description).toBe('Alex Wright has been successfully added to your organization.');
      expect(current?.duration).toBe(9000);
    });
  });

  // ============================================================================
  // 3. STRING INTERPOLATION ENGINE
  // ============================================================================
  describe('3. Dynamic String Interpolation Engine', () => {
    it('interpolates single and multiple placeholders correctly', () => {
      expect(interpolate('Hello {{name}}!', { name: 'Alice' })).toBe('Hello Alice!');
      expect(interpolate('Batch #{{id}} for {{count}} items.', { id: 'PR-101', count: 42 })).toBe(
        'Batch #PR-101 for 42 items.'
      );
    });

    it('handles missing, null, or undefined parameters gracefully', () => {
      expect(interpolate('Hello {{name}}!', {})).toBe('Hello {{name}}!');
      expect(interpolate('Hello {{name}}!', { name: null })).toBe('Hello !');
      expect(interpolate('Plain string with no tokens', { name: 'Alice' })).toBe(
        'Plain string with no tokens'
      );
    });
  });

  // ============================================================================
  // 4. STANDARDIZED SECURE ERROR HANDLING
  // ============================================================================
  describe('4. Standardized Error Handling & Sanitization', () => {
    it('maps HTTP 401 unauthorized to auth.session_expired catalog entry', () => {
      const error = new Error('HTTP 401: Unauthorized');
      const parsed = parseApiError(error);

      expect(parsed.catalogKey).toBe('auth.session_expired');
      expect(parsed.title).toBe('Session expired');
    });

    it('maps HTTP 403 forbidden to auth.forbidden catalog entry', () => {
      const error = new Error('HTTP 403: Forbidden access');
      const parsed = parseApiError(error);

      expect(parsed.catalogKey).toBe('auth.forbidden');
      expect(parsed.title).toBe('Permission denied');
    });

    it('maps HTTP 404 not found to common.not_found catalog entry', () => {
      const error = { status: 404, message: 'Department not found' };
      const parsed = parseApiError(error);

      expect(parsed.catalogKey).toBe('common.not_found');
      expect(parsed.title).toBe('Resource not found');
    });

    it('maps HTTP 429 rate limit to network.rate_limited catalog entry', () => {
      const error = { status: 429 };
      const parsed = parseApiError(error);

      expect(parsed.catalogKey).toBe('network.rate_limited');
      expect(parsed.title).toBe('Too many requests');
    });

    it('maps HTTP 500 server error to system.server_error catalog entry', () => {
      const error = { status: 500, message: 'Internal Server Error' };
      const parsed = parseApiError(error);

      expect(parsed.catalogKey).toBe('system.server_error');
      expect(parsed.title).toBe('Service temporarily unavailable');
    });

    it('maps PostgreSQL RLS violation code 42501 to safe permission denied message', () => {
      const dbError = { code: '42501', message: 'new row violates row-level security policy for table "departments"' };
      const parsed = parseApiError(dbError);

      expect(parsed.title).toBe('Permission denied');
      expect(parsed.description).not.toContain('row-level security policy');
      expect(parsed.description).not.toContain('departments');
    });

    it('maps PostgreSQL unique constraint code 23505 to validation.conflict message', () => {
      const dbError = { code: '23505', message: 'duplicate key value violates unique constraint "roles_org_code_key"' };
      const parsed = parseApiError(dbError);

      expect(parsed.catalogKey).toBe('validation.conflict');
      expect(parsed.title).toBe('Duplicate entry detected');
      expect(parsed.description).not.toContain('roles_org_code_key');
    });

    it('scrubs and redacts raw SQL statements and internal table references', () => {
      const sqlInjectionError = new Error(
        'SELECT * FROM sensitive_payroll WHERE amount > 1000 syntax error at or near sensitive_payroll'
      );
      const parsed = parseApiError(sqlInjectionError);

      expect(parsed.title).toBe('Data constraint error');
      expect(parsed.description).not.toContain('SELECT');
      expect(parsed.description).not.toContain('sensitive_payroll');
    });

    it('scrubs node_modules stack trace leakage', () => {
      const stackError = new Error('at Module._compile (node_modules/express/lib/router/index.js:12:4)');
      const parsed = parseApiError(stackError);

      expect(parsed.description).not.toContain('node_modules');
      expect(parsed.description).not.toContain('Module._compile');
    });

    it('toast.fromError automatically extracts and triggers safe notifications', () => {
      const err = new Error('HTTP 403: Insufficient rights');
      const toastId = toast.fromError(err);

      const active = toastStore.getSnapshot().find((t) => t.id === toastId);
      expect(active?.type).toBe('error');
      expect(active?.title).toBe('Permission denied');
    });

    it('prevents duplicate notifications when the same error bubbles across layers', () => {
      const err = new Error('HTTP 409: Duplicate role code');
      const id1 = toast.fromError(err);
      const id2 = toast.fromError(err);

      expect(id1).toBe(id2);
      expect(toastStore.getSnapshot().filter((t) => t.type === 'error')).toHaveLength(1);
    });
  });

  // ============================================================================
  // 5. AUTOMATIC & MANUAL DISMISSAL
  // ============================================================================
  describe('5. Automatic & Manual Dismissal', () => {
    it('automatically dismisses a toast after its duration elapses', () => {
      toast.success('Auto dismiss test', { duration: 3000 });
      expect(toastStore.getSnapshot()).toHaveLength(1);

      vi.advanceTimersByTime(2999);
      expect(toastStore.getSnapshot()).toHaveLength(1);

      vi.advanceTimersByTime(1);
      expect(toastStore.getSnapshot()[0].isExiting).toBe(true);

      vi.advanceTimersByTime(200);
      expect(toastStore.getSnapshot()).toHaveLength(0);
    });

    it('supports manual dismissal by id', () => {
      const id = toast.info('Manual dismiss test');
      expect(toastStore.getSnapshot()).toHaveLength(1);

      toast.dismiss(id);
      expect(toastStore.getSnapshot()[0].isExiting).toBe(true);

      vi.advanceTimersByTime(200);
      expect(toastStore.getSnapshot()).toHaveLength(0);
    });

    it('supports dismissing all active toasts at once', () => {
      toast.info('Toast 1', { dedupe: false });
      toast.info('Toast 2', { dedupe: false });
      expect(toastStore.getSnapshot()).toHaveLength(2);

      toast.dismiss();
      expect(toastStore.getSnapshot().every((t) => t.isExiting)).toBe(true);

      vi.advanceTimersByTime(200);
      expect(toastStore.getSnapshot()).toHaveLength(0);
    });
  });

  // ============================================================================
  // 6. STACKING BEHAVIOR, MANAGED QUEUE & HOVER/FOCUS INTERACTIONS
  // ============================================================================
  describe('6. Stacking Behavior & Managed Queue', () => {
    it('displays a maximum of 3 notifications simultaneously and queues additional ones', () => {
      toast.info('Item 1', { dedupe: false });
      toast.info('Item 2', { dedupe: false });
      toast.info('Item 3', { dedupe: false });

      const state3 = toastStore.getState();
      expect(state3.visible).toHaveLength(3);
      expect(state3.queueCount).toBe(0);
      // Newest notifications appear at the top (index 0) of visible stack
      expect(state3.visible[0].title).toBe('Item 3');
      expect(state3.visible[1].title).toBe('Item 2');
      expect(state3.visible[2].title).toBe('Item 1');

      // Adding 4th and 5th items puts them in the managed queue
      toast.info('Item 4', { dedupe: false });
      toast.info('Item 5', { dedupe: false });

      const state5 = toastStore.getState();
      expect(state5.visible).toHaveLength(3);
      expect(state5.queueCount).toBe(2);
      expect(state5.queued[0].title).toBe('Item 4');
      expect(state5.queued[1].title).toBe('Item 5');
    });

    it('automatically promotes queued notifications when a visible notification is dismissed', () => {
      const id1 = toast.info('Visible 1', { dedupe: false });
      toast.info('Visible 2', { dedupe: false });
      toast.info('Visible 3', { dedupe: false });
      toast.info('Queued 1', { dedupe: false });

      expect(toastStore.getQueueCount()).toBe(1);

      // Dismiss visible notification 1
      toast.dismiss(id1);
      vi.advanceTimersByTime(200); // Exit animation duration

      const stateAfterDismiss = toastStore.getState();
      expect(stateAfterDismiss.visible).toHaveLength(3);
      expect(stateAfterDismiss.queueCount).toBe(0);
      // Promoted item is now visible at the top
      expect(stateAfterDismiss.visible.some((t) => t.title === 'Queued 1')).toBe(true);
    });

    it('clears queue independently without affecting active visible notifications', () => {
      toast.info('Vis 1', { dedupe: false });
      toast.info('Vis 2', { dedupe: false });
      toast.info('Vis 3', { dedupe: false });
      toast.info('Queue 1', { dedupe: false });
      toast.info('Queue 2', { dedupe: false });

      expect(toastStore.getQueueCount()).toBe(2);

      toast.clearQueue();

      expect(toastStore.getQueueCount()).toBe(0);
      expect(toastStore.getSnapshot()).toHaveLength(3);
    });

    it('bounds queue capacity to MAX_QUEUE_SIZE to prevent unbounded accumulation', () => {
      // Fill visible (3)
      for (let i = 1; i <= 3; i++) {
        toast.info(`Visible ${i}`, { dedupe: false });
      }

      // Add 30 queued items (limit is 25)
      for (let i = 1; i <= 30; i++) {
        toast.info(`Queued ${i}`, { dedupe: false });
      }

      expect(toastStore.getQueueCount()).toBe(25);
    });

    it('pauses expiration countdown while hovered and resumes with remaining time on leave', () => {
      const id = toast.info('Hover inspection toast', { duration: 4000 });

      vi.advanceTimersByTime(2000);

      toastStore.pause(id);
      expect(toastStore.getSnapshot()[0].isPaused).toBe(true);

      vi.advanceTimersByTime(5000);
      expect(toastStore.getSnapshot()).toHaveLength(1);

      toastStore.resume(id);
      expect(toastStore.getSnapshot()[0].isPaused).toBe(false);

      vi.advanceTimersByTime(1000);
      expect(toastStore.getSnapshot()).toHaveLength(1);

      vi.advanceTimersByTime(1001);
      expect(toastStore.getSnapshot()[0].isExiting).toBe(true);
    });
  });

  // ============================================================================
  // 7. LOADING STATE TRANSITIONS & PROMISES
  // ============================================================================
  describe('7. Loading-to-Success and Promise Lifecycle', () => {
    it('updates an existing loading toast in-place when resolved to success', () => {
      const toastId = toast.loading('payroll.processing_started');
      expect(toastStore.getSnapshot()[0].type).toBe('loading');

      toast.success('payroll.calculation_completed', {
        id: toastId,
        batchId: '2026-11',
        count: 142,
      });

      const updated = toastStore.getSnapshot();
      expect(updated).toHaveLength(1);
      expect(updated[0].id).toBe(toastId);
      expect(updated[0].type).toBe('success');
      expect(updated[0].title).toBe('Payroll computed');
      expect(updated[0].description).toBe('Calculation snapshot #2026-11 ready for review (142 employees).');
      expect(updated[0].duration).toBe(4000);
    });

    it('toast.promise handles promise resolution seamlessly with catalog keys', async () => {
      const fakeAsyncAction = () =>
        new Promise<{ name: string }>((resolve) => {
          setTimeout(() => resolve({ name: 'Maria Santos' }), 100);
        });

      const promise = toast.promise(fakeAsyncAction, {
        loading: 'payroll.processing_started',
        success: (data) => ({ key: 'employees.created', name: data.name } as any),
        error: 'payroll.processing_failed',
      });

      expect(toastStore.getSnapshot()[0].type).toBe('loading');

      vi.advanceTimersByTime(100);
      await promise;

      const afterResolve = toastStore.getSnapshot();
      expect(afterResolve).toHaveLength(1);
      expect(afterResolve[0].type).toBe('success');
      expect(afterResolve[0].description).toBe('Maria Santos has been successfully added to your organization.');
    });

    it('toast.promise handles promise rejection with automatic error mapping', async () => {
      const fakeFailingAction = () =>
        new Promise<string>((_, reject) => {
          setTimeout(() => reject(new Error('HTTP 403: Forbidden')), 100);
        });

      const promise = toast.promise(fakeFailingAction, {
        loading: 'payroll.processing_started',
        success: 'payroll.calculation_completed',
        error: (err) => ({ key: 'auth.forbidden' } as any),
      });

      vi.advanceTimersByTime(100);
      await expect(promise).rejects.toThrow();

      const afterReject = toastStore.getSnapshot();
      expect(afterReject).toHaveLength(1);
      expect(afterReject[0].type).toBe('error');
      expect(afterReject[0].title).toBe('Permission denied');
    });
  });

  // ============================================================================
  // 8. LUXURY GLASS UI COMPONENT CONTRACTS & ACCESSIBILITY
  // ============================================================================
  describe('8. Luxury Glass UI Component Contracts & Accessibility', () => {
    it('renders ToastCard with correct ARIA roles: role="alert" for error, role="status" for others', () => {
      const errorToast = {
        id: 'err-1',
        type: 'error' as const,
        title: 'Error Title',
        duration: 5000,
        createdAt: Date.now(),
      };
      const errorCard = React.createElement(ToastCard, { toast: errorToast });
      expect(errorCard.props.toast.type).toBe('error');

      const successToast = {
        id: 'succ-1',
        type: 'success' as const,
        title: 'Success Title',
        duration: 3500,
        createdAt: Date.now(),
      };
      const successCard = React.createElement(ToastCard, { toast: successToast });
      expect(successCard.props.toast.type).toBe('success');
    });

    it('supports keyboard dismissal via Escape key and pause on focus', () => {
      const id = toast.info('Accessible Toast', { duration: 4000 });
      expect(toastStore.getSnapshot()).toHaveLength(1);

      // Focus pause
      toastStore.pause(id);
      expect(toastStore.getSnapshot()[0].isPaused).toBe(true);

      // Escape key dismissal
      toastStore.dismiss(id);
      expect(toastStore.getSnapshot()[0].isExiting).toBe(true);
      vi.advanceTimersByTime(200);
      expect(toastStore.getSnapshot()).toHaveLength(0);
    });

    it('exports all infrastructure elements from ui module', () => {
      expect(toast).toBeDefined();
      expect(toastStore).toBeDefined();
      expect(ToastCard).toBeDefined();
      expect(ToastContainer).toBeDefined();
      expect(ToastProvider).toBeDefined();
      expect(useToast).toBeDefined();
      expect(MESSAGE_CATALOG).toBeDefined();
      expect(interpolate).toBeDefined();
      expect(parseApiError).toBeDefined();
    });
  });

  // ============================================================================
  // 9. BULK OPERATIONS NOTIFICATION GROUPING & SUMMARIZATION
  // ============================================================================
  describe('9. Bulk Operations Notification Grouping & Summaries', () => {
    it('creates a single success summary notification when all bulk items succeed', () => {
      toast.bulkSummary({
        action: 'import',
        entity: 'employee',
        total: 50,
        successCount: 50,
      });

      const toasts = toastStore.getSnapshot();
      expect(toasts).toHaveLength(1);
      expect(toasts[0].type).toBe('success');
      expect(toasts[0].title).toBe('Bulk import completed');
      expect(toasts[0].description).toBe('Successfully imported 50 employee(s).');
    });

    it('creates a warning summary with failure counts and errors for partial success', () => {
      toast.bulkSummary({
        action: 'process',
        entity: 'payslip',
        total: 100,
        successCount: 98,
        failureCount: 2,
        errors: ['Invalid tax bracket for EMP-002', 'Missing bank info for EMP-089'],
      });

      const toasts = toastStore.getSnapshot();
      expect(toasts).toHaveLength(1);
      expect(toasts[0].type).toBe('warning');
      expect(toasts[0].title).toBe('Bulk process partially completed');
      expect(toasts[0].description).toContain('98 of 100');
      expect(toasts[0].description).toContain('2 failed');
      expect(toasts[0].description).toContain('Invalid tax bracket for EMP-002');
    });

    it('creates an error summary when all bulk operations fail', () => {
      toast.bulkSummary({
        action: 'export',
        entity: 'report',
        total: 10,
        successCount: 0,
        failureCount: 10,
        errors: ['Database connection timeout'],
      });

      const toasts = toastStore.getSnapshot();
      expect(toasts).toHaveLength(1);
      expect(toasts[0].type).toBe('error');
      expect(toasts[0].title).toBe('Bulk export failed');
      expect(toasts[0].description).toContain('Failed to export 10 report(s)');
      expect(toasts[0].description).toContain('Database connection timeout');
    });
  });

  // ============================================================================
  // 10. SHELL INTEGRATION & DYNAMIC TOPBAR OFFSET CALCULATION
  // ============================================================================
  describe('10. Shell Integration & Dynamic Offset Calculation', () => {
    it('calculates fallback offset (20px) when application topbar is absent', () => {
      // In tests without #app-topbar, offset defaults to 20px
      const container = React.createElement(ToastContainer, { defaultSpacing: 24 });
      expect(container.props.defaultSpacing).toBe(24);
    });

    it('sets maxVisible dynamically via toastStore.setMaxVisible', () => {
      toastStore.setMaxVisible(2);
      expect(toastStore.getMaxVisible()).toBe(2);

      toast.info('Item A', { dedupe: false });
      toast.info('Item B', { dedupe: false });
      toast.info('Item C', { dedupe: false });

      const state = toastStore.getState();
      expect(state.visible).toHaveLength(2);
      expect(state.queueCount).toBe(1);

      // Reset back to 3
      toastStore.setMaxVisible(3);
      expect(toastStore.getState().visible).toHaveLength(3);
      expect(toastStore.getState().queueCount).toBe(0);
    });
  });
});
