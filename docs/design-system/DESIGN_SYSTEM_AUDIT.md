# PayPulse Design System Architecture Audit

**Project:** PayPulse (JK Payroll)  
**Primary Role:** Principal Frontend Architect, UI/UX Systems Architect, Design System Engineer  
**Document:** `docs/design-system/DESIGN_SYSTEM_AUDIT.md`  
**Date:** November 2026  
**Status:** Canonical Baseline Audit  
**Authoritative Dark Design Direction:** Balanced Glossy Graphite  

---

## 1. Executive Summary

PayPulse is an enterprise-grade multi-tenant HR & Payroll management platform built on React 19, TypeScript, Tailwind CSS v4, and Vite. This audit evaluates the current frontend visual foundation, component architecture, styling infrastructure, and theming mechanisms to prepare for enterprise standardization under the **Balanced Glossy Graphite** visual language.

### Key Audit Findings:
1. **Strong Theming Engine Already in Place:** A centralized `ThemeContext` (`src/client/core/theme/ThemeContext.tsx`) provides `'light' | 'dark' | 'system'` support with `ResolvedTheme` persistence in `localStorage`, media query listeners, and automated `.dark` class injection on `document.documentElement`.
2. **Emerging Design Tokens in CSS:** `src/client/index.css` defines base CSS custom properties for light mode and Balanced Glossy Graphite dark mode (`--bg-canvas`, `--bg-workspace`, `--bg-surface-1..3`, `--border-subtle..specular`, `--text-primary..disabled`).
3. **Severe Ad-Hoc Hex Fragmentation:** While tokens exist in CSS, individual components and feature pages frequently bypass them, hardcoding arbitrary hex values such as `bg-[#181D2A]`, `dark:bg-[#121620]`, `border-[#E5E7EB]`, `dark:border-white/10`, and `text-[#111827]`.
4. **Missing Atomic Form Foundations:** No centralized `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`, or `FormField` components exist in `src/client/components/ui/`. Every feature page manually recreates raw `<input>`, `<select>`, `<textarea>`, and `<input type="checkbox">` elements with slightly differing radii (`rounded-lg` vs `rounded-xl`), focus rings, and dark mode borders.
5. **Missing Unified Surface / Card Abstractions:** No atomic `Card`, `CardHeader`, `CardTitle`, `CardContent`, or `CardFooter` components exist. Complex cards in `RoleFormPage`, `DepartmentFormPage`, `OrganizationSettingsForm`, and `OrganizationTable` duplicate 40+ character class strings for elevation and glossy borders.
6. **Robust Notification & Floating Components:** The Toast system (`src/client/components/ui/toast/`), `TableActionMenu`, `CustomSelect`, `SearchableSelect`, `ConfirmDialog`, and topbar popovers provide strong foundation for floating elements, though dropdown menus lack a unified popover surface token.
7. **Legacy Design System Nomenclature:** Multiple files still refer in header comments to legacy systems (e.g. `"Midnight & Champagne Steel"`). The canonical dark-mode visual standard is **Balanced Glossy Graphite**.

---

## 2. Current Frontend Architecture

```
src/client/
├── index.css                     # Tailwind CSS v4 entrypoint + Base Token Layer
├── main.tsx                      # Vite React 19 entrypoint + BrowserRouter
├── RootApp.tsx                   # Central route registry + ThemeProvider + Protected routes
├── core/
│   ├── theme/
│   │   └── ThemeContext.tsx      # Multi-mode Theme Provider ('light' | 'dark' | 'system')
│   ├── auth/                     # Session, cross-tab sync, route restoration
│   └── persistence/              # Form draft persistence & tab identity
├── layouts/
│   ├── AppLayout.tsx             # Responsive dashboard layout (collapsible sidebar + topbar + workspace)
│   ├── DashboardLayout.tsx       # Alias for AppLayout
│   └── OnboardingLayout.tsx      # Standalone onboarding container
├── components/
│   ├── layout/
│   │   ├── AppSidebar.tsx / sidebar.tsx   # Fixed/collapsible enterprise navigation
│   │   ├── AppTopbar.tsx / topbar.tsx     # Global action bar (search, notifications, theme toggle)
│   │   ├── AppFooter.tsx / footer.tsx     # Standardized legal footer
│   │   ├── CommandPaletteModal.tsx        # Global ⌘K search and quick jump modal
│   │   ├── OrganizationSwitcherModal.tsx  # Multi-tenant tenant swapping modal
│   │   ├── SystemStatusPopover.tsx        # Real-time infrastructure health indicator
│   │   ├── notification-popover.tsx       # Notification center
│   │   └── user-profile-popover.tsx       # Profile menu & sign-out
│   └── ui/
│       ├── Button.tsx            # Multi-variant button (primary, secondary, outline, ghost, destructive)
│       ├── Badge.tsx             # Status badge (neutral, outline, error, warning, success)
│       ├── StatusIndicator.tsx   # Minimal dot status indicator
│       ├── ConfirmDialog.tsx     # Modal confirmation dialog
│       ├── CustomSelect.tsx      # Floating dropdown without search
│       ├── SearchableSelect.tsx  # Floating dropdown with real-time fuzzy search
│       ├── KpiCard.tsx           # Dashboard metric display card
│       ├── Pagination.tsx        # Paginated table navigation
│       ├── SearchButton.tsx      # Topbar search trigger
│       ├── TableActionMenu.tsx   # 3-dots row action popover
│       ├── StatusPages.tsx       # 401 Unauthorized & Maintenance pages
│       └── toast/                # Full enterprise notification catalog & container
└── features/                     # Domain modules (organizations, departments, roles, users, etc.)
```

