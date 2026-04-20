package store

import (
	"context"
	"fmt"
	"os"
	"testing"

	"base-server/internal/infra/observability"

	"github.com/google/uuid"
)

// SetupTestStore creates a Store connected to the test PostgreSQL database.
// It uses environment variables with defaults matching docker-compose.services.yml.
func SetupTestStore(t *testing.T) *Store {
	t.Helper()

	host := envOrDefault("TEST_DB_HOST", "localhost")
	port := envOrDefault("TEST_DB_PORT", "5433")
	user := envOrDefault("TEST_DB_USER", "base_user")
	pass := envOrDefault("TEST_DB_PASS", "base_password")
	name := envOrDefault("TEST_DB_NAME", "base_db")

	connStr := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, pass, host, port, name)
	logger := observability.NewLogger()

	s, err := New(connStr, logger)
	if err != nil {
		t.Fatalf("failed to create test store: %v", err)
	}

	t.Cleanup(func() {
		s.db.Close()
	})

	return &s
}

// createTestAccount inserts a user and account into the database for use by tests
// that require an account_id foreign key. Returns the account ID.
func createTestAccount(t *testing.T, s *Store) uuid.UUID {
	t.Helper()

	ctx := context.Background()
	userID := uuid.New()

	// Insert a minimal user row
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO users (id, first_name, last_name, stripe_customer_id) VALUES ($1, $2, $3, $4)`,
		userID, "Test", "User", "")
	if err != nil {
		t.Fatalf("failed to create test user: %v", err)
	}

	account, err := s.CreateAccount(ctx, CreateAccountParams{
		Name:        fmt.Sprintf("test-account-%s", uuid.New().String()[:8]),
		Slug:        fmt.Sprintf("test-slug-%s", uuid.New().String()[:8]),
		OwnerUserID: userID,
		Plan:        AccountPlanFree,
	})
	if err != nil {
		t.Fatalf("failed to create test account: %v", err)
	}

	return account.ID
}

func envOrDefault(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

func strPtr(s string) *string {
	return &s
}

func intPtr(i int) *int {
	return &i
}
