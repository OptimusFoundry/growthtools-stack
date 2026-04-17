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

// POST /api/protected/media — OUT OF SCOPE: calls S3 (FileStore.UploadFile).
// Coverage belongs in the media processor unit test with a mock FileStore.

func TestMediaAPI_ListMedia(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) string // returns token
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns media list (may be empty)",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got []store.Media
				require.NoError(t, json.Unmarshal(body, &got))
				assert.NotNil(t, got)
			},
		},
		{
			name: "200 returns seeded media",
			setup: func(t *testing.T) string {
				u := seedUserWithAccount(t, c.Store)
				seedMedia(t, c.Store, u.AccountID)
				return u.Token
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got []store.Media
				require.NoError(t, json.Unmarshal(body, &got))
				assert.GreaterOrEqual(t, len(got), 1)
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
			resp, body := c.Request(t, http.MethodGet, "/api/protected/media", nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantBody != nil {
				tt.wantBody(t, body)
			}
		})
	}
}

func TestMediaAPI_DeleteMedia(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	// Note: the processor calls S3 DeleteFile AFTER deleting the DB row.
	// If S3 fails the error is only logged and nil is returned.
	// We seed a fake media row with a non-existent S3 key — the DB delete
	// succeeds and the S3 call will fail silently, so we expect 200 OK.

	tests := []struct {
		name        string
		setup       func(t *testing.T) (token, mediaID string, accountID uuid.UUID)
		wantStatus  int
		afterAssert func(t *testing.T, accountID, mediaID uuid.UUID)
	}{
		{
			name: "200 soft-deletes the media record",
			setup: func(t *testing.T) (string, string, uuid.UUID) {
				u := seedUserWithAccount(t, c.Store)
				m := seedMedia(t, c.Store, u.AccountID)
				return u.Token, m.ID.String(), u.AccountID
			},
			wantStatus: http.StatusOK,
			afterAssert: func(t *testing.T, accountID, mediaID uuid.UUID) {
				_, err := c.Store.GetMediaByID(context.Background(), accountID, mediaID)
				assert.ErrorIs(t, err, store.ErrNotFound, "media record should be soft-deleted")
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
			name: "400 when media id is not a uuid",
			setup: func(t *testing.T) (string, string, uuid.UUID) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, "not-a-uuid", u.AccountID
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 when media does not exist",
			setup: func(t *testing.T) (string, string, uuid.UUID) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, uuid.New().String(), u.AccountID
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "404 when media belongs to another account",
			setup: func(t *testing.T) (string, string, uuid.UUID) {
				me := seedUserWithAccount(t, c.Store)
				them := seedUserWithAccount(t, c.Store)
				theirMedia := seedMedia(t, c.Store, them.AccountID)
				return me.Token, theirMedia.ID.String(), me.AccountID
			},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, mediaIDStr, accountID := tt.setup(t)
			resp, _ := c.Request(t, http.MethodDelete, "/api/protected/media/"+mediaIDStr, nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.afterAssert != nil && resp.StatusCode == http.StatusOK {
				mediaID, err := uuid.Parse(mediaIDStr)
				require.NoError(t, err)
				tt.afterAssert(t, accountID, mediaID)
			}
		})
	}
}

// GET /api/protected/media/:id/file — OUT OF SCOPE: calls S3 GetFile.
// GET /public/media/file/*key    — OUT OF SCOPE: calls S3 GetFileByKey.
// Both are covered at the processor unit-test level.