---

## 3. Styling Infrastructure Audit

### 3.1 Tailwind CSS Version & Configuration
- **Version:** Tailwind CSS `v4.0.0` with `@tailwindcss/postcss`.
- **Entry point:** `src/client/index.css` using `@import "tailwindcss";` and `@custom-variant dark (&:where(.dark, .dark *));`.
- **Configuration:** `tailwind.config.js` specifies `darkMode: 'class'` and content paths (`./index.html`, `./src/**/*.{js,ts,jsx,tsx}`).
- **Theme Variables in CSS:**
  `index.css` defines base CSS custom properties on `:root` and `html.dark, .dark`.
  - Light mode: `--bg-canvas: #FBFBFC`, `--bg-workspace: #FBFBFC`, `--bg-surface-1: #FFFFFF`, `--border-subtle: #E5E7EB`, `--text-primary: #111827`, `--btn-primary-bg: #0F172A`.
  - Dark mode (Balanced Glossy Graphite):
    - `--bg-canvas: #0B0E14` (Deep obsidian canvas)
    - `--bg-workspace: #0E121B` (Workspace background)
    - `--bg-surface-1: #121620` (Level 1 shell, sidebars, tables)
    - `--bg-surface-2: #181D2A` (Level 2 raised cards, panels)
    - `--bg-surface-3: #202637` (Level 3 hover states, selected rows)
    - `--bg-surface-elevated: #252C3D` (Elevated modals)
    - `--bg-surface-floating: rgba(21, 26, 38, 0.88)` (Glass floating popovers)
    - `--border-subtle: rgba(255, 255, 255, 0.07)`
    - `--border-standard: rgba(255, 255, 255, 0.10)`
    - `--border-strong: rgba(255, 255, 255, 0.14)`
    - `--border-specular: rgba(255, 255, 255, 0.20)`
    - `--text-primary: #F8FAFC`, `--text-secondary: #94A3B8`, `--text-muted: #64748B`
    - `--btn-primary-bg: #CBD5E1`, `--btn-primary-text: #0F172A` (Polished Platinum Slate)

### 3.2 Typography & Numeric Alignment
- Primary font: `'Inter', sans-serif`.
- Monospace font: `'JetBrains Mono', monospace` (`.font-mono`).
- Tabular figures: `.tabular-nums, .tnum` configured with `font-variant-numeric: tabular-nums` and `font-feature-settings: "tnum" 1`.

### 3.3 Motion & Scrollbars
- Standard cubic bezier: `cubic-bezier(0.16, 1, 0.3, 1)` used in `.glossy-card` and `.glass-floating`.
- Custom scrollbar classes (`.custom-scrollbar`) for dropdowns and navigation containers.

---

## 4. Component Architecture & Reusability Audit

