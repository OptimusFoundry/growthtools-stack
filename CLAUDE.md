# Growth Tools — Monorepo

AI-powered social media management platform.

## Repository Structure

```
growth-tools/
├── base-server/    # Go backend (API, auth, billing, store)
├── webapp/         # React frontend (Vite, TanStack Router, Proto Design System)
├── docs/           # Product docs (PRD, tracker, platform API specs)
└── .claude/        # Agent configs and settings for both codebases
```

## Codebase-Specific Docs

- **Go backend conventions:** [base-server/CLAUDE.md](base-server/CLAUDE.md)
- **React frontend conventions:** [webapp/CLAUDE.md](webapp/CLAUDE.md)
- **Design system & component patterns:** [webapp/docs/DESIGN-GUIDELINES.md](webapp/docs/DESIGN-GUIDELINES.md)
- **Commit message convention:** [COMMITS.md](COMMITS.md) — Conventional Commits, enforced by the `.githooks/commit-msg` hook. Run `./.githooks/install.sh` once per clone to activate.

## Quick Reference

### Backend (`base-server/`)

- **Language:** Go with Gin, sqlx, PostgreSQL
- **Architecture:** Handler → Processor → Store (three-layer DI)
- **Auth:** JWT + Google OAuth, cookie-based sessions
- **Billing:** Stripe (products, subscriptions, checkout, webhooks)
- **Error handling:** Two-tier — processors log details, handlers map to `apierrors` responses
- **Build:** `cd base-server && go build ./...`
- **Test:** `cd base-server && go test ./...`

### Frontend (`webapp/`)

- **Stack:** React 19, Vite 7, TypeScript 5.9 (strict), TanStack Router
- **Design System:** 50+ components in `webapp/src/proto-design-system/`
- **Styling:** SCSS Modules with design tokens (never hardcode values)
- **Linting:** Biome (code) + Stylelint (SCSS)
- **Build:** `cd webapp && npm run build`
- **Lint:** `cd webapp && npm run lint && npm run lint:scss`

### Key Conventions

- **Frontend:** Use existing design system components, design tokens, SCSS modules, no barrel exports, no `any`, no inline styles
- **Backend:** Use `apierrors` for all HTTP errors, context propagation everywhere, soft deletes with `deleted_at`, UUID primary keys, parameterized SQL
- **Both:** Constructor-based DI, structured logging, no secrets in code
