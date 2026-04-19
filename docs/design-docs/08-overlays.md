# Overlays: Modal, Popover, Menu, Tooltip, Command Palette, Date Picker

All overlays float above the page with `--shadow-lg` or `--shadow-xl`. The backdrop (when used) is `oklch(0% 0 0 / 0.4)` with `backdrop-filter: blur(2px)`.

## Modal — `.modal`

Primary dialog for confirmations, flows, and focused tasks.
```html
<div class="modal" role="dialog">
  <div class="modal-hd">
    <div class="ic-w warn"><svg …/></div>          <!-- .warn / .err / .success / .info -->
    <div class="text">
      <h3>Delete campaign?</h3>
      <div class="desc">This action cannot be undone. 14 scheduled posts will be canceled.</div>
    </div>
    <button class="x"><svg …/></button>
  </div>
  <div class="modal-bd">
    <!-- optional body content -->
    Are you sure you want to permanently delete <strong>Summer launch 2025</strong>?
  </div>
  <div class="modal-ft">
    <button class="btn ghost">Cancel</button>
    <button class="btn danger">Delete campaign</button>
  </div>
</div>
```
- Width: 520px, radius 16px, `--shadow-xl`
- Title: Fraunces 22px, opsz 100 SOFT 20
- Icon-well (`.ic-w`) is optional but elevates trust — semantic tint matches modal intent
- Footer: right-aligned, ghost → primary/danger

## Popover — `.pop`

Smaller, anchored to a trigger, usually with a title.
```html
<div class="pop">
  <div class="pop-hd">
    <span class="t">Filters</span>
    <button class="btn ghost icon-only sm"><svg …/></button>
  </div>
  <div class="pop-bd">
    …content, form, or list…
  </div>
</div>
```
Width: 260–320px. Use for filter dropdowns, field help, quick editors.

## Dropdown menu — `.menu`

Triggered by an action button or row ••• menu.
```html
<div class="menu">
  <button class="menu-item focused">
    <span class="ic"><svg …/></span>
    <span>Edit post</span>
  </button>
  <button class="menu-item">
    <span class="ic"><svg …/></span>
    <span>Duplicate</span>
  </button>
  <button class="menu-item selected">
    <span class="ic"><svg …/></span>
    <span>Mark as featured</span>
    <span class="check"><svg …/></span>
  </button>
  <div class="menu-divider"></div>
  <button class="menu-item danger">
    <span class="ic"><svg …/></span>
    <span>Delete</span>
  </button>
  <button class="menu-item disabled">
    <span class="ic"><svg …/></span>
    <span>Archive (Pro)</span>
  </button>
</div>
```

With descriptions:
```html
<button class="menu-item">
  <span class="ic"><svg …/></span>
  <div style="display:flex; flex-direction:column; gap:2px;">
    <span>Publish now</span>
    <span class="desc">Bypass the queue</span>
  </div>
</button>
```

## Tooltip — `.tt-bubble`

Tiny dark bubble, 4 directions.
```html
<div class="tt-demo">
  <button class="btn ghost icon-only"><svg …/></button>
  <span class="tt-bubble top">Preview</span>     <!-- .top / .bottom / .left / .right -->
</div>
```
Show on hover / focus, hide otherwise (wrap in JS, or pure CSS with `.tt-demo:hover .tt-bubble { opacity:1 }`).

## Command palette — `.cmd`

The ⌘K overlay. 520px wide, `--shadow-xl`.
```html
<div class="cmd">
  <div class="cmd-inp">
    <svg …/>
    <input placeholder="Search or run a command…" autofocus/>
    <kbd>ESC</kbd>
  </div>
  <div class="cmd-list">
    <div class="cmd-group-lbl">SUGGESTED</div>
    <div class="cmd-item focus">
      <span class="ic"><svg …/></span>
      <span>Create new post</span>
      <kbd>N</kbd>
    </div>
    <div class="cmd-item">
      <span class="ic"><svg …/></span>
      <span>Open AI chat</span>
      <kbd>⌘ J</kbd>
    </div>

    <div class="cmd-group-lbl">NAVIGATE</div>
    <div class="cmd-item">
      <span class="ic"><svg …/></span>
      <span>Go to calendar</span>
    </div>
  </div>
</div>
```

## Date picker — `.dp`
```html
<div class="dp">
  <div class="dp-hd">
    <button><svg …/></button>
    <div class="month">November 2025</div>
    <button><svg …/></button>
  </div>
  <div class="dp-days">
    <div class="dp-dow">SUN</div><div class="dp-dow">MON</div>…<div class="dp-dow">SAT</div>

    <button class="dp-day other">30</button>
    <button class="dp-day">1</button>
    …
    <button class="dp-day today">14</button>
    <button class="dp-day selected">20</button>
    <button class="dp-day disabled">25</button>
  </div>
</div>
```
- `.other` — days from adj. month
- `.today` — 1px ink outline
- `.selected` — inverted ink fill
- `.disabled` — 30% opacity

## Backdrop pattern

When a modal/cmd palette is up:
```html
<div class="backdrop" style="
  position:fixed; inset:0; z-index:90;
  background:oklch(0% 0 0 / 0.4); backdrop-filter:blur(2px);
  display:grid; place-items:center;
">
  <div class="modal">…</div>
</div>
```

## Do / Don't
✅ Auto-focus the first input in modals and cmd palette
✅ Close on ESC and on backdrop click
✅ Only one overlay at a time — stacking is a smell

❌ Nested modals
❌ Tooltips for anything longer than ~5 words (use popover instead)
❌ Date picker with both start and end picker open simultaneously — use range mode
