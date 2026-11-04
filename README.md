# JK Payroll - Multi-Tenant, Departmental Hierarchy & Cascading RBAC

Core foundation for the JK Payroll System built with **Node.js (TypeScript)** and **Supabase (PostgreSQL + Auth + Row Level Security)**.

## Architecture Overview
For detailed documentation on the architecture, recursive CTE procedures, 3-tier cascade, and implicit permissions, see [ARCHITECTURE.md](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/ARCHITECTURE.md).

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
- [01_multi_tenant_cascading_rbac.sql](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/supabase/migrations/20261101000001_multi_tenant_cascading_rbac.sql)
- [02_functions_and_procedures.sql](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/supabase/migrations/20261101000002_functions_and_procedures.sql)
- [03_seed_data.sql](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/supabase/migrations/20261101000003_seed_data.sql)
