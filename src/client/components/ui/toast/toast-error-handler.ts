// ==============================================================================
// PAYPULSE ENTERPRISE NOTIFICATION INFRASTRUCTURE: STANDARDIZED ERROR HANDLER
// Converts technical, HTTP, database, and validation errors into secure, user-friendly messages.
// File: src/client/components/ui/toast/toast-error-handler.ts
// ==============================================================================

import { MessageCatalogKey, resolveCatalogMessage } from './toast-catalog.js';
import { ToastOptions } from './toast-types.js';

export interface ParsedErrorNotification {
  title: string;
  description: string;
  catalogKey?: MessageCatalogKey;
  statusCode?: number;
  isValidationError?: boolean;
}

// Patterns that identify raw SQL / database internals or sensitive stack traces
const SENSITIVE_DB_PATTERNS = [
  /SELECT\s+|INSERT\s+|UPDATE\s+|DELETE\s+|FROM\s+|WHERE\s+/i,
  /syntax error at or near/i,
  /relation ".*" does not exist/i,
  /table ".*" does not exist/i,
  /column ".*" does not exist/i,
  /violates row-level security/i,
  /violates foreign key constraint/i,
  /violates not-null constraint/i,
  /violates check constraint/i,
  /violates unique constraint/i,
  /invalid input syntax for type/i,
  /at\s+[\w\.]+\s+\(.*:\d+:\d+\)/,
  /node_modules/i,
  /supabase_admin/i,
  /service_role/i,
];

// Tracking errors to prevent duplicate notifications during multi-layer bubbling
const processedErrorTimestamps = new WeakMap<object, number>();
const processedErrorSignatures = new Map<string, number>();
const DEDUPE_ERROR_WINDOW = 2000; // ms

/**
 * Checks whether an error contains sensitive internal implementation details.
 */
