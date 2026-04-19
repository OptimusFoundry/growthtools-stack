# Forms & Inputs

All inputs share a common look: `10px` radius, hairline border, focus shows `--fg1` border + `3px` `--focus-ring` shadow.

## Text input — `.inp`

Wrapper pattern, so you can add leading/trailing icons and variants:
```html
<label class="lbl" for="q">Search <span class="req">*</span></label>
<div class="inp">
  <svg …/><!-- leading icon -->
  <input id="q" type="text" placeholder="Search campaigns"/>
</div>
<div class="hint">Optional helper text</div>

<!-- Sizes -->
<div class="inp sm">…</div>
<div class="inp lg">…</div>

<!-- Variants -->
<div class="inp filled">…</div>          <!-- no border, base-100 bg -->
<div class="inp error">…</div>           <!-- red border -->
<div class="inp disabled">…</div>        <!-- 60% opacity, no events -->
```

## Textarea — `.ta`
```html
<label class="lbl">Notes</label>
<textarea class="ta" rows="3" placeholder="Add details…"></textarea>
<div class="hint err">This field is required</div>
```

## Select — `.sel`
Appearance-none with custom caret.
```html
<label class="lbl">Channel</label>
<div class="sel">
  <select>
    <option>LinkedIn</option>
    <option>Instagram</option>
  </select>
</div>
```

## Label & hint
```html
<label class="lbl">Label <span class="req">*</span></label>
<div class="hint">Neutral helper</div>
<div class="hint err">Error message</div>
```

## Switch — `.sw`
```html
<label class="sw">
  <input type="checkbox" checked/>
  <span class="track"></span>
  <span class="sw-text">
    <span class="label">Publish drafts automatically</span>
    <span class="desc">Queue goes out on schedule</span>
  </span>
</label>

<!-- Sizes: .sw.sm / .sw.lg -->
```

## Checkbox / Radio — `.cb` / `.rd`
```html
<label class="cb">
  <input type="checkbox" checked/>
  <span class="box"></span>
  <span class="cb-text">
    <span class="label">I agree</span>
    <span class="desc">To the terms of service</span>
  </span>
</label>

<label class="rd">
  <input type="radio" name="plan" checked/>
  <span class="box"></span>
  <span class="rd-text">
    <span class="label">Creator</span>
    <span class="desc">For solo operators</span>
  </span>
</label>

<!-- Error state: add .error class to root -->
```

Checked state: box fills with `--fg1` and renders a white checkmark. Radio: border collapses to a thick 5px ring.

## Slider — `.slider`
```html
<div class="slider-head">
  <label class="lbl" style="margin:0">Budget</label>
  <span class="slider-val">$1,240</span>
</div>
<input type="range" class="slider" min="0" max="100" value="40" style="--v: 40%"/>
```
The `--v` custom property drives the gradient fill on the track. Update in JS:
```js
el.style.setProperty('--v', val + '%');
```

## File upload — `.drop`
```html
<div class="drop" tabindex="0">
  <div class="up-ic"><svg …/></div>
  <div class="lbl-big">Drop files or click to upload</div>
  <div class="desc">PNG, JPG, MP4 — up to 50MB</div>
  <div class="accepts">.png .jpg .mp4</div>
</div>

<!-- Uploaded list -->
<div class="file-list">
  <div class="file-row">
    <svg class="succ" …/>
    <div class="info">
      <div class="name">hero-shot.png</div>
      <div class="size">2.4 MB</div>
    </div>
    <button class="btn ghost icon-only sm"><svg …/></button>
  </div>
</div>
```
Add `.dragging` class on dragenter for highlight.

## Form layout patterns

**Stacked (default):**
```html
<div style="display:flex; flex-direction:column; gap:20px;">
  <div>
    <label class="lbl">Name</label>
    <div class="inp"><input/></div>
  </div>
  <div>
    <label class="lbl">Email</label>
    <div class="inp"><input type="email"/></div>
  </div>
</div>
```

**2-column (on wide):**
```html
<div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px;">
  …
</div>
```

**Inline search bar (topbar):**
```html
<div class="inp" style="border-radius:999px; max-width:420px;">
  <svg …/><input placeholder="Search"/>
  <kbd style="font-family:var(--font-mono); font-size:10px; color:var(--fg3); padding:2px 6px; border:1px solid var(--border); border-radius:4px;">⌘K</kbd>
</div>
```
Pills are a Growth Tools signature for search.

## Do / Don't
✅ Always pair input with `.lbl` (even if visually hidden via `aria-label`)
✅ Use `.hint` for helpers and `.hint.err` for errors
✅ Put a leading icon in search inputs (magnifier)
✅ Use switch for binary settings, checkbox for multi-select, radio for mutually-exclusive

❌ Floating labels — the kit uses stacked labels
❌ Hard-coded heights — sizes come via `.sm`/`.lg` variant
❌ Native `<select>` unstyled; always wrap with `.sel`
