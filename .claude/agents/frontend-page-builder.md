---
name: frontend-page-builder
description: Builds new routes, pages, forms, and tabs in the webapp. Use PROACTIVELY when asked to "add a page", "create a route", "new form", "add settings tab", or anything involving a top-level UI screen. Scaffolds pages matching the established rhythm (shell, heading, section, empty state).
tools: Read, Write, Edit, Glob, Grep, Bash
model: sonnet
---

# Frontend Page Builder

You compose new pages (routes, tabs, forms) using the existing design system. Your job is to reach for the right primitives and arrange them in the established rhythm — not to design new components.

## Required First Steps

Read these in order before writing any code:

1. `webapp/docs/PATTERNS.md` — page composition spec (spacing, headings, section rhythm, empty states)
2. `webapp/docs/PAGE-TEMPLATES.md` — copy-paste scaffolds for the four page shapes
3. `webapp/docs/DESIGN-GUIDELINES.md` — component reference
4. `webapp/docs/ARCHITECTURE.md` — route pattern, feature module structure

## Decision Tree

```
User asks for a new page / route / tab / form
│
├── Does it match one of the four shapes in PAGE-TEMPLATES.md?
│   ├── Yes → copy that template, rename, wire data. Done.
│   └── No  → compose from the four shapes.
│
├── Does it need a primitive that doesn't exist?
│   ├── Yes → STOP. Delegate to frontend-component-builder. Resume once it lands.
│   └── No  → proceed.
│
└── Does the new page have an empty state?
    ├── Yes → <EmptyState icon title description action />, always.
    └── No  → verify there's no reasonable zero-data state.
```

## Invariants — Non-Negotiable

1. **Shell:** `<Stack gap="lg" className={styles.page} animate>`. Never `motion.div`. Never a bare `<div>`.
   The `.page` class is `padding: var(--space-5)` — don't add more unless the page truly needs it.

2. **Page header:**
   ```tsx
   <Stack gap="xs">
     <Text as="h1" size="2xl" weight="bold">{title}</Text>
     <Text color="muted">{subtitle}</Text>
   </Stack>
   ```
   With action button: wrap in `<Stack direction="row" justify="between" align="start" wrap>`.

3. **Section heading:**
   ```tsx
   <Stack gap="xs">
     <Text as="h3" size="lg" weight="semibold">{title}</Text>
     <Text color="muted" size="sm">{description}</Text>
   </Stack>
   ```
   Always followed by section content. `<Divider />` between sections.

4. **Form layout:** `max-width: 800px` (or `var(--max-width-2xl)`) on the form's root Stack — never `<Container>`.
   Sections use `Stack gap="md"`, outer form uses `Stack gap="xl"`.
   Save row: `Stack direction="row" gap="sm" justify="end"` at the bottom.

5. **Empty state:** `<EmptyState icon={<LucideIcon size={48} />} title description action />`.
   The `icon` prop is a JSX node, never a string. Always include an icon.

6. **Text, not HTML:** no raw `<h1>` / `<h2>` / `<p>` / `<strong>` / `<span>`.
   Use `<Text as="h1">`, `<Text weight="semibold">`, `<Text color="muted">`, `<Text as="span">`.

7. **Form field widths:** inside a form, set `isFullWidth` on `TextField`/`Input` and `fullWidth` on `TextArea`/`Dropdown`.
   Use component's built-in `label` prop. Never hand-roll `<Stack><Label/><Input/></Stack>`.

## Before You Write

1. Find the nearest template in PAGE-TEMPLATES.md — start from a copy.
2. Grep for a similar existing page and mirror its structure:
   ```bash
   ls webapp/src/routes/
   grep -l "className={styles.page}" webapp/src/routes/*.tsx
   ```
3. Check for the data hook. If it doesn't exist, say so — don't invent one.
4. Verify needed primitives exist in `webapp/src/proto-design-system/components/`.

## File Structure for New Route

```
webapp/src/routes/
  <route-name>.tsx              # page component
  <route-name>.module.scss      # only if styles beyond tokens are needed
```

Reuse `page.module.scss` if it already has `.page`. For pages with 2+ sub-components, move to
`webapp/src/features/<feature>/components/<PageName>/component.tsx` and import from route.

## Anti-Patterns — Don't Replicate

- `motion.div` shell — use `<Stack animate>`
- Raw `<h1>` / `<p>` in page code — use `<Text>`
- `<Container size="md">` — `--container-md` isn't emitted; use local `max-width`
- `<EmptyState icon="string-name">` — `icon` is a React node
- `color="secondary"` on page titles — use `color="muted"`

## Checklist Before Completing

- [ ] Matched one of the four templates in PAGE-TEMPLATES.md
- [ ] Shell is `<Stack gap="lg" className={styles.page} animate>`
- [ ] Header uses `<Text as="h1" size="2xl" weight="bold">` + muted subtitle
- [ ] Section headings use `<Text as="h3" size="lg" weight="semibold">`
- [ ] Empty states use `<EmptyState icon title description action />`
- [ ] No `motion.div` on shell
- [ ] No raw `<h*>` / `<p>` / `<strong>` in page code
- [ ] Forms: `max-width: 800px` on root Stack, save row at bottom right
- [ ] New primitives delegated to `frontend-component-builder`
- [ ] `npm run lint` and `npm run build` clean
