# JK Payroll (PayPulse) — Multi-Tenant, Departmental Hierarchy & Cascading RBAC

Core foundation for the JK Payroll (PayPulse) System built with **React 19 + Vite**, **Node.js (TypeScript Express)**, and **Supabase (PostgreSQL 15+ with Row Level Security & Auth)**.

---

## 1. Authoritative Architecture & Canonical Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — System architecture, 3-tier cascading RBAC model, and data flow.
- [AGENTS.md](AGENTS.md) — Authoritative root AI agent operating instructions and engineering rules.
- [Consolidated System Architecture](docs/architecture/CONSOLIDATED_ARCHITECTURE.md) — System topology, multi-tenancy, and module specifications.
- [Consolidated Database Guide](docs/database/CONSOLIDATED_DATABASE_GUIDE.md) — PostgreSQL schema, 27 migrations, constraints, and stored procedures.
- [Consolidated Security Specification](docs/security/CONSOLIDATED_SECURITY_SPECIFICATION.md) — Authentication, RBAC, RLS policies, and fail-closed security.
- [Consolidated Onboarding Specification](docs/onboarding/CONSOLIDATED_ONBOARDING_SPECIFICATION.md) — SuperAdmin invitations, 24h expiration, atomic provisioning RPC.
- [Deployment & Migration Procedures](docs/deployment/DEPLOYMENT_AND_MIGRATION_PROCEDURES.md) — Staging/production deployment rules, preflight checks, ledger verification.
- [Testing & Acceptance Criteria](docs/testing/TESTING_AND_ACCEPTANCE_CRITERIA.md) — 31 test suites, 510 tests, live Supabase & embedded PGlite test specs.
- [Architectural Decision Records (ADRs)](docs/decisions/ARCHITECTURAL_DECISION_RECORDS.md) — Formal records for Decisions P-01 through P-05.
- [Master Implementation & Deployment Report](docs/PAYPULSE_PHASES_1_3_FINAL_ENGINEERING_REPORT.md) — Verified live deployment status against remote Supabase.
- [Historical Archive](docs/archive/README.md) — Historical proposals, interim reviews, and Phase 1–3 audit evidence.

---

## 2. Tech Stack Overview

The JK Payroll architecture relies on modern, type-safe full-stack technologies:

### Runtime & Core Backend Dependencies
| Package | Version | Purpose / Architectural Responsibility |
| :--- | :--- | :--- |
| `express` | `^4.21.2` | Core HTTP application server and REST routing engine |
| `jsonwebtoken` | `^9.0.2` | Powers all JWT verification, token decoding, and `generateTestToken` |
| `cors` | `^2.8.5` | Express CORS middleware handling cross-origin requests and API client communication |
| `dotenv` | `^16.4.7` | Runtime environment variable loader for `src/config/env.ts` |
| `zod` | `^3.24.2` | Strict schema validation, DTO sanitization, and request payload validation |
| `@supabase/supabase-js` | `^2.49.1` | PostgreSQL database client, authentication, RPC procedure invoker, and RLS integration |

### Frontend UI & Client Dependencies
| Package | Version | Purpose / Architectural Responsibility |
| :--- | :--- | :--- |
| `react` | `^19.3.1` | Declarative component rendering and client application core |
| `react-dom` | `^19.3.1` | DOM renderer for React web application |
| `react-router-dom` | `^7.18.5` | Declarative client-side routing, navigation, and layout guards |
| `react-hook-form` | `^7.91.0` | Reactive form state management and form validation lifecycle |
| `@hookform/resolvers` | `^7.0.1` | Seamless schema validation adapter connecting React Hook Form to Zod schemas |
| `lucide-react` | `^1.66.0` | Production UI iconography library |

### Build, Styling & Development Tooling (`devDependencies`)
| Package | Version | Purpose / Architectural Responsibility |
| :--- | :--- | :--- |
| `vite` | `^6.0.0` | Frontend dev server, Hot Module Replacement (HMR), and production asset bundler |
| `@vitejs/plugin-react` | `^4.3.4` | Fast Refresh and JSX/TSX compilation for React in Vite |
| `tailwindcss` | `^3.4.17` | Utility-first CSS styling engine |
| `@tailwindcss/postcss` | `^4.0.0` | PostCSS integration plugin for modern Tailwind compilation |
| `postcss` | `^8.4.49` | CSS transformation and AST post-processing pipeline |
| `autoprefixer` | `^10.4.20` | Vendor prefixing for cross-browser CSS compatibility |
| `typescript` | `^5.7.3` | Static type system and NodeNext ESM compiler |
| `tsx` | `^4.19.3` | High-speed TypeScript execution engine and file-watcher runtime for development |
| `vitest` | `^3.0.6` | High-performance unit and integration test runner |
| `supertest` | `^7.0.0` | End-to-end and integration HTTP assertion framework for Express routes |
| `@electric-sql/pglite` | `^0.5.17` | Embedded in-process PostgreSQL engine for high-speed SQL regression tests |

---

## 3. Quick Start & Execution

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Automated Regression Test Suites
All 31 test suites and 510 tests must pass:
```bash
npm test
```

### 3. Build Client & Server Distributions
```bash
npm run build
npm run build:client
```

### 4. Start Development Server
```bash
npm run dev
```

---

## 4. Database Migrations (Supabase / PostgreSQL)

Migration files are maintained in [`supabase/migrations/`](supabase/migrations/). The repository contains **27 forward-only immutable migrations** (`20261104000001` through `20261122100007`). All 27 migrations are applied and synchronized on the pre-production remote Supabase project (`fsnfqnbixitmmjmeogml`). See [Consolidated Database Guide](docs/database/CONSOLIDATED_DATABASE_GUIDE.md) and [Deployment Procedures](docs/deployment/DEPLOYMENT_AND_MIGRATION_PROCEDURES.md).
