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
- **Every UI change ships a Playwright spec** — any change to `src/routes/**`, pages, forms, or a new API call MUST come with a Playwright spec in `webapp/e2e/` that table-drives across every status code the endpoints can return. Use the `network` fixture from `e2e/fixtures/test.ts` and add MSW handlers + scenario factories to `e2e/handlers/<domain>.handlers.ts`. Invoke the `playwright-coverage-check` skill when making or reviewing webapp changes — it defines the exact pattern. Never `page.route` for API mocking; never `expect(body).toBeTruthy()` as an error-path assertion.
- **Accessible names must be unique within their visible context** — every focusable control needs a non-ambiguous accessible name. When two controls would otherwise share a name (rows in a list, duplicated nav across regions, icon-only buttons), the `aria-label` MUST disambiguate them. Ambiguous names break screen readers AND Playwright strict-mode locators. See [docs/A11Y-PATTERNS.md](docs/A11Y-PATTERNS.md).

## Environment

```env
VITE_API_URL=http://localhost:3000
```

## Docs

- **[UI kit design language](../docs/design-docs/)** — **read first for any new page or component.** Editorial serif-forward system (Fraunces + Geist). Start with `00-overview.md`, then numbered docs in order. `12-judgment.md`, `19-typography-decisions.md`, `20-spacing-decisions.md` are the prescriptive decision guides; `18-review.md` is the PR rubric.
- [Architecture & module patterns](docs/ARCHITECTURE.md) — feature structure, routes, hooks, API layer
- [Component patterns](docs/COMPONENT-PATTERNS.md) — React 19 patterns, SCSS template, Storybook
- [React 19 patterns](docs/REACT19-PATTERNS.md) — new APIs, deprecated patterns, testing
- [Design guidelines](docs/DESIGN-GUIDELINES.md) — component reference, design tokens, spacing
- [Page composition](docs/PATTERNS.md) — shell, heading, section, empty state rhythm
- [Page templates](docs/PAGE-TEMPLATES.md) — copy-paste scaffolds for 4 page shapes
- [Testing patterns](docs/TESTING-PATTERNS.md) — Vitest, RTL, Playwright, MSW
- [Accessibility patterns](docs/A11Y-PATTERNS.md) — aria-label uniqueness, instance discriminators, region landmarks
