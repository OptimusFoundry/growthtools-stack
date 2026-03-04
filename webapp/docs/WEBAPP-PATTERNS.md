# Webapp Architecture Patterns

> Reference doc for building new features. Follow these patterns exactly.

---

## 1. Feature Module Structure

Each feature lives under `src/features/{feature-name}/` with this layout:

```
src/features/{feature-name}/
├── components/
│   ├── {PageComponent}/
│   │   ├── component.tsx          # Main component
│   │   ├── component.module.scss  # Scoped styles
│   │   └── component.stories.ts   # Optional Storybook story
│   ├── {SubComponent}/
│   │   ├── component.tsx
│   │   └── component.module.scss
│   └── index.ts                   # Optional barrel (only for feature-internal use)
├── hooks/                         # Feature-specific hooks (optional)
│   └── use{Something}.ts
└── services/                      # Feature-specific API services (optional)
    └── {feature}.service.ts
```

**Naming:** Component folders use PascalCase, files inside use `component.tsx` / `component.module.scss`.

---

## 2. Component Pattern

All components follow this structure:

```tsx
/**
 * ComponentName Component
 * Brief description of what it does
 */

// 1. React imports
import { memo, useState, useCallback } from "react";

// 2. Third-party imports
import { SomeIcon } from "lucide-react";

// 3. Proto design system imports
import { Card } from "@/proto-design-system/components/layout/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Text } from "@/proto-design-system/components/primitives/Text";

// 4. App imports (hooks, contexts, types, utils)
import { useAuth } from "@/contexts/auth";
import type { SomeType } from "@/types/someType";

// 5. Relative imports (sibling components)
import { ChildComponent } from "../ChildComponent/component";

// 6. Styles (always last)
import styles from "./component.module.scss";

// ============================================================================
// Types
// ============================================================================

export interface ComponentNameProps extends HTMLAttributes<HTMLDivElement> {
  /** Prop description */
  someProp: string;
  /** Optional prop */
  loading?: boolean;
}

// ============================================================================
// Custom Hooks (same file, above component, if used by one component only)
// ============================================================================

function useComponentData() {
  // ... hook logic
  return { data, loading, error };
}

// ============================================================================
// Sub-Components (same file if small, separate file if large)
// ============================================================================

const SubPart = memo(function SubPart({ ... }) {
  return <div>...</div>;
});
SubPart.displayName = "SubPart";

// ============================================================================
// Component
// ============================================================================

export const ComponentName = memo(function ComponentName({
  someProp,
  loading = false,
  ...props
}: ComponentNameProps) {
  // hooks
  // handlers
  // render
  return (
    <Stack gap="lg" className={styles.root} {...props}>
      ...
    </Stack>
  );
});

ComponentName.displayName = "ComponentName";
```

**Key rules:**
- Always `memo` wrap exported components
- Always set `displayName`
- Extract hooks above component, sub-components with their own `memo` + `displayName`
- Use `// ============================================================================` section dividers

---

## 3. Route Pattern

Routes live in `src/routes/` and use TanStack Router file-based routing:

```tsx
// src/routes/{route-name}.tsx
import { createFileRoute } from "@tanstack/react-router";
import { SomePage } from "@/features/{feature}/components/SomePage/component";

export const Route = createFileRoute("/{route-name}")({
  component: RouteComponent,
});

function RouteComponent() {
  return <SomePage />;
}
```

**Route → Feature mapping:** Routes are thin wrappers that import from features. Business logic stays in features.

---

## 4. Hook Pattern (Data Fetching)

Hooks live in `src/hooks/` (shared) or `src/features/{name}/hooks/` (feature-specific):

