# Frontend Component Standards

Status: `IMPLEMENTED`

## 1. Directory Structure (`src/client/components/`)
- `ui/`: Decoupled, reusable primitives (Button, Card, Dialog, Badge, Input, Table, Pagination, KpiCard, SearchableSelect).
- `layout/`: High-level chrome (Topbar, Sidebar, Footer, OrganizationSwitcherModal, UserProfilePopover, NotificationPopover).
- `onboarding/`: Onboarding wizard and tokenized invitation form.

---

## 2. Component Guidelines
- Explicit TypeScript props interfaces for every component.
- Accessibility attributes (`aria-label`, `role`, `aria-expanded`).
- Use `cn(...)` from `src/client/lib/utils.js` for dynamic styling.
