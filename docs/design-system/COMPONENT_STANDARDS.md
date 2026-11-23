# PayPulse Shared Component Standards

**Project:** PayPulse (JK Payroll)  
**Document:** `docs/design-system/COMPONENT_STANDARDS.md`  
**Design Direction:** Balanced Glossy Graphite  
**Version:** 1.0.0 (Production Standard)  

---

## 1. Component System Overview

PayPulse provides a centralized, cohesive component library under `src/client/components/ui/`. Every component is built with TypeScript, React 19 forwardRef patterns, strict accessibility (ARIA roles and keyboard handling), and native dual-theme support (Light mode and Balanced Glossy Graphite dark mode).

### Golden Rule:
Developers must NEVER manually construct raw `<input>`, `<textarea>`, `<select>`, `<button>`, or surface containers with custom inline styles on feature pages. Always import from `src/client/components/ui/index.js`.

---

## 2. Foundation & Form Components

### 2.1 Button (`Button.tsx`)
Standardized interactive trigger supporting icons, loading spinner, and responsive sizing.

- **Variants:**
  - `primary`: Polished Platinum Slate (`#CBD5E1` / `#0F172A`) in Dark mode; Midnight Slate (`#0F172A` / `#FFFFFF`) in Light mode.
  - `secondary`: Clean elevated card surface (`bg-white` / `dark:bg-[#181D2A]`, `dark:border-white/10`).
  - `outline`: Subtle transparent container with boundary border.
  - `ghost`: Transparent container without border; reveals illumination on hover.
  - `destructive`: Muted rose treatment (`bg-rose-50` / `dark:bg-rose-950/40`) for deletions.
  - `link`: Inline text button with subtle hover underline.
- **Sizes:**
  - `sm` (`h-8`, `px-3`, `text-xs`)
  - `md` (`h-9`, `px-3.5`, `text-xs`) - *Standard*
  - `lg` (`h-10`, `px-4`, `text-xs sm:text-sm`) - *Forms & primary CTAs*
  - `icon` (`h-9`, `w-9`) / `icon-sm` (`h-7`, `w-7`)
- **Usage:**
  ```tsx
  import { Button } from '../../../client/components/ui/index.js';

  <Button variant="primary" size="lg" isLoading={isSubmitting} leftIcon={<Save className="w-4 h-4" />}>
    Save Changes
  </Button>
  ```

### 2.2 Input (`Input.tsx`)
Unified text control with icon slots, prefix/suffix elements, error states, and monospace support.

- **Heights:** `sm` (`h-8`), `md` (`h-10` default), `lg` (`h-11`).
- **Surface:** `bg-white dark:bg-[#121620]`.
- **Border:** `border-[#E5E7EB] dark:border-white/10`.
- **Focus:** `focus:ring-2 focus:ring-[#0F172A]/15 dark:focus:ring-white/10 focus:border-[#0F172A] dark:focus:border-white/30`.
- **Usage:**
  ```tsx
  import { Input } from '../../../client/components/ui/index.js';

  <Input
    value={code}
    onChange={(e) => setCode(e.target.value)}
    placeholder="e.g. OPG-ITD"
    isMonospace
    leftIcon={<Hash className="w-4 h-4" />}
    error={errors.code?.message}
  />
  ```

### 2.3 Textarea (`Textarea.tsx`)
Multi-line text input with custom scrollbar, matching input borders, and focus rings.

- **Usage:**
  ```tsx
  import { Textarea } from '../../../client/components/ui/index.js';

  <Textarea
    rows={3}
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    placeholder="Describe operational scope..."
  />
  ```

### 2.4 Select (`Select.tsx`)
Styled native select component styled identically to `Input` with custom ChevronDown indicator.

- **Usage:**
  ```tsx
  import { Select } from '../../../client/components/ui/index.js';

  <Select
    value={status}
    onChange={(e) => setStatus(e.target.value)}
    options={[
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ]}
  />
  ```

### 2.5 Floating Dropdowns: `CustomSelect` & `SearchableSelect`
- **`CustomSelect`:** Accessible floating popover for small to medium option lists without search.
- **`SearchableSelect`:** High-performance searchable dropdown with avatar support, sublabels, and real-time filtering.