```tsx
// src/hooks/use{Action}.ts
import { useCallback, useEffect, useState } from "react";
import { type ApiError, fetcher } from "@/api";
import type { SomeType } from "@/types/someType";
import { toApiError } from "@/utils";

export const useSomething = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [data, setData] = useState<SomeType | null>(null);

  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetcher<SomeType>(
        `${import.meta.env.VITE_API_URL}/api/protected/endpoint`,
      );
      setData(response);
    } catch (error: unknown) {
      setError(toApiError(error));
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

**Key rules:**
- Always return `{ data, loading, error, refetch }`
- Use `toApiError()` for error conversion
- Use `fetcher` (authenticated) or `publicFetcher` (public endpoints)
- URL pattern: `` `${import.meta.env.VITE_API_URL}/api/protected/...` ``

---

## 5. API Layer

```
src/api/
├── client.ts       # fetcher() and publicFetcher() — cookie-based auth
├── index.ts        # Barrel export for api layer
├── transforms/     # API → UI type converters (snake_case → camelCase)
└── types/          # API response types (snake_case, matching backend)
```

- `fetcher<T>(url, options)` — authenticated, sends cookies
- `publicFetcher<T>(url, options)` — no auth, for public endpoints
- Types in `api/types/` match the backend response (snake_case)
- Transforms in `api/transforms/` convert to UI types (camelCase)
- UI types in `src/types/` are camelCase

---

## 6. Navigation Config

Navigation is driven by `src/config/navigation.ts`:

```tsx
export const navigationConfig: NavGroup[] = [
  {
    label: "Group Label",
    allowedPersonas: ["admin", "marketing"],
    items: [
      {
        label: "Page Name",
        href: "/route-path",
        iconClass: "icon-name",        // maps to Lucide icon in Layout.tsx
        allowedPersonas: ["admin"],
      },
    ],
  },
];
```

The Layout component (`src/components/Layout/Layout.tsx`) reads this config via PersonaProvider and renders the sidebar. Icon mapping is in `iconMap` const.

---

## 7. Contexts

| Context | File | Purpose |
|---------|------|---------|
| AuthProvider | `contexts/auth.tsx` | User auth state, login/logout |
| PersonaProvider | `contexts/persona.tsx` | Role-based nav filtering |
| TierProvider | `contexts/tier.tsx` | Subscription tier, feature gating |
| SidebarProvider | `contexts/sidebar.tsx` | Sidebar open/collapsed state |
| Providers | `contexts/providers.tsx` | Wraps all providers together |

---

## 8. Styling Pattern

- **Always** use CSS Modules: `component.module.scss`
- **Always** use design tokens: `var(--space-4)`, `var(--color-surface)`, etc.
- **Never** hardcode colors, spacing, or font sizes
- **Never** use inline styles for layout

```scss
// component.module.scss
.root {
  padding: var(--space-6);
}

.card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: var(--space-4);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}
```

---

## 9. Loading / Error / Empty State Pattern

```tsx
// Loading
if (loading) {
  return <Spinner size="lg" label="Loading..." />;
}

// Error
if (error) {
  return <ErrorState message={`Something went wrong: ${error.error}`} />;
}

// Empty
if (!data || data.length === 0) {
  return (
    <EmptyState
      icon={<SomeIcon size={48} />}
      title="No items found"
      description="Description of what to do"
      action={<Button>Create New</Button>}
    />
  );
}

// Data
return <DataDisplay data={data} />;
```

---

## 10. Proto Design System Components (Quick Reference)

| Category | Components |
|----------|------------|
| **Primitives** | `Button`, `Text`, `Badge`, `Avatar`, `Icon`, `Spinner`, `Skeleton`, `Tag` |
| **Forms** | `Input`, `TextField`, `TextArea`, `Select`, `Checkbox`, `Radio`, `Switch`, `Slider`, `FormField` |
| **Layout** | `Stack`, `Grid`, `Container`, `Card`, `Divider`, `AspectRatio` |
| **Navigation** | `Tabs`, `Sidebar`, `Navbar`, `Breadcrumb`, `Pagination`, `StepIndicator` |
| **Feedback** | `Alert`, `Toast`, `Progress`, `Banner` |
| **Overlays** | `Modal`, `Dropdown`, `DropdownMenu`, `Popover`, `Tooltip` |
| **Data** | `Table`, `DataGrid`, `List`, `StatCard`, `EmptyState` |

Import pattern: `import { Button } from "@/proto-design-system/components/primitives/Button";`

---

## 11. File Size & Extraction Guidelines

| Metric | Limit | Action |
|--------|-------|--------|
| Component body | ~50 lines | Extract hooks/sub-components |
| File length | ~200 lines | Split into sub-components |
| useState calls | ~5 | Combine into hook or reducer |
| useEffect calls | ~2 | Extract into hooks |
| Props count | ~8 | Consider composition |
