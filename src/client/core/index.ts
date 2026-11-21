// ==============================================================================
// JK-PAYROLL: CLIENT CORE SYSTEM EXPORTS
// Centralized exports for session recovery, cross-tab sync, and draft persistence.
// File: src/client/core/index.ts
// ==============================================================================

export * from './persistence/TabIdentity.js';
export * from './persistence/DraftStorage.js';
export * from './persistence/DraftManager.js';
export * from './auth/CrossTabAuthSync.js';
export * from './auth/RouteRestoration.js';
export * from './auth/AuthSessionManager.js';
