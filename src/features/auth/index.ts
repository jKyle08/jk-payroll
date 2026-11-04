// ==============================================================================
// JK-PAYROLL: AUTH FEATURE CLIENT EXPORTS
// Strictly Frontend-Safe Modules (Components, Hooks, Types, Schemas)
// File: src/features/auth/index.ts
// ==============================================================================

// LoginInput / RegisterInput exist in both ./types.js and ./auth.schema.js.
// Export the schema-derived versions (frontend validation) and only the
// non-conflicting types from ./types.js to avoid an ambiguous re-export.
export type { UserSessionData, AuthResponse, AuthUser } from './types.js';
export { loginSchema, registerSchema } from './auth.schema.js';
export type { LoginInput, RegisterInput } from './auth.schema.js';
export { useAuth, default as useAuthDefault } from './hooks/use-auth.js';
