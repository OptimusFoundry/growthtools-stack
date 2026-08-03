# States & edge cases — what breaks your design in production

Every component ships with at least six states. Forgetting one is the most common production bug. This doc names each state, shows its markup, and states the rule.

Rules labeled `S-N.M`. Anti-patterns labeled `SAP-N`.

---

## S-1. The state inventory

Every interactive surface must handle these states explicitly:

1. **Default** — the resting state
2. **Hover** — pointer over it (desktop only)
3. **Focus** — keyboard-focused
4. **Active / pressed** — mid-click or mid-tap
5. **Disabled** — cannot be interacted with, explained why
6. **Loading** — async in-flight
7. **Empty** — no data to show
8. **Error** — something failed, recoverable
9. **Selected / active** — persistent "on" state (nav items, chips)
10. **Read-only** — data shown but not editable

If you find yourself asking "does this component need a loading state?" — the answer is yes. Build it.

---

## S-2. Loading states — the skeleton discipline

**S-2.1 — Skeletons match the shape of the real thing.** Not a generic spinner centered in a blank page. Not a full-screen overlay. The layout shouldn't move when data arrives.

**S-2.2 — Skeleton recipe:**

```jsx
<div className="sk" aria-busy="true" aria-live="polite">
  <div className="sk-line" style={{width: '40%', height: 12}}/>
  <div className="sk-line" style={{width: '72%', height: 28, marginTop: 12}}/>
  <div className="sk-line" style={{width: '62ch', height: 18, marginTop: 12}}/>
</div>
```

```css
.sk-line {
  background: linear-gradient(90deg,
    var(--base-100) 0%,
    var(--base-200) 50%,
    var(--base-100) 100%);
  background-size: 200% 100%;
  animation: sk-shimmer 1.4s ease-in-out infinite;
  border-radius: 4px;
}
@keyframes sk-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

**S-2.3 — Shimmer direction is always left-to-right.** Reversed shimmer reads as "undoing."

**S-2.4 — Skeletons don't show copy.** Never "Loading posts…" beside a skeleton. The skeleton IS the message.

**S-2.5 — Button loading state replaces the label with a spinner, same width:**

```jsx
<button className="btn primary" disabled={saving}>
  {saving
    ? <><Spinner size={14}/> Saving…</>
    : 'Save changes'}
</button>
```

The `"Saving…"` text is allowed in buttons — it's the exception because the label must stay the same width to avoid layout shift.

**S-2.6 — For operations > 2s, show progress.** `<progress>` element or a determinate bar. Indeterminate spinners beyond 2s feel broken.

**S-2.7 — Never show a loading state for operations < 300ms.** The flash is worse than the wait. Debounce or skip.

**S-2.8 — Full-page loading is a blank page with a skeleton dashboard.** Not a centered spinner. Not a splash screen. Users should see the page shape from frame 1.

### S-2.9 Skeleton gallery

**Stat grid skeleton:**
```jsx
<div className="stat-grid">
  {[0,1,2,3].map(i => (
    <div className="sc" key={i}>
      <div className="sk-line" style={{width: 80, height: 10}}/>
      <div className="sk-line" style={{width: 120, height: 48, marginTop: 16}}/>
      <div className="sk-line" style={{width: 100, height: 12, marginTop: 16}}/>
    </div>
  ))}
</div>
```

**List row skeleton (post-list):**
```jsx
{[...Array(4)].map((_, i) => (
  <div className="post-row" key={i}>
    <div className="sk-line" style={{width: 24, height: 12}}/>
    <div style={{flex: 1}}>
      <div className="sk-line" style={{width: '70%', height: 16}}/>
      <div className="sk-line" style={{width: '30%', height: 12, marginTop: 8}}/>
    </div>
    <div className="sk-line" style={{width: 40, height: 20, borderRadius: 4}}/>
  </div>
))}
```

---

## S-3. Empty states

Three flavors. Don't mix them up.

**S-3.1 — First-time empty** (user has never created anything): illustration-light, primary CTA, aspirational copy.

Use R-6.1.

**S-3.2 — Filtered empty** (user's filter returned 0): no illustration, ghost "Clear filters" action, factual copy.

Use R-6.2.

**S-3.3 — Permanently empty** (this section doesn't apply to you): short inline text in `--fg3`, no card, no CTA.

```jsx
<p style={{color: 'var(--fg3)', fontSize: 15}}>
  No billing history — your plan hasn't renewed yet.
