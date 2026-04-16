//go:build integration

package tests

import (
	"context"
	"net/http"
	"testing"
	"time"

	platformsHandler "base-server/internal/platform/handler"
	platformsProcessor "base-server/internal/platform/processor"
	"base-server/internal/infra/store"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

// mockPlatformProcessor implements platformsHandler.PlatformProcessor for testing.
// We implement the handler's interface directly since the processor depends on
// external OAuth services.
type mockPlatformProcessor struct {
	connections map[uuid.UUID]store.PlatformConnection
}

func newMockPlatformProcessor() *mockPlatformProcessor {
	return &mockPlatformProcessor{
		connections: make(map[uuid.UUID]store.PlatformConnection),
	}
}

func (m *mockPlatformProcessor) InitiateOAuth(_ context.Context, accountID uuid.UUID, platform string) (string, error) {
	return "https://oauth.example.com/auth?platform=" + platform, nil
}

func (m *mockPlatformProcessor) HandleOAuthCallback(_ context.Context, accountID uuid.UUID, platform, code string) (store.PlatformConnection, error) {
	now := time.Now().UTC()
	conn := store.PlatformConnection{
		ID:             uuid.New(),
		AccountID:      accountID,
		Platform:       platform,
		PlatformUserID: "user-" + code,
		DisplayName:    strPtr("Test User"),
		AccessToken:    "access-token",
		Status:         "active",
		Scopes:         store.StringArray{"read", "write"},
		ConnectedAt:    now,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	m.connections[conn.ID] = conn
	return conn, nil
}

func (m *mockPlatformProcessor) ConnectBluesky(_ context.Context, accountID uuid.UUID, handle, appPassword string) (store.PlatformConnection, error) {
	now := time.Now().UTC()
	conn := store.PlatformConnection{
		ID:             uuid.New(),
		AccountID:      accountID,
		Platform:       "bluesky",
		PlatformUserID: handle,
		DisplayName:    strPtr(handle),
		AccessToken:    "bsky-token",
		Status:         "active",
		Scopes:         store.StringArray{},
		ConnectedAt:    now,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	m.connections[conn.ID] = conn
	return conn, nil
}

func (m *mockPlatformProcessor) DisconnectPlatform(_ context.Context, accountID uuid.UUID, connectionID uuid.UUID) error {
	conn, ok := m.connections[connectionID]
	if !ok || conn.AccountID != accountID {
		return platformsProcessor.ErrConnectionNotFound
	}
	delete(m.connections, connectionID)
	return nil
}

func (m *mockPlatformProcessor) ListConnections(_ context.Context, accountID uuid.UUID) ([]store.PlatformConnection, error) {
	var result []store.PlatformConnection
	for _, c := range m.connections {
		if c.AccountID == accountID {
			result = append(result, c)
		}
	}
	if result == nil {
		result = []store.PlatformConnection{}
	}
	return result, nil
}

// setupPlatformsRouter sets up a Gin router with the platforms handler.
func setupPlatformsRouter(accountID uuid.UUID) (*gin.Engine, *mockPlatformProcessor) {
	mockProc := newMockPlatformProcessor()
	logger := testLogger()

	handler := platformsHandler.New(mockProc, logger)

	router := setupTestRouter()
	protected := router.Group("/api/protected", mockAuthMiddleware(accountID))
	{
		protected.GET("/platforms", handler.HandleListConnections)
		protected.DELETE("/platforms/:id", handler.HandleDisconnect)
	}

	return router, mockProc
}

func TestPlatformsAPI_ListConnections_Empty(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupPlatformsRouter(accountID)

	w := makeRequest(t, router, http.MethodGet, "/api/protected/platforms", nil)
	assertStatus(t, w, http.StatusOK)

	var resp struct {
		Connections []store.PlatformConnection `json:"connections"`
	}
	parseResponseBody(t, w, &resp)
	assert.Empty(t, resp.Connections)
}

func TestPlatformsAPI_ListConnections(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, mockProc := setupPlatformsRouter(accountID)

	// Seed connections
	for _, platform := range []string{"twitter", "linkedin"} {
		connID := uuid.New()
		mockProc.connections[connID] = store.PlatformConnection{
			ID:             connID,
			AccountID:      accountID,
			Platform:       platform,
			PlatformUserID: "user-123",
			Status:         "active",
			Scopes:         store.StringArray{},
			ConnectedAt:    time.Now().UTC(),
			CreatedAt:      time.Now().UTC(),
			UpdatedAt:      time.Now().UTC(),
		}
	}

	w := makeRequest(t, router, http.MethodGet, "/api/protected/platforms", nil)
	assertStatus(t, w, http.StatusOK)

	var resp struct {
		Connections []store.PlatformConnection `json:"connections"`
	}
	parseResponseBody(t, w, &resp)
	assert.Len(t, resp.Connections, 2)
}

func TestPlatformsAPI_DisconnectPlatform(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, mockProc := setupPlatformsRouter(accountID)

	connID := uuid.New()
	mockProc.connections[connID] = store.PlatformConnection{
		ID:             connID,
		AccountID:      accountID,
		Platform:       "twitter",
		PlatformUserID: "user-123",
		Status:         "active",
		Scopes:         store.StringArray{},
		ConnectedAt:    time.Now().UTC(),
		CreatedAt:      time.Now().UTC(),
		UpdatedAt:      time.Now().UTC(),
	}

	w := makeRequest(t, router, http.MethodDelete, "/api/protected/platforms/"+connID.String(), nil)
	assertStatus(t, w, http.StatusOK)

	var resp messageResponse
	parseResponseBody(t, w, &resp)
	assert.Contains(t, resp.Message, "disconnected")

	_, exists := mockProc.connections[connID]
	assert.False(t, exists)
}

func TestPlatformsAPI_DisconnectPlatform_NotFound(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupPlatformsRouter(accountID)

	fakeID := uuid.New()
	w := makeRequest(t, router, http.MethodDelete, "/api/protected/platforms/"+fakeID.String(), nil)
	assertNotFound(t, w)
}

func TestPlatformsAPI_DisconnectPlatform_InvalidID(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupPlatformsRouter(accountID)

	w := makeRequest(t, router, http.MethodDelete, "/api/protected/platforms/not-a-uuid", nil)
	assertStatus(t, w, http.StatusBadRequest)
}

func TestPlatformsAPI_DisconnectPlatform_CrossAccountIsolation(t *testing.T) {
	t.Parallel()

	accountA := uuid.New()
	accountB := uuid.New()

	_, mockProcA := setupPlatformsRouter(accountA)
	routerB, _ := setupPlatformsRouter(accountB)

	connID := uuid.New()
	mockProcA.connections[connID] = store.PlatformConnection{
		ID:             connID,
		AccountID:      accountA,
		Platform:       "twitter",
		PlatformUserID: "user-123",
		Status:         "active",
		Scopes:         store.StringArray{},
		ConnectedAt:    time.Now().UTC(),
		CreatedAt:      time.Now().UTC(),
		UpdatedAt:      time.Now().UTC(),
	}

	// Account B tries to disconnect account A's platform
	w := makeRequest(t, routerB, http.MethodDelete, "/api/protected/platforms/"+connID.String(), nil)
	assertNotFound(t, w)
}
