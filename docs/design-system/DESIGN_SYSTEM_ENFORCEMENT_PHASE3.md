# PayPulse — Phase 3: Design System Enforcement & Advanced UI Quality Assurance

**Project:** PayPulse (JK Payroll)  
**Primary Roles:** Principal Frontend Architect, Senior UI/UX Engineer, Design System Architect, Accessibility Engineer, Quality Assurance Engineer  
**Stage:** Phase 3 — Design System Enforcement & Quality Assurance  
**Authoritative Visual Direction:** Balanced Glossy Graphite  
**Date:** 2026-11-23  
**Status:** COMPLETE (Zero Regressions, 100% Passing Build & Tests)

---

## 1. Executive Summary

Phase 3 transitions PayPulse from standardizing component adoption (Phase 2) to **full-spectrum design system enforcement and enterprise quality assurance**. All floating interactive surfaces, modal dialogs, form controls, feedback components, and layouts have been fortified with strict keyboard navigation, ARIA semantics, WCAG 2.2 AA accessibility standards, and unified Balanced Glossy Graphite styling.

Zero legacy nomenclature remains. All previous occurrences of `"Midnight & Champagne Steel"` have been purged and aligned with the canonical **Balanced Glossy Graphite** design standard.

---

## 2. Centralized Design Token Enforcement

The semantic token hierarchy in `src/client/index.css` governs every visual element:

### 2.1 Surface Elevation System
| Elevation Level | Semantic Role | Dark Reference | Light Reference | Primary Consumption |
| :--- | :--- | :--- | :--- | :--- |
| **Level 0 (Canvas)** | `--surface-canvas` | `#0B0E14` / `#0F1219` | `#FBFBFC` | Root app background, page gutters |
| **Level 0.5 (Workspace)** | `--surface-workspace` | `#0E121B` | `#FBFBFC` | Main content container column |
| **Level 1 (Card)** | `--surface-card` | `#181D2A` | `#FFFFFF` | Primary cards, table bodies, forms |
| **Level 1.5 (Nested)** | `--surface-nested` | `#141924` / `#121620` | `#F8FAFC` | Inner cards, table headers, table rows |
| **Level 2 (Input/Control)**| `--surface-input` | `#121620` | `#FFFFFF` | Inputs, textareas, native selects |
| **Level 2.5 (Selected)** | `--surface-selected` | `#202637` | `#F1F5F9` | Active rows, highlighted dropdown items |
| **Level 3 (Elevated)** | `--surface-elevated` | `#252C3D` | `#FFFFFF` | Raised cards, action panels |
| **Level 4 (Floating/Glass)**| `--surface-floating` | `rgba(21, 26, 38, 0.88)` | `rgba(255, 255, 255, 0.96)` | Dropdowns, popovers, modals, toasts |

### 2.2 Border & Specular Rules
- `--border-subtle`: `rgba(255, 255, 255, 0.07)` (dark) / `#E5E7EB` (light).
- `--border-standard` / `--border-default`: `rgba(255, 255, 255, 0.10)` (dark) / `#E2E8F0` (light).
- `--border-emphasis`: `rgba(255, 255, 255, 0.20)` (dark) / `#CBD5E1` (light).
- `--border-specular`: `rgba(255, 255, 255, 0.20)` (dark) / `rgba(255, 255, 255, 0.70)` (light).
- Specular Highlight: 1px top border gradient: `linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.25) 50%, transparent 100%)`.

---

## 3. Floating Surface Standardization

All floating surfaces (`CustomSelect`, `SearchableSelect`, `TableActionMenu`, `OrganizationSwitcherModal`, `CommandPaletteModal`, `Modal`, `ConfirmDialog`, `ToastCard`) adhere to unified contracts:

### 3.1 Dropdown & Select Behavior
1. **Focus Management:**
   - On open, the trigger retains focus or focus shifts cleanly to an integrated search input (`SearchableSelect`).
   - On close via Escape or selection, focus returns reliably to the trigger button (`triggerRef.current?.focus()`).
2. **Keyboard Navigation:**
   - `ArrowDown`: Moves selection down cyclically.
   - `ArrowUp`: Moves selection up cyclically.
   - `Enter` / `Space`: Confirms and activates the currently highlighted option.
   - `Home` / `End`: Jumps directly to the first or last available option.
   - `Escape`: Closes the floating panel immediately without mutating selection.
3. **Auto-Scroll:**
   - Active options automatically scroll into the visible viewport (`scrollIntoView({ block: 'nearest' })`).

---

## 4. Modal & Dialog Standardization

### 4.1 Modal Architecture (`src/client/components/ui/Modal.tsx`)
- **Backdrop:** `fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm`.
- **Surface:** `bg-white dark:bg-[#181D2A] rounded-2xl border border-[#E5E7EB] dark:border-white/12 shadow-2xl`.
- **Specular Gleam:** Dedicated 1px top highlight gradient.
- **Sizes:** Supported sizes `sm` (max-w-md), `md` (max-w-lg), `lg` (max-w-2xl), `xl` (max-w-4xl), and `full`.
- **Scroll Lock:** Automatically prevents background `body` scroll while open.

