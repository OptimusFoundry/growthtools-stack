//go:build integration

package tests

import (
	"encoding/json"
	"net/http"
	"testing"

	"base-server/internal/infra/store"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSettingsAPI_GetVoiceProfile(t *testing.T) {
	t.Parallel()
	srv := setupTestServer(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) string // returns token
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns existing voice profile",
			setup: func(t *testing.T) string {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				seedVoiceProfile(t, srv.Store, accountID)
				return newJWT(t, userID, accountID)
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got store.VoiceProfile
				require.NoError(t, json.Unmarshal(body, &got))
				assert.Equal(t, "professional", got.Tone)
				assert.Equal(t, "concise", got.Style)
			},
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) string {
				return ""
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "404 when no voice profile exists",
			setup: func(t *testing.T) string {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID)
			},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token := tt.setup(t)
			resp, body := srv.Request(t, http.MethodGet, "/api/protected/settings/voice", nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantBody != nil {
				tt.wantBody(t, body)
			}
		})
	}
}

func TestSettingsAPI_UpdateVoiceProfile(t *testing.T) {
	t.Parallel()
	srv := setupTestServer(t)

	tests := []struct {
		name        string
		setup       func(t *testing.T) (token string, body map[string]any)
		wantStatus  int
		afterAssert func(t *testing.T, respBody []byte)
	}{
		{
			name: "200 creates voice profile when none exists",
			setup: func(t *testing.T) (string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), map[string]any{
					"tone":            "casual",
					"style":           "storytelling",
					"example_posts":   []string{"Post one", "Post two"},
					"industry":        "saas",
					"target_audience": "developers",
				}
			},
			wantStatus: http.StatusOK,
			afterAssert: func(t *testing.T, body []byte) {
				var vp store.VoiceProfile
				require.NoError(t, json.Unmarshal(body, &vp))
				assert.Equal(t, "casual", vp.Tone)
				assert.Equal(t, "storytelling", vp.Style)
				assert.Len(t, vp.ExamplePosts, 2)
				require.NotNil(t, vp.Industry)
				assert.Equal(t, "saas", *vp.Industry)
			},
		},
		{
			name: "200 updates existing voice profile",
			setup: func(t *testing.T) (string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				seedVoiceProfile(t, srv.Store, accountID) // pre-existing profile
				return newJWT(t, userID, accountID), map[string]any{
					"tone":  "witty",
					"style": "conversational",
				}
			},
			wantStatus: http.StatusOK,
			afterAssert: func(t *testing.T, body []byte) {
				var vp store.VoiceProfile
				require.NoError(t, json.Unmarshal(body, &vp))
				assert.Equal(t, "witty", vp.Tone)
				assert.Equal(t, "conversational", vp.Style)
			},
		},
		{
			name: "200 sets custom instructions",
			setup: func(t *testing.T) (string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), map[string]any{
					"tone":                "professional",
					"style":               "authoritative",
					"custom_instructions": "Always end with a call to action.",
				}
			},
			wantStatus: http.StatusOK,
			afterAssert: func(t *testing.T, body []byte) {
				var vp store.VoiceProfile
				require.NoError(t, json.Unmarshal(body, &vp))
				require.NotNil(t, vp.CustomInstructions)
				assert.Contains(t, *vp.CustomInstructions, "call to action")
			},
		},
		{
			name: "400 when tone is missing",
			setup: func(t *testing.T) (string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), map[string]any{
					"style": "concise",
				}
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when style is missing",
			setup: func(t *testing.T) (string, map[string]any) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), map[string]any{
					"tone": "casual",
				}
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, map[string]any) {
				return "", map[string]any{"tone": "x", "style": "y"}
			},
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, body := tt.setup(t)
			resp, respBody := srv.Request(t, http.MethodPut, "/api/protected/settings/voice", body, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.afterAssert != nil {
				tt.afterAssert(t, respBody)
			}
		})
	}
}
