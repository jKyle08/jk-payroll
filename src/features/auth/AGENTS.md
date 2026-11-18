# `src/features/auth/` Agent Instructions

## Responsibility
Authentication forms, JWT token issuance, session storage, and client auth state.

## Key Files
- `components/LoginPage.tsx`: Client login interface.
- `hooks/use-auth.ts`: Global authentication hook syncing tokens and profiles via `localStorage` and `paypulse-auth-change` events.
- `auth.service.ts`: Backend service verifying user credentials and creating JWT sessions.
