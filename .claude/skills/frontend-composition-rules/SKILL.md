---
name: frontend-composition-rules
description: Use when building or reviewing React pages/features in webapp/ that involve CRUD lists, forms, resource detail views, or any UI with branching render states — catches duplicated page scaffolding, nested ternary rendering, hardcoded inline strings, per-page timeAgo/truncate copies, and ad-hoc delete-modal wiring that should be extracted into composition, custom hooks, and config-driven components.
---

# React Composition Patterns (webapp)

## Overview

The webapp has a clear layering convention: **route → page → feature(s) → components**. In practice, routes under `src/routes/` are doing too much: they re-implement the same CRUD-list scaffolding, duplicate helpers, hardcode copy inline, and render through 4-level-deep ternaries. This skill is the authoritative reference for refactoring those pages using composition, compound components, custom hooks (modern HOC replacement), and config-driven data — so that adding the *next* resource (media, drafts, campaigns) is ~40 lines of configuration, not 300 lines of copy-paste.

**Core principle:** A route file should declare *what the page is* (resource, filters, row renderer, copy). Any *how it renders* logic — loading/empty/list branching, delete confirmation flow, time formatting, status chips — lives in reusable primitives.

## When to Use

Apply this skill whenever you are:

- Adding a new list/detail/edit page under `src/routes/` or `src/features/`
- Reviewing a PR that touches CRUD UI
- Seeing any of these symptoms in a route file:
  - `>200 lines` of JSX in one component
  - Nested ternaries deeper than 2 levels (`loading ? ... : empty ? ... : filtered ? ... : list`)
  - `timeAgo` / `truncate` / `formatStatus` redefined inline (grep: 4 copies of `timeAgo` exist today)
  - Hardcoded strings like `"Couldn't delete post"`, `"Please try again."`, `"Are you sure..."` inline in JSX
  - `STATUS_CLASS` / `STATUS_LABELS` record maps redeclared per page
  - A `useState<string | null>(null)` used as "which row is the delete target" plus a `Dialog` block at the bottom
  - `useCallback` wrapping a handler that does `try { mutate(); notify success; refetch() } catch { notify error }` — this is a hook
  - `useBannerCenter` / `addBanner` calls — legacy Proto feedback; replace with `useNotify`
  - Index-of-string-key lookups with ternaries to compute counts (see `FILTER_KEYS.map(... f.id === "" ? all : f.id === "draft" ? ...)`)
- Writing a feature where two sibling routes share structure (posts + blog, drafts + scheduled, etc.)

Skip when: the page is genuinely one-of-a-kind (e.g. OAuth callback, billing checkout). Don't abstract for a sample of one.

## Diagnosis: What's Wrong Today

`src/routes/posts.tsx` (326 lines) and `src/routes/blog.tsx` (280 lines) are ~90% identical. Diff them and you see:

| Concern | Duplicated in both files |
|---|---|
| `timeAgo(iso)` helper | verbatim copy |
| `truncate(text, maxLen)` helper | verbatim copy |
| `STATUS_CLASS` / `STATUS_LABELS` maps | same shape, different enum |
| `FILTER_KEYS.map(...)` count-computation ternary | 4-level nested `?:` in both |
| Loading/empty/empty-filtered/list ternary | 4-branch ternary in both |
| `deleteTargetId` + `Dialog` + confirm handler | identical wiring, different resource noun |
| Toast success/error on delete | identical copy with s/post/blog post/ |
| `<Topbar actions={<Link><Button>+New</Button></Link>} />` | identical shape |
| Page hero `<header>` with eyebrow + title + sub | identical structure, different copy |
| `motion.div` list wrapper with same transition | identical |

Every time a new resource ships, this 280-line template gets copied again. That's how we accrete inconsistency: someone updates `blog.tsx`'s empty state and forgets `posts.tsx`.

## The Patterns

### 1. Extract cross-cutting helpers to `utils/`

Move `timeAgo`, `truncate`, and any `formatX` redefined in ≥2 files to `src/utils/format.ts`. No per-page copies.

### 2. Replace status maps with a single typed config co-located with the type

Today:
```ts
// posts.tsx
const STATUS_CLASS: Record<PostStatus, string> = { draft: "statusDraft", ... };
const STATUS_LABELS: Record<PostStatus, string> = { draft: "Draft", ... };
```

