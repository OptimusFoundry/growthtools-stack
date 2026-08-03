# Implementation — how to wire the design without breaking it

The rules that keep the design system intact at scale. If the other docs answer "what to build," this one answers "how to build it so it doesn't rot."

Rules `I-N.M`. Anti-patterns `IAP-N`.

---

## I-1. CSS scoping

**I-1.1 — Every style belongs to one of three layers:**

| Layer | Files | Rule |
|---|---|---|
| Tokens | `colors_and_type.css` | CSS custom props only. No selectors outside `:root` / `[data-theme]`. |
| Kit | `kit.css`, `catalog.css` | Reusable classes (`.btn`, `.card`, `.inp`). Token references only, no literals. |
| Page | component-scoped | Layout glue only. Never invent new primitives. |

**I-1.2 — Page-level CSS uses CSS Modules or scoped styles.** Global classes never ship from a page file.

**I-1.3 — No `!important`.** Ever. If you need it, your specificity is wrong.

**I-1.4 — One literal color in the project: `transparent`.** Everything else references a token. `rgba(0,0,0,0.5)` → `oklch(0% 0 0 / 0.5)` or a token.

**I-1.5 — Pixel literals only for geometry < 4px.** Hairlines (1px), `translateY(-2px)`, etc. Spacing uses `var(--space-*)`.

---

## I-2. React patterns

**I-2.1 — Components are small and focused.** A single component is one concept, one file, ≤ 200 lines. If a component grows past that, split into sub-components in the same folder.

**I-2.2 — Props over CSS classes for variants:**

```jsx
// Good
<Button variant="primary" size="lg">Save</Button>

// Bad (leaks implementation)
<Button className="btn primary lg">Save</Button>
```

The Button component owns the class mapping.

**I-2.3 — Never pass `style` from parent to child.** Parents don't know the child's internals. Exceptions: `grid-column`, `grid-row` (layout slot assignment), custom property handoff (`--v`).

**I-2.4 — Controlled inputs for forms, uncontrolled for search.** Controlled = you own the state. Uncontrolled = the DOM owns it. Search inputs are stateless until submit.

**I-2.5 — Derive; don't duplicate.** If `isOpen` can be computed from URL params, don't also keep it in `useState`.

**I-2.6 — Server state in a data library** (React Query, SWR, Apollo). Never in `useState` + `useEffect`.

**I-2.7 — Keys on lists are stable IDs, never indices.** `key={i}` breaks animations and selection state.

---

## I-3. File organization

```
src/
  components/
    Button/
      Button.tsx
      Button.module.css
      index.ts
  features/
    posts/
      Posts.tsx
      PostCard.tsx
      usePosts.ts
  routes/
    posts.tsx
  proto-design-system/
    tokens/
    themes/
    components/
```

**I-3.1 — One component per folder, barrel-exported.** `import { Button } from 'components/Button'`.

**I-3.2 — Features own their data hooks.** `usePosts` lives with `Posts.tsx`, not in a global `hooks/` folder.

**I-3.3 — Routes are thin.** A route file configures the URL, reads params, renders a feature component. Business logic lives in features.

---

## I-4. Theming

**I-4.1 — Theme switches via `<html data-theme="…">`.** Never inline theme props. A user's theme choice is a root-level setting.

**I-4.2 — Components never hard-code theme-dependent values.** Always tokens. If a theme breaks your component, the component used a literal.

**I-4.3 — Test every component in ≥ 3 themes** (light, dark, brutal). Brutal surfaces radius/border bugs that light hides.

**I-4.4 — Custom themes extend `:root` via `[data-theme="x"]`:**

```css
[data-theme="midnight"] {
  --bg: oklch(14% 0.02 260deg);
  --fg1: oklch(95% 0.02 260deg);
  /* …only override what changes */
}
```

Don't re-declare every token; inherit.

---

## I-5. Icons

**I-5.1 — Lucide via `lucide-react`, tree-shaken:**

```jsx
import { Save, Trash2, ChevronDown } from 'lucide-react';
```

Never import the whole package. Tree-shaking is the feature.

**I-5.2 — Icon component wraps Lucide with house defaults:**

```jsx
export const Icon = ({ name, size = 16, ...rest }) => {
  const Lucide = icons[name];
  return <Lucide size={size} strokeWidth={1.8} {...rest}/>;
};
```

Keeps stroke-width consistent across the app.

**I-5.3 — Platform icons live in `utils/platformIcons.ts`.** Not in the kit. Platforms change; the kit shouldn't.

