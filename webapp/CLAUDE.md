# React Frontend — growth-tools/webapp

## Commands

```bash
npm run dev               # Dev server (port 3000)
npm run build             # TypeScript + Vite build
npm run lint              # Biome linter
npm run lint:fix          # Biome with auto-fix
npm run lint:scss         # Stylelint for SCSS
npx playwright test       # Playwright E2E tests (the only test runner; the user runs the suite)
npm run storybook         # Storybook (port 6006)
npm run build-storybook   # Static Storybook build
```

## Technology Stack

- **React 19**, Vite, TypeScript (strict)
- **TanStack Router** — file-based routing in `src/routes/`
- **SCSS Modules** — scoped styles with design tokens
- **quiet** — `@optimusfoundry/quiet`, pinned to tag v0.3.0 from git. One entry point: `import { Button, Stack } from "@optimusfoundry/quiet"`. Themes `foundry` / `foundry-dark` with a light/dark toggle in the Topbar (no theme picker); styles load once in `main.tsx`. Start at `node_modules/@optimusfoundry/quiet/README.md`, `DESIGN.md` and `docs/guidelines/README.md`.
- **`quiet-app` skill** ([`.claude/skills/quiet-app/SKILL.md`](../.claude/skills/quiet-app/SKILL.md)) — the entry point for UI work. Its last step is the audit: `npx quiet-audit <url> --width 1280,390 --theme foundry,foundry-dark`.
- **Proto (temporary)** — `@optimusfoundry/proto-design-system`, imported as `@/proto-design-system/<path>/<File>`, stays installed only for the product screens not yet rewritten (`components/create-post`, `features/{account,posts,blog,media,analytics,admin}`, their routes). CH-001 ([brief](../docs/briefs/2026-10-08-quiet-product-rewrite.md)) rewrites them on quiet and removes Proto. Don't add new Proto imports.
- **Biome** (code) + **Stylelint** (SCSS)
- **Playwright** + **MSW** for testing

## Key Rules

- **Use quiet components** — check quiet's exports and the `.d.ts` first (`node_modules/@optimusfoundry/quiet/dist/components/<group>/<Name>.d.ts`); props are authoritative there. No deep imports.
- **Design tokens only** — `var(--q-space-2)` not `16px`; `var(--q-bg)` not `#fff`. Token tiers: `node_modules/@optimusfoundry/quiet/DESIGN.md`. Proto `--color-*` / `--space-N` vars survive only in the not-yet-migrated product SCSS.
- **SCSS modules** — no inline styles for layout
- **No barrel exports** — import directly from source files
- **No `any`** — use `unknown` with type guards
- **Comment sparingly** — explain **why** (a non-obvious decision, constraint, or gotcha), never **what**. Prefer zero comments to redundant ones; do NOT mirror the existing over-commented files.
- **React 19 patterns** — `ref` as prop, `useActionState`, `<Context>` directly (no `.Provider`)
- **Feature gating** — use `FeatureGate` / `FeatureGateHidden` from `src/components/gating/`
- **Composition before code** — for any route, page, form, or feature in this webapp, apply the `frontend-composition-rules` skill ([`.claude/skills/frontend-composition-rules/SKILL.md`](../.claude/skills/frontend-composition-rules/SKILL.md)) **before writing JSX**. It covers slot-based page shells, custom hooks over HOCs (`useConfirmableDelete`, `useFilterCounts`), config-driven status meta, and `<AsyncList>`. It bans nested render ternaries, per-route `timeAgo`/`truncate`/`STATUS_LABELS` copies, hardcoded strings in routes, and `useState` + `<Dialog>` delete wiring. Applies to new pages **and** refactors.
- **Every UI change ships a Playwright spec** — any change to `src/routes/**`, pages, forms, or a new API call MUST come with a Playwright spec in `webapp/e2e/` that table-drives across every status code the endpoints can return. Use the `network` fixture from `e2e/fixtures/test.ts` and add MSW handlers + scenario factories to `e2e/handlers/<domain>.handlers.ts`. Pattern: the `frontend-e2e-rules` skill ([`.claude/skills/frontend-e2e-rules/SKILL.md`](../.claude/skills/frontend-e2e-rules/SKILL.md)). Never `page.route` for API mocking; never `expect(body).toBeTruthy()` as an error-path assertion.
- **Accessible names must be unique within their visible context** — every focusable control needs a non-ambiguous accessible name. When two controls would otherwise share a name (rows in a list, duplicated nav across regions, icon-only buttons), the `aria-label` MUST disambiguate them. Ambiguous names break screen readers AND Playwright strict-mode locators. See [docs/A11Y-PATTERNS.md](docs/A11Y-PATTERNS.md).
- **Follow quiet's layout** — dimensions and rules: `node_modules/@optimusfoundry/quiet/docs/guidelines/layouts.md`, `sections.md`, `grid.md`. Screens inside `Layout` do not wrap in `PageShell`: its `<main>` supplies padding and the 1280 cap, the Topbar title is the route's one `h1`, and a `PageHero` inside is `as="h2"` with the template's zero-padding class. Public pages outside the shell use a narrow `PageShell as="main"`.
- **Dividers are elements** — quiet `Rule`; `Stat` / `StatCard` own their cell rule.
- **Mixed-width rows** — `Grid columns={12}` with `Col span` (`1+10+1`, `2+8+2`, `1+11`); stylelint bans `display: grid`.
- **Wrap rows use Stack** — `Stack direction="row" wrap gap="sm"`; its default `gap` is `sm`, set it where it matters.
- **Toasts only via `useNotify()`** (`@/hooks/useNotify`), never quiet's `toast()` and never Proto's `useBannerCenter` in new code.
- **Icons and links** — `AppIcon` (`@/components/AppIcon/AppIcon`); in-app links through quiet components and the root `linkComponent` (`RouterLink`).
- **quiet drops `id`, `data-*`, `aria-*` on most components** — wrap in a native element; see [docs/TEMPLATE-PATTERNS.md](docs/TEMPLATE-PATTERNS.md).

## Environment

```env
VITE_API_URL=http://localhost:3000
```

## Docs

- quiet, under `node_modules/@optimusfoundry/quiet/` — **read first for any new page or component.** [README.md](node_modules/@optimusfoundry/quiet/README.md), [DESIGN.md](node_modules/@optimusfoundry/quiet/DESIGN.md) (tokens), and [docs/guidelines/README.md](node_modules/@optimusfoundry/quiet/docs/guidelines/README.md) (layouts, sections, grid, spacing, typography, checklist)
- [Template patterns](docs/TEMPLATE-PATTERNS.md) — what the template adds on top of quiet: page shell, gating, `useNotify`, `AppIcon`, `RouterLink`
- [Architecture & module patterns](docs/ARCHITECTURE.md) — feature structure, routes, hooks, API layer
- [Component patterns](docs/COMPONENT-PATTERNS.md) — React 19 patterns, SCSS template, Storybook
- [React 19 patterns](docs/REACT19-PATTERNS.md) — new APIs, deprecated patterns, testing
- [Page composition](docs/PATTERNS.md) — shell, heading, section, empty state rhythm
- [Page templates](docs/PAGE-TEMPLATES.md) — scaffolds for the page layouts
- [Testing patterns](docs/TESTING-PATTERNS.md) — Playwright + MSW
- [Accessibility patterns](docs/A11Y-PATTERNS.md) — aria-label uniqueness, instance discriminators, region landmarks
- Proto → quiet guide — the template's [migration plan](https://github.com/OptimusFoundry/saas-template/blob/main/docs/design-system-migration.md) §4 (rename map, token map, codemods)
