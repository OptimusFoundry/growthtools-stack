package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// AdminUser is a lightweight user projection returned by admin search queries.
type AdminUser struct {
	ID        uuid.UUID `db:"id"`
	Email     string    `db:"email"`
	FirstName string    `db:"first_name"`
	LastName  string    `db:"last_name"`
	CreatedAt time.Time `db:"created_at"`
}

// AdminUserDetail extends AdminUser with the resolved account ID for impersonation.
type AdminUserDetail struct {
	AdminUser
	AccountID uuid.UUID `db:"account_id"`
}

const sqlSearchAdminUsers = `
SELECT
    u.id,
    COALESCE(ea.email, oa.email, '') AS email,
    u.first_name,
    u.last_name,
    u.created_at
FROM users u
LEFT JOIN user_auth ua ON ua.user_id = u.id
LEFT JOIN email_auth ea ON ea.auth_id = ua.id
LEFT JOIN oauth_auth oa ON oa.auth_id = ua.id
WHERE u.deleted_at IS NULL
  AND ($1 = '' OR LOWER(COALESCE(ea.email, oa.email, '')) LIKE LOWER($1 || '%'))
ORDER BY u.created_at DESC
LIMIT 25
`

// SearchAdminUsers returns up to 25 users whose email starts with query (case-insensitive).
// An empty query returns the 25 most recently created users.
func (s *Store) SearchAdminUsers(ctx context.Context, query string) ([]AdminUser, error) {
	users := make([]AdminUser, 0)
	err := s.db.SelectContext(ctx, &users, sqlSearchAdminUsers, query)
	if err != nil {
		return nil, fmt.Errorf("failed to search admin users: %w", err)
	}
	return users, nil
}

const sqlGetAdminUserByID = `
SELECT
    u.id,
    COALESCE(ea.email, oa.email, '') AS email,
    u.first_name,
    u.last_name,
    u.created_at
FROM users u
LEFT JOIN user_auth ua ON ua.user_id = u.id
LEFT JOIN email_auth ea ON ea.auth_id = ua.id
LEFT JOIN oauth_auth oa ON oa.auth_id = ua.id
WHERE u.id = $1
  AND u.deleted_at IS NULL
LIMIT 1
`

// GetAdminUserByID fetches a single non-deleted user by their UUID.
func (s *Store) GetAdminUserByID(ctx context.Context, userID uuid.UUID) (AdminUser, error) {
	var u AdminUser
	err := s.db.GetContext(ctx, &u, sqlGetAdminUserByID, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return AdminUser{}, ErrNotFound
		}
		return AdminUser{}, fmt.Errorf("failed to get user by id: %w", err)
	}
	return u, nil
}

const sqlGetAccountIDByOwnerUserID = `
SELECT id FROM accounts
WHERE owner_user_id = $1 AND deleted_at IS NULL
ORDER BY created_at ASC
LIMIT 1
`

const sqlGetAccountIDByTeamMemberUserID = `
SELECT account_id FROM team_members
WHERE user_id = $1
ORDER BY created_at ASC
LIMIT 1
`

// GetAccountIDForUser resolves the account that the given user belongs to,
// preferring owned accounts over team memberships.
func (s *Store) GetAccountIDForUser(ctx context.Context, userID uuid.UUID) (uuid.UUID, error) {
	var accountID uuid.UUID
	err := s.db.GetContext(ctx, &accountID, sqlGetAccountIDByOwnerUserID, userID)
	if err == nil {
		return accountID, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return uuid.UUID{}, fmt.Errorf("failed to get owned account: %w", err)
	}

	// Fall back to first team membership
	err = s.db.GetContext(ctx, &accountID, sqlGetAccountIDByTeamMemberUserID, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return uuid.UUID{}, ErrNotFound
		}
		return uuid.UUID{}, fmt.Errorf("failed to get team member account: %w", err)
	}
	return accountID, nil
}
