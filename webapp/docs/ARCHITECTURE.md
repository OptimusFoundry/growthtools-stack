# Webapp Architecture Patterns

Reference for feature module structure, routing, data fetching, API layer, and file organization.

---

## Directory Structure

```
src/
├── features/             # Feature modules (see below)
├── routes/               # TanStack Router file-based routes (thin wrappers)
├── components/           # Shared app-level components (Layout, gating, AppIcon, patterns)
├── hooks/                # Shared hooks (used by 2+ features)
├── api/                  # fetcher, publicFetcher, transforms, types
├── contexts/             # React contexts + providers
├── config/               # App config (navigation, tiers)
├── styles/               # Shared SCSS (_breakpoints.scss)
├── lib/                  # Non-React helpers (cache, sentry, migrateTheme)
├── utils/                # Pure helpers (format, timeAgo, trimTrailingPeriod)
└── types/                # Shared TypeScript types
```

The UI kit is the `@optimusfoundry/quiet` package, not a folder in `src/`. Its docs ship in `vendor/quiet/` (`DESIGN.md`, `docs/guidelines/*.md`). Template-only patterns are in [TEMPLATE-PATTERNS.md](TEMPLATE-PATTERNS.md).

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

// 3. quiet (single entry point)
import { Button, Card, Stack, Text } from "@optimusfoundry/quiet";

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
    <Stack gap="md" className={styles.root} {...props}>
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
import { type ApiError, fetcher } from "@/api/client";
import type { SomeType } from "@/types/someType";
import { toApiError } from "@/utils/errorHandler";

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
├── transforms/     # API → UI type converters (snake_case → camelCase)
└── types/          # API response types (snake_case, matching backend)
```

- `fetcher<T>(url, options)` — authenticated, sends cookies (`credentials: 'include'` automatically)
- `publicFetcher<T>(url, options)` — no auth, for public endpoints
- Types in `api/types/` use snake_case (matching backend)
- Transforms in `api/transforms/` convert to camelCase UI types
- UI types in `src/types/` use camelCase
- **Auth is cookie-based** — never manage tokens manually, auth state is server-side

---

## Contexts

| Context | File | Purpose |
|---------|------|---------|
| AuthProvider | `contexts/auth.tsx` | User auth state, login/logout |
| PersonaProvider | `contexts/persona.tsx` | Role-based nav filtering |
| TierProvider | `contexts/tier.tsx` | Subscription tier, feature gating |
| Providers | `contexts/providers.tsx` | Wraps all providers together |
| AppRoot | `contexts/AppRoot.tsx` | Root wiring (quiet `linkComponent`, the one `Toaster`); also used by Storybook |

Sidebar state comes from quiet's `SidebarProvider` (mobile drawer breakpoint set once, see TEMPLATE-PATTERNS).

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

## Styling Pattern

- **Always** use CSS Modules: `component.module.scss`
- **Always** use quiet tokens: `var(--q-space-2)`, `var(--q-bg)`, etc. Tiers and names are in `vendor/quiet/DESIGN.md`.
- **Never** hardcode colors, spacing, or font sizes
- **Never** use inline styles for layout
- **Never** write `display: grid` (stylelint bans it); use quiet `Grid` with `Col span`

```scss
// component.module.scss
@use "@/styles/breakpoints" as *;

.root {
  padding-inline: var(--q-space-page-x);
}

.card {
  background: var(--q-bg);
  border-radius: var(--q-radius-sm);
  border: 1px solid var(--q-border);
  padding: var(--q-space-2);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--q-space-2);
}

// Responsive rules use the shared mixins
.aside {
  @include breakpoint-down(md) {
    display: none;
  }
}
```

Multi-column layouts compose in JSX:

```tsx
<Grid columns={12}>
  <Col span={8}>...</Col>
  <Col span={4}>...</Col>
</Grid>
```

Layouts, grid and spacing rules: `vendor/quiet/docs/guidelines/` (`layouts.md`, `grid.md`, `spacing.md`).

---

## Loading / Error / Empty State Pattern

Lists render these states through `AsyncList` (`@/components/patterns/AsyncList/AsyncList`), never hand-rolled branches in a route; see [TEMPLATE-PATTERNS.md](TEMPLATE-PATTERNS.md). Non-list views early-return one state per branch:

```tsx
if (loading) return <Spinner />;

if (error) return <Alert variant="error" title="Something went wrong" />;

