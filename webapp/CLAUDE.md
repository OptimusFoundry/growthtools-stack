# React Frontend — growth-tools/webapp

## Commands

```bash
npm run dev          # Dev server (port 3000)
npm run build        # TypeScript + Vite build
npm run lint         # Biome linter
npm run lint:fix     # Biome with auto-fix
npm run lint:scss    # Stylelint for SCSS
npm run test         # Vitest unit tests
npm run storybook    # Storybook (port 6006)
```

## Technology Stack

- **React 19**, Vite 7, TypeScript 5.9 (strict)
- **TanStack Router** — file-based routing in `src/routes/`
- **SCSS Modules** — scoped styles with design tokens
- **Proto Design System** — 50+ components in `src/proto-design-system/`
- **Biome** (code) + **Stylelint** (SCSS)
- **Vitest** + **Playwright** for testing

## Key Rules

- **Use existing design system components** — always check `proto-design-system/` before building
- **Design tokens only** — `var(--space-4)` not `16px`; `var(--color-surface)` not `#fff`
- **SCSS modules** — no inline styles for layout
- **No barrel exports** — import directly from source files
- **No `any`** — use `unknown` with type guards
- **React 19 patterns** — `ref` as prop, `useActionState`, `<Context>` directly (no `.Provider`)
- **Feature gating** — use `FeatureGate` / `FeatureGateHidden` from `src/components/gating/`

## Environment

```env
VITE_API_URL=http://localhost:3000
```

## Docs

- [Architecture & module patterns](docs/ARCHITECTURE.md) — feature structure, routes, hooks, API layer
- [Component patterns](docs/COMPONENT-PATTERNS.md) — React 19 patterns, SCSS template, Storybook
- [React 19 patterns](docs/REACT19-PATTERNS.md) — new APIs, deprecated patterns, testing
- [Design guidelines](docs/DESIGN-GUIDELINES.md) — component reference, design tokens, spacing
- [Page composition](docs/PATTERNS.md) — shell, heading, section, empty state rhythm
- [Page templates](docs/PAGE-TEMPLATES.md) — copy-paste scaffolds for 4 page shapes
- [Testing patterns](docs/TESTING-PATTERNS.md) — Vitest, RTL, Playwright, MSW
