# Project Context & Business Domain

Status: `IMPLEMENTED`

## 1. Executive Summary
**JK Payroll (PayPulse)** is an enterprise-grade multi-tenant HR and payroll management system. It is designed to provide strict tenant isolation, arbitrary-depth recursive departmental hierarchies, and an unbreakable 3-tier cascading Role-Based Access Control (RBAC) model.

The platform serves organizations ranging from private corporations to public sector institutions and non-profits, supporting multi-sector configuration, customizable payroll rules, statutory deductions, and granular access delegation.

---

## 2. Technical Stack Summary

| Layer | Technology | Version | Purpose in Codebase |
| :--- | :--- | :--- | :--- |
| **Runtime** | Node.js | `>=20.0.0` | Node.js runtime with modern ES Modules (`"type": "module"`) |
| **Language** | TypeScript | `^5.7.3` | Strong typing with `NodeNext` module resolution |
| **Backend Engine** | Express.js | `^4.21.2` | Core REST API server mounted at `/api` |
| **Auth & Security** | JWT / Supabase Auth | `^9.0.2` | HMAC SHA-256 JWT tokens with local validation & Supabase fallback |
| **Database** | PostgreSQL (Supabase) | `PostgreSQL 15` | Relational database with Row Level Security & Recursive CTE RPCs |
| **Database Client** | `@supabase/supabase-js` | `^2.49.1` | Supabase SDK for client & admin service role operations |
| **Validation** | Zod | `^3.24.2` | Runtime request body and environment variable validation |
| **Frontend Core** | React | `^19.3.1` | Modern declarative component UI rendering |
| **Frontend Bundler**| Vite | `^6.0.0` | Client dev server and production asset compilation |
| **Frontend Router** | React Router DOM | `^7.18.5` | Client-side routing, protected layouts, and URL parameters |
| **Styling** | Tailwind CSS / PostCSS | `^3.4.17` / `^8.4.49` | Utility-first styling with dark mode and custom components |
| **Test Runner** | Vitest | `^3.0.6` | High-performance unit, integration, and security test runner |
| **API Assertions** | Supertest | `^7.0.0` | HTTP assertion testing against Express app endpoints |

---

## 3. Core Architectural Pillars

### 3.1 Strict Multi-Tenancy
Every operational record in JK Payroll is bound to an `organization_id` (historically referenced as `tenant_id`). The system enforces tenant isolation at both the database layer via Supabase Row Level Security (RLS) policies and at the application layer via authentication middleware and repository scoping. Cross-tenant reads and mutations fail closed with `403 Forbidden` or `404 Not Found`.

### 3.2 Recursive Department Hierarchy
Departments within an organization form an arbitrary-depth tree structure via self-referential `parent_department_id` pointers. Sub-departments automatically inherit permissions and modules downward, while user authorization evaluations traverse ancestor chains upward via PostgreSQL Recursive Common Table Expressions (CTEs).

### 3.3 Three-Tier Cascading RBAC
Authority is governed strictly through three concentric gates:
1. **Tier 1 (Super Admin):** Enables global modules for a Tenant/Organization (`organization_modules`).
2. **Tier 2 (Tenant Admin):** Allocates tenant-licensed modules to specific Departments (`department_modules`).
3. **Tier 3 (User Grants):** Assigns granular action permissions (`user_permissions` / `role_permissions`) within the department's allocated module branch.

---

## 4. Key References in Repository
- Canonical Architecture: [ARCHITECTURE.md](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/ARCHITECTURE.md)
- Root API Router: [src/server/routes/index.ts](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/src/server/routes/index.ts)
- In-Memory Database Simulation: [src/server/db/repository.ts](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/src/server/db/repository.ts)
- Shared Contracts: [src/shared/types/index.ts](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/src/shared/types/index.ts)
