# PayPulse Theming Guidelines

**Project:** PayPulse (JK Payroll)  
**Document:** `docs/design-system/THEMING_GUIDELINES.md`  
**Design Direction:** Balanced Glossy Graphite  
**Version:** 1.0.0 (Production Standard)  

---

## 1. Theming Architecture Overview

PayPulse provides enterprise theme switching between **Light**, **Dark (Balanced Glossy Graphite)**, and **System Preference**.

The system utilizes:
- **`ThemeContext`** (`src/client/core/theme/ThemeContext.tsx`): React context exposing `theme` (`'light' | 'dark' | 'system'`), `resolvedTheme` (`'light' | 'dark'`), `isDark` (`boolean`), and `setTheme` / `toggleTheme`.
- **Root DOM Class Switching:** When dark mode is resolved, class `dark` is appended to `document.documentElement` and `style.colorScheme = 'dark'` is set. For light mode, class `dark` is removed and `colorScheme = 'light'` is set.
- **LocalStorage Persistence:** The chosen mode is saved under key `paypulse_theme`.
- **System Preference Sync:** When `theme === 'system'`, a `window.matchMedia('(prefers-color-scheme: dark)')` listener automatically syncs `resolvedTheme` with OS-level theme changes.

---

## 2. Dark Mode Standard: Balanced Glossy Graphite

The authoritative dark mode aesthetic for PayPulse is **Balanced Glossy Graphite**.

### Core Visual Principles:
1. **Restrained Gloss:**
   - Gloss effects must remain subtle and restrained.
   - Do NOT use exaggerated neon glassmorphism or distracting translucent blurs on primary data surfaces.
   - Primary data surfaces (tables, forms) must remain fully opaque and legible using `#181D2A` (surface-card) or `#121620` (surface-input).
   - Glass blur (`backdrop-blur-md`, `backdrop-filter: blur(16px)`) is reserved exclusively for floating navigation overlays (topbar, dropdown menus, modals).
2. **Layered Graphite Elevation:**
   - Level 0 (Canvas): `#0B0E14`
   - Level 1 (Shell & Table Containers): `#121620`
   - Level 2 (Cards & Forms): `#181D2A`
   - Level 3 (Selected rows & Hover states): `#202637`
   - Level 4 (Elevated modals): `#252C3D`
3. **Specular Hairline Highlights:**
   - Elevated cards and modals incorporate a 1px specular highlight at the top border (`inset 0 1px 0 0 rgba(255, 255, 255, 0.12)` or `before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent`).
4. **Monochromatic Platinum Primary CTA:**
   - In dark mode, primary action buttons use Polished Platinum Slate (`bg-[#CBD5E1]` / `text-[#0F172A]`) rather than electric blues. This maintains the executive enterprise tone.

---

## 3. Light Mode Baseline Preservation

The application's established light-mode appearance is preserved:
- Canvas & Workspace: `#FBFBFC`
- Cards & Form Inputs: `#FFFFFF`
- Nested Containers & Headers: `#F8FAFC`
- Borders: `#E5E7EB` / `#E2E8F0`
- Primary Button: Midnight Slate (`#0F172A` with `#FFFFFF` text)
- Text: Primary `#111827`, Secondary `#475569`, Muted `#6B7280`

---

## 4. How to Add New Semantic Tokens

When introducing a new token:

1. **Declare CSS Variables in `src/client/index.css`:**
   Add the variable in both `:root` (light mode) and `html.dark, .dark` (dark mode):
   ```css
   :root {
     --surface-badge-accent: #EFF6FF;
   }
   html.dark, .dark {
     --surface-badge-accent: rgba(59, 130, 246, 0.15);
   }
   ```

2. **Map to Semantic Tailwind Class or Utility:**
   Create utility aliases or reference via arbitrary property `bg-[var(--surface-badge-accent)]`.

3. **Verify Contrast in Both Modes:**
   - Light mode contrast must achieve minimum 4.5:1 ratio against `#FFFFFF` / `#FBFBFC`.
   - Dark mode contrast must achieve minimum 4.5:1 ratio against `#0B0E14` / `#181D2A`.

---

## 5. Theme Testing Checklist

- [ ] Inspect component in light mode (`document.documentElement` without `.dark`).
- [ ] Inspect component in dark mode (`document.documentElement` with `.dark`).
- [ ] Verify focus indicator visibility in both modes (`focus:ring-2`).
- [ ] Verify hover and active states provide distinct visual feedback.
- [ ] Ensure text remains crisp without loss of legibility.
