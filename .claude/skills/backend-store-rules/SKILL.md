---
name: backend-store-rules
description: Use when writing, editing, testing, or reviewing store-layer code in base-server — any method on `*Store` under base-server/internal/infra/store/, any SQL query constant, or any Flyway migration. Covers the seven non-negotiable store rules — package-level `const` SQL with explicit column lists, soft delete plus tenant isolation in every query, `make([]T, 0)` for list results, RowsAffected checks on delete, RETURNING on update, pointer receivers with parameterized SQL, and migration naming/columns.
---

# Store Layer Rules (base-server)

Seven rules, one line each. Each carries a depth pointer — follow it when you need the worked
example, not before. The code lives in the doc; this file is the checklist.

- **S-1** SQL lives in package-level `const` strings; no `SELECT *` — list columns explicitly.
  → `base-server/docs/STORE.md#sql-query-constants`
- **S-2** Soft delete + tenant isolation — `deleted_at IS NULL` in every query; `account_id` in
  `WHERE`.
  → `base-server/docs/STORE.md#sql-query-constants`
- **S-3** Lists: `make([]T, 0)`, never `var xs []T` — a nil slice serializes as JSON `null`.
  → `base-server/docs/STORE.md#list-operations--nil-slice-gotcha`
- **S-4** Delete = soft delete (`SET deleted_at`); check `RowsAffected()`, `ErrNotFound` if 0.
  → `base-server/docs/STORE.md#delete-operations-soft-delete`
- **S-5** Update via `RETURNING`; `COALESCE($n, column)` for optional fields; `sql.ErrNoRows` →
  `ErrNotFound`.
  → `base-server/docs/STORE.md#update-operations-returning`
- **S-6** Pointer receivers on all Store methods; parameterized queries only (`$1`, `$2`, …).
  → `base-server/docs/STORE.md#store-method-structure`
- **S-7** Migrations: `V{version}__{description}.sql`; `uuid-ossp`; every table gets
  `id`/`account_id`/`created_at`/`updated_at`/`deleted_at`.
  → `base-server/docs/STORE.md#migration-format`

Cite the rule ID when you flag a violation — `S-2: missing account_id in WHERE` is reviewable;
"soft-delete issue" is not.
