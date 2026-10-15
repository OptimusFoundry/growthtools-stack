---
name: quiet-app
description: Use when building, changing or reviewing UI in an app that uses the @optimusfoundry/quiet design system (the app shell, screens, forms, tables, dashboards, settings, agent features, chat). Covers setup, the AppShell frame, how to lay out a screen, quiet's one look, and the check before finishing.
---

# Building with quiet

quiet has one look: **an inset three-pane shell with a push inspector**: the Sidebar on a grey
canvas, the screen an inset white panel with a TopBar, and a third pane that pushes the screen
aside. Soft ink, the lava accent as punctuation, grounds instead of rules, Geist in sentence case,
dense pill controls, panes over drawers.

## Start here

1. **Name the mode** before touching code: **Build** (a new screen or flow), **Change** (edit an
   existing screen), **Review** (report only, edit nothing) or **Copy** (labels, empty states,
   errors). A review never turns into edits.
2. **Load only what the task needs.** Guidelines ship in
   `node_modules/@optimusfoundry/quiet/docs/guidelines/`. Always read `README.md` (the ten rules);
   then load by the table below. Props and styles: `src/components/<group>/<Name>.tsx` and `.scss`
   in the vendored copy. Never guess a prop: read the `.tsx`.
3. **Say what you loaded.** End your report with the guideline files you read, and cite the file
   for every rule you applied or a finding broke.

| Load | When |
|---|---|
| `layouts.md` | a new screen, the app shell, anything that collapses at 720 |
| `sections.md` | splitting a page into parts, choosing a `Panel` variant, ordering blocks |
| `grid.md` | placing blocks side by side, pane widths |
| `spacing.md` | any gap or padding |
| `typography.md` | any text, headings, numbers |
| `foundations.md` | colour, status, the accent, radius, shadow, motion, density, themes |
| `components.md` | choosing between similar components; feedback, destructive, empty/error, agent UI |
| `content.md` | Copy mode, or any label, button, empty state or error |
| `accessibility.md` | routing, focus, landmarks, forms |
| `checklist.md` | Review mode, and before finishing any mode |
| `coverage-gaps.md` | the task touches something quiet has no standard for yet |

## Setup

```tsx
import "@optimusfoundry/quiet/style.css";
import "@optimusfoundry/quiet/fonts.css"; // Geist; skip if your theme loads its own fonts
import { QuietRoot, ThemeProvider, Toaster } from "@optimusfoundry/quiet";

<ThemeProvider defaultValue="foundry" linkComponent={RouterLink}>
  <QuietRoot>  {/* no theme prop: follows ThemeProvider, dark included; density="compact" for dense tools */}
    <App />
    <Toaster position="bottom-right" max={3} />
  </QuietRoot>
</ThemeProvider>;
```

- quiet is vendored in `vendor/quiet` (`"@optimusfoundry/quiet": "file:./vendor/quiet"`). **Never edit
  it.** `npx quiet check` fails on any change. A quiet bug is fixed in the quiet repo, then re-synced
  with `node ../quiet/scripts/quiet.mjs sync --ref <tag>`. If you're blocked, say so; don't patch the copy.
- `RouterLink` adapts your router's link to `LinkComponent`; every in-app `href` quiet renders goes
  through it.
- `density` is `comfortable` (default) or `compact`, spacing only. `"app"` and `"marketing"` are
  deprecated aliases; drop them.
- Product identity is a theme (`defineThemes` plus `[data-theme="acme"]` in `@layer q.themes`), see
  `DESIGN.md#product-themes`. Never fork a component for identity.
- Box sizing: your own classed elements are `border-box`; quiet's components are `content-box`,
  even with your `className` on them. A class that sizes a quiet component and gives it padding or
  a border also sets `box-sizing: border-box`.

## The frame

Every signed-in route renders inside one `AppShell`, around the router's outlet:

```tsx
import { AccountMenu, AppIcon, AppShell, Button, CommandPalette, Sidebar, TopBar,
  WorkspaceSwitcher } from "@optimusfoundry/quiet";

<AppShell
  sidebar={
    <Sidebar label="Main" compact value={current} groups={nav /* items carry icon: <AppIcon name="…" /> */}
      header={(collapsed) => (<>
        <WorkspaceSwitcher collapsed={collapsed} name="Acme" detail="Pro plan" items={workspaces} />
        {/* then a full-width Search ⌘K button that opens the CommandPalette */}
      </>)}
      footer={(collapsed) => <AccountMenu collapsed={collapsed} name={user.name} detail={user.email} items={account} />}
    />
  }
  topBar={
    <TopBar crumbs={[{ label: "Runs", href: "/runs" }, { label: run.id }]}
      actions={<Button size="sm" variant={open ? "secondary" : "ghost"} icon={<AppIcon name="bell" />}
        aria-label="Notifications, 2 unread" aria-expanded={open} aria-controls="app-aside"
        onClick={() => setOpen((o) => !o)} />}
    />
  }
  aside={<Notifications />} asideTitle="Notifications" asideOpen={open} onAsideClose={() => setOpen(false)}
>
  <Outlet />   {/* each page: PageHeader, then its Panels */}
</AppShell>
<CommandPalette hotkey … />
```

