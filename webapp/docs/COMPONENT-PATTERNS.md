# Component Patterns

Patterns for building new components in the proto-design-system or as feature-level components.

---

## File Structure

Design system primitives live in `src/proto-design-system/components/{category}/{ComponentName}/`:

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

```typescript
import type { ComponentProps } from 'react';

// satisfies for config objects
const defaultConfig = {
  variant: 'primary',
  size: 'md',
} satisfies Partial<ComponentNameProps>;

// import type for type-only imports
import type { User } from '@/types';

// Explicit type arguments when inference is ambiguous
const items = createItems<Item>([...]);
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
