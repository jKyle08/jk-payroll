# PayPulse Semantic Design Tokens

**Project:** PayPulse (JK Payroll)  
**Document:** `docs/design-system/DESIGN_TOKENS.md`  
**Design Direction:** Balanced Glossy Graphite  
**Version:** 1.0.0 (Production Standard)  

---

## 1. Design Token Architecture

PayPulse implements a centralized semantic design-token architecture using CSS Custom Properties and Tailwind CSS utility integration.

The token system decouples aesthetic values (colors, shadows, radii) from raw hardcoded CSS classes, allowing predictable light and dark mode switching while enforcing the authoritative **Balanced Glossy Graphite** visual language.

```
+-------------------------------------------------------------+
|                     Component Layer                         |
|  Button, Input, Card, Modal, Dropdown, Table, Toast, Badge  |
+-------------------------------------------------------------+
                              | consumes
+-------------------------------------------------------------+
|                  Semantic Token Layer                       |
|   surface-card, text-primary, border-default, focus-ring    |
+-------------------------------------------------------------+
                              | resolves to
+-------------------------------------------------------------+
|                    Theme Primitive Layer                    |
|   Light Mode Baseline  <--------->  Balanced Glossy Graphite |
+-------------------------------------------------------------+
```

---

## 2. Color Tokens

### 2.1 Surfaces & Backgrounds

| Semantic Token | CSS Variable | Light Mode Value | Dark Mode Value (Balanced Glossy Graphite) | Intended Usage |
|---|---|---|---|---|
| **Canvas Background** | `--bg-canvas` / `--surface-canvas` | `#FBFBFC` | `#0B0E14` | Primary viewport application background |
| **Workspace Column** | `--bg-workspace` / `--surface-workspace` | `#FBFBFC` | `#0E121B` | Main content scrolling column |
| **Primary Surface (Card)** | `--surface-card` / `--bg-surface-2` | `#FFFFFF` | `#181D2A` | Standard cards, panels, forms, dialog surfaces |
| **Secondary Surface (Nested)** | `--surface-nested` / `--bg-surface-3` | `#F8FAFC` | `#141924` | Nested containers, table header stripes, secondary cards |
| **Input Surface** | `--surface-input` / `--bg-surface-1` | `#FFFFFF` | `#121620` | Form inputs, textareas, selects, search bars |
| **Selected / Active Surface** | `--surface-selected` | `#F1F5F9` | `#202637` | Active table rows, selected dropdown options, active tabs |
| **Elevated Surface** | `--surface-elevated` | `#FFFFFF` | `#252C3D` | Floating modals, high-priority dialogs |
| **Floating Surface (Glass)** | `--surface-floating` | `rgba(255, 255, 255, 0.96)` | `rgba(21, 26, 38, 0.88)` | Dropdown menus, tooltips, popovers, sticky topbar |

### 2.2 Text & Content Hierarchy

| Semantic Token | CSS Variable | Light Mode Value | Dark Mode Value | Contrast & Purpose |
|---|---|---|---|---|
| **Text Primary** | `--text-primary` | `#111827` | `#F8FAFC` | Page headers, card titles, form labels, primary data |
| **Text Secondary** | `--text-secondary` | `#475569` | `#CBD5E1` (or `#94A3B8`) | Supporting text, descriptions, table body content |
| **Text Muted** | `--text-muted` | `#6B7280` | `#64748B` | Helper captions, timestamps, column headers, placeholders |
| **Text Disabled** | `--text-disabled` | `#9CA3AF` | `#475569` | Disabled inputs, inactive actions, read-only placeholders |

### 2.3 Borders & Separators

| Semantic Token | CSS Variable | Light Mode Value | Dark Mode Value | Usage |
|---|---|---|---|---|
| **Border Subtle** | `--border-subtle` | `#E5E7EB` | `rgba(255, 255, 255, 0.07)` | Table row dividers, inner card partitions |
| **Border Default** | `--border-default` / `--border-standard` | `#E2E8F0` | `rgba(255, 255, 255, 0.10)` | Card outlines, inputs, modals, popovers |
| **Border Emphasis** | `--border-emphasis` / `--border-strong` | `#CBD5E1` | `rgba(255, 255, 255, 0.20)` | Active borders, focused states, prominent cards |
| **Specular Highlight** | `--border-specular` | `rgba(255, 255, 255, 0.70)` | `rgba(255, 255, 255, 0.25)` | Top hairline gradient highlights on glossy surfaces |

### 2.4 Interactive & Status Tokens

| Semantic Token | Light Mode Value | Dark Mode Value | Purpose |
|---|---|---|---|
| **Primary Action (Bg)** | `#0F172A` (Midnight) | `#CBD5E1` (Platinum Slate) | Primary CTA buttons, key actions |
| **Primary Action (Text)** | `#FFFFFF` | `#0F172A` | Text on primary buttons |
| **Primary Action Hover** | `#1E293B` | `#E2E8F0` | Primary button hover state |
| **Focus Ring** | `rgba(15, 23, 42, 0.15)` | `rgba(255, 255, 255, 0.20)` | Keyboard accessible focus ring indicator |
| **Success (Green)** | `#059669` / `#10B981` | `#10B981` / `#34D399` | Approvals, active status, success toast |
| **Warning (Amber)** | `#D97706` / `#F59E0B` | `#F59E0B` / `#FBBF24` | Caution alerts, pending status |
| **Danger / Destructive** | `#E11D48` / `#EF4444` | `#EF4444` / `#F87171` | Deletions, critical security errors, rejected status |
| **Info (Blue / Indigo)** | `#2563EB` / `#3B82F6` | `#3B82F6` / `#60A5FA` | Informational badges, system updates |

