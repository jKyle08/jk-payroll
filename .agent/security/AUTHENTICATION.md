# Authentication Architecture & Lifecycle

Status: `IMPLEMENTED`

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
    
    ExtractClaims --> LookupProfile[Lookup Profile in DB Repository]
    LookupProfile --> UserActive{user.isActive == true?}
    UserActive -- No --> DenyUserInactive[403 Forbidden: User account is inactive]
    UserActive -- Yes --> SuperAdmin{isSuperAdmin == true?}
    
    SuperAdmin -- Yes --> BypassTenantCheck[Attach req.user & Continue]
    SuperAdmin -- No --> OrgLookup[Lookup Organization]
    
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
