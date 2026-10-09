# Rewrite the growth-tools product screens on quiet and remove Proto — Tech Plan

**Epic:** CH-001   **Brief:** docs/briefs/2026-10-08-quiet-product-rewrite.md   **Scope:** frontend-only (webapp, webapp/.storybook), plus docs and harness notes

Model: the template's CH-001 plan (`git show quiet-1:docs/plans/2026-10-08-quiet-template-rewrite.md`). Its translation rules, shared contract and e2e approach are reused here, corrected for quiet 0.4.1.

**quiet is vendored at 0.4.1** (commit b53821cf): `"@optimusfoundry/quiet": "file:./vendor/quiet"`, React 19.3, TypeScript 7.0.2.
- The authority for every API is `webapp/vendor/quiet`:
  - props: `src/components/<group>/<Name>.tsx`;
  - exports: `src/index.ts`;
  - tokens: `DESIGN.md` and `src/styles/`;
  - layout: `docs/guidelines/`;
  - the procedure: the `quiet-app` skill.
- There is no `dist/` and no `README.md`. Every component and prop named below was checked against that source.
- `webapp/vendor/quiet` is **read-only**. No ticket edits it. A quiet gap goes upstream and comes back by re-sync (`node <quiet>/scripts/quiet.mjs sync`).
- The same applies to the two files quiet places, which `quiet:check` hashes: `.claude/skills/quiet-app/SKILL.md` and `.claude/agents/qa/quiet-screen-reviewer.md`.

AC refs are the brief's acceptance checks, in order:

| AC | Check |
|---|---|
| AC1 | No Proto import, alias or package, and no Proto CSS var in `webapp/src`. The bridge files are gone. |
| AC2 | `npm install`, `quiet:check`, `build`, `lint` and `lint:scss` pass, plus `npx biome check --vcs-enabled=false src e2e .storybook` and `npm run build-storybook`. |
| AC3 | Every route renders on quiet in `foundry` and `foundry-dark`. The sidebar toggle switches them, links route without a full page load, and the mobile drawer works below 720. |
| AC4 | All toasts come from `useNotify()`. No BannerCenter, Proto Alert or Banner, or ThemeSwitcher is left. |
| AC5 | The featured-image upload works on the product-local component built on quiet `FileUpload`. |
| AC6 | The charts use quiet chart components or `--q-*` only, and the decision for each chart is recorded. |
| AC7 | E2E specs are updated, `e2e/shell.spec.ts` exists, and the user runs Playwright and it passes. |
| AC8 | `npx quiet-audit` runs on every route and its findings are fixed. |
| AC9 | Someone reviews each screen in light and dark. |

## Tickets
| Ticket | Epic | Layer | Depends-on | AC refs | Status |
|--------|------|-------|-----------|---------|--------|
| H1 | CH-001 | docs | — | AC2 | Todo |
| F1 | CH-001 | fe | H1 | AC1,AC3,AC4 | Todo |
| F2 | CH-001 | fe | H1 | AC1,AC5,AC7 | Todo |
| F3 | CH-001 | fe | F1,F2 | AC1,AC4,AC7 | Todo |
| F4 | CH-001 | fe | F1,F2 | AC1,AC3 | Todo |
| F5 | CH-001 | fe | F1,F2 | AC1,AC4,AC7 | Todo |
| F6 | CH-001 | fe | F1 | AC1,AC4,AC7 | Todo |
| F7 | CH-001 | fe | F1 | AC1,AC4,AC7 | Todo |
| F8 | CH-001 | fe | F1 | AC1,AC7 | Todo |
| F9 | CH-001 | fe | F1 | AC1,AC6,AC7 | Todo |
| F10 | CH-001 | fe | F4,F9 | AC1,AC4,AC6,AC7 | Todo |
| F11 | CH-001 | fe | F1,F2 | AC1,AC4,AC5,AC7 | Todo |
| F12 | CH-001 | fe | F1 | AC1,AC7 | Todo |
| F13 | CH-001 | fe | F1 | AC1,AC4,AC7 | Todo |
| F14 | CH-001 | fe | F9 | AC1,AC3,AC7 | Todo |
| F15 | CH-001 | fe | F1,F5,F10 | AC1,AC4,AC7 | Todo |
| F16 | CH-001 | fe | F1 | AC1,AC7 | Todo |
| F17 | CH-001 | fe | F1 | AC3,AC7 | Todo |
| F18 | CH-001 | fe | F13,F17 | AC3,AC7 | Todo |
| F19 | CH-001 | fe | H1 | AC1,AC2 | Todo |
| F20 | CH-001 | fe | F1,F2,F3,F4,F5,F6,F7,F8,F9,F10,F11,F12,F13,F14,F15,F16,F17,F18,F19 | AC1,AC2,AC4,AC6 | Todo |
| H2 | CH-001 | docs | F20 | AC1 | Todo |
| F22 | CH-001 | fe | F20,H2 | AC7 | Todo |
| F21 | CH-001 | fe | F22 | AC1,AC2,AC3,AC4,AC7,AC8,AC9 | Todo |

## Slices
There is one run per slice, in order.
- `fe` tickets go to `frontend-supervisor`.
- H1 and H2 have layer `docs`. `.claude/agents/routing.yml` routes `docs` to `skill:shared-repo-tooling`, so the session runs that skill for them, with `pre-commit` on docs; `frontend-supervisor` does not run them. If the routing guard rejects a `webapp/docs/**` hunk (`paths.owned: webapp → frontend-code-editor`), that hunk goes to `frontend-code-editor`.

Tickets inside a slice own disjoint files and may batch in parallel. Every slice ends with the **gate**, run in `webapp/`: `npm run quiet:check && npm run build && npm run lint && npm run lint:scss`. When it is green, the slice is committed with the Conventional Commit message shown.

Proto stays installed until S8, so each earlier slice still builds with unmigrated screens alongside it. No agent runs Playwright. The user runs the specs after each slice; a failure goes to `frontend-test-fixer`.

**Route tree.** `npm run build` runs `tsc -b` before `vite build`, and the committed `src/routeTree.gen.ts` is regenerated only by the TanStack Vite plugin. A ticket that adds or renames a route file therefore regenerates the tree before the gate, then commits `routeTree.gen.ts` with the slice. Run `npx vite build` once, or `npm run dev` until the plugin writes it. Only F17 (`/help`) adds a route; no ticket renames one.

**Line numbers** in this plan are hints from the tree at b53821cf. Executors locate each site by its text or locator, not by the line number.

| Slice | Tickets | Commit | Files (approx.) |
|---|---|---|---|
| S0 Docs point at vendored quiet | H1 | `docs(harness): point docs and agents at vendor/quiet (template 91a231a)` | 17 docs |
| S1 Shared pieces | F1 ∥ F2 | `refactor(webapp): move shared list, delete flow, action bar and media upload onto quiet` | 13 src + 7 new + 4 type-only + 3 e2e |
| S2 Create-post | F3 ∥ F4 ∥ F5 | `refactor(webapp): rewrite the post composer on quiet` | 25 src + 5 e2e |
| S3 Account and admin | F6 ∥ F7 ∥ F8 | `refactor(webapp): rewrite account tabs and admin on quiet` | 17 src + 2 specs + 3 handler/mock files |
| S4 Analytics and published posts | F9 ∥ F10 | `refactor(webapp): rewrite analytics on quiet charts` | 22 src + 3 e2e |
| S5 Blog, media, GitHub | F11 ∥ F12 ∥ F13 | `refactor(webapp): rewrite blog, media and github on quiet` | 25 src + 6 e2e |
| S6 Routes and help | F14 ∥ F15 ∥ F16 ∥ F17 | `refactor(webapp): rewrite dashboard, posts, calendar and auth routes on quiet; add /help` | 22 src + 6 e2e |
| S7 Shell spec and Storybook | F18 ∥ F19 | `test(webapp): add shell spec; chore(storybook): showcase decorator on quiet` (two commits) | 3 storybook + 3 e2e |
| S8 Remove Proto | F20 → H2 | `chore(webapp): remove Proto and the transitional bridge` and `docs: drop CH-001 transition notes` | 12 config/src + 9 docs |
| S9 E2E realignment, then sweep and audit | F22 → F21 | `test(e2e): realign account and dashboard specs (template 360c9fc)`, then `chore(webapp): CH-001 final sweep` (only if the sweep changes files) | 2 e2e + 0–n |

The PR is opened to `main` after S9 and is not merged (user decision, 2026-10-08).

## Shared contract

### Entities, endpoints, errors
No backend change. `src/api/**`, data hooks, route paths, search params, SSE flows and copy strings stay as they are. MSW handlers only gain scenarios and new files where a ticket says so:
- `github.handlers.ts` (F13; F6 first adds the GitHub connection and repo endpoints to `platforms.handlers.ts`, and F13 moves them);
- platform connect, token, OAuth-init and disconnect endpoints in `platforms.handlers.ts` (F6);
- `authScenarios.withPersona`;
- `analyticsScenarios.noPlatforms`;
- posts draft, retry and SSE handlers;
- `mediaScenarios.uploadSlow`.

### Pins and imports
- One entry point: `import { X, type XProps } from "@optimusfoundry/quiet"`. No deep imports and no barrels.
- quiet 0.4 props are fully typed. `tsc` catches renames, but not value semantics or default traps, so review every `onChange` and every omitted default by hand.
- `Table` is generic. A standalone column array is typed `TableProps<Row>["columns"]`, and the row type goes on the array.
- Stylelint `quiet/known-tokens` rejects any `var(--q-…)` that quiet does not declare.

### Already on quiet (reuse; signatures unchanged except the delete flow)
- **`useNotify()`** (`@/hooks/useNotify`) returns `{ notify(options: NotifyOptions): string; dismiss(id?) }`.
  - `NotifyOptions = { status: "info"|"success"|"warning"|"error"; title: string; description?: string; duration?: number }`.
  - `notify` is a stable module-level function, so it is safe in dependency arrays.
  - warning and error stay until dismissed; info and success close after the Toaster's 5 s.
  - The parameter type for a passed-in notifier is `UseNotifyResult["notify"]`.
- **`AppIcon`, `RouterLink`, `trimTrailingPeriod`, `AsyncList`, `ConfirmDeleteModal({ flow })`, `useConfirmableDelete`, `Topbar`, `TopbarActionsPortal`** and `@use "@/styles/breakpoints" as *;`.
  - **Deliberate contract change (F1):** `ConfirmableDeleteFlow` gains `error: string | null`. A failed delete shows an inline error `Alert` inside `ConfirmDeleteModal` and raises no toast, because a toast under an open Dialog is inert. Every other export keeps its signature.
  - `AsyncList` and `ResourceListPage` gain an optional `renderContainer`, and `useFilterCounts.ts` gains `toFilterTabItems` (F1). Both are additive.
  - `PageHeroActionsPortal` does **not** exist. Use PageHero `actions` or the Topbar `actions`.
- **e2e helper** `toastLocator(page, role: "status"|"alert", hasText?)` from `e2e/helpers/toast.ts`. It is scoped to the region named "Notifications".

### Translation rules (all `fe` tickets)
Verified against `vendor/quiet/src`.