return <DataDisplay data={data} />;
```

Check `Spinner`, `Alert` and `EmptyState` props in `vendor/quiet/src/components/<group>/<Name>.tsx`.

---

## File Size & Extraction Guidelines

| Metric | Limit | Action |
|--------|-------|--------|
| Component body | ~50 lines | Extract hooks / sub-components |
| File length | ~200 lines | Split into sub-components |
| `useState` calls | ~5 | Combine into hook or reducer |
| `useEffect` calls | ~2 | Extract into hooks |
| Props count | ~8 | Consider composition |

**When to extract**: 3+ related `useState` → custom hook. `useEffect` with complex logic → data-fetching hook. Handler > 5 lines → named function. Validation/transformation logic → pure function. Logic reused elsewhere → shared hook.

```tsx
// ❌ Everything inline — hard to read and test
function UserSettingsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  useEffect(() => { /* 15 lines of fetch logic */ }, []);
  const handleSubmit = async () => { /* 30 lines */ };
  return <div>/* 100 lines of JSX */</div>;
}

// ✅ Logic extracted — component is readable
const validateSettings = (data: FormData): ValidationErrors => {
  const errors: ValidationErrors = {};
  if (!data.name.trim()) errors.name = 'Name is required';
  if (!isValidEmail(data.email)) errors.email = 'Invalid email';
  return errors;
};

function useUserSettings() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    fetcher<User>(`${import.meta.env.VITE_API_URL}/api/protected/user`)
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
    if (Object.keys(validationErrors).length) { setErrors(validationErrors); return; }
    await fetcher(`${import.meta.env.VITE_API_URL}/api/protected/user`, {
      method: 'PUT', body: JSON.stringify(formData),
    });
  }, [formData]);
  return { formData, setFormData, errors, handleSubmit };
}

function UserSettingsPage() {
  const { user, loading } = useUserSettings();
  const { formData, setFormData, errors, handleSubmit } = useSettingsForm(user);
  if (loading) return <Spinner />;
  return (
    <Card>
      <TextField label="Name" value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        error={errors.name} />
      <Button onClick={handleSubmit}>Save</Button>
    </Card>
  );
}
```

---

## No Barrel Exports

Do **not** create `index.ts` files to re-export modules — it slows builds, confuses tree-shaking, creates circular dependency risk.

```typescript
// ✅ Import directly from source
import { useAuth } from '@/hooks/useAuth';

// ❌ Never from barrel
import { useAuth } from '@/hooks';
```

No exceptions — import directly from source (e.g. `@/api/client`, `@/api/types/common`). `@optimusfoundry/quiet` is a package with a single entry point, not a barrel of ours; import it as is and never from `dist/` paths.

---

## Feature Gating

Access comes from `useFeatureAccess(feature)` (tier from `TierProvider`). Two `FeatureGate` components exist at different paths; pick by whether the feature should show disabled or hide.

### FeatureGate (gating) — disabled with lock badge

```tsx
import { FeatureGate } from "@/components/gating/FeatureGate/component";

// Children render locked; a badge with the required tier links to /billing/plans.
<FeatureGate feature="webhooks_zapier">
  <WebhooksManager />
</FeatureGate>
```

**Use when:** users should see what they're missing and the upgrade path.

### FeatureGate (root) — hide, or swap in a fallback

```tsx
import { FeatureGate, FeatureGateDisabled } from "@/components/FeatureGate/component";

// No access: renders nothing
<FeatureGate feature="email_blasts">
  <EmailBlastEditor />
</FeatureGate>

// No access: renders the fallback
<FeatureGate
  feature="webhooks_zapier"
  fallback={<Alert variant="info" title="Upgrade to use webhooks" />}
>
  <WebhooksManager />
</FeatureGate>

// No access: children stay visible, marked aria-disabled, with a hover title
<FeatureGateDisabled feature="tracking_pixels" disabledMessage="Upgrade to Team">
  <TrackingPixelSection />
</FeatureGateDisabled>
```

**Use when:** the feature is tier-exclusive, or you want a clean UI without disabled sections.

| Component | Import | Behavior | Use case |
|-----------|--------|----------|----------|
| `FeatureGate` | `@/components/gating/FeatureGate/component` | Disabled with lock badge | Show restricted features with upgrade path |
| `FeatureGate` | `@/components/FeatureGate/component` | Hidden, or `fallback` when no access | Hide tier-exclusive features |
| `FeatureGateDisabled` | `@/components/FeatureGate/component` | `aria-disabled` with hover title | Form sections that require upgrade |

Other gating pieces (`GatedEmptyState`, `LimitUpgradeModal`, `useLimitGate`) live under `@/components/gating/`; see [TEMPLATE-PATTERNS.md](TEMPLATE-PATTERNS.md).