</p>
```

**S-3.4 — Empty sections hold their space.** `min-height: 200px` minimum, more if the real content would be taller. The page geometry never shifts with data.

**S-3.5 — Empty copy is factual, never apologetic.** "No posts yet" — not "We couldn't find any posts, sorry!"

---

## S-4. Error states

**S-4.1 — Field-level errors** appear below the input in `.hint.err`:

```jsx
<div>
  <label className="lbl">Email</label>
  <div className={`inp ${error ? 'error' : ''}`}>
    <input/>
  </div>
  {error && <div className="hint err">{error}</div>}
</div>
```

- Error copy is specific: "Enter a valid email address" not "This field is invalid"
- Border goes `--error`, no shadow
- `aria-invalid="true"` on the `<input>`
- `aria-describedby` points at the hint's id

**S-4.2 — Form-level errors** (top of the form, before fields):

```jsx
<div className="alert error" role="alert">
  <AlertIcon/>
  <div>
    <strong>Couldn't save changes</strong>
    <div>3 fields below need attention.</div>
  </div>
</div>
```

**S-4.3 — Page-level errors** (the data request failed):

```jsx
<div className="card outlined" style={{padding: 48, textAlign: 'center'}}>
  <h3 className="ds-h3">Something went wrong</h3>
  <p style={{marginTop: 8, color: 'var(--fg3)'}}>
    We couldn't load your posts. The error has been reported.
  </p>
  <button className="btn secondary" style={{marginTop: 24}}>
    <Refresh/> Try again
  </button>
</div>
```

Same shape as an empty state — just different copy and a retry action.

**S-4.4 — Toast errors** (something backgrounded failed):

```jsx
<div className="toast error" role="status" aria-live="polite">
  <AlertIcon/>
  <span>Post didn't publish — check the queue.</span>
  <button className="btn ghost sm">Retry</button>
  <button className="icon-btn"><X/></button>
</div>
```

Toasts have retry built-in. Never an error toast without a next action.

**S-4.5 — Never stack error states.** A field error AND a form-level alert AND a toast for the same failure is noise. Pick the tightest scope that explains the error.

**S-4.6 — Errors describe what happened and what to do next.** Not stack traces. Not HTTP codes. Users don't care that it was a 504.

---

## S-5. Overflow — when content is too long

### S-5.1 Text overflow

**Single-line truncation:**
```jsx
<div style={{
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}}>
  {title}
</div>
```

Use for: table cells, list row titles where a chevron follows, avatar group labels.

**Multi-line clamp:**
```css
.clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

Use for: card body previews, post content previews. Always 2 or 3 lines — never 4+.

**S-5.2 — Page titles never truncate.** If the title is long, it wraps. Geist at 36–48px with `text-wrap: balance` handles long titles gracefully.

**S-5.3 — Card titles truncate at 2 lines max.** Beyond 2, the card has too much content.

**S-5.4 — Titles with truncation get a `title="{full string}"` attribute** so hover reveals the full content.

### S-5.5 Numeric overflow

Long numbers use thousands separators (`1,234,567`) or shorthand (`1.2M`, `48.3k`) based on context:

| Context | Format |
|---|---|
| Stat card value | shorthand (`24.1k`) |
| Table cell | full separator (`24,142`) |
| Inline body | full separator |
| Chart axis | shorthand |

`tnum` + `ss01` on (J-3.3) keeps all numerals same-width.

### S-5.6 List overflow

Lists longer than 10–20 items need:
- **Pagination** for libraries (20 per page, standard)
- **Infinite scroll** for feeds (chat, activity log)
- **Virtualization** for tables > 500 rows

Never a single scrolling container with 10,000 DOM nodes.

### S-5.7 Horizontal overflow

