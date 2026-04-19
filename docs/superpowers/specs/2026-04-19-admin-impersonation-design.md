# Admin Impersonation — Design

**Status:** Approved (2026-04-19)
**Owner:** hello@shubhanshu.dev

## Goal

Let an admin temporarily act as another user from the webapp, to debug what they're seeing and reproduce bugs in their account. Single source of truth for "who is acting" remains the request context, so existing handlers/processors need no changes — only audit-relevant code paths need to know it's an impersonation.

## Non-Goals

- General-purpose RBAC. There's no "support agent" role, no per-permission grants. Admin = full debug access. Anyone else = 403 on `/api/admin/*`.
- Read-only / scoped impersonation. An impersonator has the same write power as the target (Q3 decision — anything else is too restrictive to reproduce real bugs).
- Persistent admin audit table. Structured logs are sufficient until we surface impersonation history in the UI.
- Nested impersonation. Admin → user A → user B is forbidden.
- A full admin console. This spec ships one page (`/admin`) with user search + impersonate. Future ops surfaces (billing inspection, account suspend, moderation) plug into the same `/api/admin/*` group additively.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **Admin set = `ADMIN_EMAILS` env var** (comma-separated) | No migration. No admin-management UI. Rotation via Terraform redeploy. Hard to escalate via SQL injection or compromised account. |
| 2 | **Two cookies**: existing `token` (admin JWT, 24h) + new `impersonate` cookie (signed, 1h) | Auto-expiry safety net. Clean revert (clearing the impersonate cookie snaps back to the admin session — no re-login). |
| 3 | **Full read+write access** while impersonating | Most bugs are write-path. Loud banner is the safety mechanism. |
| 4 | **Tiny `/admin` page now**, structured for additive growth later | Single page: search users, click "Login as." Backend uses `/api/admin/*` group with `HandleAdminMiddleware` — future admin endpoints add cleanly. |
| 5 | **Context fields are additive** (`is_impersonated`, `impersonated_by`) | `user_id` and `account_id` get the *target's* values when impersonating, so existing handlers work unchanged. New fields exist only when impersonation is active. |
| 6 | **Audit via structured logs**, not a new DB table | `event=admin_impersonation_start|stop` searchable in CloudWatch. Add a real table later if surfaced in UI. |
| 7 | **No feature flag** | Empty `ADMIN_EMAILS` = feature disabled. Allowlist *is* the gate. |

## Backend

### Config

New field on `authConfig`:

```go
type Config struct {
    // ...existing fields...
    AdminEmails []string `env:"ADMIN_EMAILS" envSeparator:","`
}
```

Helper next to the config:

```go
func (c *Config) IsAdminEmail(email string) bool { /* O(n) over small list */ }
```

Empty list → no admins → all `/api/admin/*` requests 403.

### Cookie format

`impersonate` cookie is a JWT signed with the same `JWTSecret` (HMAC-SHA256), TTL 1 hour, HttpOnly, Secure (in prod), SameSite=Lax. Claims:

```json
{
  "sub": "<target_user_id>",
  "account_id": "<target_account_id>",
  "admin_user_id": "<admin_user_id>",
  "iat": <unix>,
  "exp": <unix + 3600>
}
```

Reusing JWT format keeps signing/parsing code consistent with the existing `token` cookie.

### Middleware

Extend `HandleJWTMiddleware` (`base-server/internal/auth/handler/auth.go:104`):

1. Validate `token` cookie → resolve `real_user_id`, `real_account_id`, `real_user_email`.
2. If `impersonate` cookie present:
   - Validate signature + expiry. On failure: ignore cookie (do not 401 — admin is still logged in), continue at step 3 with `is_impersonated = false`.
   - Verify `IsAdminEmail(real_user_email)`. Defense in depth — env may have been rotated since the cookie was minted. On failure: ignore cookie + clear it via `Set-Cookie` with `Max-Age=0`.
   - Set context: `user_id = impersonate.sub`, `account_id = impersonate.account_id`, `is_impersonated = true`, `impersonated_by = real_user_id`.
3. Else: set `user_id = real_user_id`, `account_id = real_account_id`. Do NOT set `is_impersonated` or `impersonated_by`.

Context keys live alongside existing user_id/account_id keys; helper accessors `observability.IsImpersonated(ctx) bool` and `observability.ImpersonatedBy(ctx) (uuid.UUID, bool)` provide read access.

### New feature module: `internal/admin/`

Standard handler/processor structure. Routes mounted under a new protected admin group:

```go
adminGroup := protectedGroup.Group("/admin", a.adminHandler.HandleAdminMiddleware)
adminGroup.GET("/users", a.adminHandler.SearchUsers)
adminGroup.POST("/impersonate/:user_id", a.adminHandler.StartImpersonation)
adminGroup.DELETE("/impersonate", a.adminHandler.StopImpersonation)
```

#### `HandleAdminMiddleware`

- Reads `real_user_id` from context (set by JWT middleware as `impersonated_by` if impersonating, else `user_id`).
  - More precisely: if `is_impersonated`, use `impersonated_by`; else use `user_id`. The check is always against the *real* admin, never the impersonation target.
- Looks up user's email, calls `IsAdminEmail`. 403 if false.

#### `POST /api/admin/impersonate/:user_id`

- 409 if `is_impersonated` is already true (no nesting).
- Look up target user — 404 if not found or soft-deleted.
- Resolve target's `account_id`: prefer `accounts.owner_user_id = target.id`; fall back to first `team_members` row. 404 if neither.
- Mint impersonate JWT, set cookie.
- Log: `{event: "admin_impersonation_start", admin_user_id, target_user_id, target_account_id}`.
- Return 204.

