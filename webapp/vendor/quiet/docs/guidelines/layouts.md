# Layouts

Ten page layouts cover a SaaS product. Pick one per screen by **what the user does there**. Don't
compose a new one. Dimensions are app density. Specimen: Storybook `guidelines-layouts--default`.

Inside the shell, every layout starts with `main` padding of `--q-space-section` (48) top/bottom and
`--q-space-page-x` (32) sides, max `--q-w-max` (1280). Blocks are separated by `--q-space-block` (32).

## Choosing

| The user… | Layout |
|---|---|
| scans the state of something, then drills in | **Dashboard** |
| works through many records one at a time | **List-detail** |
| edits one object while watching its properties or an agent | **Detail + inspector** |
| works a large dataset (filter, sort, bulk act) | **Full-bleed table** |
| fills in or changes one thing | **Form page** |
| does a multi-step setup with an order | **Wizard** |
| changes preferences across many groups | **Settings** |
| talks to Claude / an agent | **Chat** |
| is not signed in (site, docs, pricing) | **Marketing** (no app shell) |

## App shell

Every app screen sits in this frame. Story: `patterns-app-shell--default`.

```
┌────────┬──────────────────────────────────────────────┐
│Sidebar │ top bar 64 · Breadcrumb ········ ⌘K · Avatar │
│  240   ├──────────────────────────────────────────────┤
│        │ main  pad 48 / 32 · max 1280 · scrolls        │
└────────┴──────────────────────────────────────────────┘
```

| Part | Use | Rule |
|---|---|---|
| Root | `ThemeProvider` (`linkComponent`) › `QuietRoot density="app"` | one density for the whole shell |
| Side nav | `SidebarProvider breakpoint={720}` › `Sidebar mobile="drawer"` (`groups`, `header`, account `footer`) | 240, `collapsible` to the 64 rail; `label` it when a page has two navs |
| Top bar | `SidebarTrigger` + `Breadcrumb` + actions + `DropdownMenu` on an `Avatar` | `--q-h-topbar` 64, hairline below |
| Search | one `CommandPalette` with `hotkey` ⌘K | it mirrors every nav destination and page action; it's the only search UI |
| Notifications | `Drawer size="sm"` + unread `Badge` on its button | system events, kept until read |
| Toasts | one `<Toaster position="bottom-right" max={3} />` | only `toast()` feedback on the user's own action |
| Main | one `<main>`, scrolls on its own | |

- **Collapses:** under 720 the Sidebar leaves the layout and opens from `SidebarTrigger`. Drop its
  column via `useSidebar().isMobile`. The breadcrumb keeps only the current page, and page-x becomes 16.
- **Never:** wrap a `Drawer` around a copy of the nav; put `NavBar` and `Sidebar` on one screen.

## Dashboard

```
PageHero md ───────────────────────────────── [action]
Alert? (one)
┌ 3 ┐┌ 3 ┐┌ 3 ┐┌ 3 ┐   StatCard × 4         gutter 24
┌──────── 8 ─────────┐┌─── 4 ───┐  chart/table + feed
```
- **Choose over list-detail** when nothing on the page is the object being worked on; it only points elsewhere.
- **Limits:** at most 2 grid rows below the KPIs. A third row means the page is two pages.
- **Collapses:** at 720–960 the KPIs become 2 × 2; < 720 everything stacks, the 8 before the 4.
- **Story:** `patterns-dashboard--default`.
- **Rules:**
  - At most 4 KPIs. Each `StatCard` carries direction in `delta`/`trend` with a `period`; never colour the number.
  - A trend goes in a `Sparkline` directly below its StatCard, `--q-space-inline` apart, never nested in it.
  - At most one `Alert`, and only for something actionable.

## List-detail

```
┌─ list 360 ─┐┌─ detail (fluid, content ≤ 1040) ───┐
│ search     ││ PageHero md                         │
│ FilterTabs ││ Tabs                                │
│ List       ││ blocks …                            │
└────────────┘└────────────────────────────────────┘
```
- **Choose over a full table** when each record needs more than a row to judge (a body, history, actions).
- **Dimensions:** list pane padding `--q-space-card-pad`, with a hairline between the panes.
- **Collapses:** < 720 it becomes two routes, the list and then the detail with a breadcrumb back. Never squeeze both panes onto one screen.
- **Story:** `patterns-records--default`.
- **Rules:**
  - The selection lives in the URL.
  - Keyboard selection moves focus to the detail heading.
  - The detail never opens in a modal.

## Detail + inspector

```
┌─ content (fluid) ─────────────────┐┌─ panel 400 ─┐
│ PageHero md · blocks               ││ properties / │
│                                    ││ AgentRun     │
└────────────────────────────────────┘└─────────────┘
```
- **Choose over list-detail** when the user stays on one object. Choose it over 8 + 4 when the side panel is **tool UI** (it scrolls on its own, sticks, closes) rather than content.
- **Dimensions:** the panel is `--q-w-detail-panel` 400 with a hairline left edge and padding `--q-space-block` / `--q-space-card-pad`.
- **Collapses:** < 720 the panel opens in a `Drawer` from a header button.
- **Story:** `patterns-assistant--default` (side panel).

