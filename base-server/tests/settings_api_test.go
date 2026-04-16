//go:build integration

package tests

import (
	"context"
	"net/http"
	"testing"
	"time"

	settingsHandler "base-server/internal/settings/handler"
	settingsProcessor "base-server/internal/settings/processor"
	"base-server/internal/infra/store"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockSettingsStore implements settingsProcessor.SettingsStore for testing.
type mockSettingsStore struct {
	profiles map[uuid.UUID]store.VoiceProfile // keyed by accountID
}

func newMockSettingsStore() *mockSettingsStore {
	return &mockSettingsStore{
		profiles: make(map[uuid.UUID]store.VoiceProfile),
	}
}

func (m *mockSettingsStore) GetVoiceProfileByAccount(_ context.Context, accountID uuid.UUID) (store.VoiceProfile, error) {
	profile, ok := m.profiles[accountID]
	if !ok {
		return store.VoiceProfile{}, store.ErrNotFound
	}
	return profile, nil
}

func (m *mockSettingsStore) CreateVoiceProfile(_ context.Context, params store.CreateVoiceProfileParams) (store.VoiceProfile, error) {
	now := time.Now().UTC()
	profile := store.VoiceProfile{
		ID:                 uuid.New(),
		AccountID:          params.AccountID,
		Tone:               params.Tone,
		Style:              params.Style,
		ExamplePosts:       params.ExamplePosts,
		Industry:           params.Industry,
		TargetAudience:     params.TargetAudience,
		CustomInstructions: params.CustomInstructions,
		CreatedAt:          now,
		UpdatedAt:          now,
	}
	m.profiles[params.AccountID] = profile
	return profile, nil
}

func (m *mockSettingsStore) UpdateVoiceProfile(_ context.Context, accountID uuid.UUID, params store.UpdateVoiceProfileParams) (store.VoiceProfile, error) {
	profile, ok := m.profiles[accountID]
	if !ok {
		return store.VoiceProfile{}, store.ErrNotFound
	}
	if params.Tone != nil {
		profile.Tone = *params.Tone
	}
	if params.Style != nil {
		profile.Style = *params.Style
	}
	if params.ExamplePosts != nil {
		profile.ExamplePosts = params.ExamplePosts
	}
	if params.Industry != nil {
		profile.Industry = params.Industry
	}
	if params.TargetAudience != nil {
		profile.TargetAudience = params.TargetAudience
	}
	if params.CustomInstructions != nil {
		profile.CustomInstructions = params.CustomInstructions
	}
	profile.UpdatedAt = time.Now().UTC()
	m.profiles[accountID] = profile
	return profile, nil
}

// setupSettingsRouter sets up a Gin router with the settings handler and mock store.
func setupSettingsRouter(accountID uuid.UUID) (*gin.Engine, *mockSettingsStore) {
	mockStore := newMockSettingsStore()
	logger := testLogger()

	proc := settingsProcessor.New(mockStore, logger)
	handler := settingsHandler.New(proc, logger)

	router := setupTestRouter()
	protected := router.Group("/api/protected", mockAuthMiddleware(accountID))
	{
		protected.GET("/settings/voice", handler.HandleGetVoiceProfile)
		protected.PUT("/settings/voice", handler.HandleUpdateVoiceProfile)
	}

	return router, mockStore
}

func TestSettingsAPI_GetVoiceProfile(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, mockStore := setupSettingsRouter(accountID)

	// Seed a voice profile
	mockStore.profiles[accountID] = store.VoiceProfile{
		ID:           uuid.New(),
		AccountID:    accountID,
		Tone:         "professional",
		Style:        "concise",
		ExamplePosts: store.StringArray{"Example post 1"},
		Industry:     strPtr("tech"),
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}

	w := makeRequest(t, router, http.MethodGet, "/api/protected/settings/voice", nil)
	assertStatus(t, w, http.StatusOK)

	var resp store.VoiceProfile
	parseResponseBody(t, w, &resp)
	assert.Equal(t, "professional", resp.Tone)
	assert.Equal(t, "concise", resp.Style)
	require.NotNil(t, resp.Industry)
	assert.Equal(t, "tech", *resp.Industry)
}

func TestSettingsAPI_GetVoiceProfile_NotFound(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupSettingsRouter(accountID)

	w := makeRequest(t, router, http.MethodGet, "/api/protected/settings/voice", nil)
	assertNotFound(t, w)
}

func TestSettingsAPI_UpdateVoiceProfile_Create(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupSettingsRouter(accountID)

	body := map[string]interface{}{
		"tone":            "casual",
		"style":           "storytelling",
		"example_posts":   []string{"Check out this cool thing!", "Just shipped a feature"},
		"industry":        "saas",
		"target_audience": "developers",
	}

	w := makeRequest(t, router, http.MethodPut, "/api/protected/settings/voice", body)
	assertStatus(t, w, http.StatusOK)

	var resp store.VoiceProfile
	parseResponseBody(t, w, &resp)
	assert.Equal(t, "casual", resp.Tone)
	assert.Equal(t, "storytelling", resp.Style)
	assert.Len(t, resp.ExamplePosts, 2)
	require.NotNil(t, resp.Industry)
	assert.Equal(t, "saas", *resp.Industry)
}

func TestSettingsAPI_UpdateVoiceProfile_Update(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, mockStore := setupSettingsRouter(accountID)

	// Seed an existing profile
	mockStore.profiles[accountID] = store.VoiceProfile{
		ID:           uuid.New(),
		AccountID:    accountID,
		Tone:         "professional",
		Style:        "concise",
		ExamplePosts: store.StringArray{"Old example"},
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}

	body := map[string]interface{}{
		"tone":          "casual",
		"style":         "conversational",
		"example_posts": []string{"New example 1", "New example 2"},
	}

	w := makeRequest(t, router, http.MethodPut, "/api/protected/settings/voice", body)
	assertStatus(t, w, http.StatusOK)

	var resp store.VoiceProfile
	parseResponseBody(t, w, &resp)
	assert.Equal(t, "casual", resp.Tone)
	assert.Equal(t, "conversational", resp.Style)
	assert.Len(t, resp.ExamplePosts, 2)
}

func TestSettingsAPI_UpdateVoiceProfile_ValidationError(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupSettingsRouter(accountID)

	// Missing required fields (tone and style)
	body := map[string]interface{}{
		"example_posts": []string{"Some post"},
	}

	w := makeRequest(t, router, http.MethodPut, "/api/protected/settings/voice", body)
	assertStatus(t, w, http.StatusBadRequest)
}

func TestSettingsAPI_UpdateVoiceProfile_WithCustomInstructions(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupSettingsRouter(accountID)

	body := map[string]interface{}{
		"tone":                "witty",
		"style":               "thread",
		"custom_instructions": "Always include a call to action. Use emojis sparingly.",
	}

	w := makeRequest(t, router, http.MethodPut, "/api/protected/settings/voice", body)
	assertStatus(t, w, http.StatusOK)

	var resp store.VoiceProfile
	parseResponseBody(t, w, &resp)
	assert.Equal(t, "witty", resp.Tone)
	require.NotNil(t, resp.CustomInstructions)
	assert.Contains(t, *resp.CustomInstructions, "call to action")
}

func TestSettingsAPI_UpdateAndGetVoiceProfile_RoundTrip(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupSettingsRouter(accountID)

	// First, create the profile
	body := map[string]interface{}{
		"tone":          "professional",
		"style":         "authoritative",
		"example_posts": []string{"Post 1"},
	}

	w := makeRequest(t, router, http.MethodPut, "/api/protected/settings/voice", body)
	assertStatus(t, w, http.StatusOK)

	// Now get it back
	w = makeRequest(t, router, http.MethodGet, "/api/protected/settings/voice", nil)
	assertStatus(t, w, http.StatusOK)

	var resp store.VoiceProfile
	parseResponseBody(t, w, &resp)
	assert.Equal(t, "professional", resp.Tone)
	assert.Equal(t, "authoritative", resp.Style)
}
