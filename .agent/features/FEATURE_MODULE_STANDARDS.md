# Feature Module Standards

Status: `IMPLEMENTED`

## 1. Feature Slice Anatomy
Every feature under `src/features/<feature-name>/` should adhere to this standardized architecture:

- `<feature>.controller.ts`: Extracts query parameters and HTTP request payloads, delegates to service, and formats JSON responses.
- `<feature>.service.ts`: Implements pure business logic, database queries, and multi-tenant rules.
- `<feature>.routes.ts`: Defines Express routes and mounts security middleware.
- `<feature>.schema.ts`: Defines Zod validation schemas for request bodies and forms.
- `types.ts`: TypeScript interfaces specific to the domain.
- `components/`: React presentation and form components.
- `hooks/`: React custom hooks for querying and mutating feature data.
- `services/client.ts`: Client API caller functions for communication with backend.
- `index.ts`: Barrel export file.
