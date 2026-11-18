# Error Handling & Resilience Architecture

Status: `IMPLEMENTED`

## 1. Standard Error Responses
All API error responses must return JSON:
```json
{
  "error": "Human readable error message",
  "details": null
}
```

---

## 2. Fail-Closed Resilience
1. **RPC Timeouts & Failures:** If `get_user_effective_permissions` fails, the system logs the error and returns empty permissions `[]`.
2. **Missing Organization:** If an organization is suspended or missing, access is denied immediately.
