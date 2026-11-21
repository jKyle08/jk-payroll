# Authentication Architecture & Lifecycle

Implementation guidance. Phase status and production approval are tracked in [the security master tracker](../../docs/security/SECURITY_REMEDIATION_MASTER_TRACKER.md); see the [architecture baseline](../../docs/security/SECURITY_ARCHITECTURE_BASELINE.md) for current constraints. This file is not a phase tracker.

## 1. Token Mechanism
- Standard Bearer JWT tokens in header: `Authorization: Bearer <jwt-token>`.
- Signed via `ENV.JWT_SECRET` using algorithm `HS256`.

---

## 2. Token Lifecycle in `auth.middleware.ts`

```mermaid
flowchart TD
    Req[Incoming Request] --> Extract[Extract Bearer Token]
    Extract --> HasToken{Token present?}
    HasToken -- No --> Deny401[401 Unauthorized: Bearer token missing]
    HasToken -- Yes --> VerifyLocal{Verify via ENV.JWT_SECRET}
    
    VerifyLocal -- Success --> ExtractClaims[Extract Claims: sub, orgId, deptId, isSuperAdmin]
    VerifyLocal -- Fails --> FallbackSB{Call Supabase Auth<br/>getUser(token)}
    
    FallbackSB -- Success --> ExtractClaims
    FallbackSB -- Fails --> DenyToken[401 Unauthorized: Invalid or expired token]
    
    ExtractClaims --> LookupProfile[Load current profile; PostgreSQL in production]
    LookupProfile --> UserActive{user.isActive == true?}
    UserActive -- No --> DenyUserInactive[403 Forbidden: User account is inactive]
    UserActive -- Yes --> SuperAdmin{isSuperAdmin == true?}
    
    SuperAdmin -- Yes --> BypassTenantCheck[Attach req.user & Continue]
    SuperAdmin -- No --> Membership[Require active membership in selected organization]
    Membership -- No --> DenyMembership[403 Forbidden: Active membership required]
    Membership -- Yes --> OrgLookup[Lookup Organization]
    
    OrgLookup --> OrgActive{org.status == 'Active' &&<br/>today <= org.endDate?}
    OrgActive -- No --> DenyOrgExpired[403 Forbidden: Organization expired/suspended]
    OrgActive -- Yes --> PreloadPerms[Preload Effective Permissions via CTE]
    PreloadPerms --> AttachContext[Attach req.user, req.effectivePermissions & req.permissionSet]
    AttachContext --> Next[next()]
```

---

## 3. Context Payload (`req.user`)
Populated on every authenticated request:
```typescript
export interface AuthUserContext {
  userId: string;
  tenantId: string;
  departmentId: string | null;
  fullName: string;
  isTenantAdmin: boolean;
  isSuperAdmin: boolean;
  isActive: boolean;
}
```

## 4. Registration and invitation provisioning

- Public member registration requires a valid, email-bound invitation. The invitation fixes organization, department, and role; the registrant cannot choose them.
- First organization and owner provisioning is separate: a SuperAdmin issues a one-use onboarding link with a 24-hour expiration, and redemption writes the organization and owner records transactionally.
- No session timeout duration is asserted here. Record an approved timeout policy only after verifying the corresponding Supabase Auth and application settings.
- This is implementation guidance. Verification and production approval are tracked in the [security master tracker](../../docs/security/SECURITY_REMEDIATION_MASTER_TRACKER.md) and [readiness record](../../docs/security/SECURITY_PRODUCTION_READINESS.md).
