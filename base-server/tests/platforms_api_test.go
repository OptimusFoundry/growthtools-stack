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

func TestPlatformsAPI_ListConnections(t *testing.T) {
	t.Parallel()
	srv := setupTestServer(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) string // returns token
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns empty array when no connections",
			setup: func(t *testing.T) string {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID)
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var conns []store.PlatformConnection
				require.NoError(t, json.Unmarshal(body, &conns))
				assert.Empty(t, conns)
			},
		},
		{
			name: "200 returns connections for account",
			setup: func(t *testing.T) string {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				seedPlatformConnection(t, srv.Store, accountID, "x")
				seedPlatformConnection(t, srv.Store, accountID, "linkedin")
				return newJWT(t, userID, accountID)
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var conns []store.PlatformConnection
				require.NoError(t, json.Unmarshal(body, &conns))
				assert.Len(t, conns, 2)
			},
		},
		{
			name: "200 does not return other accounts connections",
			setup: func(t *testing.T) string {
				myUserID, myAccountID := seedUserAndAccount(t, srv.Store)
				_, theirAccountID := seedUserAndAccount(t, srv.Store)
				seedPlatformConnection(t, srv.Store, theirAccountID, "x")
				return newJWT(t, myUserID, myAccountID)
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var conns []store.PlatformConnection
				require.NoError(t, json.Unmarshal(body, &conns))
				assert.Empty(t, conns)
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
			resp, body := srv.Request(t, http.MethodGet, "/api/protected/platforms", nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantBody != nil {
				tt.wantBody(t, body)
			}
		})
	}
}

func TestPlatformsAPI_DisconnectPlatform(t *testing.T) {
	t.Parallel()
	srv := setupTestServer(t)

	tests := []struct {
		name        string
		setup       func(t *testing.T) (token string, path string, connID uuid.UUID, accountID uuid.UUID)
		wantStatus  int
		afterAssert func(t *testing.T, connID, accountID uuid.UUID)
	}{
		{
			name: "200 disconnects platform connection",
			setup: func(t *testing.T) (string, string, uuid.UUID, uuid.UUID) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				conn := seedPlatformConnection(t, srv.Store, accountID, "x")
				return newJWT(t, userID, accountID),
					"/api/protected/platforms/" + conn.ID.String(),
					conn.ID, accountID
			},
			wantStatus: http.StatusOK,
			afterAssert: func(t *testing.T, connID, accountID uuid.UUID) {
				// After disconnect the connection should no longer be retrievable
				_, err := srv.Store.GetPlatformConnectionByID(context.Background(), accountID, connID)
				assert.Error(t, err, "connection should be deleted/not found")
			},
		},
		{
			name: "400 when id is not a uuid",
			setup: func(t *testing.T) (string, string, uuid.UUID, uuid.UUID) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), "/api/protected/platforms/not-a-uuid", uuid.Nil, uuid.Nil
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string, uuid.UUID, uuid.UUID) {
				return "", "/api/protected/platforms/" + uuid.New().String(), uuid.Nil, uuid.Nil
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "404 when connection does not exist",
			setup: func(t *testing.T) (string, string, uuid.UUID, uuid.UUID) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID),
					"/api/protected/platforms/" + uuid.New().String(),
					uuid.Nil, uuid.Nil
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "404 when connection belongs to another account",
			setup: func(t *testing.T) (string, string, uuid.UUID, uuid.UUID) {
				myUserID, myAccountID := seedUserAndAccount(t, srv.Store)
				_, theirAccountID := seedUserAndAccount(t, srv.Store)
				theirConn := seedPlatformConnection(t, srv.Store, theirAccountID, "linkedin")
				return newJWT(t, myUserID, myAccountID),
					"/api/protected/platforms/" + theirConn.ID.String(),
					theirConn.ID, theirAccountID
			},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, path, connID, accountID := tt.setup(t)
			resp, _ := srv.Request(t, http.MethodDelete, path, nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.afterAssert != nil && connID != uuid.Nil {
				tt.afterAssert(t, connID, accountID)
			}
		})
	}
}
