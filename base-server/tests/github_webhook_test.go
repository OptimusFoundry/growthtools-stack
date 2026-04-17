//go:build integration

package tests

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"testing"
	"time"

	githubHandler "base-server/internal/github/handler"
	githubProcessor "base-server/internal/github/processor"
	"base-server/internal/infra/store"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

const testWebhookSecret = "test-webhook-secret-12345"

// mockGitHubStore implements githubProcessor.GitHubStore for testing.
type mockGitHubStore struct {
	events map[string]store.GitHubEvent // keyed by deliveryID
}

func newMockGitHubStore() *mockGitHubStore {
	return &mockGitHubStore{
		events: make(map[string]store.GitHubEvent),
	}
}

func (m *mockGitHubStore) CreateGitHubEvent(_ context.Context, params store.CreateGitHubEventParams) (store.GitHubEvent, error) {
	event := store.GitHubEvent{
		ID:         uuid.New(),
		EventType:  params.EventType,
		DeliveryID: params.DeliveryID,
		Payload:    params.Payload,
		Processed:  false,
		CreatedAt:  time.Now().UTC(),
	}
	m.events[params.DeliveryID] = event
	return event, nil
}

func (m *mockGitHubStore) GetGitHubEventByDeliveryID(_ context.Context, deliveryID string) (store.GitHubEvent, error) {
	event, ok := m.events[deliveryID]
	if !ok {
		return store.GitHubEvent{}, store.ErrNotFound
	}
	return event, nil
}

func (m *mockGitHubStore) ListUnprocessedGitHubEvents(_ context.Context, limit int) ([]store.GitHubEvent, error) {
	var result []store.GitHubEvent
	for _, e := range m.events {
		if !e.Processed {
			result = append(result, e)
		}
		if len(result) >= limit {
			break
		}
	}
	return result, nil
}

func (m *mockGitHubStore) MarkGitHubEventProcessed(_ context.Context, id uuid.UUID, postID *uuid.UUID) error {
	for k, e := range m.events {
		if e.ID == id {
			e.Processed = true
			e.PostID = postID
			m.events[k] = e
			return nil
		}
	}
	return store.ErrNotFound
}

// The webhook tests don't exercise OAuth / repo / commit paths — these
// stubs exist solely so *mockGitHubStore satisfies the GitHubStore
// interface. Repo lookups return ErrNotFound so HandleWebhookEvent
// treats the payload as "unknown repo, fall back to global secret".

func (m *mockGitHubStore) CreateOrUpdateGitHubConnection(_ context.Context, _ uuid.UUID, _ int64, _, _, _ string) (store.GitHubConnection, error) {
	return store.GitHubConnection{}, nil
}

func (m *mockGitHubStore) GetGitHubConnectionByUserID(_ context.Context, _ uuid.UUID) (store.GitHubConnection, error) {
	return store.GitHubConnection{}, store.ErrNotFound
}

func (m *mockGitHubStore) SoftDeleteGitHubConnection(_ context.Context, _ uuid.UUID) error {
	return nil
}

func (m *mockGitHubStore) CreateGitHubRepo(_ context.Context, _ uuid.UUID, _ int64, _, _ string, _ *string, _ *int64, _ string) (store.GitHubRepo, error) {
	return store.GitHubRepo{}, nil
}

func (m *mockGitHubStore) ListGitHubReposByConnection(_ context.Context, _ uuid.UUID) ([]store.GitHubRepo, error) {
	return nil, nil
}

func (m *mockGitHubStore) GetGitHubRepoByConnectionAndName(_ context.Context, _ uuid.UUID, _, _ string) (store.GitHubRepo, error) {
	return store.GitHubRepo{}, store.ErrNotFound
}

func (m *mockGitHubStore) GetGitHubRepoByGitHubID(_ context.Context, _ int64) (store.GitHubRepo, error) {
	return store.GitHubRepo{}, store.ErrNotFound
}

func (m *mockGitHubStore) GetGitHubRepoByOwnerName(_ context.Context, _, _ string) (store.GitHubRepo, error) {
	return store.GitHubRepo{}, store.ErrNotFound
}

func (m *mockGitHubStore) UpdateGitHubRepoID(_ context.Context, _ uuid.UUID, _ int64) error {
	return nil
}

func (m *mockGitHubStore) SoftDeleteGitHubRepo(_ context.Context, _ uuid.UUID) error {
	return nil
}

