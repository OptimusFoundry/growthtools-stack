# Buttons, Badges & Tags

## Button — `.btn`

```html
<button class="btn primary">Save changes</button>
<button class="btn secondary">Cancel</button>
<button class="btn ghost">Dismiss</button>
<button class="btn danger">Delete</button>
<button class="btn accent">Upgrade</button>
<button class="btn ink">Open report</button>
<button class="btn default">Neutral</button>
```

### Sizes
`.sm` · (default) · `.lg` · `.xl` — apply alongside variant:
```html
<button class="btn primary sm">Small</button>
<button class="btn primary">Default (38px tall)</button>
<button class="btn primary lg">Large</button>
<button class="btn primary xl">XL — hero CTA</button>
```

### States
```html
<button class="btn primary" disabled>Disabled</button>
<button class="btn primary loading">Saving…</button>  <!-- spinner replaces label -->
```

### Icon-only
```html
<button class="btn ghost icon-only sm"><svg …/></button>
```
SVG icons inside buttons: `width:14px; height:14px; stroke:currentColor; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round`. Use [lucide-style](https://lucide.dev) 24px viewBox line icons.

### Group
```html
<div class="btn-group">
  <button class="btn secondary">Day</button>
  <button class="btn secondary">Week</button>
  <button class="btn secondary">Month</button>
</div>
```

### When to use which
- **primary** — the page's *one* canonical action. Indigo pill. One per region.
- **secondary** — neutral next-most-important action. Outlined, bordered.
- **ghost** — tertiary / in-row actions, close buttons.
- **danger** — destructive confirm in modals.
- **accent** — rare. Reserved for upgrade / creator moments.
- **ink** — inverted black CTA, for dark hero zones or accent contrast.
- **default** — filled neutral, good for toolbar buttons.

**Rule:** max one **primary** per visible surface. If two compete, one becomes **secondary** or **ink**.

## Badge — `.badge`

Small status markers, never interactive.
```html
<span class="badge default">Draft</span>
<span class="badge primary">Beta</span>
<span class="badge success"><span class="dot"></span> Live</span>
<span class="badge warning">Review</span>
<span class="badge error">Failed</span>
<span class="badge info">New</span>
<span class="badge accent">Creator</span>
<span class="badge rounded sm">12</span>   <!-- pill, tiny -->
```
Sizes: `.sm` · (default) · `.lg`. Pill shape: `.rounded`.

The `.dot` sub-element is a 6px colored circle — great for status ("live / scheduled / draft").

## Tag — `.tag`

Selectable/removable chips, typically for filters and taxonomies. Border by default.
```html
<span class="tag">Marketing</span>
<span class="tag sm">Small</span>
<span class="tag selectable">Click me</span>
<span class="tag selected">Selected</span>

<!-- with remove -->
<span class="tag primary">
  Instagram
  <button class="tag-x"><svg …/></button>
</span>

<!-- variants: .primary .success .warning .error .info -->
```

## Tier Badge — `.tier`

A specialized editorial badge for plan/tier labels.
```html
<span class="tier free">Free</span>
<span class="tier pro">Pro</span>
<span class="tier creator">Creator</span>    <!-- amber accent -->
<span class="tier team">Team</span>          <!-- indigo primary -->
```
Always uppercase, mono, wide tracking. Use next to names, plan selectors, and feature gates.

## Placement patterns

- **Page header**: eyebrow + title — CTA goes top-right (`.btn.primary.lg`), with a `.btn.secondary` beside it.
- **Card footer** (`.card-ft`): right-aligned pair — secondary then primary (right-most).
- **Modal footer** (`.modal-ft`): same — ghost/secondary on left, primary/danger on right.
- **Toolbar** (tabs, filters): ghost buttons + `.tabs-pill`, right-side `.btn.secondary.sm`.
- **Empty state**: center-stack, primary CTA + optional ghost secondary below.

## Do / Don't
✅ One primary per surface
✅ Use `.btn.ghost` for X-close buttons (with icon-only)
✅ `loading` during async — never spin a separate spinner next to a label

❌ `.btn.primary.lg` inside a table row — too loud; use `.btn.ghost.sm` or an icon button
❌ Gradient buttons. This kit is flat.
❌ Emoji inside buttons
