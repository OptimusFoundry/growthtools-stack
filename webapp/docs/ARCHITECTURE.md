# Webapp Architecture Patterns

Reference for feature module structure, routing, data fetching, API layer, and file organization.

---

## Directory Structure

```
src/
├── proto-design-system/  # Design system (50+ components) — do not modify
│   ├── components/       # UI primitives by category
│   ├── tokens/           # Design tokens (spacing, colors, etc.)
│   ├── hooks/            # Design system hooks
│   └── themes/           # Theme definitions
├── features/             # Feature modules (see below)
├── routes/               # TanStack Router file-based routes (thin wrappers)
├── components/           # Shared app-level components (Layout, gating, etc.)
├── hooks/                # Shared hooks (used by 2+ features)
├── api/                  # fetcher, publicFetcher, transforms, types
├── contexts/             # React contexts + providers
├── config/               # App config (navigation, etc.)
└── types/                # Shared TypeScript types
```

---

## Feature Module Structure

Each feature lives under `src/features/{feature-name}/`:

```
src/features/{feature-name}/
├── components/
│   ├── {PageComponent}/
│   │   ├── component.tsx          # Main component
│   │   ├── component.module.scss  # Scoped styles
│   │   └── component.stories.ts   # Optional Storybook story
│   └── {SubComponent}/
│       ├── component.tsx
│       └── component.module.scss
├── hooks/                         # Feature-specific hooks (optional)
│   └── use{Something}.ts
└── services/                      # Feature-specific API services (optional)
    └── {feature}.service.ts
```

**Naming:** Component folders use PascalCase, files inside use `component.tsx` / `component.module.scss`.

---

## Component Pattern

```tsx
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
  loading?: boolean;
}

// ============================================================================
// Custom Hooks (above component, if used by one component only)
// ============================================================================

function useComponentData() {
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
  return (
    <Stack gap="lg" className={styles.root} {...props}>
      ...
    </Stack>
  );
});

ComponentName.displayName = "ComponentName";
```

**Rules:** always `memo` wrap, always set `displayName`, use section dividers.

---

## Route Pattern

Routes are thin wrappers in `src/routes/`. Business logic stays in features.

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

---

## Hook Pattern (Data Fetching)

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

**Rules:** always return `{ data, loading, error, refetch }`, use `toApiError()`, never raw `fetch`.

Hook placement:

| Used by | Location |
|---------|----------|
| One component | Same file, above component |
| Related components in one feature | `feature/hooks/` folder |
| Multiple features | `src/hooks/` |

---

## API Layer

```
src/api/
├── client.ts       # fetcher() and publicFetcher() — cookie-based auth
├── index.ts        # Barrel export for api layer (only exception to no-barrel rule)
├── transforms/     # API → UI type converters (snake_case → camelCase)
└── types/          # API response types (snake_case, matching backend)
```

- `fetcher<T>(url, options)` — authenticated, sends cookies
- `publicFetcher<T>(url, options)` — no auth, for public endpoints
- Types in `api/types/` use snake_case (matching backend)
- Transforms in `api/transforms/` convert to camelCase UI types
- UI types in `src/types/` use camelCase

---

## Contexts

| Context | File | Purpose |
|---------|------|---------|
| AuthProvider | `contexts/auth.tsx` | User auth state, login/logout |
| PersonaProvider | `contexts/persona.tsx` | Role-based nav filtering |
| TierProvider | `contexts/tier.tsx` | Subscription tier, feature gating |
| SidebarProvider | `contexts/sidebar.tsx` | Sidebar open/collapsed state |
| Providers | `contexts/providers.tsx` | Wraps all providers together |

---

## Navigation Config

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
        iconClass: "icon-name",   // maps to Lucide icon in Layout.tsx
        allowedPersonas: ["admin"],
      },
    ],
  },
];
```

The Layout component reads this config via PersonaProvider and renders the sidebar. Icon mapping is in `iconMap` const in `Layout.tsx`.

---

## Loading / Error / Empty State Pattern

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

return <DataDisplay data={data} />;
```

---

## File Size & Extraction Guidelines

| Metric | Limit | Action |
|--------|-------|--------|
| Component body | ~50 lines | Extract hooks / sub-components |
| File length | ~200 lines | Split into sub-components |
| `useState` calls | ~5 | Combine into hook or reducer |
| `useEffect` calls | ~2 | Extract into hooks |
| Props count | ~8 | Consider composition |

---

## No Barrel Exports

Do **not** create `index.ts` files to re-export modules — it slows builds, confuses tree-shaking, creates circular dependency risk.

```typescript
// ✅ Import directly from source
import { Button } from '@/proto-design-system/components/primitives/Button';
import { useAuth } from '@/hooks/useAuth';

// ❌ Never from barrel
import { Button } from '@/proto-design-system/components/primitives';
import { useAuth } from '@/hooks';
```

Exception: `src/api/index.ts` is intentional.
