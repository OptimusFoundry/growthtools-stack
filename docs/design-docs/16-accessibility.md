# Accessibility & interaction

Accessibility is a design moat. Kits that ship with A11y baked in look more intentional — tighter focus states, thoughtful copy, predictable keyboard paths. Users notice the difference even if they don't know why.

Rules labeled `A-N.M`. Anti-patterns labeled `AAP-N`.

**Target baseline:** WCAG 2.1 AA for all product surfaces. AAA on any text ≤ 18px.

---

## A-1. Focus — the most-violated rule

**A-1.1 — Every interactive element shows focus.** `:focus-visible`, 2–3px ring, never removed. The kit's default:

```css
:focus-visible {
  outline: 2px solid var(--fg1);
  outline-offset: 2px;
  border-radius: inherit;
}
.btn:focus-visible,
.inp:focus-within {
  outline: none;
  box-shadow: 0 0 0 3px var(--focus-ring);
  border-color: var(--fg1);
}
```

**A-1.2 — Never `outline: none` without a replacement.** The single most common A11y regression. If you remove the default outline, replace it with a visible ring of equal or greater contrast.

**A-1.3 — Focus order follows visual order.** Tab moves left-to-right, top-to-bottom. Never uses `tabindex > 0` to reorder. If the DOM order is wrong, reorder the DOM, not the tab index.

**A-1.4 — Focus is trapped in modals and drawers.** Tab cycles within the modal. Escape closes it and returns focus to the trigger. Recipe:

```jsx
useEffect(() => {
  const el = modalRef.current;
  const focusables = el.querySelectorAll(focusableSelector);
  const first = focusables[0], last = focusables[focusables.length - 1];
  first?.focus();
  function onKey(e) {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
  }
  el.addEventListener('keydown', onKey);
  return () => el.removeEventListener('keydown', onKey);
}, []);
```

**A-1.5 — Focus ring color has ≥ 3:1 contrast against the adjacent bg.** `--focus-ring` (primary @ 40%) hits this on all surface tokens.

**A-1.6 — Focus persists after click on desktop.** `:focus-visible` (not `:focus`) keeps mouse-clicks from showing the ring, while keyboard navigation still shows it.

**A-1.7 — Never skip focus on "decorative" interactive elements.** If it clicks, it focuses.

---

## A-2. Hit targets

**A-2.1 — Minimum hit target: 44×44px on touch.** This is non-negotiable on mobile (S-11.3).

**A-2.2 — Icon-only buttons on touch are 44×44px min.** Use padding to reach the size — the visible icon can stay 14–18px.

```css
.btn.icon-only.sm {
  width: 32px; height: 32px;       /* visible size */
}
@media (pointer: coarse) {
  .btn.icon-only.sm {
    width: 44px; height: 44px;
  }
}
```

**A-2.3 — Adjacent hit targets have ≥ 8px gap** (measured center-to-center ≥ 52px). Prevents mis-taps.

**A-2.4 — Links in body text need ≥ 24px line-height** to give enough vertical hit area.

**A-2.5 — Desktop hit targets can be smaller (32×32 min)** but if the same component is used on mobile, size for mobile.

---

## A-3. Keyboard paths

Every interaction must have a keyboard equivalent. No mouse-only features.

