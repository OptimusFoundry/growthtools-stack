# Rewrite the growth-tools product screens on quiet and remove Proto

Date: 2026-10-08
Type: migration
Services: webapp

## Problem
growth-tools is moving from Proto (`@optimusfoundry/proto-design-system#v1.1.0`) to quiet (`@optimusfoundry/quiet#v0.3.0`). The guide is the template's `docs/design-system-migration.md` §4 at tag `quiet-1` ([on GitHub](https://github.com/OptimusFoundry/saas-template/blob/quiet-1/docs/design-system-migration.md)); this is its §4.5 steps 3–6 and the growth-tools checklist in §4.6. The template's CH-001 (`docs/briefs/2026-10-08-quiet-template-rewrite.md` and its plan, at `quiet-1`) is the model.

Step 1 is done on branch `chore/quiet-rewrite`. The template's quiet foundation is copied in:
- the app root: quiet `ThemeProvider`, `AppRoot`/`QuietRoot`, `Toaster`, `style.css` + `fonts.css`, `migrateProtoTheme`;
- the shell: Layout, Topbar, Sidebar drawer, Username, error;
- shared code: gating, patterns, the billing and account shell, `RouterLink`, `useNotify`, `AppIcon`, `_breakpoints.scss`;
- the quiet harness.

Proto is still installed so the **95 product files** below keep building. They render through a transitional bridge (see Constraints), so the app today is half quiet and half Proto. This change finishes the move.

## Scope
**In:**
- **Theme: foundry / foundry-dark only.**
  - Decided 2026-10-08: no ported Proto themes, no `quiet-growthtools.scss`, and no theme picker. The Proto 34-theme `ThemeSwitcher` is already deleted, and the Layout sidebar toggle switches `foundry` ↔ `foundry-dark`.
  - No product screen may read or set a theme other than through quiet's `useTheme`.
- **Rewrite every product file on quiet.**
  - Use §4.1 (renames, compound → data props, prop renames, `onChange` value semantics, default-value traps) and §4.4 (tokens in `*.module.scss`).
  - Use the §4.2 codemods where they exist in the template at `quiet-1` (`webapp/scripts/codemods/`). Do one feature directory at a time.
  - Screens follow quiet's layout system (`node_modules/@optimusfoundry/quiet/docs/guidelines/layouts.md`, the `quiet-app` skill), not Proto's PageShell/Grid recipes.
  - The files (95), by directory:
    - `components/create-post` (21): `CreatePostWizard.module.scss`, `EditPostWizard.tsx`, `PlatformPostCard.module.scss`, `PlatformPreviewTabs.tsx`, `PostPublishStatus.tsx` + `.module.scss`, `PreviewStep.tsx`, `ThreadView.module.scss`, `WizardInner.tsx`, `compose/{CaptureMediaPicker.tsx + .module.scss, ComposeStep.tsx, MediaUploadSection.tsx, PlatformSelectionSection.tsx, PostConfigSection.tsx + .module.scss, YourMessageSection.tsx}`, `platform-cards/{BlueSky,Generic,Threads,X}PostCard.tsx`
    - `features/account` (13, all under `components/AccountPage/`): `AvailablePlatformCard.tsx`, `BlueskyConnectionModal.tsx`, `GitHubConnectionSection.tsx` + `.module.scss`, `GitHubRepoSelector.tsx`, `PlatformConnectionsTab.tsx` + `.module.scss`, `SitePublishTab.tsx` + `.module.scss`, `VoiceProfileTab.tsx` + `.module.scss`, `useGitHubConnectionFlow.ts`, `usePlatformConnectionFlow.ts`. The AccountPage shell and BillingTab are already on quiet.
    - `features/analytics` (9): `AnalyticsPage/component.tsx` + `.module.scss`, `LastSevenDaysSection/component.tsx` + `.module.scss`, `chart-theme.ts`, `{DateRangeTabs,EngagementTimelineChart,MetricSelector,TimeSeriesChart}/component.module.scss`
    - `features/posts` (7): `InlinePostAnalytics`, `PlatformPostAnalyticsCard` (+ scss), `PostsEmptyStates`, `PublishedPostPage`, `PublishedPostView` (+ scss)
    - `features/admin` (4): `AdminPage.tsx` + `.module.scss`, `UserRow.tsx` + `.module.scss`
    - `features/media` (2): `MediaCard`, `MediaEmpty`. `features/blog` (1): `BlogEmptyStates`
    - `components/blog` (6): `BlogEditor.tsx`, `BlogSitePublishStatus.tsx`, `BlogWizard.tsx`, and their three `.module.scss`
    - `components/github` (4): `ArtifactGrid.tsx`, `CaptureMetaCard.tsx`, `artifacts.module.scss`, `capture-meta.module.scss`
    - `components/showcase-post` (2): `CreateShowcasePostModal.tsx`, `useCreateShowcasePostFlow.ts`
    - `components/patterns/ResourceListPage` (2), `components/Layout/MobileActionBar` (2), `components/ImpersonationBanner/ImpersonationBanner.module.scss` (keep its deliberate warning palette, now on `--q-status-warning-*` / `--q-status-error-*`)
    - `hooks/useManagedMediaUpload.ts`
    - `components/authentication/login.module.scss`: orphaned (nothing imports it); delete it
    - routes (19): `index.tsx` (the dashboard) + `dashboard.module.scss` + `page.module.scss`, `posts.tsx` + scss, `blog.tsx` + scss, `media.tsx` + scss, `calendar.tsx` + scss, `github.tsx` + scss, `github_.$id.tsx` + `github-details.module.scss`, `signin.tsx` + `signin.scss`, `test-login.tsx` + scss. The other routes (`posts_.$id*`, `blog_.*`, `analytics`, `admin`, `account`) render the feature components above.
