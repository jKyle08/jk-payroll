# Validation Standards & Zod Integration

Status: `IMPLEMENTED`

## 1. Single Source of Truth
Validation schemas reside in `src/shared/schemas/` and feature schemas (e.g. `src/features/organizations/organization.schema.ts`).

---

## 2. `validate` Middleware Implementation
Located in [src/server/middleware/validate.middleware.ts](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/src/server/middleware/validate.middleware.ts):
- Validates `req.body`, `req.query`, or `req.params`.
- On success, attaches parsed clean data.
- On failure, returns HTTP `400 Bad Request` with structured error details:
  ```json
  {
    "error": "Validation Error",
    "details": [
      { "field": "code", "message": "Code must be alphanumeric" }
    ]
  }
  ```