**I-5.4 — Never SVG-inline in JSX bodies.** The noise ruins readability. Extract to components.

---

## I-6. Fonts

**I-6.1 — `font-display: swap` on every @font-face.** Prevents invisible text during load.

**I-6.2 — Preload critical fonts:**

```html
<link rel="preload" href="/fonts/Geist-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/GeistMono-var.woff2" as="font" type="font/woff2" crossorigin>
```

Only preload fonts the first paint actually uses (Geist Sans is used for both display and body, so it's the priority; preload Geist Mono only if eyebrows render above the fold).

**I-6.3 — Variable font subsetting for weights we don't use:**

```css
@font-face {
  font-family: "Geist";
  src: url("/fonts/Geist-var.woff2") format("woff2-variations");
  font-weight: 400 700;           /* only the range we render */
}
```

**I-6.4 — Only load the weights the kit actually uses.** Geist has no variation axes beyond weight — there's no `opsz`/`SOFT`-style perf trap. Keep the subset to 400 (body), 600 (card/section titles), and 700 (display/hero) so the variable-font instance stays small.

---

## I-7. Images & media

**I-7.1 — Explicit width + height attrs:**

```jsx
<img src={src} width={640} height={360} alt={alt} loading="lazy"/>
```

Prevents layout shift; `aspect-ratio` is derived.

**I-7.2 — `loading="lazy"` on everything below the fold.** Above the fold: eager (the default).

**I-7.3 — Responsive images via `srcset`:**

```jsx
<img
  src="/img/hero-800.jpg"
  srcSet="/img/hero-400.jpg 400w, /img/hero-800.jpg 800w, /img/hero-1600.jpg 1600w"
  sizes="(max-width: 720px) 100vw, 800px"
  alt=""
/>
```

**I-7.4 — Modern formats with fallback:**

```jsx
<picture>
  <source srcSet="/img/hero.avif" type="image/avif"/>
  <source srcSet="/img/hero.webp" type="image/webp"/>
  <img src="/img/hero.jpg" alt=""/>
</picture>
```

**I-7.5 — User-uploaded media is resized server-side** to ≤ 1600px longest edge before delivery. Don't ship originals.

---

## I-8. Performance budgets

**I-8.1 — JS budget:** first-load JS ≤ 180 KB gzipped. Break it into route chunks.

**I-8.2 — CSS budget:** ≤ 60 KB gzipped total. The kit is ~30 KB; pages add ~20 KB.

**I-8.3 — Largest Contentful Paint < 2.5s** on 4G.

**I-8.4 — Cumulative Layout Shift < 0.1.** Reserve space for images (I-7.1), skeletons (S-2.2), and async content.

**I-8.5 — Lazy-load non-critical routes:**

```jsx
const Analytics = lazy(() => import('./routes/Analytics'));
```

**I-8.6 — Bundle the design system only once.** If two entry points import the kit, use a shared chunk.

---

## I-9. State management

**I-9.1 — Three categories of state:**

| Kind | Tool |
|---|---|
| URL state | router params / search params |
| Server state | React Query / SWR / Apollo |
| UI state | local `useState`; rarely, a context |

**I-9.2 — URL first.** Sort, filter, pagination, tab selection — all in the URL. Deep-linkable state is a UX feature.

**I-9.3 — No global UI state library** (Redux, MobX) unless you have a real reason. React Query + URL covers 95%.

**I-9.4 — Context is for rare cross-cutting concerns** (theme, user, toast dispatcher). Not for general state sharing.

---

## I-10. Testing

**I-10.1 — Unit tests for logic** (hooks, utility functions).

**I-10.2 — Component tests for visual states** (Storybook or equivalent). Every component lists its states (default, hover, focus, error, loading, empty) as separate stories.

**I-10.3 — Integration tests for critical paths** (sign-in, post creation, checkout). Playwright.

**I-10.4 — Visual regression** (Chromatic / Percy) on the design-system package. Any token change that would shift hundreds of components is caught upstream.

**I-10.5 — Accessibility tests via `@axe-core/playwright`** on every route.

**I-10.6 — Don't test implementation.** Test behavior. If refactoring internals breaks tests, the tests were wrong.

---

## I-11. Dark mode & themes — implementation notes

**I-11.1 — System preference by default:**

```js
const initial = localStorage.theme
  ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.dataset.theme = initial;
```

**I-11.2 — Prevent flash of wrong theme.** Set the theme in a blocking inline script in `<head>`, before React hydrates:

```html
<script>
(function () {
  const t = localStorage.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = t;
})();
</script>
```

**I-11.3 — Theme toggle updates `<html>` and `localStorage` atomically:**

```js
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  localStorage.theme = t;
}
```

---

## I-12. i18n

**I-12.1 — No hard-coded strings in components.** Every user-facing string goes through an i18n function:

```jsx
<h1 className="page-title">{t('posts.title')}</h1>
```

**I-12.3 — Numbers & dates use `Intl.*`:**

```js
new Intl.NumberFormat(locale, { notation: 'compact' }).format(24100);  // "24K"
new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-2, 'hour');  // "2 hours ago"
```

**I-12.4 — Right-to-left support via `dir="rtl"` on `<html>`.** CSS logical properties (`margin-inline-start`, `padding-block-end`) work automatically. Avoid `left`/`right`.

---

## I-13. Error boundaries

**I-13.1 — Every route has an error boundary.** When a component crashes, the shell stays; only the route content is replaced:

```jsx
<ErrorBoundary fallback={<RouteError/>}>
  <Outlet/>
</ErrorBoundary>
```

**I-13.2 — The fallback is the S-4.3 page-level error recipe.** Same shape, same copy style.

**I-13.3 — Log to error tracking (Sentry).** Don't just `console.error`.

**I-13.4 — Don't use error boundaries for expected errors** (404, unauthorized). Those are route-level redirects or specific empty states.

---

## I-14. API layer

**I-14.1 — All network calls go through one client.** Centralizes auth, error handling, logging.

**I-14.2 — Network errors become typed `ApiError`:** status, message, user-facing translation key. Components handle the type, not the raw fetch error.

**I-14.3 — Retries for idempotent operations only.** GET + PUT + DELETE can retry; POST cannot.

**I-14.4 — Mutations invalidate relevant queries,** not all queries. Over-invalidation causes waterfall refetches.

---

## I-15. Code hygiene

**I-15.1 — TypeScript strict mode on.** `strict: true`, `noUncheckedIndexedAccess: true`.

**I-15.2 — Prettier + ESLint + Stylelint** in CI. No warnings ship.

**I-15.3 — Dead code is deleted, not commented.** Git remembers.

**I-15.4 — Comments explain *why*, not *what*.** The code says what.

**I-15.5 — Commit messages describe the user-visible change:** "Posts page: auto-save draft every 2s" — not "updated PostEditor.tsx."

---

## I-16. Implementation anti-patterns

- **IAP-1** Hard-coded hex/rgb in component code (`#000`, `rgba(0,0,0,0.5)`). Tokens only (I-1.4).
- **IAP-2** `!important` to win specificity (I-1.3).
- **IAP-3** `<div>` with `onClick` and `role="button"` where a `<button>` would do (A-4.1, AAP-2).
- **IAP-4** Inline styles that vary by data (`style={{ color: dynamic }}`). Use class + CSS custom prop.
- **IAP-5** Theme-specific logic inside components (`if (theme === 'dark')`). Use tokens that already flip.
- **IAP-6** Copy-pasted component without extraction. If you've written it twice, extract.
- **IAP-7** `useEffect` for data fetching. Use React Query / SWR.
- **IAP-8** Global mutable state via module-scope variables.
- **IAP-9** Side-effects in render (`Math.random()`, `Date.now()` without memoization).
- **IAP-10** Imports of the entire icon library (`import * as icons from 'lucide-react'`) — kills tree-shaking.
- **IAP-11** Mixing CSS Modules with global class names in the same file.
- **IAP-12** Images without `width`/`height` — causes CLS.
- **IAP-13** `key={index}` on a dynamic list (I-2.7).
- **IAP-14** Storing UI state that belongs in the URL (filter, sort, page number) in local state.
- **IAP-15** Test-per-method instead of test-per-behavior (I-10.6).

---

## I-17. Implementation checklist

Before merging any design-system change:

- [ ] Tokens referenced, not literals (except < 4px geometry)
- [ ] No `!important`
- [ ] TypeScript strict; no `any` without comment
- [ ] Component exports from `index.ts`
- [ ] Story / example covers: default, hover, focus, disabled, loading, empty, error
- [ ] Works in light, dark, and brutal themes
- [ ] Keyboard-accessible (Tab + Enter + Escape)
- [ ] Focus ring visible
- [ ] A11y audit passes (A-12)
- [ ] No layout shift (CLS check)
- [ ] Bundle budget respected (I-8)
- [ ] No hard-coded strings (i18n pass)
- [ ] Error boundary where appropriate