- **Gaps and product-local components** (§4.5 step 4, under `webapp/src/components/`, on `--q-*` tokens):
  - **FileUpload featured image.** Proto `1.1.0`'s featured-image FileUpload API (used by `BlogWizard`/`BlogEditor` `featuredImageId`, `ComposeStep`, `MediaUploadSection` and `useManagedMediaUpload`) is rebuilt product-locally on top of quiet's `FileUpload`.
    - quiet's `FileUpload` is uncontrolled (G14), `onFilesChange` → `onChange`, and its default is `multiple`, so set `multiple={false}` explicitly.
    - Keep the featured-image behaviour that `e2e/blog-featured-image.spec.ts` covers.
  - **Charts.** The analytics charts (`EngagementTimelineChart`, `TimeSeriesChart`, `Sparkline`, Recharts-based) are already product-local.
    - Re-token them, and `chart-theme.ts`'s `getComputedStyle` reads of `--color-*` / `--font-mono`, to `--q-*`.
    - First evaluate quiet's own `LineChart` / `BarChart` / `Sparkline` / `NarratedChart` (`dist/components/charts`). Where one covers a chart, use it and drop that Recharts component; if all are covered, drop `recharts` and its `vendor-charts` chunk.
    - Record what was kept and why.
  - **BannerCenter → `useNotify()`**: `usePlatformConnectionFlow`, `GitHubRepoSelector`, `PlatformConnectionsTab`, `useGitHubConnectionFlow`, `WizardInner` (including its `addBanner` parameter types), `useCreateShowcasePostFlow` and `BlogWizard`. Map `type` → `status` and drop `dismissible`; warning and error toasts persist by default.
  - **Alert → quiet `Alert` with status tokens** (G3): `BlogEditor`, `BlogSitePublishStatus`, `BlogWizard`, `CaptureMediaPicker`, `ComposeStep`, `EditPostWizard`, `WizardInner`, `SitePublishTab`, `VoiceProfileTab`, `PublishedPostPage`, `github_.$id`. Proto `Banner` (`type` → `status`) the same way.
- **Remove Proto** (§4.5 step 5), last, once the inventory greps to zero:
  - the `@optimusfoundry/proto-design-system` dependency;
  - the `@/proto-design-system` alias in `vite.config.ts` (alias and `optimizeDeps.exclude`), `tsconfig.json` and `.storybook/tsconfig.json`;
  - `BannerCenterProvider` in `contexts/providers.tsx`;
  - the transitional bridge `src/styles/{layers.css,proto-legacy.scss,_proto-theme-mapped.scss}` and their imports in `main.tsx` and `.storybook/preview.ts`;
  - `.storybook/showcaseDecorator`'s Proto `Watermark`: rebuild it product-locally if capture-worker still needs the watermark;
  - any leftover Proto CSS var.
  - Then re-add the template's Stylelint override (grid ban + Proto custom-property ban, `quiet-1` `webapp/.stylelintrc.json`), and drop the CH-001 "Proto (temporary)" notes from `CLAUDE.md`, `webapp/CLAUDE.md`, `.claude/agents/README.md`, the consistency-auditor and `webapp/docs/*`.
