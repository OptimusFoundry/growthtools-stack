package processor

//go:generate go run go.uber.org/mock/mockgen@latest -source=admin.go -destination=mocks_test.go -package=processor

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// AdminStore defines the database operations required by AdminProcessor.
type AdminStore interface {
	SearchAdminUsers(ctx context.Context, query string) ([]store.AdminUser, error)
	GetAdminUserByID(ctx context.Context, userID uuid.UUID) (store.AdminUser, error)
	GetAccountIDForUser(ctx context.Context, userID uuid.UUID) (uuid.UUID, error)
	GetUserByExternalID(ctx context.Context, externalID uuid.UUID) (store.User, error)
}

var (
	ErrUserNotFound         = errors.New("user not found")
	ErrAccountNotFound      = errors.New("account not found for user")
	ErrAlreadyImpersonating = errors.New("cannot nest impersonation sessions")
	ErrInvalidCookie        = errors.New("invalid impersonation cookie")
	ErrCookieExpired        = errors.New("impersonation cookie expired")
)

// AdminConfig holds admin-specific configuration.
type AdminConfig struct {
	JWTSecret   string
	AdminEmails []string
}

// IsAdminEmail returns true when email (case-insensitive) is in the allowlist.
// An empty allowlist means the feature is disabled: always returns false.
func (c *AdminConfig) IsAdminEmail(email string) bool {
	lowerEmail := strings.ToLower(strings.TrimSpace(email))
	for _, e := range c.AdminEmails {
		if strings.ToLower(strings.TrimSpace(e)) == lowerEmail {
			return true
		}
	}
	return false
}

// ImpersonateClaims are the JWT claims stored in the impersonate cookie.
type ImpersonateClaims struct {
	// Sub holds the target user's UUID string.
	Sub         string `json:"sub"`
	AccountID   string `json:"account_id"`
	AdminUserID string `json:"admin_user_id"`

	ExpirationTime *jwt.NumericDate `json:"exp"`
	IssuedAt       *jwt.NumericDate `json:"iat"`
}

func (c *ImpersonateClaims) GetExpirationTime() (*jwt.NumericDate, error) {
	return c.ExpirationTime, nil
}

func (c *ImpersonateClaims) GetIssuedAt() (*jwt.NumericDate, error) {
	return c.IssuedAt, nil
}

func (c *ImpersonateClaims) GetNotBefore() (*jwt.NumericDate, error) {
	return nil, nil
}

func (c *ImpersonateClaims) GetIssuer() (string, error) {
	return "base-server", nil
}

func (c *ImpersonateClaims) GetSubject() (string, error) {
	return c.Sub, nil
}

func (c *ImpersonateClaims) GetAudience() (jwt.ClaimStrings, error) {
	return jwt.ClaimStrings{"base-server"}, nil
}

// AdminUser is the lightweight user shape returned by search results.
type AdminUser struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	CreatedAt time.Time `json:"created_at"`
}

// AdminProcessor implements all admin business logic.
type AdminProcessor struct {
	store  AdminStore
	cfg    AdminConfig
	logger *observability.Logger
}

// New constructs an AdminProcessor with the supplied dependencies.
func New(store AdminStore, cfg AdminConfig, logger *observability.Logger) AdminProcessor {
	return AdminProcessor{store: store, cfg: cfg, logger: logger}
}

// IsAdminEmail is exposed so the handler middleware can call it.
func (p *AdminProcessor) IsAdminEmail(email string) bool {
	return p.cfg.IsAdminEmail(email)
}

// SearchUsers returns up to 25 users whose email starts with query.
func (p *AdminProcessor) SearchUsers(ctx context.Context, query string) ([]AdminUser, error) {
	storeUsers, err := p.store.SearchAdminUsers(ctx, query)
	if err != nil {
		p.logger.Error(ctx, "failed to search admin users", err)
		return nil, fmt.Errorf("search failed: %w", err)
	}

	result := make([]AdminUser, 0, len(storeUsers))
	for _, u := range storeUsers {
		result = append(result, AdminUser{
			ID:        u.ID,
			Email:     u.Email,
			FirstName: u.FirstName,
			LastName:  u.LastName,
			CreatedAt: u.CreatedAt,
		})
	}
	return result, nil
}

// MintImpersonateCookie builds and signs the impersonate JWT.
// It resolves the target user and their account, validates no nesting,
// and returns the signed JWT string plus the resolved account ID.
func (p *AdminProcessor) MintImpersonateCookie(
	ctx context.Context,
	adminUserID uuid.UUID,
	targetUserID uuid.UUID,
	alreadyImpersonating bool,
) (string, uuid.UUID, error) {
	if alreadyImpersonating {
		return "", uuid.UUID{}, ErrAlreadyImpersonating
	}

	// Look up target user (errors if soft-deleted)
	targetUser, err := p.store.GetAdminUserByID(ctx, targetUserID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return "", uuid.UUID{}, ErrUserNotFound
		}
		p.logger.Error(ctx, "failed to get target user", err)
		return "", uuid.UUID{}, fmt.Errorf("failed to get target user: %w", err)
	}

	// Resolve target account
	accountID, err := p.store.GetAccountIDForUser(ctx, targetUser.ID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return "", uuid.UUID{}, ErrAccountNotFound
		}
		p.logger.Error(ctx, "failed to get account for target user", err)
		return "", uuid.UUID{}, fmt.Errorf("failed to resolve target account: %w", err)
	}

	// Mint JWT
	now := time.Now()
	claims := &ImpersonateClaims{
		Sub:         targetUser.ID.String(),
		AccountID:   accountID.String(),
		AdminUserID: adminUserID.String(),
		ExpirationTime: &jwt.NumericDate{
			Time: now.Add(time.Hour),
		},
		IssuedAt: &jwt.NumericDate{
			Time: now,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(p.cfg.JWTSecret))
	if err != nil {
		p.logger.Error(ctx, "failed to sign impersonate token", err)
		return "", uuid.UUID{}, fmt.Errorf("failed to sign impersonate token: %w", err)
	}

	return signed, accountID, nil
}

// ParseImpersonateCookie validates the impersonate cookie JWT and returns its claims.
// Returns ErrInvalidCookie for signature/parse failures and ErrCookieExpired for TTL.
func (p *AdminProcessor) ParseImpersonateCookie(tokenStr string) (*ImpersonateClaims, error) {
	var claims ImpersonateClaims
	t, err := jwt.ParseWithClaims(tokenStr, &claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(p.cfg.JWTSecret), nil
	})
	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrCookieExpired
		}
		return nil, ErrInvalidCookie
	}
	if !t.Valid {
		return nil, ErrInvalidCookie
	}
	return &claims, nil
}

// ParseImpersonateToken implements auth/handler.ImpersonationParser.
// Returns (targetUserID, targetAccountID, adminUserID, nil) on success.
func (p *AdminProcessor) ParseImpersonateToken(tokenStr string) (string, string, string, error) {
	claims, err := p.ParseImpersonateCookie(tokenStr)
	if err != nil {
		return "", "", "", err
	}
	return claims.Sub, claims.AccountID, claims.AdminUserID, nil
}

// GetUserEmailByID fetches a user's email by their external UUID, used by
// HandleAdminMiddleware to verify IsAdminEmail at request time.
func (p *AdminProcessor) GetUserEmailByID(ctx context.Context, userID uuid.UUID) (string, error) {
	u, err := p.store.GetAdminUserByID(ctx, userID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return "", ErrUserNotFound
		}
		return "", fmt.Errorf("failed to get user email: %w", err)
	}
	return u.Email, nil
}
