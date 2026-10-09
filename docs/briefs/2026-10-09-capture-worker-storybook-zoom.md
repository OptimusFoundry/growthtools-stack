# Fix capture-worker's Storybook zoom under quiet

Date: 2026-10-09
Type: bugfix
Services: capture-worker, webapp (Storybook)

## Problem
`capture-worker/storybook.ts` `captureStory` zooms small components up to fill the capture frame. To do that it measures `#storybook-root > div` and applies `zoom` to that element's children. It assumes that div is the showcase decorator's canvas.

Since the quiet move, `.storybook/preview.ts` wraps every story in `AppRoot` (QuietRoot). So `#storybook-root > div` is now quiet's root wrapper, not the decorator. The measured "children" are the whole showcase (`div.showcase` with the content and the Watermark), not the story's content. The zoom is computed from the full-frame showcase (so ≤ 1) and never applies, and component captures come out small and unzoomed. CH-001 F19 kept the decorator DOM unchanged on purpose and left this out of scope.

## Scope
**In:**
- Make `captureStory` find the story content reliably. Preferred: give the showcase decorator's content wrapper a stable hook, such as a `data-capture="content"` attribute on a native div (quiet drops `data-*` on its own components), and select that in `storybook.ts` instead of `#storybook-root > div`. Zoom its children as today.
- Update `capture-worker/storybook.test.ts` for the new selector.

**Out:**
- The Watermark design.
- The capture frame size and the `computeZoom` maths.
- Other capture paths, such as the URL/feature captures in `capture-worker/kafka.ts`.
- `/test-login` (capture-worker's login primitive; unchanged).

## Constraints
- The decorator stays on quiet tokens. The Watermark stays a sibling of the content and must not be zoomed.
- The selector must not depend on quiet's internal DOM (QuietRoot's wrapper can change between quiet versions).
- capture-worker edits route to `node-service-code-editor`; the decorator edit routes to `frontend-code-editor`.

## Acceptance checks
- A small story (for example a single Button) captured through `runStorybookCapture` is zoomed (`zoom > 1` applied to the content children), and the Watermark is unscaled.
- A story already at frame size is not zoomed.
- `cd capture-worker && npm test` passes; webapp `npm run build-storybook` passes; the webapp gate (`quiet:check`, `build`, `lint`, `lint:scss`) passes.