- **TopBar** is quiet's component, never your own header on `--q-top-bar-*` tokens: those tokens
  exist only when `TopBar` is imported, so a production build drops them (no padding, transparent
  on scroll). The same holds for any `--q-<component>-*` token: app CSS uses tier-2 tokens only.
  ```scss
  // Bad: works in dev, collapses in production (TopBar.scss isn't in the bundle)
  .app-topbar { height: var(--q-top-bar-height); padding: 0 var(--q-top-bar-px); }
  // Good: render <TopBar>; for your own markup, tier-2 only
  .app-toolbar { gap: var(--q-space-inline); padding: 0 var(--q-space-page-x); }
  ```
- **Third pane** (`aside`): notifications, an inspector, the assistant. One at a time, 360 wide,
  pushes the screen; a phone gets the same pane as a full-screen sheet. Never a `Drawer` or
  `Dialog` for this, and never a fixed column the page builds.
- **Notices** by urgency: an urgent workspace-wide condition is a `ShellNotice` in AppShell
  `notice` (one line on the canvas); a slow account nudge a `SidebarNotice` in the Sidebar footer,
  above the `AccountMenu`; a condition on this page a `NoticeChip` in the TopBar that opens the
  third pane. Never a `Banner` repeated on every page.
- **Page column:** padded 32 / 32 / 48, max 1280. List-detail and chat lay out their own panes
  edge to edge.

## Lay out a screen

Decide on paper before writing JSX.

1. Job: one sentence for what the user does here. Anything that doesn't serve it stays off the page.
2. Layout: pick it from `layouts.md` by that job and apply its dimensions and rules.
3. Outline: headings only. One `h1` (`PageHeader`), an `h2` per section, an `h3` per panel, ordered
   status, lead block, supporting blocks, destructive last (`sections.md`). One block leads.
4. Place: panes and spans from `grid.md`'s allowed splits; the lead gets the widest.
5. Contain: grounds, not rules. `PageHeader` on top (title, status, meta, actions; `back` on a
   detail page), titled `Panel`s for sections (warm ground, no edge), a `DescriptionList` for
   properties, empty sections collapsed (`Panel empty`). No rules between sections, no
   card-in-card, no frame or ground under a table.
6. Components: choose each with `components.md`. Every record named on the page is an `EntityLink`
   (a table's name cell too); files are `FileCard`s; a run's history is a `Transcript`; filters are
   segmented `Tabs variant="enclosed" size="sm"`; toolbar actions are ghost buttons. No badge,
   alert, chart or icon just because a slot exists.
7. Gaps and text: job tokens from `spacing.md`, roles from `typography.md`. No raw px, sizes or colours.
8. States: loading, empty (nothing yet vs filtered), error and offline for every data block.

## Never

- Hand-roll what quiet has (shell, header, nav, menus, tables …), or add another UI kit, icon set
  or chart library. Icons are `AppIcon`; no unicode glyphs or emoji.
- Raw colours, px or durations. Status colour only from `--q-status-*` and component props.
- Guessed or invented `--q-*` names. Look them up in `dist/tokens.json`; `TokenName` + `cssVar()` in TS;
  the `quiet/known-tokens` Stylelint rule (README). Your own custom properties are `--app-*`.
- Black or near-black text, mono caps labels, italics for emphasis, title case.
- The accent by hand. Components put it on links, the one primary action, the current nav icon,
  selected and checked states and focus; never a section background or body text, and never
  `--q-accent` for text (it's 3.87:1; components use `--q-accent-fg`).
- Text that navigates but doesn't look like a link, or a clickable table row with no link in it.
- Banned words (`content.md`), exclamation marks or emoji.

If quiet lacks something, build it in the product on tier-2 quiet tokens and BEM, and flag it for quiet.

## Before you finish

1. `npx quiet-audit <url…> --width 1280,390 --theme <theme>,<dark pair>`. Fix every finding or
   justify it in the PR.
2. Check a **production build** (`build` + `preview`), not only the dev server: dev injects every
   quiet stylesheet and hides a missing import. Look at the TopBar scrolled, the pane open, and
   the Sidebar collapsed.
3. Look at both themes at 1280 and 390 against `checklist.md`: frame, hierarchy, one lead,
   sectioning, slop, copy. For a whole screen, hand this to the `quiet:quiet-screen-reviewer` agent.
4. `document.title` per route, one `h1` per screen, focus after navigation, named landmarks, axe
   clean: the app's duties in `accessibility.md`, "What the app must do".
