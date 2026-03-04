# React Design System Development Guidelines

## Project Overview
This is a **Vite-based React application** with TypeScript, featuring a comprehensive design system and modern development stack. The project uses a component-based architecture with a well-structured design token system.

> **IMPORTANT:** For comprehensive frontend design patterns, component usage, and styling rules, refer to [DESIGN-GUIDELINES.md](./docs/DESIGN-GUIDELINES.md) as the source of truth.

## Technology Stack
- **Build Tool**: Vite 7.3.0 with React plugin
- **React**: Version 19.2.3
- **Routing**: TanStack Router with auto code-splitting
- **Styling**: SCSS with CSS Modules and BEM naming conventions
- **UI Icons**: RemixIcon + lucide-react
- **Animation**: Motion (Framer Motion)
- **Documentation**: Storybook 10.1.10
- **Payment**: Stripe integration
- **Linting**: Biome
- **Type Safety**: TypeScript in strict mode

## Commands
- `npm run dev` - Start development server
- `npm run build` - TypeScript compilation + Vite build
- `npm run lint` - Run Biome linter
- `npm run lint:fix` - Run Biome with auto-fix
- `npm run lint:scss` - Run Stylelint for SCSS
- `npm run preview` - Preview built application
- `npm run storybook` - Run Storybook (port 6006)

## Project Structure

### Directory Organization
```
src/
├── proto-design-system/  # Design system (50+ components)
│   ├── components/       # UI components by category
│   │   ├── primitives/   # Button, Badge, Icon, Text, etc.
│   │   ├── forms/        # Input, TextField, Select, Checkbox, etc.
│   │   ├── feedback/     # Alert, Banner, Toast, Progress
│   │   ├── overlays/     # Modal, Dropdown, Popover, Tooltip
│   │   ├── navigation/   # Tabs, Sidebar, Breadcrumb, Pagination
│   │   ├── data/         # Table, DataGrid, List, StatCard
│   │   ├── layout/       # Stack, Grid, Card, Container
│   │   └── composite/    # Accordion, DatePicker, FileUpload
│   ├── tokens/           # Design tokens (spacing, colors, etc.)
│   ├── hooks/            # Design system hooks
│   └── themes/           # Theme definitions
├── components/           # Feature-specific components
├── design-tokens/        # Token re-exports
├── hooks/                # Custom React hooks
├── api/                  # API client and types
├── contexts/             # React contexts
├── routes/               # TanStack Router routes
└── types/                # TypeScript type definitions
```

### Component File Structure
```
ComponentName/
├── ComponentName.tsx          # Main component
├── ComponentName.module.scss  # CSS Modules styles
├── ComponentName.types.ts     # TypeScript types
└── ComponentName.stories.tsx  # Storybook stories
```

## Design System Usage

### CRITICAL: Use Existing Components
**ALWAYS check if a component exists before creating custom implementations**

