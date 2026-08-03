# Feedback: Alerts, Banners, Toasts, Progress, Empty

Five surfaces for user feedback. Pick by intensity and persistence.

| Component | Intensity | Persistence       | Shape                    |
|-----------|-----------|-------------------|--------------------------|
| Alert     | medium    | stays in context  | bordered panel in page   |
| Banner    | high      | top-of-surface    | full-width colored strip |
| Toast     | low       | auto-dismiss      | dark popup, shadow-lg    |
| Progress  | ambient   | while running     | thin bar                 |
| Empty     | neutral   | no data           | centered block           |

---

## Alert — `.alert`

In-flow, bordered, subtle tinted bg. The page says "heads up" to the user.
```html
<div class="alert info">
  <div class="ic"><svg …/></div>
  <div class="body">
    <div class="t">Linked successfully</div>
    <div class="m">Your Instagram account is now connected to Growth Tools.</div>
  </div>
  <button class="x"><svg …/></button>
</div>

<!-- Variants: .info / .success / .warning / .error -->
```
Use for: form-level validation summaries, onboarding tips, connection status messages.

## Banner — `.banner`

Full-width, heavier than alert. Appears at top of a page or above key content.
```html
<div class="banner success filled">
  <div class="content">
    <div class="ic"><svg …/></div>
    <div class="t">All systems operational</div>
    <span class="sep">·</span>
    <div class="m">Last checked 2 min ago</div>
  </div>
  <div class="action"><button class="btn ghost sm">Details</button></div>
  <button class="x"><svg …/></button>
</div>

<!-- Variants: info / success / warning / error / feature -->
<!-- Fills:    .filled (solid)  ·  .light (tinted)  ·  .stroke (outlined) -->
```

`feature.filled` is a signature: inverted ink banner used for announcements and upgrade teasers.

## Toast — `.toast`

Transient; appears in a corner, auto-dismisses. Dark by default.
```html
<div class="toast">
  <div class="ic"><svg …/></div>
  <div class="body">
    <div class="t">Changes saved</div>
    <div class="m">Draft updated 2 seconds ago.</div>
  </div>
  <button class="x"><svg …/></button>
</div>

<!-- Variants: .success / .warning / .error -->
```
Stack them in a fixed container at `bottom: 24px; right: 24px`, gap `10px`.

## Progress — `.prog`

Linear progress, with optional label.
```html
<div class="prog">
  <div class="track">
    <div class="bar" style="width: 68%"></div>
  </div>
  <div class="label">68%</div>
</div>

<!-- Sizes: .prog.sm (4px) / default (6px) / .prog.lg (10px) -->
<!-- Bar variants: .bar.success / .bar.warning / .bar.error -->

<!-- Indeterminate -->
<div class="prog"><div class="track"><div class="bar indeterminate"></div></div></div>
```

## Empty state — `.empty`

Centered block for zero-data, zero-result, zero-filter states.
```html
<div class="empty">
  <div class="ic"><svg …/></div>
  <h4>No posts yet</h4>
  <p>Schedule your first post to see it here. Drafts appear automatically as you write.</p>
  <div class="actions">
    <button class="btn primary">Create post</button>
    <button class="btn ghost">Import from CSV</button>
  </div>
</div>
```
The title uses Geist 600, 24px. Keep the body ≤ 34ch for readability.

## Spinner — `.spinner`

Indeterminate loader. Sizes: `xs` (12px) / `sm` (16px) / `md` (22px) / `lg` (32px) / `xl` (48px).
```html
<span class="spinner md"></span>
<span class="spinner md primary"></span>
```

## Skeleton — `.skel`

Shimmering placeholder.
```html
<div class="skel text" style="width: 60%"></div>
<div class="skel text" style="width: 40%; margin-top: 8px"></div>
<div class="skel rect" style="width: 100%; height: 160px"></div>
<div class="skel circle" style="width: 40px; height: 40px"></div>
```
Use during initial load; swap to real content in 200–600ms. Don't mix skeletons with spinners on the same surface.

## Do / Don't
✅ One banner per page, at most
✅ Toast for transient confirms ("Saved", "Copied"); alert for stateful info
✅ Empty states *always* include a clear next action

❌ Multiple alerts stacked — consolidate
❌ Red error banner for minor issues — use warning or alert instead
❌ Spinner in a button AND a toast at the same time
