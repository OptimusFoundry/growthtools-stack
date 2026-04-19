# Accessibility Patterns

Conventions for accessible names on interactive elements. Enforced by review.

---

## Rule: aria-label must be unique within its visible context

Every focusable control on a page (`button`, `a`, `[role="button"]`, `input`,
custom widgets) needs an accessible name. When two controls would otherwise
share the same name, the label MUST disambiguate them.

**Why:** Screen-reader users can't tell "Delete" from "Delete" without context.
Test runners (Playwright in strict mode) also reject ambiguous locators —
`getByRole('button', { name: 'Delete' })` throws when it resolves to >1 element.

This is not optional polish. Ambiguous accessible names are a real defect:
they break SR navigation **and** they break our E2E suite.

---

## When to add an instance discriminator

Add disambiguating context whenever a control is:

1. **Repeated in a list, grid, or table row** — every row's "Edit" / "Delete" /
   "View" needs the row's identity in the label.
2. **Duplicated across page regions** — e.g., a topbar "Previous month" and an
   inline calendar "Previous month" both visible at once.
3. **Icon-only** — the icon's visual meaning isn't conveyed to SR users at all,
   so the label carries 100% of the meaning.
4. **Generic verb without object** — "Save" alone is ambiguous on a page with
   multiple savable forms; prefer "Save profile", "Save draft".

---

## How to write the discriminator

Pick the shortest phrase that uniquely identifies the target. In priority order:

1. **The thing being acted on** — `Delete post "${title}"`,
   `Remove platform ${platform}`, `Edit blog "${title}"`.
2. **The region the control belongs to** — `Previous month, calendar nav`,
   `Close media drawer`, `Submit profile form`. Use a comma + lowercase
   region name; SR users hear it as a natural pause.
3. **A semantic date or index** — `View posts for March 1, 2026`,
   `Page 2 of pagination`.

Keep it short. Screen readers read the whole label; verbose labels are tiring.

### Bad → Good

```tsx
// Bad: every row collides with every other row
<Button isIconOnly aria-label="Delete">
  <TrashIcon />
</Button>

// Good
<Button isIconOnly aria-label={`Delete post "${post.title}"`}>
  <TrashIcon />
</Button>
```

```tsx
// Bad: two of these on /calendar
<Button onClick={prev} aria-label="Previous month">
  <ChevronLeft />
</Button>

// Good: short region suffix
<Button onClick={prev} aria-label="Previous month, calendar nav">
  <ChevronLeft />
</Button>
```

```tsx
// Bad: button's accessible name is just the visible text "1"
<button onClick={() => select(date)}>
  <span>1</span>
  <Stripes data={dayData} />
</button>

// Good: explicit purpose + date
<button
  onClick={() => select(date)}
  aria-label={`View posts for March 1, 2026`}
>
  <span>1</span>
  <Stripes data={dayData} />
</button>
```

---

## Don't

- **Don't repeat visible text in the label.** Buttons with visible text
  (`<Button>Save profile</Button>`) already have an accessible name from
  their content. Adding `aria-label="Save profile"` is redundant and
  *replaces* the visible text for SR users — risky if the two ever drift apart.
  Only add `aria-label` when the visible content is missing, ambiguous, or
  icon-only.
- **Don't bake state into the label** unless state is part of the action.
  `aria-label="Previous month (currently March 2026)"` is noisy on every focus.
  Use a parent `aria-labelledby` or a `<Text>` sibling for context instead.
- **Don't use `title` as a substitute.** `title` shows on hover for sighted
  users; SR support is inconsistent.

---

## Region landmarks help

If a region is properly landmarked (`<nav aria-label="Calendar">`,
`<aside aria-label="Media drawer">`), SR users can already disambiguate
duplicate controls by region. Prefer landmarks over per-button suffixes
when the duplication is structural rather than incidental.

---

## Verifying

- **Manual:** Use VoiceOver (`Cmd+F5`) and tab through the page; every
  control should announce a clear, unique purpose.
- **Automated:** Playwright `getByRole('button', { name: 'X' })` will throw
  in strict mode if `X` matches more than one element. Treat that error as
  evidence of an a11y bug, not a test bug.

See also: [DESIGN-GUIDELINES.md](DESIGN-GUIDELINES.md) for visual / spacing
patterns.
