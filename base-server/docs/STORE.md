# Store Layer Patterns

All store code lives in `base-server/internal/infra/store/`.

## Store Method Structure

```go
type Store struct {
    db     *sqlx.DB
    logger *observability.Logger
}

// Pointer receivers on ALL Store methods
func (s *Store) GetUserByID(ctx context.Context, id uuid.UUID) (User, error) {
    var user User
    err := s.db.GetContext(ctx, &user, sqlGetUserByID, id)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return User{}, ErrNotFound
        }
        return User{}, fmt.Errorf("failed to get user: %w", err)
    }
    return user, nil
}
```

## SQL Query Constants

Define all queries as package-level constants:

```go
const sqlGetUserByID = `
SELECT id, account_id, email, created_at, updated_at, deleted_at
FROM users
WHERE id = $1 AND deleted_at IS NULL
`
```

Rules:
- Never `SELECT *` — list columns explicitly
- Always include `deleted_at IS NULL` (soft deletes)
- Always include `account_id` in WHERE for multi-tenant isolation
- Use parameterized queries (`$1`, `$2`, etc.)

## List Operations — Nil Slice Gotcha

**CRITICAL:** List methods MUST use `make([]T, 0)`, never `var xs []T`.

`sqlx.SelectContext` only appends — it does not reinitialize the slice. A `var`-declared slice stays `nil` on zero rows. `nil` serializes to JSON as `null`, breaking any frontend code that iterates the result.

```go
// ❌ BAD — returns null on empty result
func (s *Store) ListPosts(ctx context.Context, accountID uuid.UUID) ([]Post, error) {
    var posts []Post
    if err := s.db.SelectContext(ctx, &posts, sqlListPosts, accountID); err != nil {
        return nil, fmt.Errorf("failed to list posts: %w", err)
    }
    return posts, nil
}

// ✅ GOOD — always returns []
func (s *Store) ListPosts(ctx context.Context, accountID uuid.UUID) ([]Post, error) {
    posts := make([]Post, 0)
    if err := s.db.SelectContext(ctx, &posts, sqlListPosts, accountID); err != nil {
        return nil, fmt.Errorf("failed to list posts: %w", err)
    }
    return posts, nil
}
```

The same rule applies to any slice built in a processor or handler before JSON serialization. Error paths may still `return nil, err` since the slice is not serialized.

## Delete Operations (Soft Delete)

Always soft-delete. Always check `RowsAffected` — return `ErrNotFound` if zero:

```go
const sqlDeletePost = `
UPDATE posts
SET deleted_at = CURRENT_TIMESTAMP
WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL
`

func (s *Store) DeletePost(ctx context.Context, accountID, id uuid.UUID) error {
    result, err := s.db.ExecContext(ctx, sqlDeletePost, id, accountID)
    if err != nil {
        return fmt.Errorf("failed to delete post: %w", err)
    }
    rowsAffected, err := result.RowsAffected()
    if err != nil {
        return fmt.Errorf("failed to get rows affected: %w", err)
    }
    if rowsAffected == 0 {
        return ErrNotFound
    }
    return nil
}
```

## Update Operations (RETURNING)

Use `RETURNING` to get the updated entity. `sql.ErrNoRows` means not found:

```go
const sqlUpdatePost = `
UPDATE posts
SET content = COALESCE($3, content), updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL
RETURNING id, account_id, content, created_at, updated_at, deleted_at
`

func (s *Store) UpdatePost(ctx context.Context, accountID, id uuid.UUID, content *string) (Post, error) {
    var result Post
    err := s.db.GetContext(ctx, &result, sqlUpdatePost, id, accountID, content)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return Post{}, ErrNotFound
        }
        return Post{}, fmt.Errorf("failed to update post: %w", err)
    }
    return result, nil
}
```

Use `COALESCE($n, column)` for optional update fields — only updates the column if the argument is non-nil.

**Exception:** Idempotent operations (e.g., counter increments, set additions) may skip the rows-affected check if they're safe to succeed on non-existent records.

## Model Definition

```go
type Post struct {
    ID        uuid.UUID  `db:"id"         json:"id"`
    AccountID uuid.UUID  `db:"account_id" json:"account_id"`
    Content   string     `db:"content"    json:"content"`
    CreatedAt time.Time  `db:"created_at" json:"created_at"`
    UpdatedAt time.Time  `db:"updated_at" json:"updated_at"`
    DeletedAt *time.Time `db:"deleted_at" json:"deleted_at,omitempty"`
}
```

## Migration Format

Flyway-compatible filenames: `V{version}__{description}.sql`

Example: `V0042__add_posts_table.sql`

Rules:
- Use `uuid-ossp` extension for UUIDs
- Every table gets `created_at`, `updated_at`, `deleted_at` columns
- UUID primary keys (`id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`)
