# PayPulse: Consolidated Architectural Decision Records (ADRs)

**Document Version:** 3.0.0 (Authoritative Decision Register)  
**Status:** Approved, Implemented, Deployed, and Verified  
**Scope:** Foundational Architecture Decisions for Organization Lifecycle, RBAC, Multi-Tenancy, and Database Boundaries

---

## Index of Approved Decisions

| ID | Title | Date | Status | Migrations Involved |
| :--- | :--- | :---: | :---: | :--- |
| **ADR-P01** | Template Catalog Instantiation (Decision P-01 Option C) | 2026-11-22 | **APPROVED & DEPLOYED** | `20261122100004`, `20261122100006` |
| **ADR-P02** | Single-Role Primary Key Enforcement per Tenant User | 2026-11-22 | **APPROVED & DEPLOYED** | `20261122100002` |
| **ADR-P03** | Composite Foreign Key Behavior with `ON DELETE NO ACTION` | 2026-11-22 | **APPROVED & DEPLOYED** | `20261122100002` |
| **ADR-P04** | Standardized Lock Acquisition Hierarchy to Prevent Deadlocks | 2026-11-22 | **APPROVED & DEPLOYED** | `20261122100002` |
| **ADR-P05** | Cryptographic SHA-256 Single-Use Onboarding Tokens | 2026-11-21 | **APPROVED & DEPLOYED** | `20261121000018`, `20261122100007` |

---

## ADR-P01: Template Catalog Instantiation (Decision P-01 Option C)

### Context & Problem
In Phase 3.0B, a critical architectural incompatibility (**F-30B-07**) was identified:
- Migration `20261122100002` added a composite foreign key on `public.user_roles`:
  ```sql
  CONSTRAINT fk_user_roles_org_role 
    FOREIGN KEY (organization_id, role_id) 
    REFERENCES public.roles(organization_id, id)
  ```
- However, legacy provisioning attempted to assign the global system role `TENANT_ADMIN` (`f0000000-0000-0000-0000-000000000002`), which had `organization_id IS NULL`. This immediately caused foreign key violation `23503` during onboarding.

### Considered Options
1. **Option A (Global Role Referencing):** Weaken composite foreign key to allow `organization_id IS NULL`. Rejected: Violates strict multi-tenant boundary and permits cross-tenant role leakage.
2. **Option B (Hybrid Dual Foreign Keys):** Check constraints allowing either global or tenant-scoped roles. Rejected: Creates high procedural complexity and inconsistent permission resolution.
3. **Option C (Template Catalog Instantiation):** Global roles are strictly for platform SuperAdmins. When an organization is onboarded, standard template roles (`ORG_ADMIN` and `EMPLOYEE`) are instantiated as tenant-owned records (`organization_id = v_org_id`).

### Decision & Consequences
**Adopted Option C.**
- Global roles are strictly reserved for platform SuperAdmin.
- Onboarding RPC instantiates tenant-owned `ORG_ADMIN` and `EMPLOYEE` roles.
- Composite foreign key `fk_user_roles_org_role` is fully satisfied.
- Clean separation of tenant authority; tenant administrators can customize their own role permissions without impacting other organizations.

---

## ADR-P02: Single-Role Primary Key Enforcement per Tenant User

### Context & Problem
Previously, `public.user_roles` used `PRIMARY KEY (organization_id, user_id, role_id)`, allowing a user to hold multiple conflicting roles within the same organization simultaneously. This created ambiguity in permission resolution and administrative auditing.

### Decision & Consequences
**Adopted `PRIMARY KEY (organization_id, user_id)`.**
- Each user may hold at most one role per organization at any time.
- Changing a user's role performs an atomic replacement, preventing conflicting multi-role assignments.
- Tested and verified: inserting a second role for the same user in an organization fails with `23505 (unique_violation)`.

---

## ADR-P03: Composite Foreign Key Behavior with `ON DELETE NO ACTION`

### Context & Problem
Initial proposals used `ON DELETE RESTRICT` on composite foreign keys `fk_user_roles_org_role` and `fk_organization_members_org_role`. Under PostgreSQL semantics, `RESTRICT` enforces immediate constraint validation at the start of a statement, preventing multi-entity transactional cascades and unassignment workflows.

### Decision & Consequences
**Adopted `ON DELETE NO ACTION`.**
- PostgreSQL defers constraint checking to the end of the statement or transaction.
- When an administrator unassigns a role and deletes it in the same transaction, `NO ACTION` evaluates cleanly after both operations complete.
- Deleting an assigned role is still strictly blocked with foreign key violation `23503`, preserving full referential integrity.

---

## ADR-P04: Standardized Lock Acquisition Hierarchy to Prevent Deadlocks

### Context & Problem
Audit **F-30B-08** revealed that migration `20261122100002` acquired table locks in reverse order relative to runtime application triggers (`roles` then `user_roles`), creating a deadlock hazard during concurrent operations.

### Decision & Consequences
**Standardized lock order across all migrations and procedures:**
```sql
LOCK TABLE public.user_roles, public.organization_members, public.roles IN ACCESS EXCLUSIVE MODE;
```
All schema migrations, maintenance functions, and administrative triggers must acquire locks in this exact order.

---

## ADR-P05: Cryptographic SHA-256 Single-Use Onboarding Tokens

### Context & Problem
Organization onboarding requires verified SuperAdmin authorization without exposing long-lived credentials or secret tokens in database tables.

### Decision & Consequences
**Implemented single-use hashed onboarding invitations:**
1. Platform SuperAdmin generates a 32-byte cryptographically secure random token.
2. The server stores only the SHA-256 hash in `public.organization_onboarding_invitations`.
3. The token expires in 24 hours.
4. Redemption uses a PostgreSQL `FOR UPDATE` row lock to eliminate race conditions.
5. Once redeemed, `redeemed_at` and `redeemed_by` are set, permanently preventing token reuse.
