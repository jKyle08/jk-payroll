# `src/client/components/` Directory Agent Instructions

## Scope & Purpose
Contains shared React UI components divided into `ui/`, `layout/`, and `onboarding/`.

---

## Component Guidelines
1. **`ui/`:** Decoupled Radix/shadcn-style primitives (Button, Card, Dialog, SearchableSelect, Pagination). Keep primitives domain-agnostic.
2. **`layout/`:** High-level navigation chrome:
   - `topbar.tsx`: Minimalist Facebook-style topbar with notifications and profile switcher.
   - `sidebar.tsx`: Collapsible navigation sidebar supporting multi-level nested groups and permission gating.
   - `footer.tsx`: Persistent branding footer.
   - `OrganizationSwitcherModal.tsx`: Scope switcher modal.
3. **`onboarding/`:** Multi-step wizard components and invitation onboarding forms.