### 4.1 Foundation & Form Controls
| Component | Existing File | Status | Audit Findings & Standardizing Needs |
|---|---|---|---|
| **Button** | `src/client/components/ui/Button.tsx` | Excellent | Standardized with `primary`, `secondary`, `outline`, `ghost`, `destructive`. Needs `'link'` variant as specified in prompt section 5.2. |
| **Input** | *None (Raw `<input>`)* | **Missing** | Dispersed across forms with duplicated inline Tailwind classes. Need atomic `Input` component with consistent height (`h-10`), font-size (`text-xs`), borders, states (focus, disabled, error). |
| **Textarea** | *None (Raw `<textarea>`)* | **Missing** | Duplicated across `DepartmentFormPage`, `RoleFormPage`, etc. Need atomic `Textarea` with matching border, radius, placeholder, focus ring. |
| **Select** | *None (Raw `<select>`)* | **Missing** | Native selects in `DepartmentFormPage` and `UserRoleFormPage` use raw `<select>` with inline options. Need atomic `Select` styled identically to `Input` and compatible with `CustomSelect`. |
| **CustomSelect** | `src/client/components/ui/CustomSelect.tsx` | Standard | High-quality non-search dropdown with keyboard dismiss and outside click. |
| **SearchableSelect** | `src/client/components/ui/SearchableSelect.tsx` | Standard | High-quality searchable dropdown with avatar support. |
| **Checkbox** | *None (Raw `<input type="checkbox">`)* | **Missing** | Inconsistently styled native inputs. Need accessible, styled `Checkbox` component. |
| **Radio** | *None* | **Missing** | Needed for single-select choices (e.g. proration methods, deduction options). |
| **Switch** | *None* | **Missing** | Toggle switches currently rendered either as raw checkboxes or ad-hoc toggle buttons. Need accessible `Switch` component. |
| **Label / FormField** | *None* | **Missing** | Form fields repeatedly write `<label className="block text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] mb-1.5">` and `<p className="text-[11px] text-rose-600 mt-1">`. Need `FormField` / `Label` wrapper. |

### 4.2 Surfaces & Cards
| Component | Existing File | Status | Audit Findings & Standardizing Needs |
|---|---|---|---|
| **Card** | *None (Only inline container styles)* | **Missing** | Form and overview cards repeatedly apply `bg-white dark:bg-[#181D2A] rounded-2xl border border-[#E5E7EB] dark:border-white/10 shadow-xs dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)]`. Need unified `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`. |
| **KpiCard** | `src/client/components/ui/KpiCard.tsx` | Standard | Consistent metric card with trends and tone indicators. |
| **ToastCard** | `src/client/components/ui/toast/ToastCard.tsx` | Standard | Polished notification card with progress bar. |
| **Modal / Dialog** | `ConfirmDialog.tsx`, `CommandPaletteModal.tsx`, `OrganizationSwitcherModal.tsx` | Fragmented | Modals each implement their own backdrop, container borders, and escape/outside-click listeners. Need reusable `Modal` / `Dialog` wrapper. |

### 4.3 Data Display & Feedback
| Component | Existing File | Status | Audit Findings & Standardizing Needs |
|---|---|---|---|
| **Table** | Inline per module | Standard Pattern | `OrganizationTable`, `DepartmentTable`, `UserRoleTable` follow a clean, consistent tabular structure with `#F8FAFC]/60` / `dark:bg-[#141924]` header and `divide-y divide-[#E5E7EB] dark:divide-white/10`. Can be formalized in guidelines. |
| **TableActionMenu** | `src/client/components/ui/TableActionMenu.tsx` | Standard | 3-dots action menu with keyboard/click-outside dismiss. |
| **Badge** | `src/client/components/ui/Badge.tsx` | Standard | Standardized with `neutral`, `outline`, `error`, `warning`, `success`. |
| **StatusIndicator** | `src/client/components/ui/StatusIndicator.tsx` | Standard | Minimalist dot indicator with Active/Inactive/Suspended/Onboarding status. |
| **Pagination** | `src/client/components/ui/Pagination.tsx` | Standard | Standard pagination bar with page-size selector and total records counter. |
| **Toast System** | `src/client/components/ui/toast/` | Industry Standard | Complete enterprise message catalog, deduplication, auto-expiry, pause on hover. |
| **Alert Banner** | Inline | **Missing** | Inline banners (`bg-rose-50`, `bg-emerald-50`, `bg-amber-50`) duplicated across 12+ files. Need reusable `Alert` component. |
| **Empty State** | Inline per module | **Missing** | Empty states in `OrganizationTable`, `DepartmentTable`, etc., duplicate search-x layout. Need reusable `EmptyState` component. |
| **Skeleton** | `OrganizationTableSkeleton.tsx` | Partial | Only exists for organization table. Need generic `Skeleton` for general loading surfaces. |

---

## 5. Inconsistent Styling Patterns & Identified Weaknesses

1. **Ad-Hoc Hex Codes in Feature Pages:**
   More than 150 instances of hardcoded arbitrary hex color strings (`#181D2A`, `#121620`, `#0B0E14`, `#E5E7EB`, `#CBD5E1`, `#94A3B8`) are scattered throughout feature pages.
2. **Form Control Discrepancies:**
   - Some inputs use `rounded-xl`, others use `rounded-lg`.
   - Focus rings alternate between `focus:ring-[#0F172A]/15`, `focus:ring-slate-400/20`, and `focus:ring-indigo-500/20`.
   - Error messages are styled with varying text sizes (`text-xs` vs `text-[11px]`).