Tables that overflow horizontally scroll inside `.tbl-wrap`:

```jsx
<div className="tbl-wrap" style={{overflowX: 'auto'}}>
  <table className="tbl">…</table>
</div>
```

Never scroll the whole page horizontally (CAP-8).

---

## S-6. Long content (prose, user input)

**S-6.1 — Prose caps at 72ch** for pleasant reading. 62ch for subledes. 80ch is the absolute ceiling.

```css
.ds-prose { max-width: 72ch; }
```

**S-6.2 — User-generated content** (post bodies, comments) always uses `overflow-wrap: anywhere` so long URLs don't break layout.

```css
.user-content {
  overflow-wrap: anywhere;
  word-break: break-word;
}
```

**S-6.3 — Code blocks overflow horizontally, not vertically cramped:**

```jsx
<pre className="code-block">
  <code>{code}</code>
</pre>
```

```css
.code-block {
  overflow-x: auto;
  overflow-y: hidden;
  white-space: pre;
  font-family: var(--font-mono);
  padding: 16px 20px;
  background: var(--base-50);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
}
```

**S-6.4 — Expandable prose** ("Read more"):

```jsx
{expanded
  ? <p>{fullText}</p>
  : <>
      <p className="clamp-3">{fullText}</p>
      <button className="btn ghost sm">Read more</button>
    </>}
```

Never "Read more" on content under 200 chars.

---

## S-7. Zero / null / missing data

**S-7.1 — Missing field values render as em-dash `—`, not "N/A".**

```jsx
<td>{user.company || '—'}</td>
```

**S-7.2 — Zero is zero, not missing.** A stat of `0` renders as `0`, not `—`. The difference between "none" and "no data" matters.

**S-7.3 — Null images use the placeholder gradient** (R-8.1), not a broken-image icon.

**S-7.4 — Missing avatars fall back to initials,** never to a person silhouette icon.

**S-7.5 — Dates in the past that don't exist** (e.g. `published_at` on a draft) render as the status instead: "Draft" not "Never published."

---

## S-8. Disabled states

**S-8.1 — Disabled ≠ hidden.** A disabled button stays visible, explaining why it can't be clicked. Hidden features are invisible; disabled features are promises.

**S-8.2 — Disabled buttons get a tooltip:**

```jsx
<button className="btn primary" disabled title="Select at least one platform to publish">
  Publish
</button>
```

Or a helper hint below if tooltips are too hidden:

```jsx
<div>
  <button className="btn primary" disabled>Publish</button>
  <div className="hint" style={{marginTop: 8}}>
    Select at least one platform to publish.
  </div>
</div>
```