> **📚 Full Component Reference:** See [DESIGN-GUIDELINES.md](./docs/DESIGN-GUIDELINES.md#components-reference)

```tsx
// ✅ CORRECT: Import from design system
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Modal } from "@/proto-design-system/components/overlays/Modal";
import { TextField } from "@/proto-design-system/components/forms/TextField";
import { Card } from "@/proto-design-system/components/layout/Card";
import { Badge } from "@/proto-design-system/components/primitives/Badge";

// ❌ WRONG: Creating custom implementations
<button className={styles.myButton}>Submit</button>
<div className={styles.customModal}>...</div>
```

### Key Components Quick Reference

| Category | Components |
|----------|------------|
| **Primitives** | `Button`, `Text`, `Badge`, `Avatar`, `Icon`, `Spinner`, `Skeleton`, `Tag` |
| **Forms** | `Input`, `TextField`, `TextArea`, `Select`, `Checkbox`, `Radio`, `Switch`, `Slider`, `FormField` |
| **Layout** | `Stack`, `Grid`, `Container`, `Card`, `Divider`, `AspectRatio` |
| **Navigation** | `Tabs`, `Sidebar`, `Navbar`, `Breadcrumb`, `Pagination`, `StepIndicator` |
| **Feedback** | `Alert`, `Toast`, `Progress`, `Banner` |
| **Overlays** | `Modal`, `Dropdown`, `DropdownMenu`, `Popover`, `Tooltip` |
| **Data** | `Table`, `DataGrid`, `List`, `StatCard`, `EmptyState` |

### Component Props Patterns

```tsx
// Button variants
<Button variant="primary">Main Action</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Cancel</Button>
<Button variant="destructive">Delete</Button>

// Form fields with labels and validation
<TextField
  label="Email"
  helperText="We'll never share your email"
  errorMessage={errors.email}
  required
/>

// Modal
<Modal open={isOpen} onClose={handleClose} size="md">
  <ModalHeader>Title</ModalHeader>
  <ModalBody>Content</ModalBody>
  <ModalFooter>
    <Button variant="ghost" onClick={handleClose}>Cancel</Button>
    <Button>Save</Button>
  </ModalFooter>
</Modal>

// Layout with Stack
<Stack gap={4} direction="horizontal" align="center">
  <Avatar name="John Doe" />
  <Text weight="medium">John Doe</Text>
  <Badge variant="success">Active</Badge>
</Stack>
```

## Design Tokens

### CRITICAL: Never Hardcode Values
**Always use CSS custom properties (design tokens)**

> **📚 Full Token Reference:** See [DESIGN-GUIDELINES.md](./docs/DESIGN-GUIDELINES.md#design-tokens)

```scss
// ✅ CORRECT: Using tokens
.card {
  padding: var(--space-4);           // 16px
  margin-bottom: var(--space-6);     // 24px
  border-radius: var(--radius-lg);   // 8px
  background: var(--color-surface);
}

// ❌ WRONG: Hardcoded values
.card {
  padding: 16px;
  margin-bottom: 24px;
  border-radius: 8px;
  background: #ffffff;
}
```

### Token Categories

| Category | Prefix | Example |
|----------|--------|---------|
| Spacing | `--space-*` | `var(--space-4)` |
| Colors | `--color-*` | `var(--color-primary)` |
| Typography | `--font-*` | `var(--font-size-lg)` |
| Shadows | `--shadow-*` | `var(--shadow-md)` |
| Radius | `--radius-*` | `var(--radius-lg)` |
| Z-index | `--z-*` | `var(--z-modal)` |
| Motion | `--duration-*`, `--ease-*` | `var(--duration-fast)` |

### Common Token Values

**Spacing (8px grid system):**
```scss
var(--space-1)   // 4px
var(--space-2)   // 8px
var(--space-3)   // 12px
var(--space-4)   // 16px
var(--space-6)   // 24px
var(--space-8)   // 32px
```

**Typography:**
```scss
var(--font-size-xs)    // 12px
var(--font-size-sm)    // 13px
var(--font-size-base)  // 14px
var(--font-size-lg)    // 17px
var(--font-size-xl)    // 19px
var(--font-size-2xl)   // 21px
var(--font-size-3xl)   // 25px
```

## Styling Best Practices

### Use SCSS Modules, Not Inline Styles

```tsx
// ✅ CORRECT: SCSS module
import styles from './MyComponent.module.scss';

<div className={styles.container}>
  <Card className={styles.customCard}>
    <Button variant="primary">Submit</Button>
  </Card>
</div>

// ❌ WRONG: Inline styles
<div style={{ display: 'flex', gap: '16px', padding: '24px' }}>
  <Card style={{ marginTop: '20px' }}>
    <Button style={{ backgroundColor: 'blue' }}>Submit</Button>
  </Card>
</div>
```

### Use Component Variants, Not Custom CSS

```tsx
// ✅ CORRECT: Using component props
<Button variant="primary" size="lg">Large Primary</Button>
<Badge variant="success">Active</Badge>
<Text size="lg" weight="semibold" color="secondary">Subtitle</Text>

// ❌ WRONG: Overriding with custom styles
<Button className={styles.bigBlueButton}>Submit</Button>
<span className={styles.customBadge}>Active</span>
```

### SCSS Module Pattern

```scss
// Component.module.scss
.container {
  display: grid;
  grid-template-columns: var(--space-64) 1fr;
  gap: var(--space-6);
  padding: var(--space-page);
}

.card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-4);

  &:hover {
    background: var(--color-surface-hover);
  }
}

@media (max-width: 768px) {
  .container {
    grid-template-columns: 1fr;
  }
}
```

## API Integration

### HTTP Client
Use the centralized `fetcher` from `@/api`:

```typescript
import { fetcher } from '@/api';

// Type-safe API call
const response = await fetcher<ResponseType>(
  `${import.meta.env.VITE_API_URL}/api/endpoint`,
  {
    method: 'POST',
    body: JSON.stringify(data)
  }
);
```

### Custom Hook Pattern

```typescript
import { fetcher, ApiError } from '@/api';

export const useGetData = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [data, setData] = useState<DataType | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetcher<DataType>(
        `${import.meta.env.VITE_API_URL}/api/data`
      );
      setData(response);
    } catch (err) {
      setError(toApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};
```

### Authentication
Cookie-based authentication:
- All API calls use `credentials: 'include'`
- No manual token management
- Authentication state managed server-side

## Code Organization

### Reduce Cognitive Load
**Extract logic into hooks and pure functions to keep components readable.**

### When to Extract

| Complexity | Action |
|------------|--------|
| 3+ related `useState` | Extract into a custom hook |
| `useEffect` with complex logic | Extract into a data-fetching hook |
| Handler > 5 lines | Extract into a named function or hook |
| Validation/transformation logic | Extract into a pure function |
| Logic reused elsewhere | Move to shared hooks/utils |

### Example: Extracting Complex Logic

```tsx
// ❌ BAD: Everything inline
function UserSettingsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => { /* 15 lines of fetch logic */ }, []);

  const handleSubmit = async () => {
    // 30 lines of validation + submit + error handling
  };

  return <div>/* 100 lines of JSX */</div>;
}

// ✅ GOOD: Logic extracted, component is thin
// -- Pure functions (top of file or separate utils file)
const validateSettings = (data: FormData): ValidationErrors => {
  const errors: ValidationErrors = {};
  if (!data.name.trim()) errors.name = 'Name is required';
  if (!isValidEmail(data.email)) errors.email = 'Invalid email';
  return errors;
};

// -- Custom hook (same file, above component)
function useUserSettings() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetcher<User>('/api/user')
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}

function useSettingsForm(user: User | null) {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    if (user) setFormData({ name: user.name, email: user.email });
  }, [user]);

  const handleSubmit = useCallback(async () => {
    const validationErrors = validateSettings(formData);
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    await fetcher('/api/user', { method: 'PUT', body: JSON.stringify(formData) });
  }, [formData]);

  return { formData, setFormData, errors, handleSubmit };
}

// -- Component is now clean and readable
function UserSettingsPage() {
  const { user, loading } = useUserSettings();
  const { formData, setFormData, errors, handleSubmit } = useSettingsForm(user);

  if (loading) return <Spinner />;

  return (
    <Card>
      <TextField
        label="Name"
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        errorMessage={errors.name}
      />
      <Button onClick={handleSubmit}>Save</Button>
    </Card>
  );
}
```

### Hook Placement

| Used by | Location |
|---------|----------|
| One component | Same file, above component |
| Related components in feature | `feature/hooks/` folder |
| Multiple features | `src/hooks/` |

### Simplifying Handlers

```tsx
// ❌ BAD: Complex inline handler
<Button onClick={async () => {
  const errors = {};
  if (!name) errors.name = 'Required';
  if (!email) errors.email = 'Required';
  if (Object.keys(errors).length) {
    setErrors(errors);
    return;
  }
  setSubmitting(true);
  try {
    await fetch('/api/submit', { method: 'POST', body: JSON.stringify({ name, email }) });
    toast.success('Saved!');
  } catch (e) {
    toast.error('Failed');
  } finally {
    setSubmitting(false);
  }
}}>Submit</Button>

// ✅ GOOD: Handler calls smaller functions
const validate = (): boolean => {
  const errors = validateSettings(formData);
  setErrors(errors);
  return Object.keys(errors).length === 0;
};

const handleSubmit = async () => {
  if (!validate()) return;
  await submitSettings(formData);
};

<Button onClick={handleSubmit}>Submit</Button>
```

### Component Size Limits

| Metric | Limit | If exceeded... |
|--------|-------|----------------|
| Function body | ~50 lines | Extract hooks/components |
| File length | ~200 lines | Split into sub-components |
| `useState` calls | ~5 | Combine into hook or reducer |
| `useEffect` calls | ~2 | Extract into hooks |
| Props count | ~8 | Consider composition |

---

## TypeScript Patterns

### Component Props Interface

```tsx
export interface ComponentProps extends HTMLAttributes<HTMLDivElement> {
  /** Visual variant */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Size of the component */
  size?: 'sm' | 'md' | 'lg';
  /** Whether disabled */
  disabled?: boolean;
}
```

### Import Organization

```typescript
// 1. React
import { useState, useEffect, useCallback } from 'react';

// 2. Third-party
import { useNavigate } from '@tanstack/react-router';

// 3. API/Utils
import { fetcher } from '@/api';

// 4. Types
import type { ComponentProps } from '@/types';

// 5. Components
import { Button } from '@/proto-design-system/components/primitives/Button';

// 6. Styles
import styles from './Component.module.scss';
```

## Accessibility Requirements

All interactive components must include:
- Proper ARIA attributes
- Keyboard navigation support
- Focus-visible states
- Semantic HTML elements

```tsx
// Icon-only buttons need aria-label
<Button icon={<X />} aria-label="Close" />

// Error messages need aria-describedby
<TextField
  label="Email"
  errorMessage="Invalid email"
  aria-describedby="email-error"
/>

// Navigation needs aria-label
<nav aria-label="Main navigation">
  <Sidebar>...</Sidebar>
</nav>
```

## Best Practices

### Do's
- ✅ Use existing design system components
- ✅ Use design tokens (`var(--space-4)`, not `16px`)
- ✅ Use SCSS modules for custom layouts
- ✅ Use component variants/props for styling
- ✅ Follow TypeScript strict mode
- ✅ Include proper accessibility attributes
- ✅ Use the centralized `fetcher` for API calls

### Don'ts
- ❌ Don't recreate existing components
- ❌ Don't hardcode colors, spacing, or sizes
- ❌ Don't use inline `style` props for static layouts
- ❌ Don't override component styles with custom CSS
- ❌ Don't use `any` type
- ❌ Don't ignore keyboard navigation
- ❌ Don't make direct `fetch` calls
- ❌ Don't use `index.ts` barrel exports (see below)

## No Barrel Exports

**CRITICAL: Do not use `index.ts` files for re-exporting modules (barrel exports).**

### Why We Avoid Barrel Exports

1. **Slower build times** - Bundlers must process entire dependency trees
2. **Larger bundles** - Tree-shaking is less effective with barrel files
3. **Circular dependency risks** - Barrel files often create hidden circular imports
4. **Slower IDE performance** - TypeScript must resolve more files
5. **Harder debugging** - Stack traces point to index.ts instead of actual source

### Import Directly From Source

```typescript
// ✅ CORRECT: Import directly from the source file
import { Button } from '@/proto-design-system/components/primitives/Button/Button';
import { useAuth } from '@/hooks/useAuth';
import { fetcher } from '@/api/fetcher';
import type { User } from '@/types/user';

// ❌ WRONG: Import from barrel/index files
import { Button } from '@/proto-design-system/components/primitives';
import { useAuth } from '@/hooks';
import { fetcher } from '@/api';
import type { User } from '@/types';
```

### File Organization Without Barrels

```
// Instead of:
hooks/
├── index.ts          ❌ Don't create this
├── useAuth.ts
└── useUser.ts

// Just have:
hooks/
├── useAuth.ts        ✅ Import directly: import { useAuth } from '@/hooks/useAuth'
└── useUser.ts        ✅ Import directly: import { useUser } from '@/hooks/useUser'
```

### Exception: Design System Components

The design system uses a specific import pattern for consistency:
```typescript
// This is acceptable for design system components
import { Button } from '@/proto-design-system/components/primitives/Button';
```
Where `Button` folder contains `Button.tsx` as the main export.

## Common Patterns

### Page Layout

```tsx
<Container>
  <Stack gap={8}>
    {/* Header */}
    <Stack direction="horizontal" justify="between" align="center">
      <Stack gap={1}>
        <Text as="h1" size="3xl" weight="semibold">Page Title</Text>
        <Text color="secondary">Page description</Text>
      </Stack>
      <Button>Action</Button>
    </Stack>

    {/* Content */}
    <Card>
      <CardBody>
        {/* Content here */}
      </CardBody>
    </Card>
  </Stack>
</Container>
```

### Form Layout

```tsx
<Card>
  <CardBody>
    <Stack gap={6}>
      <Text as="h2" size="xl" weight="semibold">Form Title</Text>

      <Grid columns={2} gap={4}>
        <TextField label="First Name" required />
        <TextField label="Last Name" required />
      </Grid>

      <TextField label="Email" type="email" required />
      <TextArea label="Description" rows={4} />

      <Stack direction="horizontal" gap={2} justify="end">
        <Button variant="ghost">Cancel</Button>
        <Button>Submit</Button>
      </Stack>
    </Stack>
  </CardBody>
</Card>
```

### Loading State Pattern

```tsx
if (loading) {
  return <Spinner />;
}

if (error) {
  return <Alert variant="error" title="Error">{error.message}</Alert>;
}

if (!data) {
  return (
    <EmptyState
      title="No data"
      description="No items found"
      action={<Button>Add Item</Button>}
    />
  );
}

return <DataDisplay data={data} />;
```

## Environment Variables

```env
VITE_API_URL=http://localhost:3000  # API base URL
```

---

**For comprehensive design patterns and component usage, always refer to [DESIGN-GUIDELINES.md](./docs/DESIGN-GUIDELINES.md)**
