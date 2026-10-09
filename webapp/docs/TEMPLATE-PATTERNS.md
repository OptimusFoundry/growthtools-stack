# Template patterns

> **growth-tools note.** These docs come from the saas-template at `quiet-1`; their worked examples cite the
> template's `/webhooks` and `/api-keys` screens, which growth-tools doesn't have. The patterns apply unchanged
> to `/posts`, `/blog`, `/media`, `/analytics` and `/admin`.

quiet's docs cover components, layouts, spacing and type: `vendor/quiet/DESIGN.md`, [`docs/guidelines/`](../vendor/quiet/docs/guidelines/README.md), and the [`quiet-app` skill](../../.claude/skills/quiet/skills/quiet-app/SKILL.md). This file covers only what the template adds.

## Page shell

Dimensions and rules for each layout: [`layouts.md`](../vendor/quiet/docs/guidelines/layouts.md).

| Route | Layout |
|---|---|
| `/` | Dashboard |
| `/api-keys`, `/webhooks` | Full-bleed table |
| `/integrations`, `/account` | Settings |
| `/webhooks/new`, `/billing/pay` | Form page |
| Auth pages | Outside the shell |

- `Layout`'s `<main>` pads and caps the width; shell screens do not use `PageShell`.
- The Topbar title is the route's one `h1`. Breadcrumbs and actions go through `Topbar`, `TopbarActionsPortal` and `PageHeroActionsPortal`.
- A `PageHero` inside the shell is `as="h2"` and carries a module class that zeroes its padding.
- Public pages outside the shell use a narrow `PageShell as="main"`.

## AsyncList

`@/components/patterns/AsyncList/AsyncList` renders loading, empty, filtered-empty and items from one render-prop contract (`items`, `loading`, `empty`, `emptyFiltered`, `hasActiveFilter`, `getKey`, row renderer as `children`). Routes never hand-roll those branches; see `frontend-composition-rules`.

## Gating

Tier comes from `TierProvider`.

| Component | Import | Use |
|---|---|---|
| `FeatureGate` | `@/components/gating/FeatureGate/component` | Show content disabled with a lock button naming the required tier |
| `FeatureGate`, `FeatureGateDisabled` | `@/components/FeatureGate/component` | Hide content, or render `fallback` instead; `FeatureGateDisabled` dims it with a title hint |
| `GatedEmptyState` | `@/components/gating/GatedEmptyState/component` | Whole-page gate: info `Alert` plus `EmptyState` with an upgrade button; renders `children` when allowed |
| `useLimitGate` | `@/components/gating/useLimitGate` | Count against a tier limit; returns `isAtLimit`, `showModal`, `openModal`, `closeModal`, `checkAndBlock` |
| `LimitUpgradeModal` | `@/components/gating/LimitUpgradeModal/component` | `Dialog` opened by `useLimitGate` when the limit is hit |
| `UpgradePrompt` | `@/components/UpgradePrompt/component` | Inline upgrade card or banner for one feature; renders nothing when allowed |

## useNotify

`const { notify, dismiss } = useNotify()` from `@/hooks/useNotify`. `notify({ status, title, description?, duration? })` returns the toast id; `dismiss(id?)` closes one or all. `info` and `success` use the Toaster's default duration; `warning` and `error` stay until dismissed. Never import quiet's `toast` in features. The single `Toaster` lives in `AppRoot`.

## useConfirmableDelete

`useConfirmableDelete({ mutate, onSuccess?, copy })` returns `{ target, request, cancel, confirm, isLoading, isOpen }`. Pair it with `ConfirmDeleteModal` (`@/components/patterns/ConfirmDeleteModal/ConfirmDeleteModal`): a quiet `Dialog` with copy in `body` and the buttons in `actions`. It replaces `useState` plus a hand-wired modal and toasts through `useNotify`.

## useCopyToClipboard

`useCopyToClipboard(options?)` returns `{ copiedType, handleCopy }`. `handleCopy(code, type)` writes the clipboard and toasts through `useNotify`.

## RouterLink and AppIcon

- `RouterLink` is the root `linkComponent`; it maps a quiet `href` to a TanStack `Link`.
- `AppIcon` takes `icon`, `size`, `color`, `label`. Pass `<AppIcon icon={X} />` into quiet's `icon`, `leftIcon` and `rightIcon` slots. Without `label` it is `aria-hidden`.

## Wrapping dropped attributes

Most quiet components do not spread rest props, so `id`, `data-*` and unknown `aria-*` are dropped on Card, Banner, Alert, EmptyState, Badge, Avatar, Tag, Stack, Grid, Col, Container, PageShell, PageHero, SectionHeader, Tabs, Table, DataGrid, List, Accordion, Pagination, Breadcrumb, Dialog, Drawer, Toast, Popover and most form widgets. Button, ButtonGroup, Link, ArrowLink, Spinner, Input, Select, TextArea and TextField forward them. Dialog, Drawer, CommandPalette and Tooltip also drop `className` and `style`.

Wrap in a native element that carries the attribute, for example `<section aria-label="Webhooks">` around a `Stack`.

## Titles and periods

`PageHero`, `SectionHeader`, `Headline` and `EmptyState` append a period to the title. Pass copy through `trimTrailingPeriod` from `@/utils/trimTrailingPeriod`; no file-local copies. It cannot undo the period after a title ending in `?` or `!`.

## Dialogs and toasts

- Always pass a truthy `title` to `Dialog`: it is the accessible name and shows a trailing period.
- Copy goes in children, buttons in `actions`; there is no `description` or `footer`.
- A toast raised while a `Dialog` is open is inert, so also show the feedback inline with an `Alert`.

## Router opt-out

`RouterLink` renders `/api/...` paths, `//` and non-`/` hrefs as a plain `<a>` (full page load). Pass the relative `/api/auth/signout` href to a quiet `Button` or `Link`. Use a native `<a>` or an absolute URL only if a component cannot take it.

## Breakpoints

`@use "@/styles/breakpoints" as *;` gives the `breakpoint` (min-width) and `breakpoint-down` mixins over `xs` 475, `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536. The mobile sidebar drawer switches at 720, set once on `SidebarProvider breakpoint={720}` in `contexts/providers.tsx`, so `md` is a media-query size only. Read `useSidebar().isMobile` for drawer-dependent UI.

## Theme toggle

`useTheme()` from quiet switches `foundry` and `foundry-dark` and persists to `localStorage["quiet-theme"]`. `@/lib/migrateTheme` runs once before render (from `main.tsx`) and carries over a legacy stored theme. The template defines no per-product themes; `defineThemes` is for downstream products.
