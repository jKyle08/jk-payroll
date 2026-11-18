# `src/client/pages/` Directory Agent Instructions

## Scope & Purpose
Contains declarative React page views rendered by `RootApp.tsx`.

---

## Organization of Pages
- `organizations/`:
  - `OrganizationListPage.tsx`: Displays organization table and directory view.
  - `NewOrganizationPage.tsx`: Super Admin internal organization creation wizard.
- `onboarding/`:
  - `StandaloneOnboardPage.tsx`: Public client onboarding page.
  - `TokenOnboardPage.tsx`: Private invitation onboarding page (`/onboarding/:token`).