| Proto | quiet |
|---|---|
| `useBannerCenter().addBanner({ type, title, description?, dismissible })` | `useNotify().notify({ status: type, title, description? })`. Drop `dismissible`. |
| `Alert variant=… dismissible onDismiss` | quiet `Alert variant=…` keeps **`variant`** (no rename). Drop `dismissible`; `onDismiss` shows "Dismiss alert". `action` holds a Retry button. Role is `alert` for `error` and `status` for every other variant. |
| `Banner type` | `Banner status`; it defaults to `dismissible`. |
| `Modal isOpen onClose title description footer size` | `Dialog open onClose title size actions`. Copy goes in `children` and buttons in `actions`; there is no `description` or `footer`. The accessible name is the title plus a visible trailing ".". |
| `Drawer isOpen … footer` | `Drawer open onClose title description footer size side` |
| `Button isLoading`, `isIconOnly`, default variant | `loading`; `icon={<AppIcon/>}` with `aria-label`; set `variant` explicitly (quiet defaults to `primary`) |
| `<Link to><Button/></Link>` | `Button href="/path"`. It renders `<a>`, so its role is **link**. Specs change from `getByRole("button")` to `getByRole("link")`. |
| `Stack animate`, `justify="end\|between"`, `align="start\|end"`, `gap="0"` | `animated`, `flex-end\|space-between`, `flex-start\|flex-end`, `gap="none"` |
| Stack and Grid `gap` | Translate by **value**. Proto `xs`4 `sm`8 `md`16 `lg`32 `xl`48 `2xl`80. quiet `xs`8 `sm`16 `md`24 `lg`32 `xl`48 `2xl`64 or a number. So Proto `xs`→`4`, `sm`→`xs`, `md`→`sm`, `lg`→`lg`, `xl`→`xl`. Prefer a `spacing.md` job gap when one names the job: field `md`, block `lg`, section `xl`. |
| `Text color="secondary" \| "muted"` | `color="muted" \| "quiet"` |
| `Input leftElement` / `TextField isFullWidth` / `TextArea fullWidth errorMessage` | `TextField leftIcon` / remove the prop / `TextArea error`. TextField, TextArea, Select, Button, Link, Text, Spinner and ArrowLink spread unknown props to the DOM, so remove Proto-only props instead of leaving them. |
| `Checkbox` / `Switch` `onChange(e)` | `onChange(checked: boolean)`. A Checkbox with `label` ignores `aria-label`. |
| `Tabs` + `TabList/Tab/TabPanels/TabPanel`, `activeTab onTabChange` | `Tabs tabs=[{value,label}] value\|defaultValue onChange label panels` (or `keepMounted`). Role stays `tab`. |
| `FilterTabs items[{id,label,count}] aria-label` | `FilterTabs items[{value,label,count}] value onChange label size`. It renders `role="radiogroup"` and `role="radio"`, **not tabs**. Use `toFilterTabItems` (F1). |
| `Accordion onExpandedChange` | `onChange`; ids are `Array<string\|number>`; set `headingLevel` |
| `PageTransition pageKey type duration={0.25}` | `transitionKey variant duration={250}` (ms) |
| `DatePicker minDate inline` | `min`; there is no inline mode (it is a popup); add `label` |
| `Stepper aria-label` | `label` |
| `Pagination totalPages onPageChange` | `total onChange` |
| `EmptyState action`, `icon={<X size={48}/>}` | `actions`, `icon={<AppIcon icon={X} size="xl"/>}`; title through `trimTrailingPeriod` |
| `StatCard numericValue formatValue footer` | `value format delta trend period icon`. A string `delta` needs an explicit `trend`. |
| `Badge rounded` | Drop `rounded`. success, warning and error show a dot by default; pass `dot={false}` wherever the old plain pill should stay (named per ticket). |
| `Card padding="md"` used as a box | No equivalent; quiet `Card` is an openable object. Use a bare section, or a module-class panel (hairline `--q-border`, `--q-radius-lg`, `--q-space-card-pad`). Never put a panel around a Table. |
| `Divider` | `Rule`, or nothing when a `SectionHeader` rule already divides |
| `Grid columns="auto"` | `Grid minChildWidth={…} gap rowGap` |
| Proto `Text` section headings | `SectionHeader size="sm" as="h2"` (appends ".") |
| Hand-made page `<header>` with an h1 | `PageHero size="md" ruled={false}` with a module class `.hero { padding: 0 }`. Use `as="h2"` under a titled Topbar (the Topbar title is the route's one h1). Keep the default h1 under a breadcrumb Topbar, which renders no h1. `title` is a **required** prop; where a heading has no lead text, pass `title={null}`. |
| `@use "@/proto-design-system/mixins"` (and `/responsive`) | `@use "@/styles/breakpoints" as *;`. Proto's `transition-*` mixins become plain `transition` on `--q-dur-hover` and `--q-ease-soft`. |
| Lucide `size={n}` | `AppIcon`: 14–16→`md`, 18–20→`lg`, 24→`xl`, 40–48→`xl` or `2xl` |

- **Passthrough (0.4.1).** Only Button, ButtonGroup, ArrowLink, Link, Text, Spinner, Input, TextField, TextArea, Select and Sidebar spread rest props. Every other component drops `id`, `data-*` and `aria-*`. Where a spec needs a name or role, wrap the component in a native element, e.g. `<section aria-label>`.
- **Toast under a Dialog or Drawer.** A Dialog or Drawer sets `inert` on everything outside it, including the Toaster. Feedback raised while one is open is shown inline as an `Alert` inside it, **instead of** a toast. This covers `ConfirmDeleteModal` (F1), the schedule Drawer (F5), the Bluesky Dialog (F6), `LoginAsAction` (F8) and the showcase Dialog (F5).
- **PageHero `after`.** Headline puts a space before `after` only when an `accent` is present (and a space between lead and accent only when both exist). Put trailing punctuation inside `accent`, e.g. accent "thought," then after "five platforms".
- **No codemods.** The template at `quiet-1` ships no `webapp/scripts/codemods/`, so every rewrite is manual.

### Tokens (every `*.module.scss`; all verified in `vendor/quiet/src/styles`)

| Proto | quiet |
|---|---|
| `--space-1` 4 · `-2` 8 · `-3` 12 · `-4` 16 · `-5` 24 · `-6` 32 · `-7` 40 · `-8` 48 · `-9` 56 · `-10` 64 · `-12` 80 · `-14` 96 | `--q-space-0-5` · `-1` · `-1-5` · `-2` · `-3` · `-4` · `-5` · `-6` · `-7` · `-8` · `-10` · `-12` |
| `--space-16` 112 · `--space-24` 192 | quiet has no 112 or 192 step. These were page-level padding, which the shell now owns, so delete them. If one is truly needed, use `--q-space-12` (96) or `--q-space-16` (128). |
| Space used for a job | Prefer the job token: 8→`--q-space-inline`, 16→`--q-space-stack`, 24→`--q-space-field`, 32→`--q-space-block` or `--q-space-card-pad`, 48→`--q-space-section` |
| `--color-base-content` / `-secondary` / `-tertiary`, `--color-muted`, `--color-text-secondary` | `--q-fg` / `--q-fg-body` or `--q-fg-muted` / `--q-fg-subtle` (decoration only), `--q-fg-muted`, `--q-fg-muted` |
| `--color-text`, `--color-text-muted`, `--color-text-subtle` (undefined in Proto; today they fall back) | `--q-fg`, `--q-fg-muted`, `--q-fg-subtle` |
| `--color-surface`, `--color-background`, `--color-base-50/100/200`, `--color-hover-overlay`, `--color-surface-elevated` | `--q-bg`, `--q-bg`, `--q-bg-subtle`, `--q-bg-subtle`, `--q-bg` (there is no elevated token) |
| `--color-border`, `--color-border-hover`, `1px` border | `--q-border`, `--q-border-strong`, `var(--q-hairline) solid` |
| `--color-primary` | `--q-accent` (marks only, never body text) |
| `--color-accent` (Proto's second brand colour) | `--q-fg` (ink tone). quiet keeps molten for one accent only. |
| `--color-primary-50` (undefined in Proto) | `--q-bg-subtle`; quiet has no accent-tint token |
| `--color-success/warning/error/info` (and `-bg`) | `--q-status-<name>-fg` / `-bg` / `-border` |
| `--color-overlay`, `--color-white`, `--color-base-900` | `--q-scrim`, `--q-fg-on-inverse`, `--q-bg-inverse` |
| `--color-platform-*` | Defined nowhere, so they resolve empty today. Delete them; behaviour is unchanged. |
| `--font-size-xxs/xs/sm/base/lg/xl/2xl` | `--q-text-2xs/xs/sm/md/lg/xl/2xl` |
| `--font-size-3xl` 28 · `-4xl` 34 · `-5xl` 40 | `--q-text-3xl` (30) · `--q-text-4xl` (40) · `--q-text-4xl` (40), by value. Prefer letting PageHero, Headline or StatCard own display type. |
| `--font-weight-normal/medium/semibold/bold` | `--q-weight-regular/medium/semibold/bold` |
| `--font-family-sans/mono`, `--font-mono` | `--q-font-sans/mono`. `--font-family-display/serif` and `--font-serif` (the latter undefined in Proto) have no equivalent; delete them and let the component own the type. |
| `--line-height-none/tight/normal/relaxed` | `--q-leading-none/tight/body/body` |
| `--letter-spacing-tighter/tight/wide/wider/widest` | `--q-tracking-display/tight/wide/mono/mono` |
| `--radius-xs/sm/md/lg/card/xl/2xl/full` | `--q-radius-2xs/xs/sm/md/lg/lg/xl/pill` (a card or list surface → `lg`) |
| `--shadow-xs/sm/md` | `--q-shadow-1/1/2` |
| `--duration-fast/normal`, `--ease-*` | `--q-dur-hover/expand`, `--q-ease-soft`; spin and pulse use `--q-dur-spin` and `--q-dur-pulse` |
| `--z-sticky`, `--z-*` | `--q-z-sticky` (50), `--q-z-overlay` (100), `--q-z-toast` (200) |
| `--border-width-sm/md/lg` | `--q-hairline`, `calc(var(--q-hairline) * 2)`, `--q-space-0-25` |
| `--max-width-7xl`, page padding | Delete; Layout `<main>` pads and caps at `--q-w-max` |

- Names that do **not** exist: `--q-bg-elevated`, `--q-bg-hover`, `--q-dur-fast`, `--q-z-top`, `--q-radius-full`, `--q-fg-heading`, `--q-w-narrow`, `--q-space-14`, `--q-space-24`, `--q-tracking-tighter`, `--q-font-serif`, `--q-font-display`, `--q-accent-bg`, `--q-accent-subtle`.
- No hex, no raw px beyond sub-4px geometry, no `!important`, no `display: grid`; use quiet `Grid`/`Col`, with `display: flex` allowed for micro-alignment.
- Remove each `stylelint-disable` comment once nothing needs it.

### Layout and shell
- Layout `<main>` pads (48 / 32) and caps at 1280, so shell screens do not use `PageShell` and delete their `.page` padding.
- Public routes outside the shell use `PageShell narrow as="main"`: `/signin`, `/test-login`, `/oauth/signedin`.
- There is exactly one h1 per route:
  - the Topbar `title`;
  - or, when the Topbar has `breadcrumbs`, the screen's PageHero (default h1) or the commit `Text as="h1"`.
- Several routes render two h1s today (Topbar plus hero). Each ticket fixes its own.
- Each screen ticket names its layout from `vendor/quiet/docs/guidelines/layouts.md`. Where none fits, the ticket records a **Gap**.

### Behaviour and selector preservation
Routes, data flow, copy and accessible names stay. Specs use role, label and text, never test ids (user decision, 2026-10-08).

`/test-login` keeps its three `data-testid` attributes in the DOM because `capture-worker/auth.ts` (out of scope, a prod primitive) logs in through them. The specs and `e2e/helpers/auth.ts` move to labels anyway.

Admin's test ids are deleted, because nothing else reads them.

### quiet-screen-reviewer and quiet-audit
- After each screen slice (S1–S6), the supervisor's report lists the routes the slice changed under "quiet-screen-reviewer: pending human run".
  - The agent needs a running app, and protected routes need the backend and a signed-in session. `quiet-audit` has no cookie option.
- F21 runs the agent and `quiet-audit` itself on the public routes, which need only `npm run dev` on port 3000.
- For protected routes a human runs `npx quiet-audit http://localhost:3000/<route> --width 1280,390 --theme foundry,foundry-dark` and dispatches `quiet-screen-reviewer` while logged in. AC8 and AC9 stay **pending, human run** until then, and are never reported as passed.

### Chart decisions (AC6)
| Chart | Decision | Reason |
|---|---|---|
| `TimeSeriesChart` (one series over daily dates, area, axes, tooltip, 280 high) | quiet `LineChart` | Covers a single series with `area`, axes, crosshair tooltip, `height`, `formatValue`/`formatLabel` and `aria-label`. Colours come from `--q-chart-*`, so the theme toggle applies live. Today's chart memoises colours once and misses a theme switch. |
| `Sparkline` (wrapper over Recharts `AreaChart`) | quiet `Sparkline`; delete the wrapper | `area`, `tone="accent"` / `"ink"`, `aria-label`. Gap: fixed pixel width. |
| `EngagementTimelineChart` (one line, 140 high, empty overlay under 2 points) | quiet `LineChart` inside the existing product wrapper | Same coverage, and it gains a tooltip. Keep the `<2 points` overlay. Gap: no `allowDecimals`, so round with `formatValue`. |
| `NarratedChart`, `BarChart`, `DonutChart` | Not adopted | Nothing on the page needs them. The platform breakdown stays a table. |

With zero Recharts users left after S4, F20 removes `recharts` and the `vendor-charts` chunk. `chart-theme.ts` is deleted.

### Reported quiet gaps (none patched; each ticket carries its workaround)

| Area | Gap |
|---|---|
| FileUpload | Uncontrolled; numeric ids; `onChange` fires inside a state updater, so twice under StrictMode. No external progress, error or remove, and no existing or featured files. `maxFiles` counts internal rows. Type validation is new ("Type not accepted"). The hidden input has no label. |
| Dialog and Drawer | Make the Toaster inert, so feedback goes inline (see translation rules). Not portaled. Title gets a trailing period. |
| Titles | PageHero, SectionHeader, Headline and EmptyState append a period. PageHero `title` is required (`title={null}` for an accent-only heading). |
| Charts | Sparkline width is fixed. LineChart has no `allowDecimals`. LineChart's hidden table caption repeats the `aria-label`, which affects `getByText`. |
| Missing components and tokens | No bottom action bar (MobileActionBar stays product-local). No calendar or month grid. No panel component. No serif or display font token. No global disabled-opacity token. |
| DatePicker | No inline mode. |
| Status tokens | Monochrome: `--q-status-warning-fg` and `--q-status-error-fg` equal `--q-accent`. White on molten is 3.87:1, so there is no AA-safe solid warning fill. |
| Table and DataGrid | No server-search slot; `DataGrid searchable` filters on the client only. |
| List and Card | Rows cannot host a sibling interactive control, and they drop `aria-label`. |
| Layouts | `layouts.md` has no layout for a signed-out app page, a docs or help page, or a month grid. |
| Placed files | The placed `quiet-app` SKILL and `quiet-screen-reviewer` still cite `node_modules/.../dist/components/*.d.ts` and `dist/tokens.json`, which a vendored install does not have. Report upstream; do not edit them here. |

### Decisions
Decided by the user (2026-10-08):
- **Help contact address.** Use the placeholder `support@example.com` in one named constant, `HELP_COPY.contact.email` (F17). It is replaced later by editing that one line; it does not block F17.
- **Toast under a Dialog.** `useConfirmableDelete` gains an `error` state, and `ConfirmDeleteModal` shows an inline error Alert instead of the failure toast (F1).

Defaults the tickets build, open for confirmation:
1. **ImpersonationBanner palette.** An outlined band (`--q-status-warning-bg`, `--q-fg` text, a 2px bottom border in `--q-status-error-border`). quiet has no AA-safe solid warning fill.
2. **Help FAQ copy.** F17 drafts six topics: connect a platform, connect GitHub, create and schedule a post, a failed post and retry, media and the featured image, plan and billing. Review the wording.
3. **Spec drift.** `analytics.spec.ts`, `post-analytics.spec.ts` and `calendar.spec.ts` already fail on the current copy, before any quiet change. Their tickets rebase them onto the current copy (needed for AC7).
4. **Storybook capture DOM.** See F19. Keep the DOM the decorator renders today.
5. **Dead code removed.**
   - `AvailablePlatformCard.tsx` is deleted, and `PlatformConnectionsTab`'s inline duplicates of `usePlatformConnectionFlow` / `BlueskyConnectionModal` are removed in favour of those files (F6).
   - `UserRow.tsx` becomes `LoginAsAction.tsx` (F8).
   - `remixicon` is dropped (F20).

---

## H1 — Point docs and agents at the vendored quiet (port of template 91a231a)
**Routing:** layer `docs` → `skill:shared-repo-tooling` (`.claude/agents/routing.yml`). The commit message is in the Slices table.

**Port by hand.** This repo shares no history with the template. For each file, read `git show 91a231a -- <template path>` and apply the same change to the growth-tools text. The contents differ, so never `git apply` or cherry-pick.

| Template path in 91a231a | growth-tools target |
|---|---|
| `.claude/agents/README.md` | same (line 284) |
| `.claude/agents/engineering/frontend/frontend-code-editor.md` | same (".d.ts is the authority" → "its `.tsx` source is the authority") |
| `.claude/agents/engineering/frontend/{frontend-component-builder,frontend-page-builder,frontend-style-checker,frontend-supervisor,frontend-theme-designer}.md` | same |
| `.claude/agents/qa/frontend-code-reviewer.md` | same |
| `.claude/skills/frontend-design-rules/SKILL.md`, `.claude/skills/shared-docs-oracle/SKILL.md` | same |
| `AGENTS.md` | root `CLAUDE.md` (line 19) |
| `webapp/AGENTS.md` | `webapp/CLAUDE.md`: already done by b53821cf; verify only |
| `webapp/docs/{A11Y-PATTERNS,ARCHITECTURE,COMPONENT-PATTERNS,PAGE-TEMPLATES,PATTERNS,TEMPLATE-PATTERNS}.md` | same |
| `webapp/.storybook/tsconfig.json` (drop `baseUrl`) | already done by b53821cf |
| `webapp/.stylelintrc.json` (message paths) | F20 (a `webapp/` config owned by the fe executor) |
| `scripts/agents-frontmatter-check` (exempt agents placed by `quiet sync`) | **skip**: the script does not exist here (`scripts/` holds only `harness-drift`, `sync-env*`) |
| `webapp/SCSS_VALIDATION_README.md`, `webapp/docs/scss-validation-setup.md` | **skip**: they do not exist here |

**Also in H1:** `.claude/agents/qa/consistency-auditor.md` lines 31–35. Its PageShell public-route list `(/signin, /auth/email/callback, /invites/$token, /oauth/signedin)` becomes `/signin`, `/test-login`, `/oauth/signedin` (the `__root.tsx` prefixes `/signin`, `/oauth*`, `/test-*`). `webapp/docs/PAGE-TEMPLATES.md:33` "sign-in, invite, callback" becomes "sign-in, test login, OAuth return".

**Not mine:** `.claude/skills/quiet-app/SKILL.md` and `.claude/agents/qa/quiet-screen-reviewer.md`. quiet placed them, they are read-only, and `quiet:check` hashes them.

**Contract:**
- Every `node_modules/@optimusfoundry/quiet/README.md` becomes `webapp/vendor/quiet/DESIGN.md`, or `docs/guidelines/README.md` where it was cited for components.
- Every `dist/components/<group>/<Name>.d.ts` or "the `.d.ts`" becomes `vendor/quiet/src/components/<group>/<Name>.tsx`.
- `node_modules/@optimusfoundry/quiet/{DESIGN.md,docs/guidelines/…}` becomes `vendor/quiet/…`.
- Relative links in `webapp/docs/*` become `../vendor/quiet/docs/guidelines/<page>.md`.
- The `quiet:` citation prefix in `frontend-design-rules` and `shared-docs-oracle` means "a file in `webapp/vendor/quiet/`".
- The CH-001 "still on Proto" notes stay until H2.

**Verify:** `grep -rnE "node_modules/@optimusfoundry/quiet|dist/components|quiet/README|\.d\.ts" CLAUDE.md webapp/docs .claude --exclude-dir=quiet-app | grep -v quiet-screen-reviewer` prints nothing.

**Gate:** the standard gate (docs only).

**Rules:** frontend-review-rules:V-1

## F1 — Shared list shell, delete flow, filter items, action bar, impersonation strip
**Files:**
- Edit:
  - `src/components/patterns/ResourceListPage/ResourceListPage.tsx`
  - `src/components/patterns/AsyncList/AsyncList.tsx`
  - `src/components/patterns/ConfirmDeleteModal/ConfirmDeleteModal.tsx`
  - `src/hooks/useConfirmableDelete.ts`
  - `src/hooks/useFilterCounts.ts`
  - `src/components/Layout/MobileActionBar.tsx`
  - `src/components/Layout/MobileActionBar.module.scss`
  - `src/components/ImpersonationBanner/ImpersonationBanner.module.scss`
  - `e2e/blog-delete.spec.ts`
- Delete: `src/components/patterns/ResourceListPage/ResourceListPage.module.scss`, `src/components/authentication/login.module.scss` (imported nowhere).

**Contract:**
- **ResourceListPage.** `ResourceListPageProps<T>` are unchanged (`title, topbarAction?, hero?, filters?, loading, items, hasActiveFilter?, empty, emptyFiltered?, listClassName?, renderItem, overlays?`), plus an additive `renderContainer?` that is passed through to AsyncList.
  - Render quiet `Stack gap="lg" animated`, with a native `<div>` around `AsyncList`.
  - Delete the module SCSS; `<main>` already pads.
- **AsyncList.** `AsyncListProps<T>` gains `renderContainer?: (children: ReactNode) => ReactNode`. Every existing prop stays.
- **useConfirmableDelete.** `ConfirmableDeleteFlow` gains `error: string | null`. Every other field and option is unchanged.
- **ConfirmDeleteModal.** `ConfirmDeleteModal({ flow })` is unchanged as a signature.
- **toFilterTabItems.** `useFilterCounts.ts` gains `toFilterTabItems<K extends string>(items: FilterItemWithCount<K>[]): FilterTabsProps["items"]`. The hook's own output is unchanged.
- **MobileActionBar.** `MobileActionBarProps { start?: ReactNode; end?: ReactNode }` is unchanged.
  - Keep the native `<div role="toolbar" aria-label="Post actions">`.
  - quiet `Stack`: start group `gap={4}`, end group `gap="xs"`.
- **ImpersonationBanner.** `ImpersonationBanner.tsx` is untouched. It keeps `role="alert"` and the "Stop impersonating" button.

**Behavior:**
- `AsyncList`: WHEN `renderContainer` is passed and items exist, it SHALL wrap the mapped items in its return value instead of the default list `motion.div`. The loading and empty branches are unchanged.
- `toFilterTabItems` SHALL map `id`→`value` and keep `label` and `count`. The "All" item keeps `value: ""`.
- `useConfirmableDelete.confirm`:
  - WHEN `mutate` rejects, it SHALL set `error` to `Couldn't delete ${resource}`, keep the dialog open (`targetId` unchanged) and raise **no** toast.
  - The success and warning paths are unchanged. They close the dialog, then toast.
  - `request`, `cancel` and the start of `confirm` SHALL reset `error` to `null`.
- `ConfirmDeleteModal`: WHEN `flow.error` is set, it SHALL render `Alert variant="error" title={flow.error}` with the body "Please try again." above `confirmBody` inside the Dialog. That Alert is the dialog's only `role="alert"`.

**Tokens:**
- `MobileActionBar.module.scss`:
  - `@use "@/styles/breakpoints" as *;`
  - `breakpoint-down(lg)` is unchanged.
  - background `color-mix(in srgb, var(--q-bg) 85%, transparent)`
  - `--q-border`
  - padding `--q-space-1-5` / `--q-space-2`
  - `blur(var(--q-space-1-25))`
  - `--q-z-sticky`
  - safe-area `max(var(--q-space-1-5), env(safe-area-inset-bottom))`
- `ImpersonationBanner.module.scss`:
  - `--q-font-sans`, `--q-weight-medium/semibold`
  - gaps `--q-space-1-5`, `--q-space-0-5`
  - padding `--q-space-1` / `--q-space-2`
  - `--q-radius-pill`, `--q-text-sm`
  - min-height `--q-space-5`
  - `--q-z-sticky`
  - `var(--q-dur-hover) var(--q-ease-soft)`
  - Palette per the ImpersonationBanner default in Decisions (outlined band). Drop the hex and rgba values and the `stylelint-disable` comments.

**E2E:**
- **`blog-delete.spec.ts`.** Every failed-delete case (the ones asserting `/couldn't delete blog post/i`) changes:
  - Assert `getByRole("dialog",{ name: /delete blog post/i }).getByRole("alert")` contains the text.
  - Assert the dialog is still visible.
  - Assert `toastLocator(page, "alert")` has count 0.
  - Success and warning cases are unchanged.
- **`posts.spec.ts`.** Its delete-failure cases follow the same pattern in F5 (wizard) and F15 (list).
- No other locator changes. `posts.spec.ts` keeps the toolbar and button names, and `admin.spec.ts` keeps the banner's role.

**Layout:** ResourceListPage is the list body of the Full-bleed table layout: hero → filters → content, separated by `--q-space-block`.

**Gaps:** no quiet bottom action bar. The toast-inert workaround is above.

**Rules:** frontend-page-rules:PL-2, frontend-page-rules:S-4, frontend-design-rules:FC-4, frontend-style-rules:I-3, frontend-design-rules:FC-5

## F2 — Product-local media upload on quiet FileUpload
**Files:**
- New: `src/types/mediaUpload.ts`, `src/components/MediaUpload/{MediaUpload.tsx, MediaUpload.module.scss, AttachedMediaTile.tsx, AttachedMediaTile.module.scss, PendingUploadRow.tsx, PendingUploadRow.module.scss, useUploadIntake.ts}`, `e2e/media-upload.spec.ts`.
- Edit: `src/hooks/useManagedMediaUpload.ts`, `src/components/create-post/compose/MediaUploadSection.tsx` (owned here), `e2e/blog-featured-image.spec.ts` (header comment only), `e2e/handlers/media.handlers.ts` (+ `mediaScenarios.uploadSlow`).
- Type-only edits so the slice builds:
  - `compose/ComposeStep.tsx`: prop types `PendingUpload` and `MediaItem[]`.
  - `create-post/WizardInner.tsx`: drop the `existingMedia` projection (~L714-720) and pass `state.uploadedMedia`.
  - `blog/BlogWizard.tsx`: drop the `existingMediaFiles` memo (~L153-163) and the `ExistingFile` import.
  - Nothing else in those three files changes here.

**Signatures:**
```
// src/types/mediaUpload.ts
interface PendingUpload { id: string; file: File; progress?: number; error?: string }
// MediaUpload.tsx
interface MediaUploadProps { pendingFiles: PendingUpload[]; existingMedia: MediaItem[]; onFilesChange(files: PendingUpload[]): void;
  onRemoveExisting(id: string): void; featuredId?: string; onSetFeatured?(id: string): void;
  accept?: string; maxSize?: number; maxFiles?: number; disabled?: boolean }
function MediaUpload(props: MediaUploadProps): JSX.Element
interface AttachedMediaTileProps { media: MediaItem; featured: boolean; onRemove(id: string): void; onSetFeatured?(id: string): void; disabled?: boolean }
interface PendingUploadRowProps { upload: PendingUpload; onRemove(id: string): void; disabled?: boolean }
function useUploadIntake(args: { pendingFiles: PendingUpload[]; onFilesChange(f: PendingUpload[]): void; maxFiles?: number }):
  { onIntake: NonNullable<FileUploadProps["onChange"]>; limitNote: string | null }
// MediaUploadSection.tsx (prop names unchanged; types swapped)
interface MediaUploadSectionProps { pendingFiles: PendingUpload[]; existingMedia: MediaItem[]; onFilesChange(f: PendingUpload[]): void;
  onRemoveExisting(id: string): void; featuredImageId?: string; onSetFeatured?(id: string): void }
```
`useManagedMediaUpload` keeps its signature and `ManagedMediaUpload { uploadingFiles; isUploading; onFilesChange }`. Only the type import changes, to `PendingUpload`. Proto's `ExistingFile` is gone; callers pass `MediaItem[]`.

**Behavior:**
- **Intake.**
  - The wrapper renders quiet `FileUpload variant="dropzone" multiple accept maxSize` with an explicit `hint` that includes "max N".
  - It does NOT pass `maxFiles` to quiet.
  - quiet's own row list is hidden by the module rule `.intake [class~="q-file-upload__list"] { display: none; }`. That rule passes the repo's stylelint config (checked); `:global(...)` fails `selector-pseudo-class-no-unknown`.
  - Remounting `FileUpload` via `key` is the last resort only. It loses focus and announcements, so the wrapper would have to restore focus to the zone.
  - The zone's name stays "Choose files or drop them here".
- WHEN quiet `onChange` reports a row id not seen before, `useUploadIntake` SHALL emit `onFilesChange([...pendingFiles, …new])` once per row id. Seen ids are tracked in a ref, which absorbs StrictMode double calls.
  - Each new row maps to `{ id: "upload-" + row.id, file: row.file, error: row.error ?? undefined }`.
  - The call is deferred with `queueMicrotask` so it never sets parent state during quiet's render.
  - Rows without `file` SHALL be ignored.
- WHEN `pendingFiles.length + batch > maxFiles`, the wrapper SHALL accept only the remaining room and show "Limit is {maxFiles} files." in a polite live region.
- WHEN a pending row's Remove (`aria-label="Remove {name}"`) is clicked, the wrapper SHALL emit the filtered list (the hook aborts that upload). Focus moves to the next Remove button or to the zone.
- **Pending rows.** A row SHALL show name, size, status, and a quiet `Progress` with `aria-label="Uploading {name}"` and `size="sm"`.
  - The bar is indeterminate when `progress === 0` and determinate between 1 and 99.
  - An `error` shows its text plus `Progress variant="error"` in a polite region, never `role="alert"`.
- **Attached tiles.** WHEN `existingMedia` is non-empty, one `AttachedMediaTile` per item SHALL render, in order. The structure is a native `<section aria-label="Attached media">` (Grid takes no `aria-*`) holding `Grid as="ul" minChildWidth gap="sm" rowGap="sm"`, with each tile in a `Col as="li"`.
  - Images: `<img alt={filename}>` in `AspectRatio`. Videos: muted `<video aria-label={filename}>`. Anything else: an `AppIcon` fallback.
  - Remove is `aria-label="Remove {filename}"` and calls `onRemoveExisting(id)`. The row stays until the parent removes it.
- **Featured star.** WHEN the item is an image AND `onSetFeatured` is given, the tile SHALL show a ghost icon Button named `Set {filename} as featured image`, or `{filename} is the featured image` when `media.id === featuredId`.
  - No `aria-pressed`.
  - A click calls `onSetFeatured(id)` only. Toggle-off and clear-on-remove stay in BlogWizard.
  - Videos never show the star.
- WHEN `disabled`, the wrapper SHALL disable the zone and every tile and row button.
- **`MediaUploadSection`** SHALL render a native `<section aria-label="Media">` with `SectionHeader size="sm" as="h2" title="Media"` and `MediaUpload accept="image/*,video/*" maxSize={50*1024*1024} maxFiles={10}`. It passes `multiple`; the old `multiple={false}` rule does not apply here.

**Tokens:**
- Borders: `--q-border`, `--q-hairline`, `--q-radius-md`.
- Thumbnail background: `--q-bg-subtle`.
- Featured outline: `--q-border-emphasis`.
- Error text: `--q-status-error-fg`.
- Meta: `--q-fg-muted`, `--q-text-sm`.
- Gaps: `--q-space-1`, `--q-space-1-5`.

**E2E:**
- `blog-featured-image.spec.ts`: every locator survives. Refresh the header comment only.
- New `media-upload.spec.ts` covers `/blog/new` and `/posts/new`. Role and label locators only; the file input is the one exception (`page.locator('input[type="file"]')` for `setInputFiles`, because quiet's hidden input has no label).
  - (a) The region "Media" and the button "Choose files or drop them here" render.
  - (b) **Success.** An upload goes to `mediaEndpoints.upload[201]` (POST `*/api/protected/media`). The result is a tile with "Remove uploaded-file.png", plus "Set uploaded-file.png as featured image" on blog. The pending row disappears.
  - (c) **Errors, table-driven.** For each of `400, 401, 403, 404, 409, 500, 503` and `"transport"` (`mediaEndpoints.upload[status]()`), the pending row shows the error text, no tile is added, and that row's Remove button removes it.
  - (d) **Slow upload (posts).** First fill the message TextArea and switch on one platform, so "Generate Content" is enabled. Then, with `mediaScenarios.uploadSlow()`, `getByRole("progressbar",{name:"Uploading <name>"})` shows and "Generate Content" is disabled until the upload settles, then enabled again.
  - (e) A wrong type (`text/plain`) shows "Type not accepted" and makes no request.

**Gaps:** the FileUpload gaps in the shared contract.

**Rules:** frontend-recipe-rules:R-4.1, frontend-a11y-rules:A-5.2, frontend-a11y-rules:A-8, frontend-design-rules:FC-4, frontend-design-rules:FC-2

## F3 — Composer: compose column
**Files:**
- Edit: `src/components/create-post/compose/{CaptureMediaPicker.tsx, CaptureMediaPicker.module.scss, ComposeStep.tsx, PlatformSelectionSection.tsx, PostConfigSection.tsx, PostConfigSection.module.scss, YourMessageSection.tsx}`, `e2e/capture-media-picker.spec.ts`.
- Not mine: `MediaUploadSection.tsx` (F2) and `CreatePostWizard.module.scss` (F5). Use its `actions` class as is.

**Contract (Proto → quiet):**

| File | Change |
|---|---|
| `ComposeStep.tsx` | Alert, Stack, Button and Text become quiet. Action row `gap="xs" justify="flex-end"`. `isLoading` becomes `loading`. `RegenerateWarning` is `<Alert variant="warning">{message}</Alert>` (role status). Props `ComposeStepProps` are unchanged (types from F2). |
| `YourMessageSection.tsx` | `TextArea label="Idea or Instructions for post"`, keeping placeholder, `rows={6}`, `required` and `disabled={readOnly}`. Drop `fullWidth`. `onChange` stays event-style. |
| `PlatformSelectionSection.tsx` | `SectionHeader size="sm" as="h2" title="Platforms"`. The Switch row is `Stack direction="row" wrap gap="sm"`. Switch `onChange={() => onTogglePlatform(p)}` ignores its argument and stays as is. |
| `PostConfigSection.tsx` | The content-type Switch handler becomes `(checked: boolean) => onContentTypeChange(checked ? "thread" : "text")`. Stepper takes `label="Thread length"` and keeps `onChange(number)`. Switch `label="Thread mode"` and `description`. `Text color` muted→quiet. |
| `CaptureMediaPicker.tsx` | Native `<section aria-label="Captured media">`. `SectionHeader size="sm" as="h2" title="Captured media" description=…`. The Checkbox keeps `aria-label={`Use ${label}`}`, takes **no** `label` prop, and uses `onChange={(checked) => onToggle(item, checked)}`. The outer tile element changes from `<label>` to `<div>` (no nested labels), and click-to-toggle sits on the `.media` wrapper only. Groups use `Grid as="ul" minChildWidth={112} gap="xs" rowGap="xs"` with `Col as="li"`. The button "Regenerate with N selected" uses `loading`. The warning Alert is unchanged. `captureLabel` and `selectionWarning` exports stay. |

**Behavior:** the composer's state, SSE and regenerate flow are unchanged. Regenerate errors stay on `wizard.setError` and the inline error `Alert` in F5, not a toast.

**Tokens:**
- `CaptureMediaPicker.module.scss`: `--q-hairline`, `--q-border`, `--q-space-3`/`-1-5`/`-inline`/`-0-5`, `--q-radius-sm`, `--q-accent` (focus-within 2px outline), `--q-bg-subtle`, `--q-fg`, `--q-text-xs`, `--q-dur-hover`/`--q-ease-soft`. Delete `.grid`.
- `PostConfigSection.module.scss`: `@use "@/styles/breakpoints" as *;`, `--q-space-3`/`-5`/`-0-5`/`-inline`/`-2`. Delete `.lengthFieldWrap`.

**E2E (`capture-media-picker.spec.ts`):**
- Every locator survives: region "Captured media", checkboxes "Use <label>", "Regenerate with N selected", group text "Storybook · 2", and the error `getByRole("alert")` at :215.
- :189 becomes `toastLocator(page, "status", "Post regenerated with your selected media")`.

**Layout:** the compose column of the composer (F5): a Form-page column capped at `--q-w-form`.

**Rules:** frontend-recipe-rules:R-4.1, frontend-a11y-rules:A-8, frontend-design-rules:FC-4, frontend-design-rules:J-1

## F4 — Composer: preview, publish status, platform cards
**Files:**
- Edit: `src/components/create-post/{PlatformPreviewTabs.tsx, PreviewStep.tsx, PostPublishStatus.tsx, PostPublishStatus.module.scss, PlatformPostCard.module.scss, ThreadView.module.scss, ThreadView.tsx}`, `src/components/create-post/platform-cards/{BlueSky,Generic,Threads,X}PostCard.tsx`, `src/components/create-post/platform-cards/MediaGrid.tsx`.
  - `ThreadView.tsx` and `MediaGrid.tsx` are required, not optional. They read the `.collapsible*` and `.mediaGrid1..4` classes this ticket deletes.
  - Those classes use `display: grid`, which the S8 Stylelint ban rejects, so they cannot stay.
- Not mine: `CreatePostWizard.module.scss` (F5). Use its frozen classes `previewPanel`, `progressList`, `progressRow`, `progressPlatform`, `statusDone`, `statusGenerating`, `streamingCursor`, `baseContentBody`, `tabPanelContent` and `previewScale` as they are.

**Contract:**

| File | Change |
|---|---|
| `PlatformPreviewTabs.tsx` | One quiet `Tabs`: `tabs=selectedPlatforms.map(p => ({ value: p, label: PLATFORM_DISPLAY_NAMES[p] }))`, `defaultValue={selectedPlatforms[0]}`, `label="Platform previews"`, `panels`. `PlatformPreviewTabsProps` is unchanged (`PublishedPostView` consumes it). |
| `PreviewStep.tsx` | Accordion `onChange`, `expanded: Array<string\|number>`, `headingLevel={4}`. PageTransition `transitionKey`, `variant="slideUp"`, `duration={250}`. EmptyState titles go through `trimTrailingPeriod`. `Badge … dot={false}`. "Review Content" becomes `SectionHeader size="sm" as="h3"`. Gaps by value. |
| `PostPublishStatus.tsx` | `SectionHeader size="sm" as="h2" title="Publish Status"`. Button `loading` with `leftIcon` AppIcon `RefreshCw`. `justify="space-between"`. Status icons are AppIcon with `color` success / error / muted / primary, or `Spinner size="xs"`. Props and copy are unchanged (`PublishedPostView` consumes it). |
| `platform-cards/*PostCard.tsx` | `Badge variant={isOver ? "error" : "default"} size="sm" dot={false}`. The brand-colour hex inside SVG props stays (TSX, not linted). |

**Tokens:**
- `PostPublishStatus.module.scss`: `--q-space-0-5`/`-inline`/`-1-5`, `--q-fg-muted`, `--q-status-success-fg`/`-error-fg`, `--q-accent`, `--q-dur-spin`.
- `PlatformPostCard.module.scss` and `ThreadView.module.scss` use the token table.
  - Delete the `--color-platform-*` accent blocks and `.verified`.
  - Replace `display: grid` in `MediaGrid.tsx`:
    - `.mediaGrid1..4` become `Grid columns={12} gap={2} rowGap={2}` with `Col span={6} spanMd={6} spanSm={6}`.
    - The 1-up case uses `span={12} spanMd={12} spanSm={12}`.
    - The 3-up case (the old `.mediaGrid3` first tile at `grid-row: 1 / -1`) gives the first `Col` `rowSpan={2}`. Col ignores `rowSpan` at the `sm` container breakpoint, where the tiles stack.
    - Always pass `spanMd` and `spanSm` explicitly. The preview rail is narrower than 720, so the defaults would collapse every cell to 12.
  - Replace `display: grid` in `ThreadView.tsx`: `.collapsible` becomes a ghost `Button` with `aria-expanded` that mounts or unmounts the segments. The height animation is lost (recorded).

**E2E:** no locator in the existing specs targets these files. The Tabs name "Platform previews" is covered by F5's `post-wizard.spec.ts`.

**Rules:** frontend-page-rules:PL-6, frontend-style-rules:I-2, frontend-design-rules:FC-4, frontend-a11y-rules:A-4

## F5 — Composer shell, edit wrapper, showcase dialog
**Files:**
- Edit: `src/components/create-post/{WizardInner.tsx, EditPostWizard.tsx, CreatePostWizard.module.scss}`, `src/components/showcase-post/{CreateShowcasePostModal.tsx, useCreateShowcasePostFlow.ts}`, `e2e/showcase-post.spec.ts`, `e2e/posts.spec.ts` (wizard parts, lines ~588–800), `e2e/handlers/posts.handlers.ts`.
- New: `e2e/post-wizard.spec.ts`.

**Signatures:**
```
function useScheduleDrawer(initialScheduledAt: string, setScheduledAt: (iso: string) => void,
  handleSchedule: (whenOverride?: string) => Promise<void>): { …unchanged fields…; scheduleError: string | null; handleConfirmSchedule(): Promise<void> }
interface UseWizardActionsParams { …unchanged…; notify: UseNotifyResult["notify"]; navigate: ReturnType<typeof useNavigate> }  // replaces addBanner
// CreateShowcasePostFlow (useCreateShowcasePostFlow) unchanged; deps [brief, createShowcasePost, notify]
```

**Behavior:**
- **Toasts.** Every `addBanner` in `WizardInner.tsx` becomes `notify({ status, title, description? })`, with titles and descriptions verbatim and `dismissible` dropped:

  | Line | Title | status | Description |
  |---|---|---|---|
  | 91 | "Please pick a date" | error | — (shown **inline** in the Drawer; see below) |
  | 102 | "Pick a time in the future" | error | — (shown **inline** in the Drawer; see below) |
  | 259 | "Post published" | success | "We're pushing it out to your selected platforms." |
  | 267 | "Couldn't publish post" | error | "Please try again." |
  | 281 | "Please pick a date and time" | error | — (toast; `handleSchedule` runs after the Drawer has closed) |
  | 295 | "Post scheduled" | success | `` `It'll go out on ${new Date(when).toLocaleString()}.` `` |
  | 303 | "Couldn't schedule post" | error | "Please try again." |
  | 320 | "Draft updated" / "Draft saved" | success | — |
  | 327 | "Couldn't save draft" | error | "Please try again." |
  | 346 | "Retrying failed platforms" | success | — |
  | 353 | "Couldn't retry post" | error | "Please try again." |
  | 481 | "Post regenerated with your selected media" | success | — |
  | 570 / 577 | "Post deleted" / "Couldn't delete post" | — | Replaced by `useConfirmableDelete` (success toast; failure inline in the dialog, F1) |

  In `useCreateShowcasePostFlow.ts`:45, `addBanner({ type: "success", title: SHOWCASE_POST_COPY.successBannerTitle })` becomes `notify({ status: "success", title: SHOWCASE_POST_COPY.successBannerTitle })`.
- **Schedule validation.** "Please pick a date" (l.91) and "Pick a time in the future" (l.102) SHALL render as `Alert variant="error"` inside the open Drawer through `scheduleError`, not as toasts (inert gap). The error clears on date or time change and on close.
- **Delete.** It SHALL go through `useConfirmableDelete({ mutate: deletePost, mutating: deleting, onSuccess: () => navigate({ to: "/posts" }), copy: { resource: "post", modalTitle: "Delete post", confirmBody: "Are you sure you want to delete this post? This action cannot be undone." } })` plus `<ConfirmDeleteModal flow/>`.
  - The Topbar and MobileActionBar delete buttons call `flow.request(editPostId)`.
  - The `useState` + `Modal` wiring is removed.
  - The hook raises the toast "Post deleted" on success. On failure, "Couldn't delete post" shows as an inline Alert in the dialog (F1), which stays open.
- **Schedule Drawer.** `Drawer open onClose title description={scheduledLabel} size="md" footer`.
  - `DatePicker label="Date" value onChange min={startOfToday()}` is a popup now.
  - `TextField type="time" label="Time"`.
  - The confirm Button uses `loading`.
- **Header.** The hand-made editorial `<header>` becomes `PageHero size="md" ruled={false}` (default **h1**, because the Topbar has breadcrumbs) with `className={styles.hero}` and `eyebrow={eyebrowLabel}` (unchanged strings):

  | State | title | accent | after |
  |---|---|---|---|
  | new | "A new" | "thought," | "five platforms" |
  | draft | "Sharpen the" | "draft" | "before it ships" |
  | scheduled | `null` (`title` is required) | "Scheduled." | "Queued for liftoff" |
  | other | `null` | "Shipped." | "Here's how it landed" |

  Headline adds a space before `after` only when an accent is present, so each row reads as one sentence.

  `description={subLine}`; the `<strong>` stays, without its class.
- **MobileActionBar buttons.** `icon={<AppIcon size="lg"/>}`, with `aria-label`s verbatim: "Delete post", "Save draft", "Schedule post" / "Reschedule post", "Publish post".
- **Inline Alert.** `state.error` stays an inline `Alert variant="error"`.
- **Layout.** Detail + inspector, with the compose column at `--q-w-form` and a sticky preview rail at `--q-w-detail-panel`.
  - Flex row from `breakpoint(lg)`, stacked below; the `.twoColumn` `display: grid` is removed.
  - Keep a mobile bottom reserve `calc(var(--q-space-12) + env(safe-area-inset-bottom))` below `lg`.
  - Exactly one `<header>` in the wizard (the PageHero); `posts.spec.ts:603` counts headers.
- **`EditPostWizard`.** `Alert` and `Spinner` become quiet. Copy is unchanged (`Spinner aria-label="Loading post"`).
- **Showcase dialog.** `Dialog open={flow.isOpen} onClose={flow.cancel} title={SHOWCASE_POST_COPY.modalTitle} size="sm" actions={Cancel ghost + Generate primary loading disabled={!brief.trim()}}`. The body has `TextArea label={briefLabel} error={flow.errorMessage ?? undefined}`. The `role="alert"` comes from FormHint and is verified in 0.4.1.

**Tokens (`CreatePostWizard.module.scss`, owner):**
- Freeze the class names F3 and F4 consume.
- Add `.hero { padding: 0 }`.
- Delete `.page` padding and gap, `.header*`, `.eyebrow`, `.title`, `.sub*`, `.statusError`, `.statusPending`, `.postTimestamp`, `.threadLengthField`, `.platformStatusSummary` and `.platformStatusRow`.
- Re-token: `--q-space-block`, `--q-space-2` (sticky top), `--q-space-inline`, `--q-space-1-5`, `--q-border`/`--q-hairline`, `--q-fg-body`, `--q-status-*-fg`, `--q-accent` (cursor), `calc(var(--q-hairline) * 2)`, `--q-text-sm`, `--q-leading-body`, `--q-dur-spin`/`--q-dur-pulse`.

**E2E:**
- `showcase-post.spec.ts`:
  - :137 becomes `toastLocator(page, "status", "Showcase post is being generated")`;
  - :120 becomes count 0 on both `toastLocator(page, "status")` and `toastLocator(page, "alert")`;
  - drop the stale "EXPECTED TO BE RED" header;
  - the dialog name, `textbox /brief/i`, Generate and Cancel survive.
- `posts.spec.ts` (wizard parts):
  - :603 `header:visible` count 2 stays valid;
  - :658 `locator("header").first()` becomes `getByRole("banner")`;
  - :767 `/open menu/i` becomes `getByRole("button",{name:"Open navigation"})` with count 0 on desktop;
  - the `triggerDelete` confirm scopes to `getByRole("dialog",{name:/delete post/i}).getByRole("button",{name:/^delete$/i})`;
  - the wizard's delete-failure case asserts the dialog's own `getByRole("alert")` contains "Couldn't delete post", the dialog stays open, and `toastLocator(page,"alert")` has count 0.
- New `post-wizard.spec.ts`:
  - publish → `toastLocator(page,"status","Post published")` and `("alert","Couldn't publish post")`;
  - save draft → "Draft saved" / "Couldn't save draft";
  - schedule Drawer: open "Schedule post", the dialog, `getByLabel("Time")`, the inline alert "Pick a time in the future" scoped to the drawer, success "Post scheduled";
  - delete through the dialog "Delete post": success toast `toastLocator(page,"status","Post deleted")`; failure is the inline dialog alert;
  - retry "Retrying failed platforms" / "Couldn't retry post";
  - the tablist "Platform previews";
  - the switch "Thread mode" and the spinbutton or group "Thread length".
  - Table-drive every status `setupEndpoint` offers (`200/201`, `400`, `401`, `403`, `404`, `409`, `500`, `503`, `"transport"`) for publish, schedule, save draft, update draft and retry.
- `posts.handlers.ts` additions:
  - `saveDraft` POST `*/api/protected/posts/draft`;
  - `updateDraft` PUT `*/posts/:id/draft`;
  - `retry` POST `*/posts/:id/retry`;
  - SSE POST `*/content/generate/stream`, modelled on the blog SSE scenario in `blog.handlers.ts`;
  - each with scenario factories, registered in `handlers/index.ts`.

**Gaps:** DatePicker has no inline mode (check for clipping in the Drawer); Headline's `after` spacing; the toast-inert workaround.

**Rules:** frontend-page-rules:C-5, frontend-page-rules:S-4, frontend-recipe-rules:R-4.4, frontend-design-rules:FC-5, frontend-a11y-rules:A-10

## F6 — Account: platform and GitHub connections
**Files:**
- Edit:
  - `src/features/account/components/AccountPage/{BlueskyConnectionModal.tsx, GitHubConnectionSection.tsx, GitHubConnectionSection.module.scss, GitHubRepoSelector.tsx, PlatformConnectionsTab.tsx, PlatformConnectionsTab.module.scss, useGitHubConnectionFlow.ts, usePlatformConnectionFlow.ts}`
  - `e2e/handlers/platforms.handlers.ts`
  - `e2e/handlers/index.ts`
  - `e2e/mocks/data/index.ts` (fixtures, plus the missing `platforms` fields)
- New: `e2e/account-connections.spec.ts`. F7 owns `account.spec.ts`, so the two tickets stay disjoint.
- Delete: `AvailablePlatformCard.tsx` (dead).
- `github.handlers.ts` is created by F13 in S5, after this slice. This ticket adds the two GitHub repo endpoints it needs to `platforms.handlers.ts` under a `githubRepos*` name, and F13 moves them into `github.handlers.ts`.

**Contract:**
- `BlueskyConnectionModal` props become `{ isOpen: boolean; onClose(): void; onSuccess(): void }`; `onError` is dropped.
  - It renders `Dialog open title="Connect BlueSky" size="sm" actions={Cancel ghost + Connect primary loading disabled until both fields are filled}`.
  - The body is the old description `Text`, then TextFields "Handle" and "App Password".
- `usePlatformConnectionFlow` drops `handleBlueskyError`. Its other handlers and state are unchanged.
- `PlatformConnectionsTab` consumes `usePlatformConnectionFlow` and `BlueskyConnectionModal`. Its inline `BlueskyModal`, connect and disconnect handlers and duplicate state are removed.
  - `PLATFORM_INFO` brand SVGs stay.
  - `BadgeVariant` becomes local `NonNullable<BadgeProps["variant"]>`.
  - It keeps its own `useNotify` for "Couldn't load platform connections".
- Layout:
  - `Container size="md" padded={false}` with `.container { padding-top: var(--q-space-block) }`, matching BillingTab.
  - Two native `<section aria-label>` blocks, each `SectionHeader size="sm" as="h2"` ("Outbound"/"Platforms", eyebrow `{n} of {N} CONNECTED`; "Inbound"/"Sources", eyebrow "CONTENT ORIGIN").
  - Each block holds `List divided` items `{id, leading: icon tile, primary: name + Badge, secondary: meta + scope Tags, trailing: Buttons}`.
  - Row buttons keep their visible text ("Connect", "Reconnect", "Disconnect") and carry unique names with the platform: `aria-label={`Connect ${name}`}`, `Reconnect ${name}`, `Disconnect ${name}`.
- `GitHubConnectionSection`: `List divided` single item; trailing `Button` with visible text "Connect" / "Disconnect" and `aria-label` "Connect GitHub" / "Disconnect GitHub"; Badge success "Connected" replaces the status dot; `Rule`; `SectionHeader size="sm" as="h3" title="Repositories" description=…`.
- `GitHubRepoSelector`: `List divided` of repos with `Switch aria-label={`${connected ? "Disconnect" : "Connect"} ${key}`}`; EmptyState icon AppIcon `GitBranch` `2xl`.

**Behavior:**
- Every `addBanner` becomes `notify({ status, title, description? })`, with titles and descriptions verbatim and `dismissible` dropped:

  | File:line | Title | status | Description |
  |---|---|---|---|
  | `GitHubRepoSelector.tsx`:46 | "Couldn't load repositories" | error | the error string |
  | `GitHubRepoSelector.tsx`:62 | `` `Disconnected ${key}` `` | success | — |
  | `GitHubRepoSelector.tsx`:69 | `` `Connected ${key}` `` | success | "We'll watch this repo for new commits." |
  | `GitHubRepoSelector.tsx`:78 | `` `Couldn't disconnect ${key}` `` / `` `Couldn't connect ${key}` `` | error | "Please try again." |
  | `useGitHubConnectionFlow.ts`:56 | "GitHub connected" | success | "We'll watch your selected repos for new commits." |
  | `useGitHubConnectionFlow.ts`:63 | "GitHub connection failed" | error | "Please try again." |
  | `useGitHubConnectionFlow.ts`:78 | "Couldn't start GitHub OAuth" | error | as today |
  | `useGitHubConnectionFlow.ts`:91 | "GitHub disconnected" | success | — |
  | `useGitHubConnectionFlow.ts`:97 | "Couldn't disconnect GitHub" | error | as today |
  | `usePlatformConnectionFlow.ts`:75 | `` `Connected ${name}` `` | success | — |
  | `usePlatformConnectionFlow.ts`:89 | `` `Couldn't connect ${name}` `` | error | the "already connected" text or "Please try again." |
  | `usePlatformConnectionFlow.ts`:107 | "Platform disconnected" | success | — |
  | `usePlatformConnectionFlow.ts`:113 | "Couldn't disconnect platform" | error | as today |
  | `usePlatformConnectionFlow.ts`:128 | "Couldn't connect BlueSky" | — | **Removed** with `handleBlueskyError`; the Dialog shows the inline Alert instead |
  | `PlatformConnectionsTab.tsx`:312 | "Couldn't load platform connections" | error | the error string (skipped on 404 / not found, as today) |
  | `PlatformConnectionsTab.tsx`:339, 353, 371, 377, 392 | inline duplicates of the flow hook | — | **Removed** with the de-duplication |

  Replace `addBanner` with `notify` in every dependency array (it is stable).
- WHEN the Bluesky connect fails, the Dialog SHALL stay open and show `Alert variant="error"` "Failed to connect BlueSky. Check your handle and app password." at the top of its body. The error clears on retry and on close.

**Tokens:**
- Icon tile: `--q-bg-subtle`, `--q-fg`, `--q-radius-xs`, `--q-space-5`.
- `.loading` min-height `--q-space-12`; `.loadingState` `--q-space-20`.
- Delete the row and status-dot classes.

**E2E (required): `account-connections.spec.ts` on `/account?tab=platforms`.**
- Handlers are added to `platforms.handlers.ts` with `setupEndpoint`, so each one exposes `200/201, 400, 401, 403, 404, 409, 500, 503, "transport"`:
  - POST `*/api/protected/platforms/bluesky`
  - POST `*/api/protected/platforms/token`
  - POST `*/api/protected/platforms/oauth/init`
  - DELETE `*/api/protected/platforms/:id`
  - GET `*/api/protected/github/connection`
  - DELETE `*/api/protected/github/connection` (`useDisconnectGitHub.ts`)
  - GET `*/api/protected/github/oauth/init` (`useInitGitHubOAuth.ts`)
  - GET `*/api/protected/github/repos`
  - POST `*/api/protected/github/repos/:owner/:repo/connect` (`useConnectGitHubRepo.ts`, connect)
  - DELETE `*/api/protected/github/repos/:owner/:repo` (`useConnectGitHubRepo.ts`, disconnect)
- **Repo state across the toggle.** The repos GET is refetched after each toggle, so the toggle cases need stateful mocks. Either make the default repo handlers share a small in-memory `connected` map (POST 200 sets `connected: true` for that repo, DELETE 200 clears it, and the next GET returns it), or give each test a `network.use(...)` override that serves the post-toggle list on the second GET. Pick one and use it for both directions.
- Fixtures go in `e2e/mocks/data/index.ts`. This ticket also fixes that file's pre-existing type errors: the `posts: ApiPost[]` entries at ~:167, ~:183 and ~:198 are missing the post type's `platforms` field (TS2741). Add it, copying the shape from the existing post fixtures (not the tier fixtures). F21's e2e type-check depends on this.
- Cases:
  - **Renders.** Sections "Outbound" and "Inbound" (by `getByRole("region",{name})`), one row per mocked connection, and status badges.
  - **Bluesky connect.**
    - Setup: the default `platformConnections` mock has BlueSky as `status: "expired"` (button "Reconnect BlueSky"). Give the Bluesky cases a list override without BlueSky, and serve the post-connect list (BlueSky active) on the second GET, stateful like the repo mocks.
    - Open with `getByRole("button",{name:"Connect BlueSky"})`. Assert `getByRole("dialog",{name:/connect bluesky/i})` and labels "Handle" and "App Password". Connect stays disabled until both fields are filled.
    - 200: keep today's behaviour, which raises **no** toast. Assert the dialog closes and the BlueSky row refetches to a "Connected" state (its badge and the "Disconnect BlueSky" button). Do not assert a toast.
    - 400 / 401 / 500 (table-driven): the dialog's own `getByRole("alert")` shows "Failed to connect BlueSky. Check your handle and app password.", the dialog stays open, and `toastLocator(page,"alert")` has count 0.
  - **Token platform connect** (table-driven): success toast `Connected <Name>` and error toast `Couldn't connect <Name>`, both via `toastLocator`.
  - **Disconnect** (table-driven): "Platform disconnected" on success, and "Couldn't disconnect platform" on 4xx and 5xx.
  - **GitHub repo toggle.** With a connection mocked, `getByRole("switch",{name:"Connect <owner/repo>"})`:
    - POST 200 gives toast `Connected <owner/repo>`, and the switch name flips to "Disconnect <owner/repo>".
    - 409 and 500 give toast `Couldn't connect <owner/repo>`, and the switch stays unchecked.
    - The DELETE path mirrors this: 200 gives toast `Disconnected <owner/repo>` and the switch flips back; errors give toast `Couldn't disconnect <owner/repo>`.
  - **GitHub OAuth init** (table-driven over every `setupEndpoint` status). Click the GitHub row's "Connect GitHub".
    - Non-2xx shows `toastLocator(page,"alert","Couldn't start GitHub OAuth")`.
    - 2xx asserts only that GET `*/github/oauth/init` was sent (`page.waitForRequest`). Do not assert the navigation that follows.
  - **GitHub disconnect** (table-driven). With a connection mocked, click "Disconnect GitHub".
    - 200 shows `toastLocator(page,"status","GitHub disconnected")`.
    - 4xx and 5xx show `toastLocator(page,"alert","Couldn't disconnect GitHub")`.
  - **Load errors.** `platforms` GET 500 gives toast "Couldn't load platform connections". GET 404 shows no toast.

**Layout:** Settings.

**Rules:** frontend-recipe-rules:R-3.1, frontend-design-rules:FC-5, frontend-page-rules:S-4, frontend-a11y-rules:A-8

## F7 — Account: voice profile and site publish
**Files:** edit `src/features/account/components/AccountPage/{SitePublishTab.tsx, SitePublishTab.module.scss, VoiceProfileTab.tsx, VoiceProfileTab.module.scss}`, `e2e/account.spec.ts`.

**Contract:**
- `Container size="sm" padded={false}` with `.container { padding-top: var(--q-space-block) }`, then `<form noValidate>` > `Stack gap="xl"`.
- The tab header is `SectionHeader size="sm" as="h2"` ("Voice Profile" / "Site Publish" with the existing description).
- Each group is a native `<section aria-label>`. Use "Repository" and "Publish Target", which must not contain the field labels. Each holds `SectionHeader size="sm" as="h3"` and its fields.
- `Divider` is deleted.
- Fields:
  - TextField: Repository Owner, Repository Name, Base Branch, Content Path, Industry, Target Audience. Drop `isFullWidth`; event-style `onChange` is unchanged.
  - TextArea: Example Posts, Custom Instructions. Drop `fullWidth`.
  - Tone and Style become `Select label options placeholder` with `onChange={(e) => setTone(e.target.value)}`; `items` `id` becomes `options` `value`.
- Alerts:
  - `Alert variant="success"|"error"` with `onDismiss`; `dismissible` is dropped.
  - The full-tab error stays `Alert variant="error" title="Error"`.
- Save: `Button variant="primary" loading={saving} leftIcon={AppIcon Check}`, "Saving..." / "Save", in `Stack direction="row" justify="flex-end"`.
- Delete `.settings`; `.loadingState` uses `--q-space-20`.

**E2E (`account.spec.ts`):**
- :80-82 becomes `page.getByRole("status").filter({ hasText: /saved|success/i })`; the quiet success Alert is `role="status"`.
- The full-tab and save error `getByRole("alert")` assertions, the field labels and `/save/i` survive. Locate them by text, not by line.
- **Add VoiceProfileTab coverage** on `/account?tab=voice-profile`, using the existing `settingsEndpoints.getVoice` and `updateVoice` and the voice mocks:
  - Load fills Tone, Style, Industry, Target Audience, Example Posts and Custom Instructions.
  - Tone and Style are `getByRole("combobox",{name:"Tone"})`, set with `selectOption`.
  - Save 200 shows `getByRole("status").filter({hasText:/voice profile saved/i})`.
  - Save, table-driven over `400/401/403/404/409/500/503/"transport"`, shows `getByRole("alert")` "Failed to save voice profile. Please try again.".
  - GET 404 gives an empty form with no alert. GET 500 gives the full-tab error alert.

**Layout:** Settings, with the form column at 640.

**Rules:** frontend-recipe-rules:R-4.1, frontend-recipe-rules:R-4.2, frontend-a11y-rules:A-8, frontend-page-rules:S-4

## F8 — Admin
**Files:**
- Edit: `src/features/admin/AdminPage.tsx`, `src/features/admin/AdminPage.module.scss`, `e2e/admin.spec.ts`.
- New: `src/features/admin/LoginAsAction.tsx`.
- Delete: `src/features/admin/UserRow.tsx`, `src/features/admin/UserRow.module.scss`.

**Contract:**
- `AdminPage` keeps `Topbar title="Admin"` (h1) and drops `pageStyles` (`@/routes/page.module.scss`) and `Card`.
- `PageHero size="md" as="h2" title="Users" className={styles.hero}`.
- Search: `TextField label="Search users by email" hideLabel placeholder="Search by email…" leftIcon={AppIcon Search} value onChange={handleSearchChange}` in `Grid columns={12}` / `Col span={4} spanSm={12}`.
- `Table<AdminUser> label="Users" rowKey="id" data loading emptyText="No users found."`.
  - `columns: TableProps<AdminUser>["columns"]` = Email, Name, Joined (`<time dateTime>`), and an actions column rendering `<LoginAsAction user/>`.
- The error state is `Alert variant="error"`, and the table is hidden.
- The impersonating bar is `Alert variant="warning"` (role status) with `action={Button variant="destructive" size="sm" loading>Stop impersonating}`.
- Remove every `data-testid`.
- `LoginAsAction({ user }: { user: AdminUser })`:
  - `Button variant="outline" size="sm" aria-label={`Login as ${user.email}`}` "Login as".
  - `Dialog title="Confirm impersonation" icon="warning" size="sm" actions={Cancel ghost (disabled while loading) + Continue destructive loading}`.
  - Body: "You will act as {email}. All actions will affect their account." plus, on failure, an inline `Alert variant="error"`. The Dialog stays open.
- `AdminPage.module.scss` reduces to `.hero { padding: 0 }`.

**E2E (`admin.spec.ts`):**

| Old locator | New locator |
|---|---|
| `getByTestId("admin-user-list")` | `getByRole("table",{name:"Users"})` |
| `getByTestId("admin-user-row")` count | `getByRole("row",{name:/@example\.com/})` |
| `getByTestId("admin-search-input")` | `getByRole("textbox",{name:"Search users by email"})` |
| Dialog error `getByRole("alert")` (:322, :337) | Scoped to `getByRole("dialog",{name:/confirm impersonation/i})` |

- Add a local `impersonationBanner(page)` = `getByRole("alert").filter({ has: getByRole("button",{name:/stop impersonating/i}) })`.
- Fix the spec's pre-existing type errors, which F21's e2e type-check depends on. Replace the `adminScenarios` import with `scenarios.admin.*` from the fixture (or import it from `./handlers/admin.handlers`), and make sure `scenarios` and `network` are either used or removed, so nothing is left unused.
- :220 becomes `toHaveCount(0)`.

**Layout:** Full-bleed table; the hook caps at 25 rows, so no Pagination.

**Gaps:** Table has no server-search slot.

**Rules:** frontend-recipe-rules:R-3.1, frontend-recipe-rules:R-4.4, frontend-page-rules:C-5, frontend-a11y-rules:A-8

## F9 — Analytics on quiet charts
**Files:**
- Edit: `src/features/analytics/components/{AnalyticsPage/component.tsx, AnalyticsPage/component.module.scss, LastSevenDaysSection/component.tsx, DateRangeTabs/component.tsx, MetricSelector/component.tsx, TimeSeriesChart/component.tsx, EngagementTimelineChart/component.tsx, EngagementTimelineChart/component.module.scss}`, `e2e/analytics.spec.ts`, `e2e/handlers/analytics.handlers.ts`.
- Delete: `chart-theme.ts`, `LastSevenDaysSection/component.module.scss`, `DateRangeTabs/component.module.scss`, `MetricSelector/component.module.scss`, `TimeSeriesChart/component.module.scss`, `Sparkline/component.tsx`, `Sparkline/component.module.scss`.

**Contract:**
- Exported names and props are unchanged: `DateRangeTabs { value, onChange }`, `MetricSelector`, `MetricKey`, `TimeSeriesChart { data, metric }`, `LastSevenDaysSection()`.
- `EngagementTimelineChart` props become `{ data: EngagementPoint[]; height?: number; ariaLabel: string; emptyLabel?: string }`; `stroke` is removed, and F10 stops passing it in the same slice.
- **`AnalyticsPage`** (Dashboard layout):
  - Topbar "Analytics" (h1).
  - One local shell renders `PageHero size="md" as="h2" ruled={false}` with eyebrow `PERFORMANCE · {Last N days[ · k platforms]}`, title "The numbers," accent "without the noise" and the existing description. `DateRangeTabs` sits in `actions`.
  - Then one status body, built with early returns and no nested ternaries:
    - KPI row: `Grid columns={12} gap="md" rowGap="md"`, 4 × `Col span={3}` `StatCard`:
      - labels Impressions, Likes, Comments, Shares, with AppIcon icons;
      - `value` numeric and `format={(v) => formatNumber(Number(v))}`;
      - `delta` is the signed `formatNumber` string, with `trend={trendOf(delta)}`;
      - `period="vs prior period"`;
      - omit `delta` and `period` when `deltas` is null.
    - Declare a file-local `function trendOf(delta: string): "up" | "down" | "neutral"`, written as if-returns:
      - `"down"` when `delta` starts with `-`;
      - `"neutral"` when `delta` is `"0"` or `"+0"`;
      - otherwise `"up"`.
      - Every StatCard with a string delta in this ticket uses it. LastSevenDaysSection imports nothing from AnalyticsPage, so it declares its own copy or the helper moves to `src/utils/format.ts`; the builder picks one and does not duplicate it.
    - A panel with `Text as="h3"` "Engagement over time", `MetricSelector` and `TimeSeriesChart`.
    - Then `SectionHeader size="sm" as="h2" title="Platform Breakdown"` and `Table` with `label="Platform breakdown"` (not `caption`), `rowKey="platform"`, numeric columns right-aligned and `size="sm"`.
  - States:
    - Loading: `Skeleton variant="rounded"` shapes.
    - Error: `Alert variant="error" title="Something went wrong" action={Retry}`.
    - No platforms: EmptyState "No platforms connected" with `Button href="/account?tab=platforms"` "Connect platforms".
    - No data: EmptyState "No data for this range" with "Switch to 30 days".
- **`DateRangeTabs` / `MetricSelector`.** `FilterTabs size="sm" showCounts={false}`.
  - Labels "Date range" and "Select metric".
  - Items 7d / 30d / 90d ("7 days" …) and impressions, likes, comments, shares.
- **`TimeSeriesChart`.** `LineChart series=[{ name: metricLabel, data }] labels area height={280} formatValue aria-label={`${metricLabel} over time`}`. Format dates with `timeZone: "UTC"`.
- **`EngagementTimelineChart`.** `LineChart height` (default 140) with `aria-label`. Keep the `<2 points` overlay. SCSS keeps `.wrapper` and `.emptyLabel` on `--q-font-mono`, `--q-text-2xs`, `--q-tracking-mono`, `--q-fg-subtle` and `--q-space-2`.
- **`LastSevenDaysSection`.**
  - `SectionHeader size="sm" as="h2" eyebrow="LAST 7 DAYS · PERFORMANCE" title="Momentum" accent="at a glance" actions={ArrowLink href="/analytics?range=7d" "View analytics"}`.
  - Then `Grid` with 2 × `Col span={6}`, each a `StatCard` ("Impressions" / "Engagements", `format={(v) => formatNumber(Number(v))}`, `delta` with `trend={trendOf(delta)}`, `period="vs prior 7d"`) over a `Sparkline` (`tone="accent"` / `"ink"`, `area`, fixed `width` and `height`, `aria-label` "… sparkline for last 7 days").
  - The early returns are unchanged.
- `AnalyticsPage/component.module.scss` keeps `.hero` and `.panel` (hairline, `--q-radius-lg`, `--q-space-card-pad`). Every grid class goes, and it drops `pageStyles`.

**E2E:**
- `analytics.spec.ts` (rebase per the spec-drift default in Decisions):

  | Find by text | Old | New |
  |---|---|---|
  | `getByText(/analytics/i)` | heading lookup | `getByRole("heading",{level:1,name:"Analytics"})` |
  | `getByRole("button",{name:"7d"})` / `"30d"` / `"90d"` | range buttons | `getByRole("radiogroup",{name:"Date range"}).getByRole("radio",{name:"7 days",exact:true})` etc. |
  | `locator("svg").first()` + "Recharts renders an SVG" comment | chart lookup | the chart's `aria-label` `/impressions over time/i`; delete the comment |
  | `getByText(/platform breakdown/i)`, `getByText(/linkedin/i)` | breakdown and LinkedIn | `getByRole("heading",{name:/platform breakdown/i})`, `getByRole("cell",{name:"LinkedIn"})` |
  | `getByText(/no analytics data/i)`, all **8** occurrences (the empty-state test plus 7 status cases) | stale copy | the status cases: `getByRole("alert").filter({hasText:/something went wrong/i})`; the empty-state test becomes the `noPlatforms` case below |

  - Add a real empty case using the new `analyticsScenarios.noPlatforms()` → heading "No platforms connected".
  - Add metric and range switching with `aria-checked`.
- `dashboard.spec.ts` is F14's; keep "Momentum" (a single match), "View analytics" and "vs prior 7d".

**Rules:** frontend-recipe-rules:R-2.5, frontend-page-rules:S-1, frontend-page-rules:S-3, frontend-style-rules:I-2, frontend-design-rules:FC-4

## F10 — Published post view and inline analytics
**Files:** edit `src/features/posts/components/{InlinePostAnalytics/component.tsx, PlatformPostAnalyticsCard/component.tsx, PlatformPostAnalyticsCard/component.module.scss, PostsEmptyStates/PostsEmptyStates.tsx, PublishedPostPage/component.tsx, PublishedPostView/component.tsx, PublishedPostView/component.module.scss}`, `e2e/post-analytics.spec.ts`.

**Contract:**
- `InlinePostAnalytics`:
  - Loading: `Skeleton variant="rounded"` × 2.
  - 404 or empty: `EmptyState size="sm"` "No analytics yet".
  - Error: `Alert variant="error" title="Couldn't load analytics" action={Retry ghost}`.
  - List: `Stack gap="sm"`.
- `PlatformPostAnalyticsCard`:
  - A module-class panel. The header row holds Badge platform, mono "Published · {date}", `Badge variant="warning" dot={false}` "Analytics unavailable" (it keeps the old plain pill), and `Button variant="ghost" size="sm" icon href target="_blank" rel="noopener noreferrer" aria-label={`Open on ${platformLabel}`}`.
  - `Tooltip` keeps its existing content around "Why is this unavailable?".
  - KPIs are a file-local `KpiCell` (mono label plus `Text size="xl"` value) in `Grid columns={12}` / `Col span={3} spanMd={6} spanSm={6}`.
  - `EngagementTimelineChart height={140} ariaLabel={`Impressions over time for ${platformLabel}`}`, with no `stroke`.
  - The faded state uses a literal `opacity`, which is not a strict-value property.
- `PostsEmptyStates`: export signatures `PostsEmpty()` and `PostsEmptyFiltered({ onClear })` are unchanged. `PostsEmpty` actions: `Button variant="primary" href="/posts/new" leftIcon={AppIcon Plus}` "Create Post". `PostsEmptyFiltered`: "Clear filters" secondary.
- `PublishedPostPage`: quiet `Spinner aria-label="Loading post"`. The Alerts keep `variant="error"`.
- `PublishedPostView`:
  - Breadcrumb Topbar unchanged.
  - `PageHero size="md" ruled={false}` (h1): eyebrow "Composer · published|partially published", title `trimTrailingPeriod("Shipped. Here's how it landed.")`, the existing description.
  - `Grid columns={12}` with two `Col span={6}`: left is `PostPublishStatus`, `SectionHeader "Analytics"` and `InlinePostAnalytics`; right is `SectionHeader "Review Content"` and `PlatformPreviewTabs readOnly`.
  - SCSS keeps `.hero`.

**E2E (`post-analytics.spec.ts`, rebase):**

| Find by text (line hints at b53821cf) | New locator |
|---|---|
| `locator('a[target="_blank"]')` (~:78) | `getByRole("link",{name:"Open on X"})` and `"Open on Threads"` |
| `getByText(/^X$/i)`, `getByText(/threads/i)` (~:57-58) | `getByText("X",{exact:true})`, `getByText("Threads",{exact:true})` |
| `getByText(/no analytics yet/i)` (~:101) | `getByRole("heading",{name:/no analytics yet/i})` |
| 404 case, `getByText(/post not found/i)` (~:165) | "No analytics yet" heading |
| 500 / transport, `getByText(/something went wrong/i)` (~:185, :202) | `getByRole("alert").filter({hasText:/couldn't load analytics/i})` + `getByRole("button",{name:"Retry"})` |

**Rules:** frontend-page-rules:S-1, frontend-page-rules:S-4, frontend-style-rules:I-2, frontend-a11y-rules:A-5.2

## F11 — Blog
**Files:**
- Edit: `src/components/blog/{BlogEditor.tsx, BlogSitePublishStatus.tsx, BlogWizard.tsx, blog-wizard.module.scss}`, `src/features/blog/components/BlogEmptyStates/BlogEmptyStates.tsx`, `src/features/blog/components/BlogRow/BlogRow.tsx`, `src/features/blog/components/BlogHero/BlogHero.tsx`, `src/types/blog.ts`, `src/routes/blog.tsx`, `e2e/blog.spec.ts`.
- New: `BlogRow/BlogRow.module.scss`, `BlogHero/BlogHero.module.scss`.
- Delete: `src/components/blog/blog-editor.module.scss` (orphan), `src/components/blog/blog-site-publish-status.module.scss`, `src/routes/blog.module.scss`.
- Read-only: `routes/blog_.$id.tsx`, `routes/blog_.new.tsx`.

**Contract:**
- `BLOG_STATUS_META: Record<BlogStatus, { label: string; badgeVariant: NonNullable<BadgeProps["variant"]> }>`: draft→`outline`, published→`success`, archived→`secondary`. Labels are unchanged.
- **`blog.tsx`.**
  - `topbarAction` is `Button variant="primary" href="/blog/new" leftIcon` "New Post".
  - `filters` is `FilterTabs size="sm" label="Filter blog posts by status" items={toFilterTabItems(filterItems)} value onChange`.
  - The rest of the `ResourceListPage` props, `useConfirmableDelete` and `ConfirmDeleteModal` are unchanged.
- **`BlogHero`.** `PageHero size="md" as="h2" ruled={false}` with eyebrow "Stories · NN piece(s)", title "Long-form", accent "thought through", and the existing description. Its own `.hero`; it drops `pageStyles`.
- **`BlogRow`.**
  - The TanStack `Link` row is kept, with `Badge variant={meta.badgeVariant}` and AppIcons.
  - Delete is a quiet `Button variant="ghost" size="sm" icon aria-label={`Delete blog post "${title || "untitled"}"`}` with stopPropagation and preventDefault.
  - The row grid is `Grid columns={12}`/`Col` with `spanSm`.
- **`BlogWizard`** (no exact layout; recorded gap).
  - `PageHero` (h1, breadcrumb Topbar), then the status slot, then the error Alerts, then `Grid columns={12}`: form `Col span={6} spanMd={12}` first, sticky preview `Col span={6} spanMd={12}`.
  - Hero titles: new "One idea, a full post"; draft or edit "Refine the" with accent "story"; published "Published. Edit with care".
  - "Idea or instructions" is `SectionHeader size="sm" as="h2"`, rendered exactly once. The TextArea gets `label="Instructions" hideLabel` with its placeholder verbatim.
  - "Details" and "SEO" are SectionHeaders.
  - Published date stays `TextField type="date" label="Published date"`, **not** DatePicker.
  - Fields use `Stack gap="md"`; sections use `gap="lg"`.
  - Preview: `Tabs tabs=[Preview, Markdown] defaultValue="preview" label="Blog post view" panels` with no `keepMounted`. Empty preview: `EmptyState bordered size="sm"`.
  - Topbar button order stays Delete (`aria-label="Delete blog post"`), Save draft, Publish (`loading`).
  - `addBanner` becomes `notify` at L256, L292 (warning, with description) and L299; deps at L272 and L324.
  - `MediaUploadSection` is consumed as F2 left it.
- **`BlogEditor`.** Alerts keep `variant` (the warning becomes role status). Spinner becomes quiet.
- **`BlogSitePublishStatus`.**
  - Native `<section aria-label="Site publish status">`.
  - Error: `Alert variant="error" action={Button variant="secondary" size="sm" loading>Retry}`.
  - PR: `Link href external` "Pushed to GitHub → PR #n".
- **`BlogEmptyStates`.** `actions`, AppIcon `xl`, `trimTrailingPeriod`. Copy "No blog posts yet" / "No matching posts".

**Tokens:** `blog-wizard.module.scss` keeps `.hero`, `.previewPanel` (sticky `top: var(--q-space-2)` inside `breakpoint(lg)`), `.markdown` and its children, and `.streamingCursor` with its keyframes.
- `.markdown` re-tokens: `--q-fg`, code and pre background `--q-bg-subtle`, `--q-radius-2xs`/`-xs`, table borders `var(--q-hairline) solid var(--q-border)`, `--q-font-mono`.
- Delete every other class, including `.twoColumn` (grid).
- `highlight.js/styles/github.css` is light-only. Override `.markdown pre` and `code` colours to tokens and check foundry-dark by eye (recorded risk).

**E2E (`blog.spec.ts`):**
- "New Post" moves from `getByRole("button",{name:/new post/i})` to `getByRole("link",{name:/new post/i})`. Find it by text; hints at b53821cf are ~:57, ~:176 and ~:205.
- **Add one FilterTabs interaction.** Click `getByRole("radiogroup",{name:"Filter blog posts by status"}).getByRole("radio",{name:/^draft/i})`. Assert it has `aria-checked="true"`, and that the next GET `*/api/protected/blogs` carries `status=draft` (`page.waitForRequest`).
- The placeholder, `/generate/i`, "Published date" and the streaming text survive.
- `blog-delete`, `blog-site-publish` and `blog-featured-image` need no change.

**Rules:** frontend-page-rules:C-5, frontend-recipe-rules:R-4.1, frontend-page-rules:S-3, frontend-design-rules:FC-5, frontend-style-rules:I-2

## F12 — Media
**Files:**
- Edit: `src/features/media/components/{MediaCard/MediaCard.tsx, MediaEmpty/MediaEmpty.tsx, MediaHero/MediaHero.tsx}`, `src/routes/media.tsx`, `src/routes/media.module.scss`, `e2e/media.spec.ts`.
- New: `MediaCard/MediaCard.module.scss`, `MediaHero/MediaHero.module.scss`.

**Contract:**
- **`media.tsx`.**
  - The Topbar action is a **button**: `Button variant="primary" onClick loading={uploading} leftIcon` "Upload".
  - Keep the native `<input type="file" accept="image/*,video/*" aria-label="Upload media file">` as the first file input on the page.
  - `ResourceListPage` props are unchanged, plus `renderContainer={(children) => <Grid minChildWidth={200} gap="md" rowGap="md">{children}</Grid>}` from F1.
- **`MediaCard`.**
  - A module-class tile: hairline, `--q-radius-lg`, `overflow: hidden`, hover `--q-shadow-2`.
  - `img alt`, or `video controls preload="metadata" aria-label` with `<track kind="captions"/>`, or an AppIcon fallback.
  - The filename is one text node.
  - The meta row has `Badge variant="outline" size="sm"` {ext} and the size.
  - Delete: `Button variant="ghost" size="sm" icon aria-label={`Delete ${filename}`}`. Its behaviour is unchanged (no `onDelete` is passed today).
- **`MediaEmpty`.** EmptyState "No media yet" with action "Upload Media".
- **`MediaHero`.** `PageHero size="md" as="h2" ruled={false}` with eyebrow "Library · NN item(s)", title "Every asset," and accent "one tap away". Drop its `@/routes/page.module.scss` import (`pageStyles`), and use its own `.hero` class.
- `media.module.scss` keeps `.hiddenInput`; the card rules move to `MediaCard.module.scss`. Delete `.mediaGrid`.

**E2E (`media.spec.ts`):**
- The file input moves from the `document.querySelector` style hack to `page.getByLabel("Upload media file")`.
- `getByText(/library/i)` must stay a single match, and `/upload media/i` must not match the Topbar "Upload".

**Rules:** frontend-recipe-rules:R-2.2, frontend-page-rules:S-3, frontend-style-rules:I-2, frontend-a11y-rules:A-5.2

## F13 — GitHub
**Files:**
- Edit: `src/components/github/{ArtifactGrid.tsx, CaptureMetaCard.tsx, artifacts.module.scss, capture-meta.module.scss}`, `src/routes/github.tsx`, `src/routes/github.module.scss`, `src/routes/github_.$id.tsx`, `e2e/handlers/index.ts`, `e2e/handlers/platforms.handlers.ts` (the GitHub endpoints move out), `e2e/account-connections.spec.ts` (imports updated), `e2e/mocks/data/index.ts`.
- Delete: `src/routes/github-details.module.scss`, and `github.module.scss` if it ends up empty.
- New: `e2e/github.spec.ts`, `e2e/handlers/github.handlers.ts`.
- Move the GitHub connection and repo endpoints F6 added to `platforms.handlers.ts` into `github.handlers.ts`, and update the imports in `account-connections.spec.ts`.

**Contract:**
- **`github.tsx`** (Full-bleed table).
  - `Topbar title="GitHub"`, with Refresh unchanged.
  - `PageHero size="md" as="h2"`: eyebrow "Activity · NN commit(s) tracked", title "Every push, captured in", accent "context".
  - `Table<GitHubCommitSummary> label="Commits" size="sm" onRowClick` with columns №, Commit (`Link href={`/github/${id}`}` truncated first line plus a muted meta line) and Status (Badge).
  - `Pagination page total={totalPages} onChange={setPage} size="sm" disabled={loading}` when there is more than one page.
  - `STATUS_META: Record<CommitState["kind"], { label; variant }>` replaces `STATUS_CLASS` and `STATUS_LABELS`. Labels are unchanged.
  - Not connected: EmptyState "GitHub isn't connected" with `Button href="/account?tab=platforms"` "Connect GitHub". Empty: "No commits yet".
  - Replace the nested ternary with early returns.
  - Drop the `@/routes/page.module.scss` import.
- **`github_.$id.tsx`.**
  - The breadcrumb Topbar keeps its icon as AppIcon.
  - `Stack gap="lg" animated`.
  - Alerts keep `variant`. "Capture failed" uses `action={Button variant="primary" size="sm" loading>Retry capture}`.
  - "View generated post →" and "View generated blog →" become `Button href`.
  - EmptyStates "Commit not found" and "No artifacts yet".
- **`CaptureMetaCard`.**
  - `Text as="h1" size="2xl" weight="semibold" color="heading"` for the commit subject. It is the route's h1, and there is no period.
  - Badges, a mono `<code>` sha, and `Link href external variant="muted" size="sm"` "View on GitHub".
- **`ArtifactGrid`.** Bare sections: `SectionHeader size="sm" as="h2"` (Images / Video / Metadata) with a count Badge in `actions`. Images use `Grid minChildWidth={256} gap="xs" rowGap="xs"` with native anchor tiles. Video uses `<video controls>` and a Download `Link external`.
- SCSS uses the token table. `.videoPlayer` becomes `width: 100%; aspect-ratio: 16/9; max-width: var(--q-w-content); background: var(--q-bg-inverse)`. Delete the undefined `--space-24` / `--space-160` and the duplicated rules.

**E2E:**
- `github.handlers.ts`: `githubEndpoints` (built with `setupEndpoint`) and `githubScenarios`, registered in `handlers/index.ts` (handlers, endpoints, scenarios). Mock data `githubConnection`, `githubCommitSummaries` and `githubCommit`.
- **Each of the four endpoints is table-driven in `github.spec.ts`** across every `setupEndpoint` status (`200`, `400`, `401`, `403`, `404`, `409`, `500`, `503`, `"transport"`), asserting the UI each produces. The 2xx variants are scenarios:
  - GET `*/api/protected/github/connection`: 404 means not connected → EmptyState "GitHub isn't connected".
  - GET `*/github/commits`: variants `empty` and `paginated` (`total > 25`).
  - GET `*/github/commits/:id`: variants for images, video and metadata; skipped; failed; waiting; post or blog with the deleted flags. 404 → "Commit not found".
  - POST `*/github/commits/:id/retry-capture`: 200 flips to "Capture in progress"; errors show "Retry failed: …".
- `github.spec.ts`:
  - h1 "GitHub";
  - `getByRole("link",{name:/connect github/i})` with its href;
  - `getByRole("table",{name:"Commits"})`;
  - pagination `getByRole("navigation",{name:/pagination/i})`;
  - detail h1 equal to the commit subject;
  - error alert "Capture failed" with "Retry capture";
  - info and warning alerts as `getByRole("status").filter({hasText})`;
  - the "View on GitHub" link via `getByRole("link",{name:/^view on github/i})`. quiet `Link external` appends " (opens in new tab)" to the accessible name, so an exact match fails.

**Rules:** frontend-recipe-rules:R-3.1, frontend-page-rules:S-1, frontend-page-rules:S-4, frontend-page-rules:C-5, frontend-style-rules:I-2

## F14 — Dashboard
**Files:** edit `src/routes/index.tsx`, `src/routes/dashboard.module.scss`, `e2e/dashboard.spec.ts`.

**Contract:**
- Topbar "Dashboard" (h1).
- `Stack gap="lg" animated`.
- `PageHero size="md" ruled={false} as="h2" className={styles.hero}` with the date eyebrow, `title={`${greeting}, ${firstName} — your`}`, accent "command center" and the existing description.
- Then `<LastSevenDaysSection/>` (F9).
- Then a native `<section aria-label="Quick access">` holding `SectionHeader size="sm" as="h2" title="Quick Access"`. F22's quick-link assertions scope to this region.
- Then `Grid minChildWidth={200} gap="sm" rowGap="sm"` holding 5 × `Button variant="outline" size="lg" fullWidth href aria-label={`Open ${label}, quick access`} leftIcon={AppIcon}`. `quickLinks[].icon` is typed `LucideIcon`.
- Drop `page.module.scss`. `dashboard.module.scss` reduces to `.hero`.

**E2E:**
- No breaks. `auth.spec.ts` greeting headings now resolve to the h2, which is still unique.
- Add: exactly one h1 "Dashboard", and the Posts quick link routes with no full page load (window marker). F22 adds the region-scoped quick-link hrefs and the first-name greeting.

**Gaps:** five quick links exceed Dashboard's "at most 4" (they are buttons, not KPIs).

**Rules:** frontend-page-rules:C-5, frontend-page-rules:PL-4, frontend-a11y-rules:A-5.2

## F15 — Posts list and calendar
**Files:**
- Edit: `src/routes/posts.tsx`, `src/routes/calendar.tsx`, `src/routes/calendar.module.scss`, `src/features/posts/components/PostRow/PostRow.tsx`, `src/features/posts/components/PostsHero/PostsHero.tsx`, `src/types/post.ts`, `e2e/posts.spec.ts` (list parts), `e2e/calendar.spec.ts`.
- New: `PostRow/PostRow.module.scss`, `PostsHero/PostsHero.module.scss`.
- Delete: `src/routes/posts.module.scss`.

**Contract:**
- `POST_STATUS_META` `className` becomes `badgeVariant`: draft `secondary`, scheduled `warning`, publishing `default`, published `success`, failed `error`, partially_published `warning`. Labels are unchanged.
- Badges for scheduled and partially_published (the warning variant) render `dot={false}`, keeping the old plain pill. Published and failed keep quiet's default dot.
- **`posts.tsx`.**
  - `topbarAction` is `Stack direction="row" gap="xs"` holding `Button variant="primary" size="sm" href="/posts/new" leftIcon` "Create Post" (role link) and `Button variant="secondary" size="sm" onClick={showcaseFlow.open}` with the trigger label (role button).
  - `filters` is `FilterTabs size="sm" label="Filter posts by status" items={toFilterTabItems(…)}`.
  - The other props are unchanged.
- **`PostsHero`.** `PageHero size="md" ruled={false} as="h2" className={styles.hero}` with eyebrow "Library · NN entry/entries", title "Everything you've" and accent "written, in one room". Props `{ count }`. Drop its `@/routes/page.module.scss` import (`pageStyles`) and use the new `PostsHero.module.scss`.
- **`PostRow`.**
  - A native `div` row: a TanStack `Link` (typed `to`/`params`) wraps №, title, `statusLine`, platform icons and Badge.
  - **Sibling** delete: `Button variant="ghost" size="sm" icon aria-label={`Delete post "${truncate(title,40)}"`}`, shown for draft and scheduled.
  - Flex-wrap SCSS.
- **`calendar.tsx`** (nearest: Full-bleed table; month grid is a recorded gap).
  - Root `Stack gap="lg"` with **no** `animated` (Playwright click races).
  - `PageHero as="h2" title={monthLabel} description={segments.join(" · ")}`, which renders as a `<p>`.
  - Topbar actions: `Tabs variant="pill" size="sm" tabs=[By status, By platform] value onChange label="Calendar view mode"` with no panels.
  - Prev and next: `Button variant="ghost" icon aria-label="Prev month, calendar nav"` / `"Next month, calendar nav"`. "Today" is unchanged.
  - The month grid is `Grid columns={7} gap={1} className` (hairline background trick). Day cells stay native `<button aria-label="View posts for …">` and `<span aria-label="… — no posts">`, with `min-width: 0`.
  - The day detail is `List bordered divided` (`href` per post).
  - EmptyState "No posts on this day" with `headingLevel={2}`.
  - The status stripes use the `--q-status-*` tokens.
- `calendar.tsx` drops its `page.module.scss` import.

**E2E:**
- `posts.spec.ts` (list parts):
  - `getByRole("button",{name:/create post/i})` becomes `getByRole("link",{name:/create post/i}).first()`;
  - the delete confirm is scoped to the dialog (as in F5). The failed-delete cases assert the dialog's own `getByRole("alert")` contains "Couldn't delete post", the dialog stays open, and `toastLocator(page,"alert")` has count 0 (F1);
  - the "a BannerCenter notification" comment is rewritten;
  - **one FilterTabs interaction:** click `getByRole("radiogroup",{name:"Filter posts by status"}).getByRole("radio",{name:/^draft/i})`, then assert `aria-checked="true"` and that the next GET `*/api/protected/posts` carries `status=draft`.
- `calendar.spec.ts` (rebase):
  - `/previous month/i` becomes `/prev month, calendar nav/i`;
  - day buttons become `getByRole("button",{name:/^View posts for /})`;
  - the "by platform" status assertions move to `getByText` within the cell;
  - the tab and `p` locators survive.

**Rules:** frontend-page-rules:C-5, frontend-page-rules:S-3, frontend-style-rules:I-2, frontend-a11y-rules:A-5.2, frontend-recipe-rules:R-3.1

## F16 — Public auth routes
**Files:**
- Edit: `src/routes/signin.tsx`, `src/routes/test-login.tsx`, `src/routes/test-login.module.scss`, `e2e/auth.spec.ts`, `e2e/helpers/auth.ts`.
- New: `src/routes/signin.module.scss`.
- Delete: `src/routes/signin.scss`.
- Verify only: `src/routes/oauth/signedin.tsx`.

**Contract:**
- **`signin.tsx`.** `PageShell narrow as="main"` > `.container` (`max-width: var(--q-w-form)`, `padding-top: var(--q-space-section)`) > `Stack gap="lg"` > `Text as="h1" heading={4}` "Welcome" + `<Login/>`. The dotted global background goes.
- **`test-login.tsx`.**
  - `PageShell narrow as="main"` > `.container` > `<form aria-label="Test login">`.
  - `Text as="h1" heading={4}` "Test Login".
  - quiet `TextField` Email and Password, with `data-testid` kept (capture-worker).
  - The error is `Alert variant="error"`.
  - `Button type="submit" variant="primary" disabled={submitting} data-testid="test-login-submit"` toggles "Signing in…" / "Sign in". Use `disabled`, not `loading`: the spec asserts `toBeDisabled`.

**E2E:**
- `auth.spec.ts` and `helpers/auth.ts` `loginAs` use `getByLabel("Email")`, `getByLabel("Password")` and `getByRole("button",{name:/sign(ing)? in/i})`. No test ids.
- Add `/signin`: one h1 "Welcome", a "Sign in with Google" link whose href contains `accounts.google.com`, and one main.
- Add `/oauth/signedin`: one main.

**Gaps:** no layout for signed-out app pages (Form-page column used).

**Rules:** frontend-page-rules:PL-2, frontend-page-rules:C-5, frontend-a11y-rules:A-8, frontend-a11y-rules:A-10

## F17 — `/help` route (new)
**Files:**
- New: `src/routes/help.tsx`, `src/features/help/copy.ts`, `src/features/help/components/HelpPage/component.tsx`, `src/features/help/components/HelpPage/component.module.scss`, `e2e/help.spec.ts`.
- Regenerated: `src/routeTree.gen.ts`, committed with the slice. **Before the gate**, regenerate it: run `npx vite build` once (the TanStack plugin writes the tree), or start `npm run dev` until it is rewritten, or hand-add the `/help` entries following the existing ones. Otherwise `tsc -b`, the first step of `npm run build`, fails on `createFileRoute("/help")`. Confirm with `grep -n '"/help"' src/routeTree.gen.ts`.
- Optional: add `"/help"` to `publicRoutes` in `contexts/persona.tsx`. RouteGuard is not wired today.

**Signatures:**
```
export const Route = createFileRoute("/help")({ component: HelpRoute })
function HelpRoute(): JSX.Element            // <Topbar title={HELP_COPY.title}/> + <HelpPage/>
export function HelpPage(): JSX.Element
export const HELP_COPY = { title, hero: { eyebrow, title, description }, faq: { heading, items: { id, question, answer }[] },
  contact: { heading, description, emailLabel, email, subject } } as const
```

**Contract:**
- Values: title "Help"; hero "Support" / "How can we help" / "Answers to common questions, and a way to reach us."; faq heading "Frequently asked questions" with six items (the FAQ copy default in Decisions); contact "Contact us", "Can't find an answer? Email us and we'll reply as soon as we can.", label "Email support", subject "Growth Tools support". `email` is the placeholder `"support@example.com"`. It is the only place the address appears; nothing else hard-codes it, so swapping in the real address is a one-line edit.
- Layout: a single column at `--q-w-form`; no layout fits a help page (recorded gap).
  - `Stack gap="xl"`.
  - `PageHero size="md" ruled={false} as="h2"`.
  - A native `<section aria-labelledby>` FAQ with `SectionHeader size="sm" as="h2"` and `Accordion items headingLevel={3}`.
  - A contact section with `SectionHeader`, `Text`, and `Button variant="secondary" href={`mailto:${email}?subject=…`} leftIcon={AppIcon Mail}` "Email support".

**Behavior:** WHEN a FAQ question is clicked, its answer SHALL expand and any other open item SHALL close (Accordion single mode).

**E2E (`help.spec.ts`):**
- One h1 "Help" and one main;
- the sidebar link `navigation "Main" › link "Help"` routes with no full page load (window marker plus no document request) and gets `aria-current="page"`;
- FAQ `aria-expanded` toggles;
- the contact link href matches `/^mailto:.+@.+/`;
- at 390×844, "Open navigation" → dialog "Main" → Help; then URL `/help`, the drawer closed, no horizontal scroll;
- a direct load works.

**Rules:** frontend-page-rules:PL-3, frontend-page-rules:C-5, frontend-a11y-rules:A-10, frontend-design-rules:FC-5

## F18 — Shell spec
**Files:**
- New: `e2e/shell.spec.ts`.
- Edit: `e2e/handlers/auth.handlers.ts` (+ `authScenarios.withPersona(persona)` = GET `*/api/protected/user` → `{ ...users.pro, persona }`).

**Mirrors:** `git show quiet-1:webapp/e2e/shell.spec.ts`, including its helpers `seedStorage` (`e2e-seeded` guard), `storedTheme` and the window-marker plus document-request technique. `sidebarNav` = `getByRole("navigation",{name:"Main"})`.

**Cases:**

| describe | Cases |
|---|---|
| Theme toggle | "switches foundry and foundry-dark, stores the choice and survives a reload": `html[data-theme]`, `quiet-theme`, `toHaveAccessibleName("Dark Mode"/"Light Mode")`. "QuietRoot wrapper and toast region follow the theme". |
| Proto theme migration | The five table cases (carbon → foundry-dark, paper → foundry, midnight → foundry, existing `quiet-theme` wins, neither → null; `proto-theme` cleared). |
| Every route renders in both themes | For `/`, `/calendar`, `/posts`, `/posts/new`, `/posts/post_2` (draft override), `/posts/post_1/analytics`, `/media`, `/blog`, `/blog/new`, `/blog/<id>`, `/analytics` (persona override), `/github`, `/github/<id>`, `/admin`, `/account`, `/billing`, `/billing/plans`, `/billing/payment_attempt?session_id=cs_test` and `/help`: html and QuietRoot `data-theme`, one `main`, no `pageerror`. `/billing/pay` is skipped (Stripe.js comes from the network). `payment_attempt` renders its empty state with the default checkout-session handler. |
| Mobile drawer (390×844) | Trigger "Open navigation" opens dialog "Main"; the "Settings" link navigates to `/account` and closes it. "Close navigation" and Escape close it, and Escape returns focus to the trigger. |
| Sidebar | Desktop shows links Calendar, Posts, Media, Blog, GitHub, Settings, Help and the toggle, with no trigger. `aria-current` follows the route, not the toggle. The default `content_creator` persona has no Analytics link, and `withPersona("marketing")` has one. A link click routes with no full page load. |
| Help | The sidebar Help link goes to `/help` with no full page load, h1 "Help", `aria-current`. |
| Topbar | `/posts/new`: one h1, inside main; desktop `navigation "Breadcrumb: New"`; mobile link "Back to Posts" routes with no full page load. `/posts`: one h1 in the banner, none in main. |
| Landmarks | `/posts` and `/account`: one main and one banner holding the h1. With `scenarios.admin.impersonating()` the strip is `role="alert"` and there is still one banner. |
| Scroll (1280×300) | On `/posts`, main scrolls; the banner box is unchanged and `document.scrollingElement.scrollTop` is 0. |

**Rules:** frontend-page-rules:C-9, frontend-a11y-rules:A-10

## F19 — Storybook showcase decorator on quiet
**Files:**
- Edit: `webapp/.storybook/showcaseDecorator.tsx`, `webapp/.storybook/showcaseDecorator.module.scss`.
- New: `webapp/.storybook/Watermark.tsx`, `webapp/.storybook/Watermark.module.scss`.

**Already done (b53821cf):** `.storybook/tsconfig.json` dropped `baseUrl` for TypeScript 7 and uses `../`-relative paths. Its Proto path entry comes out in F20.

**Contract:**
- `showcaseDecorator: Decorator` keeps exactly today's DOM: outer `div.showcase` > [`div.content` > `<Story/>`, `<Watermark/>`]. Only the import source and the styles change.
- `Watermark(): JSX.Element` is a copy of Proto's markup and copy: "© 2026 Shubhanshu", a divider, and the Bluesky and X links with inline SVG paths.
- `Watermark.module.scss`:
  - `right`/`bottom` `--q-space-2`
  - `--q-z-toast`
  - gap `--q-space-1-5`
  - padding `--q-space-1` / `--q-space-1-5`
  - background `--q-bg`
  - `var(--q-hairline) solid var(--q-border)`
  - `--q-radius-md`, `--q-shadow-2`
  - `--q-font-mono`, `--q-text-2xs`
  - `letter-spacing: 0.02em` (em is allowed)
  - color `--q-fg-subtle`, hover `--q-fg`
  - divider `--q-hairline` × `--q-space-1-5` on `--q-border`
  - link gap `--q-space-0-5`
  - transition `--q-dur-hover` `--q-ease-soft`
  - icon `--q-space-1-5`
- `showcaseDecorator.module.scss`: padding `--q-space-10`; background `linear-gradient(135deg, var(--q-bg-inverse) 0%, var(--q-accent) 100%)`, a capture-only backdrop (recorded against the guideline on gradients).

**Capture note (the Storybook default in Decisions).** `capture-worker/storybook.ts` reads `#storybook-root > div` as "the canvas whose children are the story".
- Today that element is QuietRoot's wrapper (the `quietDecorator` is outermost), not `.showcase`.
- The Watermark sits inside `.showcase`, so zoom is effectively never applied. This is pre-existing.
- This ticket keeps the outer wrapper as asked and does not change capture behaviour. A follow-up outside CH-001 (capture-worker is out of scope) aligns the selector or the decorator order.

**Gate:** the standard gate, plus `npx stylelint ".storybook/**/*.scss"` (not covered by `lint:scss`), `npx biome check --vcs-enabled=false .storybook` and `npm run build-storybook`.

**Rules:** frontend-design-rules:FC-4, frontend-design-rules:FC-3

## F20 — Remove Proto, the bridge and dead dependencies; restore the lint bans
**Files:**
- Edit: `webapp/package.json` and `package-lock.json` (only via `npm uninstall @optimusfoundry/proto-design-system recharts remixicon`), `webapp/vite.config.ts`, `webapp/tsconfig.json`, `webapp/.storybook/tsconfig.json`, `webapp/.storybook/preview.ts`, `webapp/src/main.tsx`, `webapp/src/contexts/providers.tsx`, `webapp/.stylelintrc.json`, `webapp/biome.json`, `webapp/src/types/navigation.ts` (stale "RemixIcon" comment).
- Delete: `webapp/src/styles/{layers.css, proto-legacy.scss, _proto-theme-mapped.scss}`, `webapp/src/routes/page.module.scss`.
- Keep: `src/lib/migrateTheme.ts` (the legacy `proto-theme` key migration) and `src/styles/_breakpoints.scss`.

**Config changes:**

| File | Change |
|---|---|
| `vite.config.ts` | `resolve.alias` keeps only `{ find: "@", replacement: path.resolve(__dirname, "src") }`; drop the Proto comment. `optimizeDeps.exclude` drops both Proto entries. `manualChunks` drops the `/recharts/` → `vendor-charts` branch. |
| `tsconfig.json` | `paths` keeps only `"@/*": ["./src/*"]` |
| `.storybook/tsconfig.json` | `paths` keeps only `"@/*": ["../src/*"]` |
| `main.tsx`, `.storybook/preview.ts` | Remove the `layers.css` and `proto-legacy.scss` imports. Order: quiet `style.css`, `fonts.css`, `index.css`. |
| `providers.tsx` | Remove `BannerCenterProvider`, its import and its comment. The rest of the provider tree is unchanged. |
| `.stylelintrc.json` | Keep the quiet plugin and `quiet/known-tokens`. Append the template's `overrides` block (`git show quiet-1:webapp/.stylelintrc.json`): `files: ["src/**/*.scss", ".storybook/**/*.scss"]`, `declaration-property-value-disallowed-list` with `display: ["grid"]` and `"/.*/": ["/var\\(\\s*--(color|space|font|line-height|letter-spacing|border-width|radius|shadow|duration|ease|z|max-width|page)-/"]`, and the template message, with its paths pointed at `vendor/quiet/DESIGN.md`, `vendor/quiet/docs/guidelines/spacing.md` and `vendor/quiet/docs/guidelines/typography.md`. Also repoint the existing `scale-unlimited/declaration-strict-value` message from `node_modules/@optimusfoundry/quiet/…` to the same `vendor/quiet/…` paths (the `.stylelintrc.json` hunk of template 91a231a). The `lint:scss` script stays `src/**/*.scss`; `.storybook` SCSS is checked by the explicit `npx stylelint ".storybook/**/*.scss"` in F19 and F21. |
| `biome.json` | Add an `overrides` entry for `**/*.{ts,tsx}`: `linter.rules.style.noRestrictedImports` `{ level: "error", options: { patterns: [{ group: ["@/proto-*", "@/proto-*/**", "@optimusfoundry/proto-*", "@optimusfoundry/proto-*/**"], message: "Proto is removed; import from @optimusfoundry/quiet." }] } }`. Use wildcard `patterns` only and **no** literal `paths`, so the config never contains the string `proto-design-system` and the AC1 grep stays clean. The rule lives in the `style` group (Biome 2.5.5 schema); `group` takes gitignore-style globs. |

**Verification (all print nothing).** H2 removes the `.md` notes after this ticket, so these greps cover code and config only. F21 runs the full AC1 grep over `webapp/`.
- `grep -rnE '@/proto-design-system|@optimusfoundry/proto-design-system' webapp/src webapp/e2e webapp/.storybook webapp/*.json webapp/*.ts webapp/index.html` (the brief's AC1 pattern; `node_modules`, `vendor`, `dist`, `storybook-static` and the untracked `*.tsbuildinfo` are out of scope)
- `grep -rnE "var\(\s*--(color|space|font|line-height|letter-spacing|border-width|radius|shadow|duration|ease|z|max-width|page)-" webapp/src webapp/.storybook`
- `grep -rnE "BannerCenter|useBannerCenter|ThemeSwitcher|proto-legacy|layers\.css|_proto-theme-mapped|page\.module\.scss|recharts|remixicon" webapp/src webapp/.storybook webapp/vite.config.ts webapp/package.json`
- `test ! -e webapp/node_modules/@optimusfoundry/proto-design-system`

`package-lock.json` must keep two-space indentation and `package.json` tabs. Check `git diff --stat` for a whole-file reindent.

**Negative check (by hand, not committed):**
- A scratch `.module.scss` with a Proto var and `display: grid` fails `lint:scss`.
- Scratch `.tsx` files importing `@/proto-design-system`, `@/proto-design-system/components/x` and `@optimusfoundry/proto-design-system` each fail `npm run lint` with `lint/style/noRestrictedImports`.
- If a wildcard misses one of them, add the narrowest extra glob that still avoids the literal package name, e.g. `@optimusfoundry/proto-d*`.

**Rules:** frontend-design-rules:FC-4, frontend-style-rules:I-2

## H2 — Drop the CH-001 transition notes
**Routing:** layer `docs` → `skill:shared-repo-tooling` (`.claude/agents/routing.yml`). The two e2e comment checks at the end belong to `frontend-e2e-test-writer` if they are still present.

**Files (edit):**
- `CLAUDE.md`: line 20 "Proto → quiet migration (in progress)" goes, and line 136 is trimmed to quiet only.
- `webapp/CLAUDE.md`:
  - the "Proto (temporary)" bullet;
  - "Proto `--color-*` / `--space-N` vars survive…";
  - "never Proto's `useBannerCenter`";
  - the "Proto → quiet guide" link in Docs (~:66).
- `.claude/agents/README.md:284`: the Proto sentence.
- `.claude/agents/engineering/frontend/frontend-theme-designer.md:125-127`: the "Porting a Proto theme" section goes. Proto themes are never ported here.
- `webapp/docs/{PATTERNS,PAGE-TEMPLATES,TEMPLATE-PATTERNS}.md`: the "Until CH-001 lands" sentence.
- `.claude/agents/qa/consistency-auditor.md`:
  - lines 39–44: the CH-001 sentence goes, and the rule stays.
  - lines 369–374: Script D's header text says EXC "must match the documented-exceptions table in the CH-001 plan's F17 section" (the template's plan). Point it at this plan's H2 section instead.
  - Script D's EXC registry drops the template-only paths and adds growth-tools' legitimate hits: `base-server/internal/github/*`, `base-server/internal/infra/clients/storybook/*`, `base-server/migrations/V0053__*`, `docs/GITHUB_AUTOPOST_*`, `docs/PRD.md`, `docs/prds/*`, `docs/briefs/*`, `docs/plans/*`, `webapp/vendor/*`, `webapp/storybook-static`, `webapp/.stylelintrc.json`, `webapp/biome.json`, `webapp/src/lib/migrateTheme.ts`. **This list is the documented-exceptions table** that Script D's header points to.
  - The baseline text at 476–505 is reworded, and the regression-seed row is kept.
- **E2E comments** (owned by F9 and F15; H2 only checks them): `e2e/analytics.spec.ts` "Recharts renders an SVG" (~:129) and `e2e/posts.spec.ts` "a BannerCenter notification" (~:237) must be gone. If either is still present, it is removed here.

**Keep:** the `frontend-composition-rules` `useBannerCenter` warning and the `frontend-e2e-rules` `proto-theme` line (Script D exempts both).

**Verify:**
- Run Script D from the auditor at the repo root. It prints `0 findings`.
- `grep -rnE "Proto \(temporary\)|until CH-001|BannerCenter notification|Recharts renders" CLAUDE.md webapp/CLAUDE.md webapp/docs webapp/e2e .claude` prints nothing.

**Rules:** frontend-review-rules:V-1

## F22 — Port the template's e2e realignment (360c9fc), where it applies
**Routing:** layer `fe` (e2e) → `frontend-e2e-test-writer` through `frontend-supervisor`. It runs in S9, before F21.

**Port by hand.** `git show 360c9fc -- <path>` touched 11 files. Compare each against growth-tools; this repo shares no history, and none of the files is a byte-identical shared copy.

| 360c9fc file | growth-tools | Action |
|---|---|---|
| `e2e/account.spec.ts` | exists, with different content (site-publish only) | Port the pattern: assert the current page heading and the selected tab (see below) |
| `e2e/dashboard.spec.ts` | exists, with different content | Port the greeting-by-first-name and region-scoped quick-link checks. The "plan eyebrow per tier" checks do **not** apply, because the growth-tools hero eyebrow is the date. |
| `e2e/mocks/data/index.ts` | exists, with different content | **Not applicable.** `ApiUser` has no `email`, there are no team members, and there are no campaign or segment fixtures to remove. |
| `e2e/mocks/catalog.generated.ts`, `e2e/tier-limits.spec.ts`, `e2e/tier-webhooks.spec.ts`, `e2e/integrations.spec.ts`, `e2e/invites.spec.ts`, `e2e/team.spec.ts`, `e2e/handlers/teaminvite.handlers.ts`, `e2e/helpers/login.ts` | absent | **Skip** |

**Files:** edit `e2e/account.spec.ts` and `e2e/dashboard.spec.ts`.

**Cases:**
- `account.spec.ts`:
  - `/account` renders `getByRole("heading",{level:1,name:"Settings"})`, and `getByRole("tab",{name:/billing/i})` has `aria-selected="true"`.
  - `/account?tab=site-publish` selects the "Site Publish" tab.
  - Clicking the "Voice Profile" tab sets `?tab=voice-profile` and selects it.
- `dashboard.spec.ts`:
  - `getByRole("heading",{name:/good (morning|afternoon|evening),\s*test/i})` is visible (the default mock user's first name is "Test").
  - Inside `getByRole("region",{name:"Quick access"})` (F14), each link `Open Calendar|Posts|Media|Blog|Analytics, quick access` has `href` `/calendar`, `/posts`, `/media`, `/blog` and `/analytics`.

**Rules:** frontend-a11y-rules:A-10

## F21 — Final sweep, audit and review
**Steps:**
1. Run the brief's AC1 grep: `grep -rE '@/proto-design-system|@optimusfoundry/proto-design-system' webapp/ --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=dist --exclude-dir=storybook-static --exclude='*.tsbuildinfo'`. Then run the Proto CSS-var grep over `webapp/src`. Both must be empty.
2. Run the AC4 greps:
   - `grep -rnE "BannerCenter|useBannerCenter|ThemeSwitcher" webapp/src` must be empty.
   - `grep -rlE "\btoast(\.dismiss)?\(" webapp/src` must list only `src/hooks/useNotify.ts`.
3. Run the AC2 commands:
   - `npm install && npm run quiet:check && npm run build && npm run lint && npm run lint:scss`
   - `npx biome check --vcs-enabled=false src e2e .storybook`
   - `npx stylelint ".storybook/**/*.scss"`
   - `npm run build-storybook`
   - `npx playwright test --list` (lists only, never runs).
4. **Type-check the e2e tree.** It is outside `tsconfig.json`'s `include`.
   - Create `webapp/e2e/tsconfig.json`: extend `../tsconfig.json`, set `include: ["."]` and `compilerOptions: { "noEmit": true, "types": ["node", "react"] }` (or omit `types`). `["node"]` alone drops the React types the shared `src` imports need.
   - Run `npx tsc -p e2e/tsconfig.json`. It must be clean. The pre-existing errors are owned upstream in this plan:
     - `e2e/admin.spec.ts`: the `adminScenarios` import plus the unused `scenarios`/`network` → F8 (use `scenarios.admin.*` or import from `./handlers/admin.handlers`).
     - `e2e/mocks/data/index.ts` ~:167/183/198, the missing `platforms` → F6.
     - `e2e/handlers/sitePublish.handlers.ts`, an unused import → fixed here in F21.
   - Commit the new tsconfig, and the `sitePublish.handlers.ts` fix if the sweep changed it.
5. Run `npm run dev` (port 3000).
   - Run `npx quiet-audit http://localhost:3000/{signin,test-login,oauth/signedin} --width 1280,390 --theme foundry,foundry-dark`.
   - Dispatch `quiet-screen-reviewer` on the same three URLs.
   - Fix the findings in their owning files.
   - Check by eye that, with Proto's reset gone, `body` has no stray margin and the page background is `--q-bg` in both themes. If either is wrong, fix it in `src/index.css`.
6. Mark these **pending, human run**:
   - `quiet-audit` and `quiet-screen-reviewer` on every protected route, logged in: `/`, `/calendar`, `/posts`, `/posts/new`, `/posts/$id`, `/posts/$id/analytics`, `/media`, `/blog`, `/blog/new`, `/blog/$id`, `/analytics`, `/github`, `/github/$id`, `/admin`, `/account` (each tab), `/billing`, `/billing/plans`, `/billing/pay`, `/billing/payment_attempt`, `/help`;
   - the light/dark review of each screen (AC9);
   - the Playwright run (AC7).
7. Report:
   - the chart decision table (AC6);
   - the quiet gaps for upstream;
   - the Decisions section with final values;
   - a note that `posts.spec.ts` can now be split, since its wizard cases overlap `post-wizard.spec.ts` (F5). The split is a follow-up and is not done here.

**Rules:** frontend-review-rules:V-10, frontend-review-rules:V-1

---

## AC coverage
| AC | Tickets |
|---|---|
| AC1 Proto gone | F1–F16 (each removes its imports and vars), F19, F20, H2, F21 |
| AC2 gates | Every slice gate (`quiet:check`, `build`, `lint`, `lint:scss`); F17 (route tree); F19 (Storybook checks); F21 (incl. e2e type-check) |
| AC3 routes, toggle, routing, drawer | F1, F4, F14, F17, F18 (shell spec), F21 |
| AC4 toasts via useNotify | F1 (delete flow), F3, F5, F6, F7, F10, F11, F13, F15, F20 (provider removed), F21 greps |
| AC5 featured image | F2, F11 |
| AC6 charts | F9, F10, F20 (`recharts` removed); table in Shared contract |
| AC7 e2e | F1, F2, F3, F5–F18, F22; F21 (`--list`, `tsc`); the user runs Playwright |
| AC8 quiet-audit | F21 (public routes run; protected routes pending human) |
| AC9 light/dark review | F21 (pending human) |

## Out of scope (recorded)
- `capture-worker/storybook.ts` selector and comment drift (F19).
- `highlight.js` imported without being declared in `package.json`.
- `index.html` `<title>ProtoApp</title>`.
- The duplicate `isPublicRoute` in `contexts/auth.tsx`.
- Splitting `posts.spec.ts` (F21 notes it).
- Patching quiet, and the stale `dist/` paths in quiet's placed files (upstream).
