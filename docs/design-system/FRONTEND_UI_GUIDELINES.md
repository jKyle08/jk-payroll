# PayPulse Frontend UI Guidelines

**Project:** PayPulse (JK Payroll)  
**Document:** `docs/design-system/FRONTEND_UI_GUIDELINES.md`  
**Design Direction:** Balanced Glossy Graphite  
**Version:** 1.0.0 (Production Standard)  

---

## 1. Page Development Standards

Every page in PayPulse must conform to the unified **Balanced Glossy Graphite** design architecture. Developers building new pages or features must assemble layouts using standardized design tokens and components rather than inventing ad-hoc styling.

### Standard Page Hierarchy
1. **Breadcrumb & Page Header:**
   - Subtle path trail (`text-xs text-[#6B7280] dark:text-[#64748B]`).
   - Page Title (`text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F8FAFC]`).
   - One-sentence scope description (`text-xs text-[#6B7280] dark:text-[#94A3B8]`).
   - Primary and secondary actions aligned on the right.
2. **Key Metric Indicators (KPIs):**
   - Use `<KpiCard>` with appropriate tone (`neutral`, `success`, `warning`, `danger`, `info`) and trends.
3. **Primary Working Surface:**
   - For directories: Toolbar (Search, Filter, ViewMode) + Table / Card Grid + Pagination.
   - For CRUD forms: Form `<Card specular>` with grouped sections and bottom action row.

---

## 2. Form Implementation Guidelines

All forms must utilize the centralized form controls from `src/client/components/ui/index.js`.

### Pattern:
```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  FormField,
  Input,
  Textarea,
  Select,
  Checkbox,
  Switch,
  Button,
} from '../../../client/components/ui/index.js';

export const ExampleForm = ({ onSubmit, onCancel }) => {
  return (
    <form onSubmit={onSubmit}>
      <Card specular>
        <CardHeader>
          <CardTitle>Section Header</CardTitle>
          <CardDescription>Section guidance and constraints</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Item Code" required sublabel="Uppercase">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                isMonospace
                placeholder="e.g. ITD-01"
              />
            </FormField>

            <FormField label="Classification">
              <Select
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                options={[
                  { value: 'exempt', label: 'Exempt' },
                  { value: 'non_exempt', label: 'Non-Exempt' },
                ]}
              />
            </FormField>
          </div>

          <FormField label="Description">
            <Textarea
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Enter operational description..."
            />
          </FormField>

          <Checkbox
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            label="Record is active and available across departments"
          />
        </CardContent>

        <CardFooter>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            Save Changes
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};
```

---

## 3. Table Implementation Guidelines

Tables represent the primary data density surface of PayPulse.

### Core Rules:
1. **Container:** Wrapped in `w-full bg-white dark:bg-[#121620] rounded-2xl border border-[#E5E7EB] dark:border-white/10 shadow-xs`.
2. **Header Row:** `bg-[#F8FAFC]/60 dark:bg-[#141924] border-b border-[#E5E7EB] dark:border-white/10 text-[11px] font-semibold text-[#6B7280] dark:text-[#64748B] uppercase tracking-wider`.
3. **Row Dividers:** `divide-y divide-[#E5E7EB] dark:divide-white/10`.
4. **Row Hover:** `hover:bg-slate-50/70 dark:hover:bg-[#181D2A]/80 transition-colors`.
5. **Row Actions:** Placed in the far-right column using `<TableActionMenu>`.
6. **Numeric Data:** Always apply `.tabular-nums` or `.tnum` with monospace font where applicable.
7. **Empty State:** When rows are 0 and not loading, render `<EmptyState>`.

---

## 4. Modal and Dropdown Guidelines

### Modals:
- Render via `<Modal>` with standard sizing (`sm`, `md`, `lg`, `xl`, `full`).
- Includes backdrop blur (`bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm`).
- ESC key handling and body scroll locking are managed automatically.
- Include a specular highlight line at the top border.

### Dropdowns:
- Standard selection: `<CustomSelect>`
- Filtered / searchable selection: `<SearchableSelect>`
- Row actions: `<TableActionMenu>`
- Dropdowns must always close on click-outside and on ESC key.
- Floating menus use elevation shadow `shadow-lg dark:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.15)]`.

---

## 5. Responsive Design Standards

- **Mobile First Philosophy:** Design layouts that stack on `<640px` (`grid-cols-1`) and expand to dual-column on `sm:` (`sm:grid-cols-2`).
- **Horizontal Scroll Containers:** All data tables must be wrapped in `overflow-x-auto` to prevent layout breaking on mobile devices.
- **Collapsible Sidebar:** On desktop (`lg:`), the sidebar occupies 260px (or 72px collapsed). On mobile (`<lg:`), the sidebar transforms into a slide-over drawer triggered from the topbar hamburger toggle.

---

## 6. Accessibility & Keyboard Navigation

1. **Semantic Elements:** Never use a `<div onClick=...>` where a `<button>` or `<a>` is appropriate.
2. **Keyboard Focus:** Every interactive control must exhibit a visible focus indicator (`focus-visible:ring-2`).
3. **Form Association:** All form inputs must have associated labels (`htmlFor` matching input `id`).
4. **Contrast Verification:** Ensure text contrast exceeds WCAG AA standards (4.5:1 for normal text, 3:1 for large text).