---

## 3. Typography Tokens

| Token | Value | Applied Class | Usage |
|---|---|---|---|
| **Font Sans** | `'Inter', -apple-system, BlinkMacSystemFont, sans-serif` | `font-sans` | Default application typography |
| **Font Mono** | `'JetBrains Mono', monospace` | `font-mono` | Code snippets, UUIDs, currency values, numeric inputs |
| **Numeric Tabular** | `tabular-nums` | `tabular-nums`, `tnum` | All monetary amounts, dates, audit timestamps, phone numbers |
| **Size Display** | `24px` / `1.5rem` (`line-height: 2rem`) | `text-2xl font-bold` | Page titles, primary KPI figures |
| **Size Title** | `18px` / `1.125rem` (`line-height: 1.75rem`) | `text-lg font-bold` | Modal headers, card section headers |
| **Size Section** | `14px` / `0.875rem` (`line-height: 1.25rem`) | `text-sm font-semibold` | Subheaders, table group headers |
| **Size Body** | `12px` / `0.75rem` (`line-height: 1rem`) | `text-xs font-normal` | Standard inputs, table cells, paragraph text |
| **Size Caption** | `11px` / `0.6875rem` (`line-height: 0.875rem`) | `text-[11px]` | Form field helper text, badge text, metadata |
| **Size Micro** | `10px` / `0.625rem` (`line-height: 0.75rem`) | `text-[10px]` | Pill badges, hotkey indicators (`kbd`) |

---

## 4. Spacing Tokens

| Token | Pixel Equivalent | Tailwind Class | Application |
|---|---|---|---|
| **Space 1** | `4px` | `p-1`, `gap-1`, `space-y-1` | Micro component gaps, badge padding |
| **Space 2** | `8px` | `p-2`, `gap-2`, `space-y-2` | Button inner gaps, dropdown item padding |
| **Space 3** | `12px` | `p-3`, `gap-3`, `space-y-3` | Input padding, toolbar gaps |
| **Space 4** | `16px` | `p-4`, `gap-4`, `space-y-4` | Small card padding, modal content gap |
| **Space 6** | `24px` | `p-6`, `gap-6`, `space-y-6` | Standard card padding, form section gap |
| **Space 8** | `32px` | `p-8`, `gap-8`, `space-y-8` | Page layout margins, large form containers |

---

## 5. Border Radius Tokens

| Semantic Token | Pixel Value | Tailwind Class | Component Application |
|---|---|---|---|
| **Radius Small** | `6px` | `rounded-md` | Badges, chips, small tags |
| **Radius Medium** | `8px` | `rounded-lg` | Buttons (`sm`/`md`), dropdown menus, table action triggers |
| **Radius Large** | `12px` | `rounded-xl` | Form inputs, textareas, selects, search buttons |
| **Radius Extra Large** | `16px` | `rounded-2xl` | Primary cards, modals, table containers |
| **Radius Full** | `9999px` | `rounded-full` | Avatars, status dots, search pill inputs |

---

## 6. Elevation & Shadows

| Semantic Token | Light Mode Value | Dark Mode Value (Balanced Glossy Graphite) |
|---|---|---|
| **Shadow Subtle (2xs)** | `0 1px 2px 0 rgba(0, 0, 0, 0.05)` | `0 1px 2px 0 rgba(0, 0, 0, 0.3)` |
| **Shadow Card** | `0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)` | `0 4px 20px -2px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.12)` |
| **Shadow Elevated** | `0 10px 15px -3px rgba(0, 0, 0, 0.1)` | `0 12px 32px -4px rgba(0, 0, 0, 0.6), inset 0 1px 0 0 rgba(255, 255, 255, 0.18)` |
| **Shadow Floating** | `0 20px 25px -5px rgba(0, 0, 0, 0.1)` | `0 20px 48px -8px rgba(0, 0, 0, 0.7), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)` |

---

## 7. Motion & Transitions

| Token | Timing | Easing Function | Application |
|---|---|---|---|
| **Fast Transition** | `100ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | Checkbox ticks, button active depression |
| **Standard Transition** | `200ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | Hover states, dropdown open/close, card glow |
| **Slow Transition** | `300ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | Sidebar collapse/expand, modal fade & scale |

---

## 8. Z-Index Hierarchy

| Layer | Z-Index | Utility Class |
|---|---|---|
| **Content Baseline** | `0` | `z-0` |
| **Sticky Headers / Navigation** | `30` | `z-30` |
| **Dropdown Menus & Popovers** | `50` | `z-50` |
| **Toast Notifications** | `60` | `z-60` |
| **Modals & Dialogs** | `70` | `z-70` |
| **Critical System Alerts** | `90` | `z-90` |
