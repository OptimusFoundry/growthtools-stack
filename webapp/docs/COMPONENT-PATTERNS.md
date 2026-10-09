# Component Patterns

Patterns for building feature-level components on top of `@optimusfoundry/quiet`. Primitives (buttons, fields, layout, overlays) come from quiet; this repo only adds components that compose them. Template-only conventions (gating, `useNotify`, `AppIcon`, `RouterLink`) are in [TEMPLATE-PATTERNS.md](TEMPLATE-PATTERNS.md).

---

## File Structure

Feature components live in `src/features/{feature}/components/{ComponentName}/`:

```
ComponentName/
├── component.tsx           # Main component (React 19 patterns)
├── component.module.scss   # CSS Modules with quiet tokens
└── component.stories.ts    # Optional Storybook story
```

Shared app-level components (not tied to one feature) live in `src/components/{ComponentName}/`.

---

## Using quiet

- **Check quiet first.** Before building anything, look for it in quiet: `vendor/quiet/DESIGN.md`, and `docs/guidelines/*.md` (`components.md` says when to compose which).
- **Import from the package root** — `import { Button, Stack } from "@optimusfoundry/quiet"`. No deep imports from `dist/`.
- **Props are authoritative in the component source (`.tsx`)** — `vendor/quiet/src/components/<group>/<Name>.tsx`. Do not guess props from memory or copy lists of them into docs.
- **A missing primitive** is built here on `--q-*` tokens and flagged for quiet; do not restyle a quiet component from outside.

---

## React 19 Component Patterns

### Basic Component — ref as prop, no forwardRef

```tsx
import type { HTMLAttributes, ReactNode, Ref } from 'react';
import styles from './component.module.scss';

export interface ComponentNameProps extends HTMLAttributes<HTMLDivElement> {
  /** Visual variant */
  variant?: 'primary' | 'secondary';
  /** Ref to the root element */
  ref?: Ref<HTMLDivElement>;
  children: ReactNode;
}

export function ComponentName({
  variant = 'primary',
  className,
  children,
  ref,
  ...props
}: ComponentNameProps) {
  return (
    <div
      ref={ref}
      className={`${styles.root} ${styles[variant]} ${className ?? ''}`}
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

Inside real screens use quiet's `TextField` and `Button` in place of the raw elements above.

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

The app theme itself is quiet's `ThemeProvider` / `useTheme`; the example above shows the pattern only.

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
// component.module.scss — quiet tokens only (--q-*); never hardcode values.
// Token tiers: vendor/quiet/DESIGN.md

.root {
  padding: var(--q-space-2);
  border-radius: var(--q-radius-sm);
}

.primary {
  background: var(--q-bg);
  color: var(--q-fg);
}

.secondary {
  background: var(--q-bg);
  border: 1px solid var(--q-border);
  color: var(--q-fg-body);
}
```

Gaps between elements are quiet `Stack` / `Grid` props, not margins; `display: grid` is banned by stylelint (use `Grid` with `Col span`). Spacing, type and layout rules: `vendor/quiet/docs/guidelines/` (`spacing.md`, `typography.md`, `layouts.md`).

---

## Storybook Template

Storybook runs on quiet: `.storybook/preview.ts` loads quiet's styles and wraps every story in the theme provider and `AppRoot`, with a theme toolbar (`foundry` / `foundry-dark`). Stories sit next to the component as `component.stories.ts`.

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ComponentName } from './component';

const meta = {
  title: 'Features/Feature/ComponentName',
  component: ComponentName,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary'] },
  },
} satisfies Meta<typeof ComponentName>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: 'Content' },
};

export const Secondary: Story = {
  args: { children: 'Content', variant: 'secondary' },
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

// 3. quiet
import { Button } from '@optimusfoundry/quiet';

// 4. API / utils
import { fetcher } from '@/api/client';

// 5. Types (import type)
import type { User } from '@/types/user';

// 6. Styles (always last)
import styles from './component.module.scss';
```

### Other TypeScript Patterns

```typescript
// satisfies for config objects — validates without widening the type
const defaultConfig = {
  variant: 'primary',
} satisfies Partial<ComponentNameProps>;

// import type for type-only imports — required in strict mode
import type { User } from '@/types/user';

// Explicit type arguments when inference changes behavior
const items = createItems<Item>([...]);
```

---

## Checklist Before Completing

- [ ] Searched quiet (and `src/components`) for an existing component before creating
- [ ] Imported quiet from `@optimusfoundry/quiet` only; props checked against the component source (`.tsx`)
- [ ] Used `ref` as prop (no `forwardRef`)
- [ ] Used `--q-*` tokens (no hardcoded values, no inline styles)
- [ ] TypeScript strict, no `any`
- [ ] Accessibility attributes (aria-label, role, etc.), unique accessible names
- [ ] Storybook story when the component is reusable
- [ ] No `index.ts` barrel exports
- [ ] React Compiler handles memoization (no manual `useMemo`/`useCallback`)
