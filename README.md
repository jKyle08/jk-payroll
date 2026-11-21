# JK Payroll - Multi-Tenant, Departmental Hierarchy & Cascading RBAC

Core foundation for the JK Payroll System built with **Node.js (TypeScript)** and **Supabase (PostgreSQL + Auth + Row Level Security)**.

## Architecture Overview
For detailed documentation on the architecture, recursive CTE procedures, 3-tier cascade, and implicit permissions, see [ARCHITECTURE.md](ARCHITECTURE.md). For current security phase status and release evidence, see the [security master tracker](docs/security/SECURITY_REMEDIATION_MASTER_TRACKER.md) and [production readiness record](docs/security/SECURITY_PRODUCTION_READINESS.md).

## Tech Stack Overview

The JK Payroll architecture relies on modern, type-safe full-stack technologies categorized below:

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

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Tests
```bash
npm test
```

### 3. Build Distribution
```bash
npm run build
```

### 4. Start Development Server
```bash
npm run dev
```

## Database Migrations (Supabase / PostgreSQL)
Migration files are maintained in [`supabase/migrations/`](supabase/migrations/). The repository currently contains migrations through `20261121000019`; this does not establish which migrations are applied to any remote database. See the [security master tracker](docs/security/SECURITY_REMEDIATION_MASTER_TRACKER.md) for phase evidence.
