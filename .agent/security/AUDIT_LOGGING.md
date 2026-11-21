# Audit Logging Architecture

Implementation guidance. Phase status and production approval are tracked in [the security master tracker](../../docs/security/SECURITY_REMEDIATION_MASTER_TRACKER.md); see the [architecture baseline](../../docs/security/SECURITY_ARCHITECTURE_BASELINE.md) for current constraints. This file is not a phase tracker.

## 1. Architecture
Audit logging operates through a hybrid trigger and application architecture:
1. **Database Triggers (`20261104000004_attach_audit_triggers.sql`):** Captures mutations (`INSERT`, `UPDATE`, `DELETE`) on sensitive tables, writing to `public.audit_logs`.
2. **Audit Logging Service (`src/features/audit-logs/`):** Express API endpoints and client inspection UI.

---

## 2. Log Entry Schema
Each audit record contains:
- `id` (UUID)
- `organization_id` (UUID)
- `actor_id` (UUID, user who initiated the action)
- `action` (e.g. `'CREATE'`, `'UPDATE'`, `'DELETE'`, `'ASSIGN_ROLE'`)
- `entity_type` (e.g. `'ORGANIZATION'`, `'DEPARTMENT'`, `'USER_ROLE'`)
- `entity_id` (UUID)
- `old_values` (JSONB)
- `new_values` (JSONB)
- `ip_address`, `user_agent`
- `created_at` (TIMESTAMPTZ)
