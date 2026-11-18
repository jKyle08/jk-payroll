# Frontend API Integration Standards

Status: `IMPLEMENTED`

## 1. Client Services Pattern
Client API callers reside in `src/features/<feature>/services/client.ts`:
- Automatically attach Bearer tokens from `localStorage.getItem('token')`.
- Handle HTTP errors gracefully and throw meaningful error messages.
- Interface with Express backend routes under `/api`.