- **E2E** (the user runs Playwright):
  - Update locators that relied on Proto markup, using `e2e/helpers/toast.ts`. quiet toasts are `role="status"`, or `role="alert"` for errors, inside the "Notifications" region, with a "Dismiss notification" button.
  - Specs asserting BannerCenter banners (`role="alert"`, "Dismiss banner") from the screens moved to `useNotify`: `blog-site-publish`, `showcase-post`, `admin` (check that `ImpersonationBanner`'s own `role="alert"` still stays unique), `blog`, `posts`, `media`, `capture-media-picker`, `account`, `analytics`. `blog-delete.spec.ts` is already updated (useConfirmableDelete moved to `useNotify` in step 1).
  - Modal → quiet `Dialog` (`role="dialog"`, named by its title). Tabs and FilterTabs markup.
  - Add `e2e/shell.spec.ts` for growth-tools, modelled on the template's at `quiet-1`: the theme toggle, the `proto-theme` → `quiet-theme` migration, the sidebar and mobile drawer, and landmarks, with growth-tools' nav (Calendar, Posts, Media, Blog, Analytics, GitHub, Settings, Help).

**Out:**
- Backend, capture-worker and render code.
- quiet library changes: report gaps and don't patch quiet from here.
- Porting Proto themes. Restoring a theme picker.
- The harness: it was ported in step 1. Only remove the CH-001 temporary notes.

## Constraints
- **Use quiet v0.3.0's API exactly as shipped.** Read `node_modules/@optimusfoundry/quiet` (README, DESIGN.md, `docs/guidelines/`, `.d.ts`) and load the `quiet-app` skill before laying out a screen.
  - Most quiet props are typed `[key: string]: any`, so `tsc` will not catch a missed rename. Review every `onChange`, `isLoading`, `variant` and compound tree by hand.
- **Keep behaviour.** Every route keeps its data flow, API calls, SSE flows, routing, copy strings and accessible names, so the specs keep passing apart from markup-locator updates.
- **Keep the APIs shared with product code.** growth-tools' shared patterns keep their growth-tools APIs, already on quiet: `AsyncList` (`renderItem`/`listClassName`), `useConfirmableDelete` (`resource`/`confirmBody`/`mutating`/`getWarning` → flow) and `ConfirmDeleteModal({ flow })`. Also `Topbar` (now portals into the Layout slot) and `useNotify`.
- **Transitional bridge (delete with Proto).** Proto's tokens, themes and resets load inside `@layer proto-legacy`, which ranks below every `q.*` layer. `foundry` / `foundry-dark` are `@extend`ed onto Proto `paper` / `carbon`. An unlayered block restores the 19 Proto vars (`--space-*`, `--radius-*`, …) that quiet re-aliases to its own scale under `[data-quiet]`.
  - A migrated file must not depend on any of this. Use only `--q-*` tokens and quiet components.
- **House rules apply:** no barrels, no `any`, tokens only, minimal comments, SCSS modules, `frontend-composition-rules`, and unique accessible names.

## Acceptance checks
- [ ] `grep -rE '@/proto-design-system|@optimusfoundry/proto-design-system' webapp/` and a Proto CSS-var grep (`var(--(color|space|font|line-height|letter-spacing|radius|shadow|duration|ease|z|max-width|page)-`) over `webapp/src` both return nothing. `package.json` has no Proto dependency, and the bridge files are gone.
- [ ] `cd webapp && npm install && npm run build && npm run lint && npm run lint:scss` pass, as do `npx biome check --vcs-enabled=false src e2e .storybook` and `npm run build-storybook`.
- [ ] Every route renders on quiet in `foundry` and `foundry-dark`, and the sidebar toggle switches them. Links route without a full page load, and the mobile drawer works below 720px.
- [ ] All toasts come from `useNotify()`. No `BannerCenter`, Proto `Alert`/`Banner`, or `ThemeSwitcher` remains.
- [ ] The featured-image upload works on the product-local component built on quiet `FileUpload`.
- [ ] The analytics charts use quiet chart components or `--q-*` tokens only, and the decision for each chart is recorded.
- [ ] E2E specs are updated for the changed markup, `e2e/shell.spec.ts` exists, and the user runs Playwright and it passes.
- [ ] `npx quiet-audit <url> --width 1280,390 --theme foundry,foundry-dark` is run against the dev server for every route (`/`, `/calendar`, `/posts`, `/posts/new`, `/posts/$id`, `/posts/$id/analytics`, `/media`, `/blog`, `/blog/new`, `/blog/$id`, `/analytics`, `/github`, `/github/$id`, `/admin`, `/account` with each tab, `/billing`, `/billing/plans`, `/billing/pay`, `/billing/payment_attempt`, `/signin`, `/oauth/signedin`, `/test-login`), and its findings are fixed before merge.
- [ ] Someone reviews each screen in light and dark.
