# Settings Page — Spec-Variant Card Overhaul

**Date:** 2026-04-18
**Branch:** `feat/settings-spec-cards`
**Scope:** `webapp/src/features/account/components/AccountPage/` — Billing tab and Platforms tab only. Voice Profile tab untouched.

## Problem

The Settings page (`/account`) uses the legacy `Card variant="outlined"` + `CardBody` pattern with ad-hoc `Text as="h2"` headings stacked inside. It reads as a generic panel and no longer matches the editorial rhythm used elsewhere in the product.

A new `Card variant="spec"` landed in commit `3a50041f` with an editorial `CardHeader` API: serif `name` (supports `<em>` accent) on the left, uppercase mono `meta` caption on the right, divider, then body. This spec chrome is what the Settings cards should adopt.

## Goal

Swap every card on the Billing and Platforms tabs to `variant="spec"` with the editorial header pair. Business logic, hooks, modals, banners, routing, and tab chrome are unchanged.

## Out of Scope

- Voice Profile tab.
- Tab navigation, page title, routing.
- `NoSubscriptionState` plan-picker grid (not card-shaped).
- Any hook, API, store, or data-flow changes.
- `BlueskyModal` (Modal, not a Card).

## Card Mapping

### Billing tab (`BillingTab.tsx`)

| Card | `name` | `meta` | Notes |
|------|--------|--------|-------|
| `SubscriptionSummary` | `Current <em>Plan</em>` | `subscription.status.toUpperCase()` → `ACTIVE` / `CANCELED` / `PAST DUE` | Drop the inline `Badge` — status lives in `meta` now. |
| `BillingActionsCard` | `Billing & <em>Invoices</em>` | `ACCOUNT` | `QuickAction` rows keep their current layout. |

Move each card's primary action (`Change Plan` / secondary CTAs) into `CardFooter`. The footer's top border replaces the current Stack-gap spacing and sits flush with the body.

### Platforms tab (`PlatformConnectionsTab.tsx`)

| Card | `name` | `meta` | Notes |
|------|--------|--------|-------|
| `ConnectedCard` (per platform) | `PLATFORM_DISPLAY_NAMES[platform]` (single word, no em) | `connection.status.toUpperCase()` | Drop the body `Badge`. Keep the platform SVG icon + optional `displayName` subtitle at the top of the body. Meta grid (username, connected date, scopes) unchanged. |
| `AvailableCard` (per platform) | `PLATFORM_DISPLAY_NAMES[platform]` | `AVAILABLE` | Platform icon + description stay in body. |
| `GitHubConnectionSection` | `Git<em>Hub</em>` | `CONNECTED` when linked, `SOURCE` otherwise | Wrap its internals in one spec card. Existing logic and child components unchanged. |

`CardFooter` hosts the primary action per card:
- Connected: `Disconnect` (destructive, right-aligned).
- Available: `Connect` (secondary, right-aligned).
- GitHub: follow existing section's action set.

## Visual / Structural Rules

1. Use `<Card variant="spec">` + `<CardHeader name={…} meta={…} />` + `<CardBody>` + (when there's a primary action) `<CardFooter>`. No nested cards.
2. `name` accepts a ReactNode — render the em accent as real JSX (`<>Current <em>Plan</em></>`), not as markdown.
3. `meta` is always ALL CAPS at the call site; the SCSS already uppercases, but the value we pass should read correctly too.
4. Status values for `meta` come from the existing data model (`subscription.status`, `connection.status`). Uppercase via `.toUpperCase()`; if the backend already returns uppercase, no-op.
5. Delete the ad-hoc header SCSS (`connectedCardHeader`, `availableCard` flex row, `connectedCardFooter` spacing) that the spec chrome now owns. Keep the body-grid styles (`connectedCardMeta`, `metaItem`, `metaItemFullRow`, `scopeTags`).
6. Remove the standalone `Text as="h2" size="xl" weight="semibold">` section headings that duplicate card names (e.g., "Connected Platforms", "Add a Platform"). Section subtitle copy can stay as a small caption above the grid, or go — see decision below.

## Open Structural Decision (committed choice)

**Section subtitles:** "Manage your active platform connections" and "Connect more accounts to expand your reach" lose their `<h2>` partner when cards own their own chrome. Keep the subtitle as a small `Text size="sm" color="secondary">` intro above each grid — it orients the user without competing with the card names. No bold heading.

## Testing

- Manual: load `/account`, switch through Billing and Platforms tabs in both "subscribed" and "no subscription" states, with 0, 1, and 2+ connected platforms. Confirm spec header rhythm matches the kit catalog.
- Storybook: no new stories required — `Card.stories.tsx` already showcases `spec`.
- Build + lint: `npm run build` and `npm run lint && npm run lint:scss` must pass.

## Files Touched

- `webapp/src/features/account/components/AccountPage/BillingTab.tsx`
- `webapp/src/features/account/components/AccountPage/BillingTab.module.scss` (prune old card-chrome rules)
- `webapp/src/features/account/components/AccountPage/PlatformConnectionsTab.tsx`
- `webapp/src/features/account/components/AccountPage/PlatformConnectionsTab.module.scss` (prune old card-chrome rules)
- `webapp/src/features/account/components/AccountPage/GitHubConnectionSection.tsx` (wrap in spec card)

No backend, no migrations, no hook changes.
