# Component Patterns

Patterns for building new components in the proto-design-system or as feature-level components.

---

## File Structure

Design system primitives live in the `@optimusfoundry/proto-design-system` package under `src/components/{category}/{ComponentName}/` (imported as `@/proto-design-system/components/...`):

```
ComponentName/
├── ComponentName.tsx          # Main component (React 19 patterns)
├── ComponentName.module.scss  # CSS Modules with design tokens
├── ComponentName.types.ts     # TypeScript interfaces
└── ComponentName.stories.tsx  # Storybook documentation
```

Feature-level components live in `src/features/{feature}/components/{ComponentName}/` and use `component.tsx` / `component.module.scss` (lowercase).

**Component categories in proto-design-system:**

| Category | Path |
|----------|------|
| primitives | `components/primitives/` — Button, Badge, Text, Avatar |
| forms | `components/forms/` — TextField, Select, Checkbox |
| layout | `components/layout/` — Stack, Card, Grid, Container |
| feedback | `components/feedback/` — Alert, Toast, Progress |
| overlays | `components/overlays/` — Modal, Dropdown, Tooltip |
| navigation | `components/navigation/` — Tabs, Sidebar, Breadcrumb |
| data | `components/data/` — Table, StatCard, EmptyState |

---

## React 19 Component Patterns

### Basic Component — ref as prop, no forwardRef

```tsx
import type { HTMLAttributes, Ref } from 'react';
import styles from './ComponentName.module.scss';

export interface ComponentNameProps extends HTMLAttributes<HTMLDivElement> {
  /** Visual variant */
  variant?: 'primary' | 'secondary';
  /** Size of the component */
  size?: 'sm' | 'md' | 'lg';
  /** Ref to the root element */
  ref?: Ref<HTMLDivElement>;
  children: React.ReactNode;
}

export function ComponentName({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ref,
  ...props
}: ComponentNameProps) {
  return (
    <div
      ref={ref}
      className={`${styles.root} ${styles[variant]} ${styles[size]} ${className ?? ''}`}
      {...props}
    >
      {children}
    </div>
  );
}
```

### Form Component with Actions (React 19)

```tsx
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

interface FormComponentProps {
  onSubmit: (formData: FormData) => Promise<{ error?: string }>;
}

export function FormComponent({ onSubmit }: FormComponentProps) {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: { error?: string } | null, formData: FormData) => {
      return await onSubmit(formData);
    },
    null
  );

  return (
    <form action={formAction}>
      <input name="email" type="email" required />
      <SubmitButton />
      {state?.error && <p className={styles.error}>{state.error}</p>}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Submitting...' : 'Submit'}
    </button>
  );
}
```

### Optimistic UI (React 19)

```tsx
import { useOptimistic } from 'react';

export function OptimisticList({ items, onAdd }: ListProps) {
  const [optimisticItems, addOptimisticItem] = useOptimistic(
    items,
    (state, newItem: Item) => [...state, { ...newItem, pending: true }]
  );

  const handleAdd = async (formData: FormData) => {
    const name = formData.get('name') as string;
    addOptimisticItem({ id: crypto.randomUUID(), name });
    await onAdd(name);
  };

  return (
    <form action={handleAdd}>
      <input name="name" />
      <button type="submit">Add</button>
    </form>
  );
}
```

### Context Provider — no .Provider!

```tsx
import { createContext, use, useState } from 'react';

const ThemeContext = createContext<ThemeContextValue | null>(null);

// React 19: Use <Context> directly, NOT <Context.Provider>
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  return (
    <ThemeContext value={{ theme, setTheme }}>
      {children}
    </ThemeContext>
  );
}

// React 19: use() can be called conditionally
export function useTheme() {
  const context = use(ThemeContext);
  if (!context) throw new Error('useTheme must be within ThemeProvider');
  return context;
}
```

### Async Data with use()

```tsx
import { use, Suspense } from 'react';

function DataContent({ dataPromise }: { dataPromise: Promise<Data> }) {
  const data = use(dataPromise);
  return <div>{data.content}</div>;
}

export function DataDisplay(props: { dataPromise: Promise<Data> }) {
  return (
    <Suspense fallback={<Spinner />}>
      <DataContent {...props} />
    </Suspense>
  );
}
```

### Ref Cleanup (React 19)

```tsx
<div
  ref={(element) => {
    if (element) {
      const observer = new ResizeObserver(() => console.log('Resized'));
      observer.observe(element);
      // React 19: return cleanup function from ref callback
      return () => observer.disconnect();
    }
  }}
>
  {children}
</div>
```

---

## SCSS Template

```scss
// ComponentName.module.scss — NEVER hardcode values, always use design tokens

.root {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  transition: all var(--duration-fast) var(--ease-out);
}

.primary {
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.secondary {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.sm { padding: var(--space-2); font-size: var(--font-size-sm); }
.md { padding: var(--space-4); font-size: var(--font-size-base); }
.lg { padding: var(--space-6); font-size: var(--font-size-lg); }

.root:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
```

