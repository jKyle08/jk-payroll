# Security Architecture Overview

Status: `IMPLEMENTED`

## 1. Security Defense-in-Depth Model
JK Payroll implements a multi-layered security model:

1. **Network & Transport Layer:** All HTTP traffic requires valid JSON content types, CORS filtering, and Bearer token headers.
2. **Authentication Gate:** Bearer JWT tokens verified locally via HMAC SHA-256 (`ENV.JWT_SECRET`) with remote Supabase Auth verification fallback.
3. **Identity Binding & Expiration Gate:** Binds token identity to `req.user`. Inactive accounts (`isActive: false`) and expired organizations (`endDate` in the past) fail closed immediately with `403 Forbidden`.
4. **Three-Tier Entitlement Boundary:** Module availability is checked at the Organization tier (Tier 1), Department tier (Tier 2), and User Action tier (Tier 3).
5. **Data Scoping Layer:** Filters record visibility by departmental scope (`Self`, `SubDepartment`, `EntireDepartment`, `Tenant`).
6. **Database RLS Policies:** PostgreSQL Row Level Security enforces tenant isolation directly at the database engine level.
7. **Mutation Audit Triggers:** Sensitive tables automatically record mutations to `public.audit_logs`.