export function containsSensitiveDetails(text: string): boolean {
  if (!text) return false;
  return SENSITIVE_DB_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Parses any incoming error (Response, Error, object, string, or unknown)
 * and returns safe user-facing notification content.
 */
export function parseApiError(
  error: unknown,
  fallbackMessage?: string
): ParsedErrorNotification {
  // 1. Diagnostic logging in development mode
  if (
    typeof process !== 'undefined' &&
    (process.env?.NODE_ENV !== 'production' || (import.meta as any).env?.DEV)
  ) {
    console.error('[PayPulse Error Diagnostic]:', error);
  }

  // 2. Extract error components
  let rawMessage = '';
  let statusCode: number | undefined;
  let errorCode: string | undefined;
  let validationFields: string[] = [];

  if (typeof error === 'string') {
    rawMessage = error;
  } else if (error instanceof Error) {
    rawMessage = error.message;
    const anyErr = error as any;
    if (anyErr.status || anyErr.statusCode) {
      statusCode = Number(anyErr.status || anyErr.statusCode);
    }
    if (anyErr.code) {
      errorCode = String(anyErr.code);
    }
    if (Array.isArray(anyErr.errors)) {
      validationFields = anyErr.errors.map((e: any) => e.field || e.path || e.message);
    }
  } else if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, any>;
    rawMessage = obj.message || obj.error || obj.error_description || '';
    if (obj.status || obj.statusCode) {
      statusCode = Number(obj.status || obj.statusCode);
    }
    if (obj.code) {
      errorCode = String(obj.code);
    }
    if (Array.isArray(obj.errors)) {
      validationFields = obj.errors.map((e: any) => e.field || e.path || e.message);
    }
  }

  // 3. Extract HTTP Status Code if embedded in message (e.g. "HTTP 403: ...")
  if (!statusCode && rawMessage) {
    const httpMatch = rawMessage.match(/HTTP\s+(\d{3})/i);
    if (httpMatch) {
      statusCode = parseInt(httpMatch[1], 10);
    }
  }

  // 4. Handle Network / Offline / Timeout issues
  if (
    rawMessage.includes('Failed to fetch') ||
    rawMessage.includes('NetworkError') ||
    rawMessage.includes('ENOTFOUND') ||
    rawMessage.includes('ECONNREFUSED') ||
    (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine === false)
  ) {
    const cat = resolveCatalogMessage('network.offline');
    return {
      title: cat.title,
      description: cat.description || 'Unable to establish connection with PayPulse server.',
      catalogKey: 'network.offline',
    };
  }

  if (rawMessage.toLowerCase().includes('timeout') || rawMessage.includes('timed out')) {
    const cat = resolveCatalogMessage('network.timeout');
    return {
      title: cat.title,
      description: cat.description || 'The request took too long to complete.',
      catalogKey: 'network.timeout',
    };
  }

  // 5. Handle Known PostgreSQL Error Codes
  if (errorCode === '42501' || rawMessage.includes('42501')) {
    const cat = resolveCatalogMessage('auth.forbidden');
    return {
      title: cat.title,
      description: 'You do not have permission to modify this data.',
      catalogKey: 'auth.forbidden',
    };
  }

  if (errorCode === '23505' || rawMessage.includes('23505') || rawMessage.includes('already exists')) {
    const cat = resolveCatalogMessage('validation.conflict');
    return {
      title: cat.title,
      description: 'A record with these matching details already exists in the system.',
      catalogKey: 'validation.conflict',
      isValidationError: true,
    };
  }

  if (errorCode === '23503' || rawMessage.includes('23503')) {
    return {
      title: 'Dependency constraint',
      description: 'This record cannot be modified or deleted because other records depend on it.',
      catalogKey: 'system.database_error',
    };
  }

  // 6. Handle HTTP Status Codes with Specific Semantic Context
  if (statusCode === 400 || statusCode === 422) {
    const cat = resolveCatalogMessage('validation.invalid_input');
    let description = cat.description || 'Please check your inputs and try again.';
    if (validationFields.length > 0) {
      description = `Validation issue detected with: ${validationFields.join(', ')}`;
    } else if (rawMessage && !containsSensitiveDetails(rawMessage)) {
      description = rawMessage.replace(/^HTTP\s+\d{3}:\s*/i, '');
    }
    return {
      title: cat.title,
      description,
      catalogKey: 'validation.invalid_input',
      statusCode,
      isValidationError: true,
    };
  }

  if (statusCode === 401) {
    const cat = resolveCatalogMessage('auth.session_expired');
    return {
      title: cat.title,
      description: cat.description || 'Please sign in again to continue.',
      catalogKey: 'auth.session_expired',
      statusCode: 401,
    };
  }

  if (statusCode === 403) {
    const cat = resolveCatalogMessage('auth.forbidden');
    return {
      title: cat.title,
      description: cat.description || 'Your role does not have authorization for this action.',
      catalogKey: 'auth.forbidden',
      statusCode: 403,
    };
  }

  if (statusCode === 404) {
    const cat = resolveCatalogMessage('common.not_found');
    return {
      title: cat.title,
      description: 'The requested resource was not found.',
      catalogKey: 'common.not_found',
      statusCode: 404,
    };
  }

  if (statusCode === 409) {
    const cat = resolveCatalogMessage('validation.conflict');
    return {
      title: cat.title,
      description: cat.description || 'A conflicting record already exists.',
      catalogKey: 'validation.conflict',
      statusCode: 409,
      isValidationError: true,
    };
  }

  if (statusCode === 429) {
    const cat = resolveCatalogMessage('network.rate_limited');
    return {
      title: cat.title,
      description: cat.description || 'Too many requests. Please wait a moment.',
      catalogKey: 'network.rate_limited',
      statusCode: 429,
    };
  }

  if (statusCode && statusCode >= 500) {
    const cat = resolveCatalogMessage('system.server_error');
    return {
      title: cat.title,
      description: cat.description || 'The server encountered an issue. Our team has been notified.',
      catalogKey: 'system.server_error',
      statusCode,
    };
  }

  // 7. Security Sanitization: Scrub Raw SQL, table names, stack traces
  if (containsSensitiveDetails(rawMessage)) {
    const cat = resolveCatalogMessage('system.database_error');
    return {
      title: cat.title,
      description: 'The operation could not be completed due to a data constraint.',
      catalogKey: 'system.database_error',
    };
  }

  // 8. Safe Fallback
  if (rawMessage && rawMessage.length < 180 && !containsSensitiveDetails(rawMessage)) {
    return {
      title: fallbackMessage || 'Action failed',
      description: rawMessage.replace(/^HTTP\s+\d{3}:\s*/i, ''),
    };
  }

  const cat = resolveCatalogMessage('common.generic_error');
  return {
    title: fallbackMessage || cat.title,
    description: cat.description || 'An unexpected error occurred. Please try again.',
    catalogKey: 'common.generic_error',
  };
}

/**
 * Checks if this error has already triggered a notification recently
 * to prevent duplicate alerts when an error bubbles across layers.
 */
export function isDuplicateError(error: unknown, signature: string): boolean {
  const now = Date.now();

  if (typeof error === 'object' && error !== null) {
    const prev = processedErrorTimestamps.get(error);
    if (prev && now - prev < DEDUPE_ERROR_WINDOW) {
      return true;
    }
    processedErrorTimestamps.set(error, now);
  }

  const prevSig = processedErrorSignatures.get(signature);
  if (prevSig && now - prevSig < DEDUPE_ERROR_WINDOW) {
    return true;
  }
  processedErrorSignatures.set(signature, now);

  return false;
}