---

## Storybook Template

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { ComponentName } from './ComponentName';

const meta = {
  title: 'Components/Category/ComponentName',
  component: ComponentName,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof ComponentName>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: 'Content' },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      <ComponentName variant="primary">Primary</ComponentName>
      <ComponentName variant="secondary">Secondary</ComponentName>
    </div>
  ),
};
```

---

## TypeScript Patterns

### Import Ordering

Always organize imports in this order:

```typescript
// 1. React
import { useState, useEffect, useCallback } from 'react';

// 2. Third-party
import { useNavigate } from '@tanstack/react-router';

// 3. API / utils
import { fetcher } from '@/api/client';

// 4. Types (import type)
import type { User } from '@/types/user';

// 5. Components
import { Button } from '@/proto-design-system/components/primitives/Button';

// 6. Styles (always last)
import styles from './Component.module.scss';
```

### Other TypeScript Patterns

```typescript
// satisfies for config objects — validates without widening the type
const defaultConfig = {
  variant: 'primary',
  size: 'md',
} satisfies Partial<ComponentNameProps>;

// import type for type-only imports — required in strict mode
import type { User } from '@/types/user';

// Explicit type arguments when inference changes behavior
const items = createItems<Item>([...]);
```

---

## Component Import Paths

All components are in the `@optimusfoundry/proto-design-system` package (`@/proto-design-system/components/...`). Import directly from source — no barrel exports.

```tsx
// Primitives
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Text } from "@/proto-design-system/components/primitives/Text";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Avatar } from "@/proto-design-system/components/primitives/Avatar";
import { Icon } from "@/proto-design-system/components/primitives/Icon";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Skeleton } from "@/proto-design-system/components/primitives/Skeleton";
import { Tag } from "@/proto-design-system/components/primitives/Tag";

// Forms
import { Input } from "@/proto-design-system/components/forms/Input";
import { TextField } from "@/proto-design-system/components/forms/TextField";
import { TextArea } from "@/proto-design-system/components/forms/TextArea";
import { Select } from "@/proto-design-system/components/forms/Select";
import { Checkbox } from "@/proto-design-system/components/forms/Checkbox";
import { Radio } from "@/proto-design-system/components/forms/Radio";
import { Switch } from "@/proto-design-system/components/forms/Switch";
import { Slider } from "@/proto-design-system/components/forms/Slider";
import { FormField } from "@/proto-design-system/components/forms/FormField";

// Layout
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Grid } from "@/proto-design-system/components/layout/Grid";
import { Container } from "@/proto-design-system/components/layout/Container";
import { Card, CardHeader, CardBody, CardFooter } from "@/proto-design-system/components/layout/Card";
import { Divider } from "@/proto-design-system/components/layout/Divider";
import { AspectRatio } from "@/proto-design-system/components/layout/AspectRatio";

// Navigation
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@/proto-design-system/components/navigation/Tabs";
import { Sidebar } from "@/proto-design-system/components/navigation/Sidebar";
import { Navbar } from "@/proto-design-system/components/navigation/Navbar";
import { Breadcrumb } from "@/proto-design-system/components/navigation/Breadcrumb";
import { Pagination } from "@/proto-design-system/components/navigation/Pagination";
import { StepIndicator } from "@/proto-design-system/components/navigation/StepIndicator";

// Feedback
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { Toast } from "@/proto-design-system/components/feedback/Toast";
import { Progress } from "@/proto-design-system/components/feedback/Progress";
import { Banner } from "@/proto-design-system/components/feedback/Banner";

// Overlays
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/proto-design-system/components/overlays/Modal";
import { Dropdown } from "@/proto-design-system/components/overlays/Dropdown";
import { DropdownMenu } from "@/proto-design-system/components/overlays/DropdownMenu";
import { Popover } from "@/proto-design-system/components/overlays/Popover";
import { Tooltip } from "@/proto-design-system/components/overlays/Tooltip";

// Data Display
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/proto-design-system/components/data/Table";
import { DataGrid } from "@/proto-design-system/components/data/DataGrid";
import { List } from "@/proto-design-system/components/data/List";
import { StatCard } from "@/proto-design-system/components/data/StatCard";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";

// Composite
import { Accordion } from "@/proto-design-system/components/composite/Accordion";
import { DatePicker } from "@/proto-design-system/components/composite/DatePicker";
import { FileUpload } from "@/proto-design-system/components/composite/FileUpload";
import { MultiSelect } from "@/proto-design-system/components/composite/MultiSelect";
```

---

## Checklist Before Completing

- [ ] Searched for existing component before creating
- [ ] Used `ref` as prop (no `forwardRef`)
- [ ] Used design tokens (no hardcoded values)
- [ ] TypeScript types with JSDoc comments
- [ ] Accessibility attributes (aria-label, role, etc.)
- [ ] Storybook story
- [ ] No `index.ts` barrel exports
- [ ] React Compiler handles memoization (no manual `useMemo`/`useCallback`)