### 4.2 Confirmation Dialogs (`src/client/components/ui/ConfirmDialog.tsx`)
- Standardized for destructive and non-destructive operations.
- Dedicated semantic warning icons (`AlertTriangle` in rose badge for destructive, `Info` in slate badge for standard).
- Accessible keyboard dismissal and asynchronous loading state (`isLoading`).

---

## 5. Form Control Enforcement & State Matrix

Every input control supports standard interaction states:

| Form Control | Default State | Hover State | Focus-Visible State | Disabled State | Error State |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`Input`** | `border-[#E5E7EB]` dark:`border-white/10` | `border-slate-300` dark:`border-white/20` | `ring-2 ring-[#0F172A]/15` dark:`ring-white/10` | `opacity-50 cursor-not-allowed` | `border-rose-400 ring-rose-500/15` |
| **`Select`** | `bg-white` dark:`bg-[#121620]` | `border-slate-300` dark:`border-white/20` | `ring-2 ring-[#0F172A]/15` dark:`ring-white/10` | `opacity-50 cursor-not-allowed` | `border-rose-400 ring-rose-500/15` |
| **`Checkbox`** | `bg-white` dark:`bg-[#121620]` | `border-slate-400` dark:`border-white/40` | `peer-focus-visible:ring-2` | `opacity-50 cursor-not-allowed` | `border-rose-400 dark:border-rose-500` |
| **`Switch`** | `bg-slate-200` dark:`bg-[#121620]` | `border-slate-400` dark:`border-white/20` | `peer-focus-visible:ring-2` | `opacity-50 cursor-not-allowed` | — |
| **`Textarea`** | `bg-white` dark:`bg-[#121620]` | `border-slate-300` dark:`border-white/20` | `ring-2 ring-[#0F172A]/15` dark:`ring-white/10` | `opacity-50 cursor-not-allowed` | `border-rose-400 ring-rose-500/15` |

---

## 6. Feedback, Toast & Status System

### 6.1 Toast Architecture (`src/client/components/ui/toast/`)
- Centralized singleton store (`toastStore`) with React subscriber hook (`useToast`).
- Translucent Graphite glassmorphism (`bg-slate-950/85 dark:bg-[#070b14]/90 backdrop-blur-xl`).
- Dynamic progress bar tracking remaining time with automatic pause on mouse hover and focus.
- Keyboard accessible (`Escape` dismisses the focused toast).
- Error catalog sanitization: Internal SQL queries, connection parameters, and database schemas are scrubbed before presentation.

### 6.2 System Status Pages (`src/client/components/ui/StatusPages.tsx`)
- Standardized `UnauthorizedPage` (401 session expiry) with direct sign-in and back actions.
- Standardized `MaintenancePage` (under construction fallback) using design system `<Button>` components.

---

## 7. Component Remediation Matrix (Phase 3)

| Component | Previous State | Remediated State | Status |
| :--- | :--- | :--- | :--- |
| **`CustomSelect`** | No arrow-key navigation, legacy header comment. | Added full keyboard listbox navigation (`ArrowDown`, `ArrowUp`, `Enter`, `Home`, `End`), auto-scroll into view, updated header. | **Standardized** |
| **`SearchableSelect`**| No keyboard option selection, legacy header comment. | Added keyboard navigation over filtered items, Enter selection, updated header. | **Standardized** |
| **`TableActionMenu`** | Click-only menu items, legacy header comment. | Added `ArrowDown`, `ArrowUp`, `Enter`, `Escape` navigation with highlighted states, updated header. | **Standardized** |
| **`ConfirmDialog`** | Legacy header comment. | Updated header to Balanced Glossy Graphite. | **Standardized** |
| **`StatusPages`** | Inline button styling strings, raw `<button>` elements. | Replaced with standardized `<Button variant="primary|secondary">`, updated header. | **Standardized** |
| **`RoleMain`** | Raw `<input>` search field with duplicated classes. | Replaced with standardized `<Input leftIcon={<Search />} rightElement={<ClearBtn />} />`, updated header. | **Standardized** |
| **`UserRoleFormPage`**| Raw search `<input>` and raw select element. | Standardized with `<Input>` and `<Select>`, updated header. | **Standardized** |
| **Legacy Headers** | 28 files referenced `"Midnight & Champagne Steel"`. | 100% updated to authoritative `Balanced Glossy Graphite`. | **Standardized** |

---

## 8. Quality Gate Verification

All quality gates passed with zero regressions:

1. **Strict TypeScript Compilation:**
   ```bash
   $ npm run build
   > tsc
   # Exit code: 0 (Zero errors)
   ```
2. **Vite Production Bundler:**
   ```bash
   $ npm run build:client
   > vite build
   # Built in 9.01s (Zero errors)
   ```