**S-8.3 — Disabled styling:** 0.5 opacity, `pointer-events: none`, `cursor: not-allowed` on a wrapper (not the disabled element — cursor doesn't show on pointer-events-none elements).

**S-8.4 — Never disable the primary CTA without explanation.** Always pair with a hint, tooltip, or inline message.

---

## S-9. Read-only states

**S-9.1 — Read-only inputs:** same shape as editable, `--base-50` bg, no focus ring.

```jsx
<div className="inp" style={{background: 'var(--base-50)'}}>
  <input readOnly value={email}/>
  <button className="btn ghost icon-only sm" aria-label="Copy"><Copy/></button>
</div>
```

Copy button always accompanies a read-only value — read-only content needs to be *useable*.

**S-9.2 — Read-only pages** (post preview, analytics view): no edit controls visible. Save real estate for the content. Put edit behind an explicit "Edit" button, not a hover reveal.

---

## S-10. Selected / active states

**S-10.1 — Selected rows:** 8% primary tint bg, left border in `--primary`, bold title.

```css
.tbl tr.selected {
  background: color-mix(in oklch, var(--primary) 8%, var(--bg-surface));
  box-shadow: inset 2px 0 0 var(--primary);
}
```

**S-10.2 — Active nav items:** bg bumps to `--bg-surface`, left border 2px `--primary`, font-weight 500.

**S-10.3 — Selected tags/chips:** inverts — `--fg1` bg, `--bg` fg. The invert is the signal.

**S-10.4 — Only one active/selected at a time in a radio-style group.** Multi-select is a different interaction (checkboxes, multi-select chips), visually distinct.

---

## S-11. Mobile-specific states

**S-11.1 — Hover doesn't exist on mobile.** Any hover-only info must have an alternative path (tap, long-press, explicit button).

**S-11.2 — Tooltips are tap-to-open on mobile**, close on tap-outside. Never hover-only tooltips for important info.

**S-11.3 — Hit targets ≥ 44×44px on touch.** See `16-accessibility.md` A-2.

**S-11.4 — Drawer nav replaces sidebar on mobile** (C-9.3). Tap-outside to dismiss.

**S-11.5 — Forms focus the input, opening the keyboard.** Scroll the focused field into view (not `scrollIntoView` — use `window.scrollTo` with the right offset).

---

## S-12. Persistence & state shape

**S-12.1 — Optimistic updates:** update the UI immediately, roll back on error with a toast.

```jsx
async function toggleLike() {
  setLiked(true);                    // optimistic
  try { await api.like(postId); }
  catch {
    setLiked(false);                 // rollback
    showToast('Couldn\'t save like. Retrying…');
  }
}
```

**S-12.2 — Form drafts auto-save every 2s during typing.** Show "saved · 12s ago" in the header (R-1.2 pattern).

**S-12.3 — Never show "unsaved changes" banners.** Auto-save instead. Banners are an interruption; the save is an implementation detail.

**S-12.4 — Navigation away from dirty state:** if for some reason auto-save isn't possible, use `beforeunload`, not a custom modal — the browser handles this best.

---

## S-13. Animation & transition of states

**S-13.1 — State transitions follow the motion budget** (J-9). 150ms for most state swaps.

**S-13.2 — Skeletons fade out (200ms) as real content fades in (200ms), overlapping.** Never abrupt cuts.

**S-13.3 — Error states appear instantly** (0ms). Errors shouldn't "animate in" — they're urgent.

**S-13.4 — Toasts slide in from the top-right (240ms, ease-out) and fade out when dismissed.** Don't queue more than 3; drop the oldest.

**S-13.5 — Layout shift is a bug.** Any state change that moves other content is wrong. Use `min-height`, `aspect-ratio`, or reserved space.

---

## S-14. States anti-patterns

- **SAP-1** A spinner that replaces the whole page (S-2.8).
- **SAP-2** "Loading…" as text next to a spinner (redundant).
- **SAP-3** Empty state with `display: none` so the page rearranges when data arrives (S-3.4).
- **SAP-4** Error message saying "Error: 504" with no user-facing explanation (S-4.6).
- **SAP-5** Disabled button with no tooltip or hint (S-8.4).
- **SAP-6** Truncated text without a `title` attribute for hover reveal (S-5.4).
- **SAP-7** Unsaved-changes banner (S-12.3) — the pattern is auto-save.
- **SAP-8** Three simultaneous feedbacks for one failure: field error + form alert + toast (S-4.5).
- **SAP-9** Hover-only tooltips on mobile (S-11.2).
- **SAP-10** A state transition that shifts unrelated content (S-13.5).
- **SAP-11** Skeleton with copy ("Loading your posts…") — the skeleton is the message (S-2.4).
- **SAP-12** Spinner shown for under 300ms (flash) or over 2s without progress (S-2.6, S-2.7).

---

## S-15. The states checklist

Before marking any component "done":

- [ ] Default rendered
- [ ] Hover visible (desktop)
- [ ] Focus ring visible and reaches via Tab
- [ ] Disabled handled with reason
- [ ] Loading state (skeleton, button spinner, or progress)
- [ ] Empty state (first-time + filtered if applicable)
- [ ] Error state (field, form, or page as appropriate)
- [ ] Read-only where applicable
- [ ] Selected / active state if it's selectable
- [ ] Overflow handled (truncation or wrap)
- [ ] Zero data shows `0`, missing shows `—`
- [ ] No layout shift between any of the above

If a row is unchecked, the component isn't done.
