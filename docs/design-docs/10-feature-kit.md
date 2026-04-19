# Feature Kit: Platform Posts, Tier Badges, AI Chat, Upgrade Prompts

These are Growth-Tools-specific components — not generic primitives. Use them when the page is about social posts, subscription tiers, AI features, or gated capabilities.

## Platform post card — `.pp-card`

A single social post preview — channel chip, author line, editorial body, meta stats.
```html
<div class="pp-card">
  <div class="pp-hd">
    <div class="pp-ch li">in</div>           <!-- channel chip -->
    <div>
      <div class="t">Amrita Hegde</div>
      <div class="s">LinkedIn · 2h ago</div>
    </div>
  </div>
  <div class="pp-body">
    The quiet truth of creator growth — you don't need more channels, you need a narrower point of view.
  </div>
  <div class="pp-meta">
    <span><span class="pp-stat-dot"></span> LIVE</span>
    <span>214 LIKES</span>
    <span>12 COMMENTS</span>
  </div>
</div>
```

### Channel chips — `.pp-ch`
Each is 32×32, rounded, brand-colored:

| Class    | Platform   | Color                                                    |
|----------|------------|----------------------------------------------------------|
| `.x`     | X (Twitter)| `#0f1419`                                                |
| `.ig`    | Instagram  | gradient 45° from `#f09433` → `#bc1888`                  |
| `.li`    | LinkedIn   | `#0a66c2`                                                |
| `.fb`    | Facebook   | `#1877f2`                                                |
| `.tk`    | TikTok     | black bg, cyan `#25F4EE` fg                              |
| `.yt`    | YouTube    | `#FF0033`                                                |
| `.th`    | Threads    | black                                                    |
| `.re`    | Reddit     | `#FF4500`                                                |

Fill the chip with a 1–2 char glyph in Fraunces 13px (`in`, `IG`, `X`, `f`, `TT`, `YT`, `@`, `r`). These brand colors are the **one** case where hex literals are OK — they're external brands.

### Status dots — `.pp-stat-dot`
Inline 6px colored circle for quick status indication in meta rows:
```html
<span class="pp-stat-dot"></span>            <!-- green (live) -->
<span class="pp-stat-dot schedule"></span>   <!-- amber -->
<span class="pp-stat-dot draft"></span>      <!-- gray -->
<span class="pp-stat-dot error"></span>      <!-- red -->
```

### Post body typography
`.pp-body` is Fraunces editorial — `opsz 40, SOFT 30, wght 400`, 14px, line-height 1.5. Feels like someone *wrote* it, not typed it.

## Tier badge — `.tier`

See also `04-buttons-badges.md`. Plan/tier label. Always uppercase mono pill.
```html
<span class="tier free">Free</span>
<span class="tier pro">Pro</span>
<span class="tier creator">Creator</span>
<span class="tier team">Team</span>
```

Composition patterns:
- Next to user name in sidebar footer
- On pricing cards (top-right corner)
- In feature rows of upgrade prompts
- Inline beside a locked feature title

## AI Chat — `.chat`

A compact AI conversation widget, embeddable in cards, sidepanels, or full-page.
```html
<div class="chat">
  <div class="chat-messages">
    <div class="msg ai">Hi! I can help you draft, schedule, or analyze posts. What are we working on?</div>
    <div class="msg user">Draft a LinkedIn post about our new pricing page.</div>
    <div class="msg ai">Here's a draft — 180 words, single hook, no hashtags…</div>
  </div>
  <form class="chat-inp">
    <input placeholder="Ask anything…"/>
    <button class="btn ink sm">Send</button>
  </form>
</div>
```
- Height: 320px by default — override with inline `style="height: 480px"` for larger surfaces
- Message max-width: 78%
- User messages: inverted ink; AI: filled `--base-100`
- Bottom-left/right radius collapsed to 4px on the pointing side (chat-bubble tail)

For a **full-page chat** (like `Chat.jsx`), the AI composer layout is covered in `11-page-composition.md`.

## Upgrade prompt — `.up-prompt`

Inverted-ink card used to nudge toward a paid plan.
```html
<div class="up-prompt">
  <div class="tier creator" style="position:absolute; top:20px; right:20px;">Creator</div>
  <div style="font-family:var(--font-display); font-variation-settings:'opsz' 144,'SOFT' 30,'wght' 500; font-size:32px; letter-spacing:-0.03em; line-height:1.05; margin-bottom:12px;">
    Unlock <em style="font-style:italic; font-variation-settings:'opsz' 144,'SOFT' 70,'wght' 400; color:var(--accent);">unlimited</em> AI drafts.
  </div>
  <p style="font-family:var(--font-serif); font-variation-settings:'opsz' 40,'SOFT' 30,'wght' 400; font-size:15px; line-height:1.5; opacity:0.85; margin:0 0 20px;">
    You've used 14 of 15 monthly drafts. Creator plans get 500 per month, plus voice matching.
  </p>
  <button class="btn accent lg">Upgrade to Creator</button>
</div>
```

**The recipe:**
- Dark ink background, near-white text
- One italic accent moment in the headline (use `--accent`)
- Serif body at 0.85 opacity
- `.btn.accent` CTA — amber on dark is the signature upgrade visual

## Gated feature row

For "this feature requires X plan" in settings or feature lists:
```html
<div class="card outlined" style="display:flex; align-items:center; gap:16px;">
  <div class="av rounded md" style="background:var(--base-100);">
    <svg …/>
  </div>
  <div style="flex:1;">
    <div style="font-weight:600; color:var(--fg1); display:flex; align-items:center; gap:8px;">
      Brand voice matching
      <span class="tier creator">Creator</span>
    </div>
    <div style="font-size:13px; color:var(--fg3);">Train the AI on your past 50 posts so drafts sound like you.</div>
  </div>
  <button class="btn secondary sm">Upgrade</button>
</div>
```

## Sign-in card

Sign-in surface (large 28px radius, shadow-xl):
```html
<div style="width:440px; background:var(--bg-surface); border-radius:28px; padding:40px; box-shadow:var(--shadow-xl);">
  <div class="brand-mark" style="margin-bottom:24px;">G</div>
  <h1 class="ds-h1" style="font-size:36px; margin-bottom:8px;">
    Welcome <em style="color:var(--accent); font-style:italic; font-variation-settings:'opsz' 144,'SOFT' 70,'wght' 400;">back.</em>
  </h1>
  <p class="ds-prose" style="font-size:15px; margin-bottom:28px;">Sign in to Growth Tools.</p>

  <div style="display:flex; flex-direction:column; gap:16px;">
    <div>
      <label class="lbl">Email</label>
      <div class="inp lg"><input type="email" placeholder="you@company.com"/></div>
    </div>
    <div>
      <label class="lbl">Password</label>
      <div class="inp lg"><input type="password"/></div>
    </div>
    <button class="btn primary lg" style="border-radius:999px;">Sign in</button>
  </div>
</div>
```

## Do / Don't
✅ Use the platform hex colors in `.pp-ch` — these are external brands
✅ Italic moment in upgrade prompts is almost mandatory
✅ `--accent` (amber) is the "upgrade/creator" color; don't use `--primary` there

❌ Rendering post body in sans — must be Fraunces editorial
❌ Emoji in `.pp-ch` (draw the glyph in 1–2 chars instead)
❌ Multiple upgrade prompts on one page