Instead, co-locate with the type in `src/types/post.ts`:
```ts
export const POST_STATUS_META: Record<PostStatus, { label: string; variant: BadgeProps["variant"] }> = {
  draft: { label: "Draft", variant: "default" },
  scheduled: { label: "Scheduled", variant: "secondary" },
  ...
};
```
quiet `Badge` variants: default, primary, secondary, outline, success, warning, error. Then consume with `<StatusBadge meta={POST_STATUS_META[post.status]} />`. The badge component owns the CSS-class mapping; the page owns nothing.

### 3. Compose a `<ResourceListPage>` via slots (composition, not config-explosion)

Composition in React = **accept children/elements as props**, not a mega-config. A page shell should look like:

```tsx
<ResourceListPage
  topbar={{ title: "Posts", createHref: "/posts/new", createLabel: "Create Post" }}
  hero={<PostsHero count={postCount} />}
  filters={<FilterTabs ... />}
  data={{ loading, items: posts, hasActiveFilter }}
  emptyState={<PostsEmptyState hasFilter={hasActiveFilter} onClear={...} />}
  renderItem={(post, i) => <PostRow post={post} index={i} onDelete={setDeleteTargetId} />}
/>
```

The shell owns: the flex scaffold, the `motion.div` animation, the loading skeleton, the "empty vs empty-filtered vs list" branching, the `<Stack>` rhythm. The route owns: *what* resource, *what* copy, *what* row looks like. This is composition because the route hands concrete elements (`<FilterTabs>`, `<PostRow>`) to the shell — the shell doesn't know about posts or blogs.

### 4. Replace nested ternaries with a declarative `<AsyncList>` primitive

Today's 4-branch ternary:
```tsx
{loading ? <Spinner/>
  : items.length === 0 && hasFilter ? <EmptyFiltered/>
  : items.length === 0 ? <Empty/>
  : <List/>}
```

Encapsulate it:
```tsx
<AsyncList
  loading={loading}
  loadingFallback={<Skeleton/>}
  items={items}
  empty={<EmptyState .../>}
  emptyFiltered={<EmptyState .../>}
  hasActiveFilter={hasFilter}
>
  {(item, i) => <Row ... />}
</AsyncList>
```

This is the **render-prop pattern**. The state-machine lives in `AsyncList`. No ternary soup in pages.

### 5. Custom hooks for "mutation + confirmation + toast + refetch" flows (modern HOC replacement)

Today every CRUD page has:
```tsx
const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
const { notify } = useNotify();
const handleDeleteConfirm = useCallback(async () => {
  if (!deleteTargetId) return;
  try { await deleteX(deleteTargetId); setDeleteTargetId(null);
        notify({ status: "success", title: "X deleted" }); refetch();
  } catch { notify({ status: "error", title: "Couldn't delete X", ... }); }
}, [...]);
// ...then a hand-wired Dialog at the bottom...
```

Extract to `useConfirmableDelete`:
```tsx
const deleteFlow = useConfirmableDelete({
  mutate: deletePost,
  onSuccess: refetch,
  copy: { successTitle: "Post deleted", errorTitle: "Couldn't delete post", errorBody: "Please try again." },
});
// deleteFlow = { target, request(item), cancel, confirm, isLoading, isOpen }
```

Page now renders `<ConfirmDeleteModal {...deleteFlow} />` — one line. The hook owns state, error handling, toasts. (This is the contemporary equivalent of a "withDeleteConfirmation" HOC — custom hooks are strictly better because they compose, type, and test cleanly.)

### 6. Compound components for cases where parts must share state

Used when child pieces must coordinate (e.g. Tabs + TabPanel, Accordion + AccordionItem). For our CRUD pages this mostly applies to forms — a `<ResourceForm>` that exposes `ResourceForm.Field`, `ResourceForm.Section`, `ResourceForm.Actions` sharing the underlying form state via context. Avoid prop-drilling `formState` through 4 layers.

### 7. Config-driven filter counts instead of ternary chains

Today:
```ts
count: f.id === "" ? postCount
     : f.id === "draft" ? draftCount
     : f.id === "scheduled" ? scheduledCount
     : f.id === "published" ? publishedCount : failedCount,
```