## Full-bleed table

```
PageHero md ─────────────────── [primary]
FilterTabs · search ·········· [bulk actions when selected]
┌──────────────── Table / DataGrid, span 12 ────────────────┐
└───────────────────────────────────────── Pagination ─────┘
```
- **Choose over list-detail** when rows are comparable at a glance and the work is on many at once.
- **Dimensions:** the table fills the content width (≤ 1280, not capped at 1040); the toolbar sits `--q-space-stack` above it.
- **Collapses:** the table scrolls horizontally inside itself; the page never scrolls sideways. Don't turn rows into cards.
- **Rules:**
  - One filter mechanism per field: `FilterTabs` or a filter `Drawer`, not both.
  - "Nothing matches" (`EmptyState` + Clear filters) and "nothing yet" (`GhostFuture`, or `EmptyState` + Create) are different states.
  - Status goes in a `Badge`/`StatusDot` cell, never a row tint.
  - Paginate; no infinite scroll.
  - For live rows use `StreamingTable`, so rows never move under the pointer.

## Form page

```
PageHero md (title, one-line intro)
┌── form column 640 ──┐
│ field ↕24 field      │
│ ── group head ── ↕32 │
│ [Cancel] [Save]      │
└──────────────────────┘
```
- **Choose for** create/edit of one object with ≤ 2 groups. With more groups, use Settings (a nav) or a Wizard (an order).
- **Dimensions:** left-aligned under the title, never centred. Fields are `--q-space-field` apart and groups `--q-space-block`. Actions go at the end of the column, primary last.
- **Collapses:** the column becomes full width.
- **Rules:**
  - Every field has a visible `label`. Format hints go in `helperText`. Validate on blur or submit, not on every keystroke.
  - Exact numbers use `Stepper`/`TextField`, never `Slider`.

## Wizard

```
StepIndicator ──●──○──○
┌── step body 640 ──┐
│ fields             │
│ [Back]      [Next] │
└────────────────────┘
```
- **Choose over a form page** only when later steps depend on earlier answers. Otherwise use one form.
- **Dimensions:** one step per screen with the 640 column, and `StepIndicator` above the PageHero. Back on the left, Next/Finish on the right.
- **Collapses:** < 720 use `StepIndicator orientation="vertical"` or `size="sm"`; the column goes full width.
- **Rules:**
  - One decision per step, skippable and resumable.
  - Finishing shows ink + ✓ and names the next step. No confetti or celebration motion.

## Settings

```
┌ nav 200 ┐ ┌── form 640 ────────────┐
│ Profile │ │ section ↕48 section     │
│ Notifs  │ │ Switch rows on hairlines│
│ Danger  │ │ danger zone (last)      │
└ sticky ─┘ └────────────────────────┘
```
- **Choose over Tabs** when there are > 4 groups or a group is longer than a screen. Use Tabs for ≤ 4 short groups.
- **Dimensions:** the nav and the form are `--q-space-block` apart, and sections are `--q-space-section` apart (not block).
- **Collapses:** < 720 the nav becomes a `Select` or `FilterTabs` above the form.
- **Story:** `patterns-settings--default`.
- **Rules:**
  - A `Switch` applies immediately, so no Save button sits near switches.
  - A section with fields has one Save.
  - The danger zone comes last; pick its control by reversibility ([components.md](components.md#destructive-actions)).

## Chat

```
┌──── chat column 640 ────┐┌─ panel 400? ─┐
│ ChatThread (scrolls)     ││ Checkpoints  │
│ ChatComposer (pinned)    ││ Receipt      │
└──────────────────────────┘└──────────────┘
```
- **Choose for** a conversation as the main task. For help inside another task, use a `Drawer` holding the same components, not a route.
- **Dimensions:** thread and composer share the 640 column; the side panel follows the inspector rules.
- **Collapses:** < 720 the column goes full width and the panel opens in a drawer.
- **Story:** `patterns-assistant--default`.
- **Rules:**
  - `ChatComposer onSubmit` sends to your API; stream into `<ChatMessage from="assistant" status="streaming">`, then `"done"`.
  - Render markdown and highlight code before passing them as children; quiet ships no parser.
  - The thread gets an h2 (visible or `q-sr-only`), with `ChatMessage headingLevel` one below it.
  - AI looks like the rest of the product: no sparkles, gradients or "magic" colour.

## Marketing

```
NavBar ──────────────────────────────
PageHero lg (display type)
section ↕128 · SectionHeader md · 12-col, gutter 32
```
- **Choose for** any page a signed-out visitor sees. Never put the app shell and NavBar on one screen.
- **Dimensions:** `density="marketing"` (the default), `PageShell` / `Container` (1280, 32 sides), and sections `--q-space-section` (128).
- **Collapses:** columns stack < 720.
