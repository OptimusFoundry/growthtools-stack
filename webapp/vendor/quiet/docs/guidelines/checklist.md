# Screen review checklist

Run this on every new or changed screen, in **foundry and foundry-dark**, at 1280 and at 390 wide. The
visual-reviewer agent (`.claude/agents/`) uses this list. Every item should be a yes.

## Layout and sections
- [ ] The screen is one of the ten layouts in `layouts.md`, at its dimensions (main 48 / 32, max 1280).
- [ ] Panes use the fixed widths (240 / 200 / 360 / 400 / 640 / 1040), never % or invented px.
- [ ] Blocks sit on the 12-column grid with spans 3 / 4 / 6 / 8 / 9 / 12, and the column edges line up between rows.
- [ ] Every `Grid` has `rowGap`; at 390 no two blocks touch.
- [ ] There's one `PageHero size="md"` (`h1`); top-level sections use `SectionHeader size="sm" as="h2"`, and the heading order is unbroken.
- [ ] Each section uses the lightest container (bare → divided → panel → well), with no card-in-card, no panel around a table, and no `SectionHeader` inside a panel.
- [ ] Nesting is at most page → section → container.
- [ ] One page status under the title; the lead block is first and widest; destructive actions come last.
- [ ] Actions sit with what they act on: page actions in PageHero, section actions in SectionHeader, one primary each.
- [ ] Reading text ≤ 1040, body measure and forms ≤ 640, left-aligned.

## Colour
- [ ] There are no raw colours. Everything is a `--q-*` token.
- [ ] Molten appears only as punctuation: the title period, one status mark, warnings or errors. Charts are the exception (series 1).
- [ ] There's no molten fill, button or section, and no second accent.
- [ ] There's no green or red. Done is ink + ✓, and attention is molten with words.
- [ ] Text people must read is `--q-fg-muted` or darker, and `--q-fg-subtle` is used only for decoration.
- [ ] It looks right in dark mode, with no light-only values.

## Type and spacing
- [ ] The only sizes are 11 / 13 / 15 / 17 / 24 / 40, each through a component prop, with no `font-size` in screen code.
- [ ] Mono caps are used for labels and metadata only; numbers compared in columns are tabular and right-aligned.
- [ ] Every gap is a job token: inline 8, stack 16, field 24, card-pad 24, block 32, section 48 (app).
- [ ] There are no 12 / 20 / 28 px gaps between blocks and no margins on quiet components.
- [ ] Gaps step up with structure (inline < stack < field < block < section), so the page doesn't read as one even list.
- [ ] Every control is `size="sm"`, with no mixed sizes.

## Surfaces and motion
- [ ] Hairlines are used before shadows, and shadows appear only on floating surfaces.
- [ ] Radii follow the surface (fields 14, cards/tables 20, dialogs 28, controls pill), with no square containers.
- [ ] One moving thing per surface: no bounce, no ambient loops, no scroll-triggered motion.

## Components
- [ ] No hand-rolled modal, menu, tooltip, tabs, table, chart, toast or chat UI.
- [ ] No third-party UI kit or chart library alongside quiet.
- [ ] Destructive actions follow the reversibility table (`toast()` + Undo → Dialog → Approval/HoldButton).
- [ ] Toasts are for the user's own actions and the notification centre for system events; one `Toaster` per app.
- [ ] On a phone the nav is `Sidebar mobile="drawer"` opened by `SidebarTrigger`; links route through `linkComponent`.
- [ ] Status colour comes from `variant`/`status` props or `--q-status-*`, never a raw hue.
- [ ] Loading, empty, filtered-empty and error states all exist and match `patterns-states--default`.

## Content
- [ ] It uses sentence case, verb-first buttons that name the object, and no "OK/Submit".
- [ ] There are no banned words (AI-powered, seamless, leverage, …), no exclamation marks and no emoji.
- [ ] Numbers, dates and money are locale-formatted and tabular where compared.
- [ ] Errors say what happened and what to do next.

## Accessibility
- [ ] `document.title` is set, with one `<main>` and named navs when there are several.
- [ ] Every field is labelled and icon-only buttons are named.
- [ ] The whole flow works by keyboard and focus is always visible.
- [ ] axe is clean apart from the two accepted contrast exceptions.
