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

// seedMedia inserts a media record directly into the DB.
func seedMedia(t *testing.T, s *store.Store, accountID uuid.UUID) store.Media {
	t.Helper()
	id := uuid.New()
	media, err := s.CreateMedia(context.Background(), store.CreateMediaParams{
		AccountID:   accountID,
		Filename:    "test-" + id.String()[:8] + ".png",
		ContentType: "image/png",
		S3Key:       accountID.String() + "/" + id.String(),
		S3URL:       "https://s3.example.com/" + id.String(),
		SizeBytes:   1024,
		Source:      "upload",
	})
	require.NoError(t, err, "seedMedia")
	return media
}

func TestMediaAPI_ListMedia(t *testing.T) {
	t.Parallel()
	srv := setupTestServer(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) (token string, path string)
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns empty array when no media",
			setup: func(t *testing.T) (string, string) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), "/api/protected/media"
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var items []store.Media
				require.NoError(t, json.Unmarshal(body, &items))
				assert.Empty(t, items)
			},
		},
		{
			name: "200 returns media for account",
			setup: func(t *testing.T) (string, string) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				seedMedia(t, srv.Store, accountID)
				seedMedia(t, srv.Store, accountID)
				return newJWT(t, userID, accountID), "/api/protected/media"
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var items []store.Media
				require.NoError(t, json.Unmarshal(body, &items))
				assert.Len(t, items, 2)
			},
		},
		{
			name: "200 does not return other accounts media",
			setup: func(t *testing.T) (string, string) {
				myUserID, myAccountID := seedUserAndAccount(t, srv.Store)
				_, theirAccountID := seedUserAndAccount(t, srv.Store)
				seedMedia(t, srv.Store, theirAccountID)
				return newJWT(t, myUserID, myAccountID), "/api/protected/media"
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var items []store.Media
				require.NoError(t, json.Unmarshal(body, &items))
				assert.Empty(t, items)
			},
		},
		{
			name: "200 respects limit and offset",
			setup: func(t *testing.T) (string, string) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				for i := 0; i < 5; i++ {
					seedMedia(t, srv.Store, accountID)
				}
				return newJWT(t, userID, accountID), "/api/protected/media?limit=2&offset=0"
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var items []store.Media
				require.NoError(t, json.Unmarshal(body, &items))
				assert.Len(t, items, 2)
			},
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string) {
				return "", "/api/protected/media"
			},
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, path := tt.setup(t)
			resp, body := srv.Request(t, http.MethodGet, path, nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantBody != nil {
				tt.wantBody(t, body)
			}
		})
	}
}

func TestMediaAPI_DeleteMedia(t *testing.T) {
	t.Parallel()
	srv := setupTestServer(t)

	tests := []struct {
		name        string
		setup       func(t *testing.T) (token string, path string, mediaID uuid.UUID, accountID uuid.UUID)
		wantStatus  int
		afterAssert func(t *testing.T, mediaID, accountID uuid.UUID)
	}{
		{
			name: "200 soft-deletes media",
			setup: func(t *testing.T) (string, string, uuid.UUID, uuid.UUID) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				media := seedMedia(t, srv.Store, accountID)
				return newJWT(t, userID, accountID),
					"/api/protected/media/" + media.ID.String(),
					media.ID, accountID
			},
			wantStatus: http.StatusOK,
			afterAssert: func(t *testing.T, mediaID, accountID uuid.UUID) {
				_, err := srv.Store.GetMediaByID(context.Background(), accountID, mediaID)
				assert.ErrorIs(t, err, store.ErrNotFound, "media should be soft-deleted")
			},
		},
		{
			name: "400 when id is not a uuid",
			setup: func(t *testing.T) (string, string, uuid.UUID, uuid.UUID) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), "/api/protected/media/not-a-uuid", uuid.Nil, uuid.Nil
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string, uuid.UUID, uuid.UUID) {
				return "", "/api/protected/media/" + uuid.New().String(), uuid.Nil, uuid.Nil
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "404 when media does not exist",
			setup: func(t *testing.T) (string, string, uuid.UUID, uuid.UUID) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID),
					"/api/protected/media/" + uuid.New().String(),
					uuid.Nil, uuid.Nil
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "404 when media belongs to another account",
			setup: func(t *testing.T) (string, string, uuid.UUID, uuid.UUID) {
				myUserID, myAccountID := seedUserAndAccount(t, srv.Store)
				_, theirAccountID := seedUserAndAccount(t, srv.Store)
				theirMedia := seedMedia(t, srv.Store, theirAccountID)
				return newJWT(t, myUserID, myAccountID),
					"/api/protected/media/" + theirMedia.ID.String(),
					theirMedia.ID, theirAccountID
			},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, path, mediaID, accountID := tt.setup(t)
			resp, _ := srv.Request(t, http.MethodDelete, path, nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.afterAssert != nil && mediaID != uuid.Nil {
				tt.afterAssert(t, mediaID, accountID)
			}
		})
	}
}
