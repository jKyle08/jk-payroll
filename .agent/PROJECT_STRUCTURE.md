# Project Directory Structure & Layer Boundaries

Status: `IMPLEMENTED`

## 1. Directory Tree Overview

```text
jk-payroll/
├── .agent/                                           # Centralized AI Agent & Architecture Documentation
├── supabase/                                         # Supabase CLI configs, migrations & seeds
│   ├── config.toml                                   # Local Supabase configuration
│   ├── clean_and_seed_superadmin.sql                 # Teardown & superadmin seed script
│   ├── seed.sql                                      # Baseline seed script
│   ├── migrations/                                   # 9 canonical SQL migrations
│   └── seeds/                                        # Catalog seed definitions
│
├── tests/                                            # Vitest automated test suites (11 suites, 106 tests)
│   ├── departments.test.ts                           # Department hierarchy tests
│   ├── footer.test.ts                                # Branding & footer tests
│   ├── organizations-page-crud.test.ts               # Organization CRUD & expiration enforcement tests
│   ├── organizations.test.ts                         # Organization module architecture tests
│   ├── permission-gate.test.ts                       # UI permission gating atom tests
│   ├── permission-matrix.test.ts                     # Permission matrix allocation tests
│   ├── rbac.test.ts                                  # 3-tier cascading RBAC test suite
│   ├── security-phase1.test.ts                       # Phase 1 critical security regression suite
│   ├── sidebar.test.ts                               # Sidebar navigation tests
│   ├── topbar.test.ts                                # Topbar component tests
│   └── user-roles.test.ts                            # Role mapping & assignment tests
│
└── src/
    ├── shared/                                       # Single source of truth for shared contracts
    │   ├── constants/                                # Shared constants (permissions.ts)
    │   ├── schemas/                                  # Shared Zod validation schemas
    │   └── types/                                    # Shared domain interfaces & context types
    │
    ├── server/                                       # Express.js backend application
    │   ├── app.ts                                    # Express factory, middleware & client static server
    │   ├── server.ts                                 # Server entry point & port listener
    │   ├── config/                                   # Environment variable loader (env.ts)
    │   ├── db/                                       # Repositories & Supabase client wrapper
    │   ├── middleware/                               # Auth, RBAC, data scoping, and validation guards
    │   └── routes/                                   # Central API router (/api)
    │
    ├── client/                                       # React 19 + Vite frontend application
    │   ├── main.tsx                                  # Client entry point
    │   ├── RootApp.tsx                               # Client declarative router table
    │   ├── index.css                                 # Tailwind & global styles
    │   ├── layouts/                                  # Application frame layouts (Dashboard, Onboarding)
    │   ├── pages/                                    # Page route views (organizations, onboarding)
    │   ├── components/                               # UI component primitives & layout components
    │   │   ├── layout/                               # Topbar, Sidebar, Footer, SwitcherModal
    │   │   ├── onboarding/                           # Wizard forms & tokenized invitation handlers
    │   │   └── ui/                                   # shadcn/ui primitives & StatusPages
    │   └── lib/                                      # Client utilities, navigation configs & clsx helpers
    │
    └── features/                                     # Domain feature modules (slices)
        ├── access-control/                           # Access control hooks, matrices, & routes
        ├── audit-logs/                               # Security audit logging UI & services
        ├── auth/                                     # Authentication state, login UI, & services
        ├── departments/                              # Recursive department tree, forms, & CRUD
        ├── leave-management/                         # Leave types, request forms, & controllers
        ├── organizations/                            # Organization directory, forms, & hooks
        ├── payroll/                                  # Payroll computation & approval flows
        ├── roles/                                    # System & custom roles and permission maps
        └── users/                                    # User profile directory & assignment hooks
```

---

## 2. Layer Responsibilities & Isolation Rules

### 2.1 `src/shared/`
- **Zero Platform Dependencies:** Contains pure TypeScript interfaces, constants, and Zod schemas. Must NEVER import from `src/server/` or `src/client/`.
- Usable interchangeably across client and server.

### 2.2 `src/server/`
- **Server Scope:** Houses the Express HTTP server, database connection pools, Supabase admin clients, security middleware, and HTTP router registration.
- Must NEVER import frontend JSX/TSX components or browser APIs (`window`, `localStorage`, `document`).

### 2.3 `src/client/`
- **Client Scope:** Houses the React 19 SPA, Vite entry point, component tree, layout containers, and client router.
- Must NEVER import server-only modules (`jsonwebtoken`, `express`, database repositories with secret keys).

### 2.4 `src/features/`
- **Domain Slices:** Each directory encapsulates a business domain.
- Backend modules (`*.controller.ts`, `*.service.ts`, `*.routes.ts`) handle HTTP and business logic.
- Frontend modules (`components/`, `hooks/`, `services/*.client.ts`) provide UI and API integration for that domain.
