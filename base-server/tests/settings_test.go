//go:build integration

package tests

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"

	"base-server/internal/infra/store"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSettingsAPI_GetVoiceProfile(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) string // returns token
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns existing voice profile",
			setup: func(t *testing.T) string {
				u := seedUserWithAccount(t, c.Store)
				seedVoiceProfile(t, c.Store, u.AccountID)
				return u.Token
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got store.VoiceProfile
				require.NoError(t, json.Unmarshal(body, &got))
				assert.Equal(t, "professional", got.Tone)
				assert.Equal(t, "formal", got.Style)
			},
		},
		{
			name: "404 when no voice profile exists for account",
			setup: func(t *testing.T) string {
				// Fresh account with no voice profile seeded.
				return seedUserWithAccount(t, c.Store).Token
			},
			wantStatus: http.StatusNotFound,
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
			resp, body := c.Request(t, http.MethodGet, "/api/protected/settings/voice", nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantBody != nil {
				tt.wantBody(t, body)
			}
		})
	}
}

func TestSettingsAPI_UpdateVoiceProfile(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name        string
		setup       func(t *testing.T) string
		body        any
		wantStatus  int
		afterAssert func(t *testing.T, body []byte, s *store.Store)
	}{
		{
			name: "200 creates voice profile when none exists",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body: map[string]any{
				"tone":  "casual",
				"style": "conversational",
			},
			wantStatus: http.StatusOK,
			afterAssert: func(t *testing.T, body []byte, s *store.Store) {
				var got store.VoiceProfile
				require.NoError(t, json.Unmarshal(body, &got))
				assert.Equal(t, "casual", got.Tone)
				assert.Equal(t, "conversational", got.Style)
				// Verify persisted in DB.
				dbProfile, err := s.GetVoiceProfileByAccount(context.Background(), got.AccountID)
				require.NoError(t, err)
				assert.Equal(t, "casual", dbProfile.Tone)
				// cleanup
				t.Cleanup(func() {
					_, _ = s.GetDB().ExecContext(context.Background(),
						`DELETE FROM voice_profiles WHERE account_id = $1`, got.AccountID)
				})
			},
		},
		{
			name: "200 updates existing voice profile",
			setup: func(t *testing.T) string {
				u := seedUserWithAccount(t, c.Store)
				seedVoiceProfile(t, c.Store, u.AccountID)
				return u.Token
			},
			body: map[string]any{
				"tone":  "witty",
				"style": "informal",
			},
			wantStatus: http.StatusOK,
			afterAssert: func(t *testing.T, body []byte, s *store.Store) {
				var got store.VoiceProfile
				require.NoError(t, json.Unmarshal(body, &got))
				assert.Equal(t, "witty", got.Tone)
				assert.Equal(t, "informal", got.Style)
			},
		},
		{
			name: "400 when tone is missing",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body: map[string]any{
				"style": "formal",
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when style is missing",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body: map[string]any{
				"tone": "professional",
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) string {
				return ""
			},
			body: map[string]any{
				"tone":  "professional",
				"style": "formal",
			},
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token := tt.setup(t)
			resp, body := c.Request(t, http.MethodPut, "/api/protected/settings/voice", tt.body, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.afterAssert != nil {
				tt.afterAssert(t, body, c.Store)
			}
		})
	}
}