#### `DELETE /api/admin/impersonate`

- Idempotent. Always returns 204.
- Clear cookie via `Set-Cookie: impersonate=; Max-Age=0`.
- Log: `{event: "admin_impersonation_stop", admin_user_id, target_user_id}` (target only if cookie was present).

#### `GET /api/admin/users?q=<email-prefix>`

- Returns `[{id, email, name, created_at}]`, capped at 25 results.
- `q` matches email prefix (case-insensitive). Empty `q` returns the 25 most recently created users.
- Excludes soft-deleted users.

### Modified endpoint: `GET /api/protected/user`

Existing `UserInfoResponse` gains two optional fields:

```go
type UserInfoResponse struct {
    // ...existing fields (always reflect the *effective* user)...
    IsImpersonated  bool                  `json:"is_impersonated,omitempty"`
    ImpersonatedBy  *ImpersonatorSummary  `json:"impersonated_by,omitempty"`
}

type ImpersonatorSummary struct {
    ID    uuid.UUID `json:"id"`
    Email string    `json:"email"`
    Name  string    `json:"name"`
}
```

Populated only when `is_impersonated == true`. Drives the frontend banner.

## Frontend

### Routes

- New route `webapp/src/routes/admin.tsx` → renders the admin page.
- Route guard: `beforeLoad` calls `GET /api/admin/users?q=`. If 403, redirect to `/`. Server is the gate; no client-side admin flag.
- Feature code: `webapp/src/features/admin/` (search component, user row, confirm dialog).

### Admin page (`/admin`)

- Heading: "Admin".
- Search input (debounced ~250ms) → calls `/api/admin/users?q=...`.
- Results: list of rows. Each row: email, name, created date, "Login as" button.
- Empty `q`: shows recent 25 users.

### Impersonation flow

1. Click "Login as jane@x.com" → confirm dialog: "You will act as this user. All actions will affect their account. Continue?"
2. POST `/api/admin/impersonate/:user_id`.
3. On success: full page reload (`window.location.assign('/')`). Easiest way to flush all in-memory user-scoped state including TanStack Query caches.
4. After reload, `/api/protected/user` returns the target's data with `is_impersonated: true`. Banner appears.

### Banner

`<ImpersonationBanner />` component, mounted in the main app shell above the top nav.

- Renders only when `auth.user.is_impersonated === true`.
- Loud: amber/red background, full width, sticky.
- Text: `⚠ Impersonating <Target Name> (<target email>) — actions affect their account.`
- Right side: "Stop impersonating" button.
- **Design system note:** This banner intentionally violates the editorial design system's restraint — it should look like a system warning, not a polished UI element. Use system warning tokens if they exist, otherwise hardcoded amber/red. This is the rare justified case to break the token rule; mark with a brief comment so future contributors don't "fix" it.

### Stop impersonating

- Banner button + a button on `/admin`.
- DELETE `/api/admin/impersonate` → full page reload.

### Out of scope (intentional)

- Recently-impersonated list, favorites, keyboard shortcuts.
- Client-side polling for cookie expiry. When the 1h cookie expires, the next request naturally reverts; the banner disappears on the next `/api/protected/user` refresh or page nav. Good enough.

## Testing

### Backend

**Unit (processor):**
- `IsAdminEmail` — match, no match, empty list, mixed case.
- Impersonation cookie minting + parsing — round trip, expired, tampered signature.
- No-nesting rule — refuses when `is_impersonated == true`.
- Target user lookup — soft-deleted returns 404, no account returns 404, owner vs team-member account resolution.

**Middleware:**
- No `impersonate` cookie → context has `is_impersonated == false`, no `impersonated_by`.
- Valid `impersonate` cookie + admin in allowlist → context has target's `user_id`/`account_id`, `is_impersonated == true`, `impersonated_by == admin_id`.
- Valid `impersonate` cookie + admin NOT in allowlist (rotated env) → cookie ignored + cleared.
- Expired `impersonate` cookie → ignored, admin session continues.
- Malformed `impersonate` cookie → ignored, admin session continues.

**Integration (real HTTP + DB):**
- Admin login → start impersonation → `/api/protected/user` returns target's data with `is_impersonated: true` → DELETE → returns admin's data with no impersonation fields.
- Non-admin POST `/api/admin/impersonate/:user_id` → 403.
- Admin tries to nest → 409.

### Frontend

**Playwright E2E** (with MSW for API):
- Admin lands on `/admin`, searches, sees results, clicks "Login as," confirms dialog, sees banner with target's name, clicks "Stop," banner disappears, search page reachable again.
- Non-admin visits `/admin` → redirected to `/`.

`/test-login` already lets E2E sign in as any seeded user, including an admin (one seeded user is added to `ADMIN_EMAILS` in the test env).

## Rollout

- No DB migration.
- Add `ADMIN_EMAILS` to `base-server/internal/infra/config/`, document in `.env.example`.
- Add your email to dev + prod tfvars (per project rule: secret rotation goes through Terraform, never `aws ssm put-parameter`).
- Single PR — backend + frontend together since the banner depends on the new `/api/protected/user` fields.
- No feature flag. Empty allowlist = feature disabled.

## Future

The `/api/admin/*` group + `HandleAdminMiddleware` are designed to grow. A future admin console (billing inspection, account suspend, moderation) adds endpoints under the same group and pages under `/admin/*`. No refactor needed — just additive surface area. If/when admin actions need a queryable history, replace structured-log audit with an `admin_audit_log` table.