### 2.6 Checkbox, Switch & Radio
- **`Checkbox`:** Accessible box with custom checkmark icon, label, description, and keyboard focus ring.
- **`Switch`:** Accessible toggle with sliding thumb (`translate-x-4`) and dual-theme colors.
- **`Radio`:** Accessible circular radio input with center dot.

### 2.7 FormField & Label (`FormField.tsx`)
Wraps any input with standardized label, required red asterisk, sublabel, helper text, and error message.

- **Usage:**
  ```tsx
  import { FormField, Input } from '../../../client/components/ui/index.js';

  <FormField
    label="Department Name"
    required
    description="The official registered name of this organizational division."
    error={errorMessage}
  >
    <Input value={name} onChange={(e) => setName(e.target.value)} />
  </FormField>
  ```

---

## 3. Surface & Card Architecture (`Card.tsx`)

### 3.1 Card Variants
- `default`: Level 2 surface (`bg-white dark:bg-[#181D2A]`, `rounded-2xl`, `border-[#E5E7EB] dark:border-white/10`).
- `nested`: Level 3 surface (`bg-[#F8FAFC] dark:bg-[#141924]`, `rounded-xl`).
- `elevated`: Level 4 modal surface (`bg-white dark:bg-[#202637]`, `shadow-lg`).
- `glossy`: Balanced Glossy Graphite card with subtle vertical gradient and specular highlight.

### 3.2 Subcomponents
- `<CardHeader>`: Standard padding and dividing line.
- `<CardTitle>`: Formatted title with icon alignment.
- `<CardDescription>`: Muted description text.
- `<CardContent>`: Main container body.
- `<CardFooter>`: Bottom action row with right-aligned button groups.

### 3.3 Usage:
```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
} from '../../../client/components/ui/index.js';

<Card specular>
  <CardHeader>
    <CardTitle>Organizational Hierarchy</CardTitle>
    <CardDescription>Configure department structure</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Form Fields */}
  </CardContent>
  <CardFooter>
    <Button variant="secondary">Cancel</Button>
    <Button variant="primary">Save</Button>
  </CardFooter>
</Card>
```

---

## 4. Floating & Overlay Components

### 4.1 Modal & Dialog (`Modal.tsx`)
Backdrop blur overlay (`bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm`), keyboard ESC dismissal, body scroll lock, specular line, and responsive sizing (`sm`, `md`, `lg`, `xl`, `full`).

### 4.2 Table Action Menu (`TableActionMenu.tsx`)
Standardized 3-dots popover for table rows with keyboard navigation, click-outside handling, and danger item styling.

---

## 5. Feedback Components

### 5.1 Alert Banner (`Alert.tsx`)
Inline banner for form errors, warnings, success notifications, and information.

- **Variants:** `info`, `success`, `warning`, `destructive`.
- **Usage:**
  ```tsx
  import { Alert } from '../../../client/components/ui/index.js';

  {errorMessage && (
    <Alert variant="destructive" onDismiss={() => setErrorMessage(null)}>
      {errorMessage}
    </Alert>
  )}
  ```

### 5.2 Toast Notification System (`src/client/components/ui/toast/`)
Centralized enterprise toast system. Triggered via `toast.success()`, `toast.error()`, `toast.info()`, `toast.warning()`, or catalog keys (`toast.success('department.created')`).

### 5.3 EmptyState (`EmptyState.tsx`)
Standard empty state with centralized icon, heading, descriptive text, and optional primary CTA button.

### 5.4 Skeleton (`Skeleton.tsx`)
Animated pulse placeholder (`animate-pulse bg-slate-200/80 dark:bg-white/[0.08]`) with `rounded`, `circular`, or `rectangular` variants.

---

## 6. Component Reusability Matrix

| Requirement | Preferred Component | Do NOT Use |
|---|---|---|
| User text input | `<Input />` | Raw `<input type="text" />` |
| Long text description | `<Textarea />` | Raw `<textarea />` |
| Native select dropdown | `<Select />` | Raw `<select>` |
| Searchable dropdown | `<SearchableSelect />` | Ad-hoc modal dropdown |
| Boolean toggle | `<Switch />` or `<Checkbox />` | Raw input checkbox |
| Card / Panel | `<Card>` | Raw `div` with copied shadow/border classes |
| Error banner | `<Alert variant="destructive">` | Custom `div` with `bg-rose-50` |
| Row actions | `<TableActionMenu />` | Ad-hoc button row |
| Loading state | `<Skeleton />` | Arbitrary pulsing div |
