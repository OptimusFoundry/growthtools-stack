# Building SaaS apps with quiet

These guidelines cover how to put quiet's components together into product screens that look like
one product. The visual rules come from the Optimus Foundry reference
([`docs/reference/optimus-design/readme.md`](../reference/optimus-design/readme.md), its
`guidelines/` cards and `ui_kits/app/`). These pages turn those rules into instructions for building app screens.

| Page | Read it when |
|---|---|
| [layouts.md](layouts.md) | starting a screen: the app shell, which of the ten layouts, its dimensions, its rules, what collapses |
| [sections.md](sections.md) | breaking a page into parts: bare / divided / panel / well, nesting, headings, order |
| [grid.md](grid.md) | placing blocks: fixed panes vs 12 columns, allowed splits, responsive spans |
| [spacing.md](spacing.md) | any gap: the job token for what it separates, per density |
| [typography.md](typography.md) | any text: the eight roles and the component prop for each |
| [foundations.md](foundations.md) | colour, status, shape, depth, motion, density |
| [components.md](components.md) | choosing between similar components; feedback, destructive, waiting/empty/error, agent and trust decisions |
| [content.md](content.md) | writing a label, button, empty state or error |
| [accessibility.md](accessibility.md) | wiring a page: what quiet does for you, what you still own |
| [checklist.md](checklist.md) | reviewing a screen before it ships |

Reference screens live in Storybook under **Patterns** (`npm run dev` → :6020): `patterns-app-shell--default`,
`patterns-dashboard--default`, `patterns-records--default`, `patterns-settings--default`,
`patterns-billing--default`, `patterns-assistant--default`, `patterns-states--default`. Copy their
structure; change the content.

Measured specimens live under **Guidelines**: `guidelines-spacing--default`,
`guidelines-typography--default`, `guidelines-grid--default`, `guidelines-layouts--default` and
`guidelines-sections--default`. They render the real tokens, so they also show density and theme changes.

## Setup in one breath

Install a tagged release from git (`npm install "git+https://github.com/OptimusFoundry/quiet.git#vX.Y.Z"`;
never a branch), import `@optimusfoundry/quiet/style.css` and, for the foundry fonts, `fonts.css`.
Wrap the app in `ThemeProvider` (theme on `<html>`, `linkComponent` for your router) and
`QuietRoot density="app"`, mount one `Toaster`, and register a product theme with `defineThemes` if
the product has one. Details: the package [README](../../README.md) and the `quiet-app` skill.

## quiet in ten rules

1. **Density first.** Products render in `density="app"` (`compact` for dense admin). Never mix
   densities on one surface or carry marketing sizes (64/128 gaps, 52+ type) into an app.
2. **Pick a layout, don't compose one.** Use one of the ten in [layouts.md](layouts.md); main pads
   48 / 32 and caps at 1280.
3. **Panes are fixed, content is gridded.** 240 · 200 · 360 · 400 · 640 · 1040 for panes and columns;
   the 12-column grid with spans 3 · 4 · 6 · 8 · 9 · 12 for blocks; always `rowGap` = `gap`.
4. **Every gap is a job.** inline 8 · stack 16 · field 24 · card-pad 24 · block 32 · section 48 (app).
   Never 12, 20 or 28 between blocks, and never margins on components.
5. **Eight type roles.** page-title 40 (one `PageHero`, one `h1`) · section 24 · card 17 · metric 40 ·
   body-lg 17 · body 15 · small 13 · mono label 11. Level follows the outline; size follows the role.
6. **Lightest container wins.** Bare section first, then divided rows, then a panel only for a
   self-contained module, then a well. No card-in-card and no panel around a table; at most 3 levels.
7. **One lead per page.** Status under the title, the main block first and widest, destructive last.
   Equal-weight sections are a bug.
8. **Ink and greys do the work; molten is punctuation.** The title period, one status mark. Never a
   fill or a section. In charts it's series 1. Status comes from `--q-status-*` and component props.
9. **One control size, hairlines before shadows.** `size="sm"` everywhere in apps; 1px `--q-border`
   edges; shadows only on floating surfaces.
10. **Use the component.** Modals, menus, tables, charts, toasts, chat and agent UI exist with
    keyboard and ARIA built in. Never hand-roll one, and never set `font-size` or a raw colour in a screen.

Product identity comes from a **theme**, not a new design system: one engine (quiet), one theme per
product (`themes/_<name>.scss`). The theme can change the palette, accent, type, shape and density; the
rules above stay the same.