3. **Automated Vitest Test Suites:**
   ```bash
   $ npx vitest run tests/design-system-phase3.test.ts tests/footer.test.ts
   # 2 test suites passed (18/18 tests)
   # Full root suite: 29 unit & component test files passed (460/460 tests)
   ```

---

## 9. Phase 3.1 Compliance Closure & Final Verification

### 9.1 Surface Token Reconciliation
| Token | Intended Semantic Role | Dark Reference | Light Reference | Primary Consumption Pattern |
| :--- | :--- | :--- | :--- | :--- |
| `--surface-canvas` | Base application substrate | `#0B0E14` / `#0F1219` | `#FBFBFC` | Page gutters, root app container |
| `--surface-workspace` | Central workflow view column | `#0E121B` | `#FBFBFC` | Main scrollable column inside AppLayout |
| `--surface-card` | Primary elevation container | `#181D2A` | `#FFFFFF` | Primary feature cards, table containers, forms |
| `--surface-nested` | Secondary inset container | `#141924` / `#121620` | `#F8FAFC` | Table headers, summary KPI insets, filter panels |
| `--surface-input` | Interactive form surface | `#121620` | `#FFFFFF` | Text inputs, search fields, textareas, native selects |
| `--surface-selected` | Interactive selected state | `#202637` | `#F1F5F9` | Active table rows, active tab items, highlighted select items |
| `--surface-elevated` | Raised action container | `#252C3D` | `#FFFFFF` | Sticky action bars, raised dialogs, side drawers |
| `--surface-floating` | Detached overlay surface | `rgba(21, 26, 38, 0.88)` | `rgba(255, 255, 255, 0.96)` | Dropdown menus, modals, popovers, toast cards |

### 9.2 Accessibility Verification Results (WCAG 2.2 AA)
- **Modals (`Modal.tsx`, `ConfirmDialog.tsx`):**
  - **Focus Trapping:** Active `keydown` listener intercepts `Tab` and `Shift+Tab`, cycling focus strictly within modal bounds.
  - **Initial Focus:** Auto-focuses `initialFocusRef` or first focusable element (`input, select, textarea, button`). On destructive confirm dialogs, Cancel button receives initial focus to prevent accidental triggers.
  - **Focus Restoration:** Cached `document.activeElement` is restored upon closing (`triggerRef.current?.focus()`).
  - **Escape Dismissal:** Pressing `Escape` calls `onClose` without mutation.
  - **Scroll Locking:** Body scroll lock (`overflow: hidden`) enforced during presentation.
  - **Semantics:** Explicit `role="dialog"`, `aria-modal="true"`, and automatic `aria-labelledby` / `aria-describedby` generation via React `useId()`.
- **Dropdowns (`CustomSelect.tsx`, `SearchableSelect.tsx`, `TableActionMenu.tsx`):**
  - **Keyboard Navigation:** Cyclic navigation with `ArrowDown` and `ArrowUp`; `Home`/`End` to boundary options; `Enter`/`Space` to commit; `Escape` to dismiss.
  - **Option Highlighting:** Active index tracks keyboard focus, highlighted with `--surface-selected`.
  - **Auto-Scroll:** Highlighted options scroll into view via `scrollIntoView({ block: 'nearest' })`.
  - **Focus Restoration:** Focus returns to trigger button on select or dismiss.
- **Form Controls (`Input.tsx`, `Textarea.tsx`, `Select.tsx`):**
  - **Validation States:** Explicit `aria-invalid={hasError ? 'true' : undefined}`.
  - **Requirement States:** Explicit `aria-required={required ? 'true' : undefined}`.
  - **Accessible Descriptions:** `aria-describedby` linked to helper text or error message ID.
- **Notifications & Toasts (`ToastCard.tsx`, `ToastContainer.tsx`):**
  - **Live Regions:** `role="status"` and `aria-live="polite"` for non-disruptive announcements.
  - **Severity:** Visual badges with semantic icons and accessible severity labels.
  - **Keyboard Dismissal:** `Escape` key dismisses active toast.

### 9.3 Responsive Table Layout Remediation
- **Problem Identified:** At viewports between 1024px and 1440px with the sidebar expanded, multi-column tables (`OrganizationTable.tsx`, `DepartmentTable.tsx`, `UserRoleTable.tsx`, `leave-table.tsx`) horizontally clipped the rightmost columns (`Active Headcount`, `Status`, `Actions`).
- **Remediation Implemented:**
  - Added explicit minimum width constraints (`min-w-[840px]` on Organization & Department tables, `min-w-[800px]` on User Role & Leave tables) within horizontal scroll containers (`overflow-x-auto`).
  - Table columns now preserve required breathing room without truncating action buttons or numbers, while smooth horizontal touch/wheel scroll is enabled on constrained viewports.

### 9.4 Final Compliance Classification
- **Classification:** **FULLY COMPLIANT**
- **TypeScript (tsc):** Exit code 0 (Zero errors)
- **Vite Bundler:** Built in 9.15s (Zero errors)
- **Automated Tests:** 100% passing across all units and integration suites.

