// ==============================================================================
// PAYPULSE ENTERPRISE NOTIFICATION INFRASTRUCTURE: MESSAGE CATALOG
// Single source of truth for standardized user-facing notification messages.
// File: src/client/components/ui/toast/toast-catalog.ts
// ==============================================================================

import { ToastType } from './toast-types.js';
import { interpolate } from './toast-interpolate.js';

export interface CatalogMessageItem {
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    actionKey?: string;
  };
}

/**
 * Common Message Catalog categorized by domain.
 * Supports placeholder interpolation using {{key}} syntax.
 */
export const MESSAGE_CATALOG = {
  // ============================================================================
  // 1. COMMON DOMAIN
  // ============================================================================
  'common.saved': {
    type: 'success',
    title: 'Changes saved',
    description: 'Your changes have been saved successfully.',
    duration: 3500,
  },
  'common.created': {
    type: 'success',
    title: 'Item created',
    description: 'The item has been created successfully.',
    duration: 3500,
  },
  'common.updated': {
    type: 'success',
    title: 'Update successful',
    description: 'The record was updated successfully.',
    duration: 3500,
  },
  'common.deleted': {
    type: 'success',
    title: 'Item deleted',
    description: 'The requested item has been deleted.',
    duration: 3500,
  },
  'common.copied': {
    type: 'success',
    title: 'Copied to clipboard',
    description: '{{label}} copied to clipboard.',
    duration: 2500,
  },
  'common.bulk_success': {
    type: 'success',
    title: 'Bulk {{action}} completed',
    description: 'Successfully {{action}}ed {{successCount}} {{entity}}(s).',
    duration: 4000,
  },
  'common.bulk_partial': {
    type: 'warning',
    title: 'Bulk {{action}} partially completed',
    description: '{{successCount}} of {{total}} {{entity}}(s) {{action}}ed. {{failureCount}} failed.',
    duration: 6000,
  },
  'common.bulk_failed': {
    type: 'error',
    title: 'Bulk {{action}} failed',
    description: 'Failed to {{action}} {{total}} {{entity}}(s).',
    duration: 6000,
  },
  'common.not_found': {
    type: 'error',
    title: 'Resource not found',
    description: 'The requested record or endpoint could not be found.',
    duration: 5000,
  },
  'common.action_aborted': {
    type: 'info',
    title: 'Action canceled',
    description: 'Operation was canceled.',
    duration: 3000,
  },
  'common.generic_error': {
    type: 'error',
    title: 'An unexpected error occurred',
    description: 'Please try again. If the issue persists, contact technical support.',
    duration: 5000,
  },

  // ============================================================================
  // 2. AUTHENTICATION & SESSION DOMAIN
  // ============================================================================
  'auth.login_success': {
    type: 'success',
    title: 'Welcome back',
    description: 'Signed in successfully as {{name}}.',
    duration: 3500,
  },
  'auth.logout_success': {
    type: 'info',
    title: 'Signed out',
    description: 'You have been safely signed out of your session.',
    duration: 3000,
  },
  'auth.invalid_credentials': {
    type: 'error',
    title: 'Authentication failed',
    description: 'The email or password you entered is incorrect.',
    duration: 5000,
  },
  'auth.session_expiring': {
    type: 'warning',
    title: 'Session expiring soon',
    description: 'Your session will expire in {{minutes}} minutes due to inactivity.',
    duration: 8000,
    action: {
      label: 'Stay Signed In',
      actionKey: 'auth.extend_session',
    },
  },
  'auth.session_expired': {
    type: 'error',
    title: 'Session expired',
    description: 'Your security session has expired. Please sign in again to continue.',
    duration: 6000,
  },
  'auth.unauthorized': {
    type: 'error',
    title: 'Unauthorized access',
    description: 'You must sign in to view this application resource.',
    duration: 5000,
  },
  'auth.forbidden': {
    type: 'error',
    title: 'Permission denied',
    description: 'You do not have the required permissions to perform this action.',
    duration: 5000,
  },
  'auth.invitation_accepted': {
    type: 'success',
    title: 'Invitation accepted',
    description: 'Your user profile has been provisioned. Welcome to PayPulse!',
    duration: 4000,
  },
  'auth.invitation_failed': {
    type: 'error',
    title: 'Invitation invalid',
    description: 'The invitation token is invalid or has expired (24-hour limit).',
    duration: 5000,
  },
  'auth.demo_persona_hint': {
    type: 'info',
    title: 'Development persona authentication',
    description: 'Please select one of the 1-click test personas above to authenticate.',
    duration: 4000,
  },

  // ============================================================================
  // 3. ORGANIZATION & TENANCY DOMAIN
  // ============================================================================
  'organization.created': {
    type: 'success',
    title: 'Organization provisioned',
    description: 'Organization {{name}} ({{code}}) was created successfully.',
    duration: 4000,
  },
  'organization.updated': {
    type: 'success',
    title: 'Organization updated',
    description: 'Company profile and operational settings saved.',
    duration: 3500,
  },
  'organization.switched': {
    type: 'info',
    title: 'Workspace switched',
    description: 'Active workspace changed to {{name}} ({{code}}).',
    duration: 3000,
  },
  'organization.onboarding_completed': {
    type: 'success',
    title: 'Setup completed',
    description: 'Workspace {{name}} is ready for live operations.',
    duration: 4500,
  },
  'organization.onboarding_failed': {
    type: 'error',
    title: 'Onboarding failed',
    description: 'Could not complete organization provisioning. Please verify inputs.',
    duration: 5000,
  },
  'organization.suspended': {
    type: 'warning',
    title: 'Tenant suspended',
    description: 'This organization account has been placed on administrative hold.',
    duration: 6000,
  },

  // ============================================================================
  // 4. USERS & ROLES DOMAIN
  // ============================================================================
  'users.role_assigned': {
    type: 'success',
    title: 'Role assigned',
    description: 'Security role "{{roleName}}" assigned to {{count}} team member(s).',
    duration: 3500,
  },
  'users.role_updated': {
    type: 'success',
    title: 'Role assignment updated',
    description: 'Team member role permissions have been updated.',
    duration: 3500,
  },
  'users.role_removed': {
    type: 'success',
    title: 'Role removed',
    description: 'Role assignment was removed from the user profile.',
    duration: 3500,
  },
  'users.role_created': {
    type: 'success',
    title: 'Role definition created',
    description: 'Custom security role "{{name}}" ({{code}}) has been defined.',
    duration: 3500,
  },
  'users.role_deleted': {
    type: 'success',
    title: 'Role deleted',
    description: 'Role "{{name}}" was deleted from the organization.',
    duration: 3500,
  },
  'users.role_delete_blocked': {
    type: 'warning',
    title: 'Cannot delete assigned role',
    description: 'Role "{{name}}" cannot be deleted while assigned to active users.',
    duration: 5000,
  },
  'users.invited': {
    type: 'success',
    title: 'Invitation dispatched',
    description: 'An onboarding invitation link was generated for {{email}}.',
    duration: 4000,
  },

  // ============================================================================
  // 5. EMPLOYEES & DEPARTMENTS DOMAIN
  // ============================================================================
  'employees.created': {
    type: 'success',
    title: 'Employee added',
    description: '{{name}} has been successfully added to your organization.',
    duration: 3500,
  },
  'employees.updated': {
    type: 'success',
    title: 'Employee updated',
    description: 'Profile and compensation details updated for {{name}}.',
    duration: 3500,
  },
  'employees.archived': {
    type: 'info',
    title: 'Employee archived',
    description: 'Employee {{name}} has been deactivated and archived.',
    duration: 3500,
  },
  'employees.department_created': {
    type: 'success',
    title: 'Department created',
    description: 'Department {{name}} ({{code}}) was created successfully.',
    duration: 3500,
  },
  'employees.department_updated': {
    type: 'success',
    title: 'Department updated',
    description: 'Department {{name}} has been updated.',
    duration: 3500,
  },
  'employees.department_deleted': {
    type: 'success',
    title: 'Department deleted',
    description: 'Department {{name}} was deleted successfully.',
    duration: 3500,
  },
  'employees.department_has_children': {
    type: 'warning',
    title: 'Cannot delete parent department',
    description: 'Department {{name}} has active sub-departments. Please reassign or delete them first.',
    duration: 5000,
  },

  // ============================================================================
  // 6. PAYROLL DOMAIN
  // ============================================================================
  'payroll.processing_started': {
    type: 'loading',
    title: 'Processing payroll batch',
    description: 'Calculating statutory deductions, taxes, and net disbursements...',
    duration: 0,
  },
  'payroll.calculation_completed': {
    type: 'success',
    title: 'Payroll computed',
    description: 'Calculation snapshot #{{batchId}} ready for review ({{count}} employees).',
    duration: 4000,
  },
  'payroll.processing_failed': {
    type: 'error',
    title: 'Payroll computation failed',
    description: 'An error occurred during payroll batch processing. No payouts were initiated.',
    duration: 6000,
  },
  'payroll.disbursement_completed': {
    type: 'success',
    title: 'Disbursement executed',
    description: 'Payout of {{amount}} authorized across {{count}} active accounts.',
    duration: 4500,
  },
  'payroll.audit_approved': {
    type: 'success',
    title: 'Payroll run approved',
    description: 'Payroll run #{{batchId}} was signed and locked for disbursement.',
    duration: 4000,
  },

  // ============================================================================
  // 7. ATTENDANCE & LEAVE MANAGEMENT DOMAIN
  // ============================================================================
  'attendance.leave_requested': {
    type: 'success',
    title: 'Leave request submitted',
    description: 'Your leave request for {{days}} day(s) was submitted for manager review.',
    duration: 3500,
  },
  'attendance.leave_approved': {
    type: 'success',
    title: 'Leave request approved',
    description: 'Leave request for {{name}} has been approved.',
    duration: 3500,
  },
  'attendance.leave_rejected': {
    type: 'info',
    title: 'Leave request rejected',
    description: 'Leave request for {{name}} was not approved.',
    duration: 4000,
  },
  'attendance.clock_in_success': {
    type: 'success',
    title: 'Clocked in',
    description: 'Time entry recorded at {{time}}.',
    duration: 3000,
  },
  'attendance.clock_out_success': {
    type: 'success',
    title: 'Clocked out',
    description: 'Time entry recorded at {{time}}.',
    duration: 3000,
  },

  // ============================================================================
  // 8. SETTINGS & PREFERENCES DOMAIN
  // ============================================================================
  'settings.saved': {
    type: 'success',
    title: 'Settings saved',
    description: 'Your configuration preferences have been updated.',
    duration: 3500,
  },
  'settings.reset': {
    type: 'info',
    title: 'Settings reset',
    description: 'Preferences were restored to default values.',
    duration: 3000,
  },
  'settings.theme_toggled': {
    type: 'info',
    title: 'Appearance updated',
    description: 'Interface switched to {{theme}} mode.',
    duration: 2000,
  },

  // ============================================================================
  // 9. VALIDATION & DATA INTEGRITY DOMAIN
  // ============================================================================
  'validation.invalid_input': {
    type: 'warning',
    title: 'Invalid information',
    description: 'Please review highlighted fields and correct the validation errors.',
    duration: 5000,
  },
  'validation.required_field': {
    type: 'warning',
    title: 'Missing required field',
    description: '{{field}} is required to proceed.',
    duration: 4000,
  },
  'validation.conflict': {
    type: 'warning',
    title: 'Duplicate entry detected',
    description: 'A record with identifier {{identifier}} already exists in the system.',
    duration: 5000,
  },
  'validation.unsupported_file': {
    type: 'warning',
    title: 'Unsupported file format',
    description: 'Only {{formats}} files are supported.',
    duration: 4500,
  },

  // ============================================================================
  // 10. NETWORK & CONNECTIVITY DOMAIN
  // ============================================================================
  'network.offline': {
    type: 'error',
    title: 'Network connection lost',
    description: 'Unable to reach the PayPulse API. Please check your internet connection.',
    duration: 6000,
  },
  'network.connection_restored': {
    type: 'success',
    title: 'Connection restored',
    description: 'You are back online. Pending changes are synchronizing.',
    duration: 3500,
  },
  'network.timeout': {
    type: 'error',
    title: 'Request timed out',
    description: 'The server took too long to respond. Please try again.',
    duration: 5000,
  },
  'network.rate_limited': {
    type: 'warning',
    title: 'Too many requests',
    description: 'Please wait a moment before trying again.',
    duration: 5000,
  },

  // ============================================================================
  // 11. SYSTEM & PLATFORM DOMAIN
  // ============================================================================
  'system.server_error': {
    type: 'error',
    title: 'Service temporarily unavailable',
    description: 'The server encountered an issue processing your request. Please try again later.',
    duration: 5000,
  },
  'system.database_error': {
    type: 'error',
    title: 'Data constraint error',
    description: 'The operation could not be completed due to a database constraint.',
    duration: 5000,
  },
  'system.maintenance': {
    type: 'info',
    title: 'Scheduled maintenance',
    description: 'System maintenance is scheduled for {{scheduledTime}}.',
    duration: 6000,
  },
  'system.notifications_read': {
    type: 'info',
    title: 'Notifications cleared',
    description: 'All pending notifications marked as read.',
    duration: 2500,
  },
} as const;

export type MessageCatalogKey = keyof typeof MESSAGE_CATALOG;

/**
 * Checks whether a given string key exists in the message catalog.
 */
export function isCatalogKey(key: string): key is MessageCatalogKey {
  return Object.prototype.hasOwnProperty.call(MESSAGE_CATALOG, key);
}

/**
 * Resolves a catalog key with dynamic parameter interpolation.
 */
export function resolveCatalogMessage(
  key: MessageCatalogKey,
  params?: Record<string, any>
): CatalogMessageItem {
  const item = MESSAGE_CATALOG[key];
  if (!item) {
    return {
      type: 'info',
      title: key,
      description: undefined,
      duration: 4000,
    };
  }

  return {
    ...item,
    title: interpolate(item.title, params),
    description: item.description ? interpolate(item.description, params) : undefined,
  };
}