**A-3.1 — Standard keybindings** (don't reinvent):

| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Move focus forward/back |
| `Enter` | Activate primary action (button, link, form submit) |
| `Space` | Toggle (checkbox, switch), activate button |
| `Escape` | Close modal, dismiss popover, cancel edit |
| `↑↓←→` | Move within a grouped control (radio, tabs, menu) |
| `Home` / `End` | Jump to start/end of a list |
| `/` | Focus search (if the page has one) |
| `⌘K` / `Ctrl+K` | Open command palette |

**A-3.2 — Buttons activate on `Enter` AND `Space`.** Native `<button>` handles this. If you use a `<div role="button">` (don't, but if), wire both.

**A-3.3 — Modal Escape closes.** Every modal. Including custom dialogs.

**A-3.4 — Form submit on Enter** in the last focused field. Never override — users expect this.

**A-3.5 — `⌘Enter` submits long-form inputs** (chat composer, post editor body). Pair with a hint in the footer: `⌘+Enter to send`.

**A-3.6 — Arrow keys move within a radio group or tab group.** Not Tab — Tab moves OUT of the group. This is ARIA pattern, not optional.

---

## A-4. Semantic HTML first

**A-4.1 — Use the right element.** Always. This is the cheapest A11y win.

| Need | Use | Not |
|---|---|---|
| Clickable thing that submits/nav | `<button>` or `<a>` | `<div onClick>` |
| Labeled input | `<label for="id">` + `<input id="id">` | `<span>` as label |
| Group of related fields | `<fieldset><legend>` | `<div><h4>` |
| Navigation | `<nav>` | `<div class="nav">` |
| Main content area | `<main>` | `<div class="content">` |
| Article / self-contained post | `<article>` | `<div class="post">` |
| Page section | `<section>` | `<div>` |

**A-4.2 — `<button>` for actions, `<a>` for navigation.** A button that "opens a page" is wrong — it's a link. A link that "saves the form" is wrong — it's a button.

**A-4.3 — Headings never skip levels.** `<h1>` → `<h2>` → `<h3>`. Never `<h1>` → `<h3>`. (C-5.5.)

**A-4.4 — Lists are `<ul>` / `<ol>` / `<dl>`,** not divs. Screen readers announce item count.

**A-4.5 — Tables are tables.** `<table><thead><tbody><th scope="col">`. For grid layouts that aren't tabular, use divs — don't abuse `<table>` for layout.

---

## A-5. ARIA — only when semantic HTML isn't enough

**The first rule of ARIA: don't use ARIA.** If you can use a native element, use it. ARIA is for cases where you can't.

**A-5.1 — Common valid uses:**

| Pattern | ARIA |
|---|---|
| Loading area | `aria-busy="true" aria-live="polite"` |
| Error message | `role="alert"` (assertive) |
| Toast | `role="status" aria-live="polite"` |
| Tabs | `role="tablist"` / `tab` / `tabpanel` + `aria-selected` |
| Disclosure / accordion | `aria-expanded` + `aria-controls` |
| Modal | `role="dialog" aria-modal="true" aria-labelledby` |
| Selected in a listbox | `aria-selected="true"` (not `.selected` class only) |
| Icon-only button | `aria-label="What it does"` |

**A-5.2 — Icon-only buttons always have `aria-label`:**

```jsx
<button className="btn ghost icon-only" aria-label="Delete post">
  <TrashIcon/>
</button>
```

No `aria-label` = no screen reader announcement = bug.

**A-5.3 — Decorative icons are hidden from AT:**

```jsx
<button className="btn primary">
  <SaveIcon aria-hidden="true"/> Save changes
</button>
```

The button's text says what it does; the icon is decoration.

**A-5.4 — Live regions for async updates:**

```jsx
<div aria-live="polite" aria-atomic="true">
  {message}
</div>
```

Use `polite` for most updates. `assertive` only for errors that need immediate attention.

**A-5.5 — Never use `aria-label` on static text** (it overrides the visible label inconsistently). Only on elements without visible labels.

---

## A-6. Color & contrast

**A-6.1 — Body text needs 4.5:1 contrast** against its bg. Large text (18px+) needs 3:1. The kit's `--fg2` on `--bg` hits 4.5:1 at 15px; `--fg3` hits 4.5:1 at 15px on white but only 3:1 on `--base-100` — don't use `--fg3` on tinted backgrounds for body.

**A-6.2 — Color is never the only signal.** Status isn't only color. Always pair:

```jsx
<span className="badge success">
  <span className="dot"/> Live        {/* dot + word, not dot alone */}
</span>
```

```jsx
<span className="sc-tr up">
  <ArrowUp/> 12.4%                    {/* arrow + sign, not color alone */}
</span>
```

**A-6.3 — Red/green pairings fail for 8% of men.** Use icons + words for success/error. Our `.sc-tr.up` uses an up arrow; `.down` uses a down arrow.

**A-6.4 — Focus rings hit 3:1 minimum against every adjacent color.** The default `--focus-ring` passes on all kit surfaces.

**A-6.5 — Disabled text is 3:1 minimum.** 0.5 opacity on `--fg2` passes on light bg. On dark themes, use a dedicated `--fg-disabled` token.

---

## A-7. Motion & animation

**A-7.1 — `prefers-reduced-motion` is respected always:**

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

This is in `colors_and_type.css`. Don't override it.

**A-7.2 — No animations longer than 5s** looping without an off switch. Skeletons loop until data; toasts auto-dismiss at 5s.

**A-7.3 — Nothing flashes > 3 times per second.** (WCAG seizure guideline.)

**A-7.4 — Auto-playing video is muted and pauses on tab blur.** Prefer user-triggered playback.

---

## A-8. Forms

**A-8.1 — Every input has a visible label.** `placeholder` is not a label. The `.lbl` class sits above the input.

**A-8.2 — Required fields show `*` inline** (`.req` class) and include `aria-required="true"` on the input.

```jsx
<label className="lbl">Email <span className="req">*</span></label>
<div className="inp">
  <input type="email" required aria-required="true"/>
</div>
```

**A-8.3 — Error messages link to the field:**

```jsx
<input aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined}/>
{error && <div id={`${id}-err`} className="hint err">{error}</div>}
```

**A-8.4 — Group related fields with `<fieldset><legend>`:**

```jsx
<fieldset>
  <legend className="ds-eyebrow">BILLING ADDRESS</legend>
  {/* fields */}
</fieldset>
```

(Screen readers announce the legend for every field inside.)

**A-8.5 — Auto-complete hints help everyone:**

```html
<input type="email" autoComplete="email"/>
<input type="tel"   autoComplete="tel"/>
<input type="text"  autoComplete="name"/>
<input type="password" autoComplete="new-password"/>
<input type="password" autoComplete="current-password"/>
```

**A-8.6 — Input modes on mobile:**

```html
<input inputMode="numeric"/>   <!-- digit keyboard -->
<input inputMode="email"/>
<input inputMode="decimal"/>
<input inputMode="search"/>
```

**A-8.7 — Form validation happens on blur + on submit,** not on every keystroke. Keystroke validation is stressful.

---

## A-9. Loading, async, and time

**A-9.1 — Async actions announce completion:**

```jsx
<div role="status" aria-live="polite">
  {saved && "Changes saved."}
</div>
```

**A-9.2 — Skeletons mark themselves busy:**

```jsx
<div aria-busy="true" aria-live="polite">
  <div className="sk-line"/>
</div>
```

**A-9.3 — Timed content has controls.** Auto-advancing carousels need pause. Session timeouts need extend.

**A-9.4 — No session timeout < 20 min without warning.**

---

## A-10. Content

**A-10.1 — Page has a meaningful `<title>`:** `"Posts — Growth Tools"`, not `"Growth Tools"`. The page-specific context comes first.

**A-10.2 — Landmark roles are unique:** one `<main>`, one `<nav>` per group, one `<header>` at page root. Multiple `<nav>`s are fine if each has `aria-label`:

```jsx
<nav aria-label="Primary">
<nav aria-label="Footer">
```

**A-10.3 — Skip link at top of page:**

```jsx
<a href="#main" className="skip-link">Skip to main content</a>
```

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px 16px;
  background: var(--fg1);
  color: var(--bg);
  z-index: 100;
}
.skip-link:focus { top: 0; }
```

**A-10.4 — Images have `alt`:**
- Informative image: describe the content (`alt="Chart: engagement up 12%"`)
- Decorative image: `alt=""` (empty — don't omit)
- Icon as decoration: `aria-hidden="true"` on the svg, text label nearby

**A-10.5 — Link text is meaningful.** "Click here" fails screen readers that pull all link text into a list. Use "View the Q2 roadmap" or similar.

---

## A-11. Tooltips & popovers

**A-11.1 — Tooltips follow the hover + focus rule:** appear on both hover AND focus, dismiss on pointer-leave + blur + Escape.

**A-11.2 — Tooltip content is also available another way.** A tooltip-only piece of info is inaccessible on touch (S-11.2). Pair with `aria-describedby` or redundant visible text.

**A-11.3 — Popovers are keyboard-navigable.** Arrow keys move within; Escape closes; Tab moves out.

---

## A-12. The accessibility audit

Before shipping any component:

- [ ] Every interactive element reaches via `Tab`
- [ ] Focus ring visible on every interactive element
- [ ] `Enter`/`Space` activate buttons; arrows navigate groups
- [ ] `Escape` closes modals, popovers, menus
- [ ] Modal traps focus and restores on close
- [ ] Icon-only buttons have `aria-label`
- [ ] Decorative icons have `aria-hidden="true"`
- [ ] All inputs have visible `<label>`
- [ ] Error messages link via `aria-describedby`
- [ ] No information conveyed by color alone
- [ ] Text contrast 4.5:1 body / 3:1 large
- [ ] Hit targets 44×44 on touch, 32×32 on desktop
- [ ] Page `<title>` specific to the route
- [ ] `prefers-reduced-motion` respected
- [ ] No tab-order reordering via `tabindex > 0`
- [ ] Loading states announce with `aria-busy` / `aria-live`
- [ ] No `outline: none` without a replacement ring

---

## A-13. Anti-patterns

- **AAP-1** `outline: none` with no replacement focus indicator.
- **AAP-2** `<div onClick>` where `<button>` belongs.
- **AAP-3** `placeholder` used as the only label.
- **AAP-4** Error state shown only by red border (no text, no icon).
- **AAP-5** Icon-only button without `aria-label`.
- **AAP-6** `aria-label` on a button that already has visible text (double-announced).
- **AAP-7** Tab order reordered via `tabindex="1..N"`.
- **AAP-8** Modal that doesn't close on Escape.
- **AAP-9** Modal that leaks focus to background content.
- **AAP-10** Tooltip as the only place a piece of info appears.
- **AAP-11** Color-only status (dot without word, red border without hint).
- **AAP-12** Auto-dismiss error toast (error needs acknowledgment).
- **AAP-13** `autoFocus` on a non-initial field (scrolls the page unexpectedly).
- **AAP-14** Disabled button explaining nothing about why.
- **AAP-15** Carousel with no pause, auto-advancing content.

---

## A-14. Tooling

Run these before PR:

- **axe DevTools** (browser extension) — quick scan
- **Lighthouse** A11y score ≥ 95
- **Keyboard only** — unplug your mouse and navigate the page end-to-end
- **Screen reader** — macOS VoiceOver (`Cmd+F5`), NVDA on Windows

No automated tool catches everything. The keyboard test is the highest-leverage manual check.