3. **Button Usage Gaps:**
   Back buttons and secondary action triggers on several pages (e.g. `DepartmentFormPage`, `OrganizationTable` empty state) use raw `<button>` elements with custom classes rather than `<Button variant="secondary">` or `<Button variant="outline">`.
4. **Card Gloss Inconsistencies:**
   Some cards utilize the CSS utility `.glossy-card`, while others manually construct inline gradients or standard flat dark backgrounds.

---

## 6. Identified Risks & Architectural Guardrails

1. **Test Regressions:**
   The test suite includes 35 test files and over 600 tests. Crucially, tests like `organization-redesign-settings.test.ts`, `sidebar.test.ts`, `toast.test.ts`, and `table-action-menu.test.ts` mount components and inspect specific attributes, DOM structures, and text labels.
   *Mitigation:* Retain all existing prop interfaces, test IDs, and ARIA roles. Any component refactoring must remain 100% backward-compatible.
2. **Light Mode Divergence:**
   The prompt mandates: *"Preserve the application's existing light-mode appearance. Do not modify light-mode appearance unnecessarily."*
   *Mitigation:* Base light-mode tokens strictly on existing values (`#FFFFFF`, `#FBFBFC`, `#E5E7EB`, `#E2E8F0`, `#111827`, `#475569`).
3. **Database & API Boundaries:**
   *Strict Constraint:* Zero changes to backend schemas, Supabase functions, or API contracts.
4. **Network Sandboxing in Vitest:**
   As verified during initial audit, running `vitest` in standard sandboxed terminal mode disables loopback TCP networking and remote Supabase connections. Full validation must account for sandbox constraints.

---

## 7. Recommended Implementation Strategy

### Stage 2: Centralized Semantic Design Tokens
- Extend `src/client/index.css` with a complete, structured semantic token architecture using CSS variables and Tailwind utility aliases.
- Categories:
  - Surface hierarchy (`--surface-canvas`, `--surface-card`, `--surface-nested`, `--surface-input`, `--surface-selected`, `--surface-floating`).
  - Text hierarchy (`--text-primary`, `--text-secondary`, `--text-muted`, `--text-disabled`).
  - Border hierarchy (`--border-default`, `--border-subtle`, `--border-emphasis`, `--border-specular`).
  - Interactive & Status tokens (`--primary-bg`, `--primary-text`, `--color-success`, `--color-warning`, `--color-danger`, `--color-info`, `--focus-ring`).
  - Motion, Spacing, Radius, and Elevation tokens.
- Produce `docs/design-system/DESIGN_TOKENS.md` and `docs/design-system/THEMING_GUIDELINES.md`.

### Stage 3: Shared Component Standardization
- Standardize existing components in `src/client/components/ui/`:
  - Enhance `Button.tsx`: Add `'link'` variant, ensure consistent focus and loading states.
  - Implement atomic Form components:
    - `Input.tsx` (with left/right icons, prefix/suffix, clear button, error state)
    - `Textarea.tsx` (standardized padding, radius, focus)
    - `Select.tsx` (styled native select compatible with form libraries)
    - `Checkbox.tsx` (accessible, custom checkmark styling)
    - `Switch.tsx` (animated toggle switch)
    - `FormField.tsx` / `Label.tsx` (standard label, required asterisk, description, error text)
  - Implement atomic Surface components:
    - `Card.tsx` (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
  - Implement atomic Feedback components:
    - `Alert.tsx` (info, success, warning, danger inline banners)
    - `EmptyState.tsx` (standard icon, title, description, action button)
    - `Skeleton.tsx` (pulsing placeholder for cards, text, avatars)
- Produce `docs/design-system/COMPONENT_STANDARDS.md`.

### Stage 4: Application-Wide Validation & Consistency
- Progressively refactor representative forms and pages to use the standardized components without altering business logic or breaking tests:
  - `DepartmentFormPage.tsx`
  - `RoleFormPage.tsx`
  - `UserRoleFormPage.tsx`
  - `OrganizationMain.tsx` / `OrganizationTable.tsx`
- Ensure full responsiveness and accessibility.
- Produce `docs/design-system/FRONTEND_UI_GUIDELINES.md`.

### Stage 5: Documentation & Regression Testing
- Validate builds: `npm run build:client` (Vite) and `npm run build` (`tsc`).
- Run Vitest regression tests to verify 0 regressions across all suites.
- Produce `docs/design-system/DESIGN_SYSTEM_IMPLEMENTATION_REPORT.md` and final executive report.