Instead, compute once:
```ts
const countsByStatus = useMemo(
  () => countBy(allPosts, p => p.status),
  [allPosts],
);
const filterItems = FILTER_KEYS.map(f => ({
  ...f,
  count: f.id === "" ? allPosts.length : (countsByStatus[f.id] ?? 0),
}));
```

One ternary, data-driven.

### 8. No hardcoded user-facing strings in route files

Every literal like `"Couldn't delete post"` or `"Are you sure you want to delete this post?"` should live in:
- A `copy.ts` next to the page/feature (short-term), or
- The reusable hook/component that owns the flow (`useConfirmableDelete({ copy: {...} })`)

This prepares for i18n later and — more importantly — stops copy from drifting between duplicated pages.

## Worked Example: `posts.tsx` Refactor

**Before** (excerpt — 326 lines total):
```tsx
function PostsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { posts: allPosts } = useGetPosts();
  const { posts, loading, refetch } = useGetPosts(filters);
  const { deletePost, loading: deleting } = useDeletePost();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const { notify } = useNotify();

  const handleDeleteConfirm = useCallback(async () => { /* 20 lines */ }, [...]);

  // 15 lines of count math + ternary filterItems

  return (
    <>
      <Topbar title="Posts" actions={<Button variant="primary" href="/posts/new" leftIcon={<AppIcon icon={Plus} />}>Create Post</Button>} />
      <Stack gap="lg" ...>
        <header>{/* hero */}</header>
        <FilterTabs .../>
        <div className={styles.content}>
          {loading ? <Spinner/>
            : posts.length === 0 && hasActiveFilter ? <EmptyState .../>
            : posts.length === 0 ? <EmptyState .../>
            : <motion.div>{posts.map((post, index) => { /* 60 lines of row */ })}</motion.div>}
        </div>
        <Dialog open={deleteTargetId !== null} .../* 25 lines */ />
      </Stack>
    </>
  );
}
```

**After** (target ≈ 80 lines):
```tsx
// src/routes/posts.tsx
function PostsPage() {
  const [statusFilter, setStatusFilter] = useState<PostStatus | "">("");
  const { posts: allPosts } = useGetPosts();
  const { posts, loading, refetch } = useGetPosts({ status: statusFilter || undefined });
  const deleteFlow = useConfirmableDelete({
    mutate: useDeletePost().deletePost,
    onSuccess: refetch,
    copy: POSTS_COPY.delete,
  });

  const filterItems = useFilterCounts(allPosts, POST_FILTERS, p => p.status);

  return (
    <ResourceListPage
      topbar={{ title: "Posts", createHref: "/posts/new", createLabel: "Create Post" }}
      hero={<PostsHero count={allPosts.length} />}
      filters={
        <FilterTabs value={statusFilter} onChange={setStatusFilter}
                    items={filterItems} aria-label="Filter posts by status" />
      }
      data={{ loading, items: posts, hasActiveFilter: statusFilter !== "" }}
      empty={<PostsEmptyState onClearFilter={() => setStatusFilter("")}
                              hasFilter={statusFilter !== ""} />}
      renderItem={(post, i) => <PostRow post={post} index={i} onDelete={deleteFlow.request} />}
      confirm={<ConfirmDeleteModal {...deleteFlow} />}
    />
  );
}
```

What moved where:
- `timeAgo`, `truncate` → `src/utils/format.ts`
- `POST_STATUS_META` → `src/types/post.ts`
- `useConfirmableDelete`, `useFilterCounts` → `src/hooks/`
- `ResourceListPage`, `AsyncList`, `ConfirmDeleteModal`, `StatusBadge` → `webapp/src/components/patterns/` (quiet owns primitives; a missing one is built here on quiet tokens and flagged for quiet)
- `PostRow`, `PostsHero`, `PostsEmptyState`, `POSTS_COPY` → `src/features/posts/components/`
- `blog.tsx` now consumes the exact same primitives with blog-specific slots → ~80 lines

New resource cost: write `FooRow`, `FooHero`, `FooEmptyState`, `FOO_COPY`, `FOO_STATUS_META`, and a 30-line route. Everything else is inherited.

## Decision Flow for Any New Page

