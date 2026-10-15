# Rewrite the growth-tools product screens on quiet and remove Proto — Tech Plan

**Epic:** MEER-44   **Brief:** docs/briefs/2026-10-08-quiet-product-rewrite.md   **Scope:** frontend-only (webapp, webapp/.storybook), plus docs and harness notes

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

## Tickets

1. MEER-45 — Point docs and agents at the vendored quiet (port of template 91a231a)
2. MEER-46 — Shared list shell, delete flow, filter items, action bar, impersonation strip
3. MEER-47 — Product-local media upload on quiet FileUpload
4. MEER-48 — Composer: compose column
5. MEER-49 — Composer: preview, publish status, platform cards
6. MEER-50 — Composer shell, edit wrapper, showcase dialog
7. MEER-51 — Account: platform and GitHub connections
8. MEER-52 — Account: voice profile and site publish
9. MEER-53 — Admin
10. MEER-54 — Analytics on quiet charts
11. MEER-55 — Published post view and inline analytics
12. MEER-56 — Blog
13. MEER-57 — Media
14. MEER-58 — GitHub
15. MEER-59 — Dashboard
16. MEER-60 — Posts list and calendar
17. MEER-61 — Public auth routes
18. MEER-62 — `/help` route (new)
19. MEER-63 — Shell spec
20. MEER-64 — Storybook showcase decorator on quiet
21. MEER-65 — Remove Proto, the bridge and dead dependencies; restore the lint bans
22. MEER-66 — Drop the CH-001 transition notes
23. MEER-67 — Port the template's e2e realignment (360c9fc), where it applies
24. MEER-68 — Final sweep, audit and review
