//go:build integration

package tests

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"

	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// GET /api/protected/platforms — list connections (DB read only, in scope).

func TestPlatformsAPI_ListConnections(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) string // returns token
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns empty list for fresh account",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got []store.PlatformConnection
				require.NoError(t, json.Unmarshal(body, &got))
				assert.NotNil(t, got)
			},
		},
		{
			name: "200 returns seeded platform connection",
			setup: func(t *testing.T) string {
				u := seedUserWithAccount(t, c.Store)
				seedPlatformConnection(t, c.Store, u.AccountID, "x")
				return u.Token
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got []store.PlatformConnection
				require.NoError(t, json.Unmarshal(body, &got))
				require.GreaterOrEqual(t, len(got), 1)
				assert.Equal(t, "x", got[0].Platform)
			},
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) string {
				return ""
			},
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token := tt.setup(t)
			resp, body := c.Request(t, http.MethodGet, "/api/protected/platforms", nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantBody != nil {
				tt.wantBody(t, body)
			}
		})
	}
}

// DELETE /api/protected/platforms/:id — in scope (pure DB soft-delete).

func TestPlatformsAPI_Disconnect(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name        string
		setup       func(t *testing.T) (token, connID string, accountID uuid.UUID)
		wantStatus  int
		afterAssert func(t *testing.T, accountID, connID uuid.UUID)
	}{
		{
			name: "200 soft-deletes the connection",
			setup: func(t *testing.T) (string, string, uuid.UUID) {
				u := seedUserWithAccount(t, c.Store)
				conn := seedPlatformConnection(t, c.Store, u.AccountID, "linkedin")
				return u.Token, conn.ID.String(), u.AccountID
			},
			wantStatus: http.StatusOK,
			afterAssert: func(t *testing.T, accountID, connID uuid.UUID) {
				_, err := c.Store.GetPlatformConnectionByID(context.Background(), accountID, connID)
				assert.ErrorIs(t, err, store.ErrNotFound, "connection should be soft-deleted")
			},
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string, uuid.UUID) {
				return "", uuid.New().String(), uuid.Nil
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "400 when connection id is not a uuid",
			setup: func(t *testing.T) (string, string, uuid.UUID) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, "not-a-uuid", u.AccountID
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 when connection does not exist",
			setup: func(t *testing.T) (string, string, uuid.UUID) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, uuid.New().String(), u.AccountID
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "404 when connection belongs to another account",
			setup: func(t *testing.T) (string, string, uuid.UUID) {
				me := seedUserWithAccount(t, c.Store)
				them := seedUserWithAccount(t, c.Store)
				theirConn := seedPlatformConnection(t, c.Store, them.AccountID, "x")
				return me.Token, theirConn.ID.String(), me.AccountID
			},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, connIDStr, accountID := tt.setup(t)
			resp, _ := c.Request(t, http.MethodDelete, "/api/protected/platforms/"+connIDStr, nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.afterAssert != nil && resp.StatusCode == http.StatusOK {
				connID, err := uuid.Parse(connIDStr)
				require.NoError(t, err)
				tt.afterAssert(t, accountID, connID)
			}
		})
	}
}

// The following platform endpoints are OUT OF SCOPE for integration tests
// because they call third-party OAuth providers or social platform APIs.
// They require Level 2 (handler/processor unit tests) with gomock:
//
//   POST /api/protected/platforms/oauth/init   — calls OAuth provider
//   POST /api/protected/platforms/bluesky      — calls Bluesky API
//   POST /api/protected/platforms/token        — calls platform API
//   GET  /api/platforms/oauth/callback/:platform — OAuth redirect flow