```
1. Does a sibling route/feature already do something similar (CRUD list, detail+edit, resource form)?
   → Yes: find it in `webapp/src/components/patterns`.
          If it doesn't exist yet, extract one NOW from the sibling before copying.
   → No:  build inline, but write the route thinking "what would I factor if a second instance appeared?"

2. Am I about to write a ternary more than 2 levels deep to pick what to render?
   → Replace with an <AsyncList>-style primitive or early returns.

3. Am I about to write `const STATUS_* = { ... }` or a `timeAgo`/`truncate` helper?
   → Check utils/ and types/ first. Co-locate with type, not with page.

4. Am I wiring Dialog + try/catch + notify + refetch?
   → That's a hook. Extract useConfirmable<Verb> or useMutationWithFeedback.

5. Any user-facing string I'm typing inline?
   → If it might appear on ≥2 screens, pull to a copy constant.
```

## Red Flags (auto-block in review)

| Red flag | Fix |
|---|---|
| Route file > 200 lines | Extract row, hero, empty-state, delete-flow |
| 3+ level ternary in JSX | Use AsyncList / early returns / dedicated component |
| `function timeAgo` declared in a route | Import from `utils/format` |
| `STATUS_LABELS` / `STATUS_CLASS` maps in a route | Co-locate with type as `*_META` |
| `useState<string \| null>(null)` named `deleteTargetId` | Use `useConfirmableDelete` |
| `notify({ status: "success", ... })` + `notify({ status: "error", ... })` around a mutation | Use `useMutationWithFeedback` wrapper |
| Two route files with diff < 30% of lines | Extract shared shell before merging the second |
| Hardcoded string referring to resource noun (`"post"`, `"blog"`) inside a generic component | Pass via `copy` / `labels` prop |
| `FILTER_KEYS.map(f => f.id === "x" ? ... : f.id === "y" ? ...)` | `useFilterCounts` / `countBy` lookup |
| Props being drilled through 3+ component levels | Compound component + context, or lift state to page |

## Common Mistakes

- **Over-abstracting a sample of one.** Extract on the *second* instance, not the first. Wait for `blog.tsx` to exist before factoring `posts.tsx`.
- **Config-blob shells.** A `<ResourceListPage config={...}>` with 40 config keys is worse than duplication. Prefer slot/children props: the shell receives React elements, not primitive config for everything.
- **Extracting too aggressively into generic components.** `<ResourceListPage>` is useful; `<GenericThingWithStuff>` is not. Name by shape (list page, detail page, form page), not by abstraction.
- **Forgetting Playwright.** Every route change still needs a spec per `frontend-e2e-rules` skill — extracting to primitives does not exempt you.
- **Skipping design-token rules.** Extracted primitives still obey `frontend-design-rules` and `frontend-style-rules` — `--q-*` tokens only.

## Implementation Order When Refactoring an Existing Page

1. Land utility extractions first (`timeAgo`, `truncate`, `POST_STATUS_META`) with no behavior change — separate commit.
2. Introduce `useConfirmableDelete` hook with tests; migrate one page.
3. Introduce `AsyncList` primitive; migrate one page; verify Playwright still green.
4. Introduce `ResourceListPage` shell; migrate one page.
5. Migrate sibling page(s) to the same primitives. Delete the duplicated code.
6. Update `webapp/docs/PAGE-TEMPLATES.md` to point new pages at the shell.

Each step is independently mergeable and keeps Playwright green.

## Related Skills & Docs

- `frontend-e2e-rules` — every UI change still ships a spec
- `quiet-app` — the screen-layout procedure (read order, laying out a screen, finish checks)
- `webapp/docs/TEMPLATE-PATTERNS.md` — the template's page patterns (`AsyncList`, gating, `useNotify`)
- `webapp/docs/PATTERNS.md` — page rhythm (shell, heading, section, empty state)
- `webapp/docs/PAGE-TEMPLATES.md` — the templates this skill wants to *replace* with composable primitives
- `webapp/docs/COMPONENT-PATTERNS.md` — React 19 patterns (ref as prop, `<Context>` directly, `useActionState`)

## The Bottom Line

Routes declare *what*. Primitives own *how*. When you see a nested ternary, a duplicated helper, or a hardcoded string in a route file, that's a primitive trying to be born.
