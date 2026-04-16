package processor

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"testing"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testWebhookSecret = "test-secret-key"

func validSignature(payload []byte) string {
	mac := hmac.New(sha256.New, []byte(testWebhookSecret))
	mac.Write(payload)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

func TestGitHubProcessor_ValidateSignature(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	mockStore := &MockGitHubStore{}
	proc := New(mockStore, testWebhookSecret, logger)

	t.Run("valid signature", func(t *testing.T) {
		t.Parallel()
		payload := []byte(`{"action":"push"}`)
		sig := validSignature(payload)

		err := proc.ValidateSignature(payload, sig)

		require.NoError(t, err)
	})

	t.Run("invalid signature", func(t *testing.T) {
		t.Parallel()
		payload := []byte(`{"action":"push"}`)

		err := proc.ValidateSignature(payload, "sha256=invalidsignature")

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrInvalidSignature)
	})

	t.Run("missing sha256 prefix", func(t *testing.T) {
		t.Parallel()
		payload := []byte(`{"action":"push"}`)

		err := proc.ValidateSignature(payload, "invalidsignature")

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrInvalidSignature)
	})
}

func TestGitHubProcessor_HandleWebhookEvent(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		payload := []byte(`{"action":"push"}`)
		sig := validSignature(payload)

		mockStore := &MockGitHubStore{
			GetGitHubEventByDeliveryIDFn: func(ctx context.Context, deliveryID string) (store.GitHubEvent, error) {
				return store.GitHubEvent{}, store.ErrNotFound
			},
			CreateGitHubEventFn: func(ctx context.Context, params store.CreateGitHubEventParams) (store.GitHubEvent, error) {
				return store.GitHubEvent{ID: uuid.New(), DeliveryID: params.DeliveryID, EventType: params.EventType}, nil
			},
		}
		proc := New(mockStore, testWebhookSecret, logger)

		err := proc.HandleWebhookEvent(context.Background(), "delivery-123", "push", payload, sig)

		require.NoError(t, err)
	})

	t.Run("invalid signature", func(t *testing.T) {
		t.Parallel()
		payload := []byte(`{"action":"push"}`)

		mockStore := &MockGitHubStore{}
		proc := New(mockStore, testWebhookSecret, logger)

		err := proc.HandleWebhookEvent(context.Background(), "delivery-123", "push", payload, "sha256=bad")

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrInvalidSignature)
	})

	t.Run("duplicate event", func(t *testing.T) {
		t.Parallel()
		payload := []byte(`{"action":"push"}`)
		sig := validSignature(payload)

		mockStore := &MockGitHubStore{
			GetGitHubEventByDeliveryIDFn: func(ctx context.Context, deliveryID string) (store.GitHubEvent, error) {
				return store.GitHubEvent{ID: uuid.New(), DeliveryID: deliveryID}, nil
			},
		}
		proc := New(mockStore, testWebhookSecret, logger)

		err := proc.HandleWebhookEvent(context.Background(), "delivery-123", "push", payload, sig)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrDuplicateEvent)
	})

	t.Run("check duplicate store error propagated", func(t *testing.T) {
		t.Parallel()
		payload := []byte(`{"action":"push"}`)
		sig := validSignature(payload)

		dbErr := errors.New("db error")
		mockStore := &MockGitHubStore{
			GetGitHubEventByDeliveryIDFn: func(ctx context.Context, deliveryID string) (store.GitHubEvent, error) {
				return store.GitHubEvent{}, dbErr
			},
		}
		proc := New(mockStore, testWebhookSecret, logger)

		err := proc.HandleWebhookEvent(context.Background(), "delivery-123", "push", payload, sig)

		require.Error(t, err)
		assert.ErrorIs(t, err, dbErr)
	})

	t.Run("create event store error propagated", func(t *testing.T) {
		t.Parallel()
		payload := []byte(`{"action":"push"}`)
		sig := validSignature(payload)

		dbErr := errors.New("create error")
		mockStore := &MockGitHubStore{
			GetGitHubEventByDeliveryIDFn: func(ctx context.Context, deliveryID string) (store.GitHubEvent, error) {
				return store.GitHubEvent{}, store.ErrNotFound
			},
			CreateGitHubEventFn: func(ctx context.Context, params store.CreateGitHubEventParams) (store.GitHubEvent, error) {
				return store.GitHubEvent{}, dbErr
			},
		}
		proc := New(mockStore, testWebhookSecret, logger)

		err := proc.HandleWebhookEvent(context.Background(), "delivery-123", "push", payload, sig)

		require.Error(t, err)
		assert.ErrorIs(t, err, dbErr)
	})
}
