# Multi-Tenancy Architecture & IDOR Mitigations

Status: `IMPLEMENTED`

## 1. Invariable Tenant Filtering
Every database lookup, repository filter, and SQL query is scoped by the authenticated user's `tenantId`:
- A non-superadmin user CANNOT access data of another organization under any circumstances.
- If a user sends `{ "organizationId": "other-tenant-uuid" }`, the controller or service forcefully overrides it with `req.user.tenantId`.

---

## 2. Cross-Tenant IDOR Mitigations (SEC-04, SEC-05, SEC-06)
1. **User Profile Retrieval by ID (SEC-04):** Querying a user profile belonging to another tenant returns `404 Not Found`, preventing tenant enumeration.
2. **Department Tree Retrieval (SEC-05):** Requesting department details or subtrees across tenant boundaries returns `404 Not Found`.
3. **Organization Directory Restriction (SEC-06):**
   - Regular users and Tenant Admins can only view their own organization record.
   - Super Admins retain platform-wide access and can enumerate all organizations.
