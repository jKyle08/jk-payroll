# Frontend Application Architecture

Status: `IMPLEMENTED`

## 1. React 19 SPA Architecture
The frontend is built using React 19 and compiled via Vite 6. It resides completely within `src/client/`.

### 1.1 Entry Point & Bootstrapping
- [src/client/main.tsx](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/src/client/main.tsx): Mounts the root React DOM node and wraps the application with React Router's `<BrowserRouter>`.
- [src/client/RootApp.tsx](file:///c:/Users/HP_06/.gemini/antigravity-ide/scratch/jk-payroll/src/client/RootApp.tsx): Defines the client-side routing table.

---

## 2. Layout Shells (`src/client/layouts/`)

### 2.1 DashboardLayout (`src/client/layouts/DashboardLayout.tsx`)
The primary layout for authenticated users. Consists of:
- **Left:** Collapsible navigation `<Sidebar>` with category grouping, active route highlighting, and permission-based item filtering.
- **Top:** Modern Facebook-style `<Topbar>` with tenant badge pill (`APEX-CORP`), search trigger, unread notification counter popover, and floating user profile account menu.
- **Center:** Responsive `<main>` content container.
- **Bottom:** Persistent PayPulse `<Footer>` component preserving system branding.
- **Modal:** `<OrganizationSwitcherModal>` for organization/tenant context switching.

### 2.2 OnboardingLayout (`src/client/layouts/OnboardingLayout.tsx`)
A focused, minimalist, centered container layout without sidebar or topbar chrome, designed for high-focus onboarding wizards and signup flows.

---

## 3. Route Views (`src/client/pages/`)
Clean, standard React Router view components:
- `organizations/OrganizationListPage.tsx`: Displays organization management directory.
- `organizations/NewOrganizationPage.tsx`: Multi-step organization creation wizard.
- `onboarding/StandaloneOnboardPage.tsx`: Public self-service onboarding flow.
- `onboarding/TokenOnboardPage.tsx`: Tokenized private invitation onboarding flow.
