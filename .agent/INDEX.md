# JK Payroll AI Agent Documentation System

Welcome to the definitive architecture, security, database, and engineering documentation for the **JK Payroll System** (PayPulse).

This documentation system is designed specifically for AI coding agents, technical leads, and systems engineers to understand the repository, adhere to its multi-tenant RBAC policies, and implement features safely without architectural divergence.

---

## 1. Quick Navigation Index

### 1.1 Core Foundations
- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md): Project identity, mission, tech stack, and multi-tenant paradigm.
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md): Detailed repository layout (`src/client`, `src/server`, `src/shared`, `src/features`, `supabase/`, `tests/`).
- [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md): Local development, execution commands, testing, and CI/CD expectations.
- [CODING_STANDARDS.md](./CODING_STANDARDS.md): TypeScript, ESM, NodeNext module resolution, Zod schemas, and Tailwind rules.
- [IMPLEMENTATION_RULES.md](./IMPLEMENTATION_RULES.md): Non-negotiable safety rules for AI agents modifying this codebase.

### 1.2 System Architecture
- [architecture/SYSTEM_OVERVIEW.md](./architecture/SYSTEM_OVERVIEW.md): High-level system topology, actor boundaries, and service interaction.
- [architecture/BACKEND_ARCHITECTURE.md](./architecture/BACKEND_ARCHITECTURE.md): Express HTTP pipeline, controller/service layers, and in-memory/Supabase dual access.
- [architecture/FRONTEND_ARCHITECTURE.md](./architecture/FRONTEND_ARCHITECTURE.md): React 19, Vite SPA, layout shells, and routing design.
- [architecture/FEATURE_MODULE_ARCHITECTURE.md](./architecture/FEATURE_MODULE_ARCHITECTURE.md): Feature slice anatomy (controllers, services, hooks, UI).
- [architecture/REQUEST_LIFECYCLE.md](./architecture/REQUEST_LIFECYCLE.md): End-to-end request traversal from UI trigger to database.

### 1.3 Database & Migrations
- [database/DATABASE_OVERVIEW.md](./database/DATABASE_OVERVIEW.md): PostgreSQL + Supabase architectural overview.
- [database/DATABASE_SCHEMA.md](./database/DATABASE_SCHEMA.md): Complete entity definitions (`organizations`, `departments`, `profiles`, `roles`, etc.).
- [database/DATABASE_RELATIONSHIPS.md](./database/DATABASE_RELATIONSHIPS.md): Entity-relationship diagrams, foreign keys, and cascading rules.
- [database/MIGRATION_STANDARDS.md](./database/MIGRATION_STANDARDS.md): 9 canonical SQL migrations, naming conventions, and immutability.
- [database/SEEDING_STANDARDS.md](./database/SEEDING_STANDARDS.md): Baseline seeds, superadmin initialization, and test catalog data.
- [database/SUPABASE_SECURITY.md](./database/SUPABASE_SECURITY.md): Row Level Security (RLS) policies and PostgreSQL recursive CTE functions.

### 1.4 Security & Cascading RBAC
- [security/SECURITY_OVERVIEW.md](./security/SECURITY_OVERVIEW.md): Multi-layer security model and threat mitigations.
- [security/AUTHENTICATION.md](./security/AUTHENTICATION.md): Bearer JWT authentication, local verification, and Supabase Auth fallback.
- [security/AUTHORIZATION.md](./security/AUTHORIZATION.md): Policy enforcement points, superadmin bypass, and fail-closed guarantees.
- [security/RBAC_ARCHITECTURE.md](./security/RBAC_ARCHITECTURE.md): The canonical 3-tier cascading entitlement hierarchy.
- [security/PERMISSION_HIERARCHY.md](./security/PERMISSION_HIERARCHY.md): Module actions, dot-notation keys, and implicit `.View` inheritance.
- [security/DATA_SCOPING.md](./security/DATA_SCOPING.md): Row-level visibility scopes (`Self`, `SubDepartment`, `EntireDepartment`, `Tenant`).
- [security/MULTI_TENANCY.md](./security/MULTI_TENANCY.md): Strict multi-tenant isolation, cross-tenant IDOR protection, and expiration gating.
- [security/AUDIT_LOGGING.md](./security/AUDIT_LOGGING.md): Mutation tracking, trigger-based audit logs, and actor accountability.