func (m *mockGitHubStore) InsertGitHubCommit(_ context.Context, _ uuid.UUID, _ string, _, _ *string, _ string, _, _ *string, _ time.Time, _ *json.RawMessage) (store.GitHubCommit, bool, error) {
	return store.GitHubCommit{}, false, nil
}

func (m *mockGitHubStore) GetGitHubCommitByRepoSHA(_ context.Context, _ uuid.UUID, _ string) (store.GitHubCommit, error) {
	return store.GitHubCommit{}, store.ErrNotFound
}

func (m *mockGitHubStore) MarkGitHubCommitCaptureRequested(_ context.Context, _ uuid.UUID) (bool, error) {
	return false, nil
}

func (m *mockGitHubStore) UpdateGitHubCommitCapture(_ context.Context, _ uuid.UUID, _ json.RawMessage) error {
	return nil
}

func (m *mockGitHubStore) UpdateGitHubCommitPostID(_ context.Context, _, _ uuid.UUID) error {
	return nil
}

func (m *mockGitHubStore) ListGitHubCommitsByConnection(_ context.Context, _ uuid.UUID, _, _ int) ([]store.GitHubCommit, error) {
	return nil, nil
}

// computeGitHubSignature computes the HMAC-SHA256 signature for a given payload.
func computeGitHubSignature(payload []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

// setupGitHubRouter sets up a Gin router with the GitHub webhook handler.
func setupGitHubRouter() (*gin.Engine, *mockGitHubStore) {
	mockStore := newMockGitHubStore()
	logger := testLogger()

	proc := githubProcessor.New(mockStore, testWebhookSecret, logger)
	handler := githubHandler.New(proc, "http://localhost:3000", logger)

	router := setupTestRouter()
	router.POST("/api/github/webhook", handler.HandleWebhook)

	return router, mockStore
}

func TestGitHubWebhook_ValidSignature(t *testing.T) {
	t.Parallel()

	router, mockStore := setupGitHubRouter()

	payload := []byte(`{"action":"opened","pull_request":{"number":1}}`)
	signature := computeGitHubSignature(payload, testWebhookSecret)
	deliveryID := uuid.New().String()

	headers := map[string]string{
		"X-GitHub-Event":        "pull_request",
		"X-GitHub-Delivery":     deliveryID,
		"X-Hub-Signature-256":   signature,
	}

	w := makeRequestWithHeaders(t, router, http.MethodPost, "/api/github/webhook", payload, headers)
	assertStatus(t, w, http.StatusOK)

	var resp messageResponse
	parseResponseBody(t, w, &resp)
	assert.Contains(t, resp.Message, "received")

	// Verify the event was stored
	_, exists := mockStore.events[deliveryID]
	assert.True(t, exists)
}

func TestGitHubWebhook_InvalidSignature(t *testing.T) {
	t.Parallel()

	router, _ := setupGitHubRouter()

	payload := []byte(`{"action":"opened"}`)
	deliveryID := uuid.New().String()

	headers := map[string]string{
		"X-GitHub-Event":        "push",
		"X-GitHub-Delivery":     deliveryID,
		"X-Hub-Signature-256":   "sha256=invalid_signature_here",
	}

	w := makeRequestWithHeaders(t, router, http.MethodPost, "/api/github/webhook", payload, headers)
	assertStatus(t, w, http.StatusUnauthorized)
}

func TestGitHubWebhook_MissingHeaders(t *testing.T) {
	t.Parallel()

	router, _ := setupGitHubRouter()

	payload := []byte(`{"action":"opened"}`)

	// Missing all required headers
	w := makeRequestWithHeaders(t, router, http.MethodPost, "/api/github/webhook", payload, nil)
	assertStatus(t, w, http.StatusBadRequest)
}

func TestGitHubWebhook_MissingEventHeader(t *testing.T) {
	t.Parallel()

	router, _ := setupGitHubRouter()

	payload := []byte(`{"action":"opened"}`)
	signature := computeGitHubSignature(payload, testWebhookSecret)

	headers := map[string]string{
		// Missing X-GitHub-Event
		"X-GitHub-Delivery":   uuid.New().String(),
		"X-Hub-Signature-256": signature,
	}

	w := makeRequestWithHeaders(t, router, http.MethodPost, "/api/github/webhook", payload, headers)
	assertStatus(t, w, http.StatusBadRequest)
}

func TestGitHubWebhook_MissingDeliveryHeader(t *testing.T) {
	t.Parallel()

	router, _ := setupGitHubRouter()

	payload := []byte(`{"action":"opened"}`)
	signature := computeGitHubSignature(payload, testWebhookSecret)

	headers := map[string]string{
		"X-GitHub-Event":      "push",
		// Missing X-GitHub-Delivery
		"X-Hub-Signature-256": signature,
	}

	w := makeRequestWithHeaders(t, router, http.MethodPost, "/api/github/webhook", payload, headers)
	assertStatus(t, w, http.StatusBadRequest)
}

func TestGitHubWebhook_MissingSignatureHeader(t *testing.T) {
	t.Parallel()

	router, _ := setupGitHubRouter()

	payload := []byte(`{"action":"opened"}`)

	headers := map[string]string{
		"X-GitHub-Event":    "push",
		"X-GitHub-Delivery": uuid.New().String(),
		// Missing X-Hub-Signature-256
	}

	w := makeRequestWithHeaders(t, router, http.MethodPost, "/api/github/webhook", payload, headers)
	assertStatus(t, w, http.StatusBadRequest)
}

func TestGitHubWebhook_DuplicateEvent(t *testing.T) {
	t.Parallel()

	router, mockStore := setupGitHubRouter()

	payload := []byte(`{"action":"opened","pull_request":{"number":42}}`)
	signature := computeGitHubSignature(payload, testWebhookSecret)
	deliveryID := uuid.New().String()

	// Seed an existing event with the same delivery ID
	mockStore.events[deliveryID] = store.GitHubEvent{
		ID:         uuid.New(),
		EventType:  "pull_request",
		DeliveryID: deliveryID,
		Payload:    store.JSONB{},
		Processed:  false,
		CreatedAt:  time.Now().UTC(),
	}

	headers := map[string]string{
		"X-GitHub-Event":      "pull_request",
		"X-GitHub-Delivery":   deliveryID,
		"X-Hub-Signature-256": signature,
	}

	w := makeRequestWithHeaders(t, router, http.MethodPost, "/api/github/webhook", payload, headers)
	// Duplicate events return 200 (so GitHub stops retrying)
	assertStatus(t, w, http.StatusOK)
}

func TestGitHubWebhook_SignatureWithoutPrefix(t *testing.T) {
	t.Parallel()

	router, _ := setupGitHubRouter()

	payload := []byte(`{"action":"opened"}`)

	headers := map[string]string{
		"X-GitHub-Event":      "push",
		"X-GitHub-Delivery":   uuid.New().String(),
		"X-Hub-Signature-256": "not_sha256_prefixed",
	}

	w := makeRequestWithHeaders(t, router, http.MethodPost, "/api/github/webhook", payload, headers)
	assertStatus(t, w, http.StatusUnauthorized)
}

func TestGitHubWebhook_PushEvent(t *testing.T) {
	t.Parallel()

	router, mockStore := setupGitHubRouter()

	payload := []byte(`{"ref":"refs/heads/main","commits":[{"message":"feat: new feature"}]}`)
	signature := computeGitHubSignature(payload, testWebhookSecret)
	deliveryID := uuid.New().String()

	headers := map[string]string{
		"X-GitHub-Event":      "push",
		"X-GitHub-Delivery":   deliveryID,
		"X-Hub-Signature-256": signature,
	}

	w := makeRequestWithHeaders(t, router, http.MethodPost, "/api/github/webhook", payload, headers)
	assertStatus(t, w, http.StatusOK)

	event, exists := mockStore.events[deliveryID]
	assert.True(t, exists)
	assert.Equal(t, "push", event.EventType)
}

func TestGitHubWebhook_WrongSecret(t *testing.T) {
	t.Parallel()

	router, _ := setupGitHubRouter()

	payload := []byte(`{"action":"opened"}`)
	// Sign with a different secret
	wrongSignature := computeGitHubSignature(payload, "wrong-secret")

	headers := map[string]string{
		"X-GitHub-Event":      "push",
		"X-GitHub-Delivery":   uuid.New().String(),
		"X-Hub-Signature-256": wrongSignature,
	}

	w := makeRequestWithHeaders(t, router, http.MethodPost, "/api/github/webhook", payload, headers)
	assertStatus(t, w, http.StatusUnauthorized)
}