### 1.5 Backend & API
- [backend/API_STANDARDS.md](./backend/API_STANDARDS.md): REST conventions, status codes, route naming, and backwards-compatibility aliases.
- [backend/MIDDLEWARE_STANDARDS.md](./backend/MIDDLEWARE_STANDARDS.md): Middleware chain execution order and error boundaries.
- [backend/VALIDATION_STANDARDS.md](./backend/VALIDATION_STANDARDS.md): Zod payload validation middleware and runtime schemas.
- [backend/ERROR_HANDLING.md](./backend/ERROR_HANDLING.md): Standard error response formatting and fail-closed mechanisms.
- [backend/DATABASE_ACCESS.md](./backend/DATABASE_ACCESS.md): Dual-mode repository design (In-memory simulation vs live Supabase client).

### 1.6 Frontend & UI
- [frontend/COMPONENT_STANDARDS.md](./frontend/COMPONENT_STANDARDS.md): Decoupled shadcn/ui primitives, layout components, and accessibility.
- [frontend/ROUTING_STANDARDS.md](./frontend/ROUTING_STANDARDS.md): Declarative React Router 7 setup, layout guards, and route definitions.
- [frontend/STATE_MANAGEMENT.md](./frontend/STATE_MANAGEMENT.md): Local state, custom React hooks, and localStorage authentication syncing.
- [frontend/API_INTEGRATION.md](./frontend/API_INTEGRATION.md): Client service callers, error handling, and bearer token attachment.
- [frontend/UI_UX_STANDARDS.md](./frontend/UI_UX_STANDARDS.md): Facebook-style topbar, sidebar collapse logic, theme modes, and responsive patterns.

### 1.7 Feature Slices
- [features/FEATURE_MODULE_STANDARDS.md](./features/FEATURE_MODULE_STANDARDS.md): Anatomy of domain features under `src/features/`.
- [features/FEATURE_BOUNDARIES.md](./features/FEATURE_BOUNDARIES.md): Clear boundaries between domains (`organizations`, `departments`, `roles`, etc.).
- [features/FEATURE_DEPENDENCIES.md](./features/FEATURE_DEPENDENCIES.md): Permissible and prohibited cross-feature imports.
- [features/BUSINESS_RULES.md](./features/BUSINESS_RULES.md): Domain-specific business logic (payroll rules, leave balances, onboarding wizard).

### 1.8 Testing & Verification
- [testing/TESTING_STRATEGY.md](./testing/TESTING_STRATEGY.md): Vitest configuration, coverage targets, and testing philosophy.
- [testing/UNIT_TESTING.md](./testing/UNIT_TESTING.md): Pure function testing, schema validation testing, and permission calculation tests.
- [testing/INTEGRATION_TESTING.md](./testing/INTEGRATION_TESTING.md): HTTP supertest integration suites against Express API.
- [testing/SECURITY_TESTING.md](./testing/SECURITY_TESTING.md): RBAC cascade regression tests, cross-tenant IDOR checks, and fail-closed verification.

### 1.9 Task Execution & Agent Workflows
- [tasks/TASK_EXECUTION_RULES.md](./tasks/TASK_EXECUTION_RULES.md): Safe change execution protocol for AI agents.
- [tasks/TASK_TEMPLATE.md](./tasks/TASK_TEMPLATE.md): Standard specification template for incoming features and fixes.
- [tasks/CODE_REVIEW_CHECKLIST.md](./tasks/CODE_REVIEW_CHECKLIST.md): Quality and security verification checklist before merging changes.

---

## 2. Documentation Status Legend
Every architectural claim in this documentation uses these verified labels:
- `IMPLEMENTED`: Actively present, verified in source code, and covered by automated tests.
- `PARTIALLY IMPLEMENTED`: Foundational code exists but lacks full integration or test coverage.
- `NOT IMPLEMENTED`: Architectural concept planned or referenced in schemas but not wired up.
- `NEEDS VERIFICATION`: Code exists but exhibits edge cases, divergence from SQL, or runtime ambiguity.
- `PROPOSED`: Recommended future architectural improvement.
