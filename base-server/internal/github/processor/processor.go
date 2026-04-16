package processor

//go:generate go run go.uber.org/mock/mockgen@latest -source=processor.go -destination=mocks_test.go -package=processor

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// GitHubStore defines the database operations required by GitHubProcessor
type GitHubStore interface {
	CreateGitHubEvent(ctx context.Context, params store.CreateGitHubEventParams) (store.GitHubEvent, error)
	GetGitHubEventByDeliveryID(ctx context.Context, deliveryID string) (store.GitHubEvent, error)
	ListUnprocessedGitHubEvents(ctx context.Context, limit int) ([]store.GitHubEvent, error)
	MarkGitHubEventProcessed(ctx context.Context, id uuid.UUID, postID *uuid.UUID) error
}

var (
	ErrInvalidSignature = errors.New("invalid webhook signature")
	ErrDuplicateEvent   = errors.New("duplicate webhook event")
)

type GitHubProcessor struct {
	store         GitHubStore
	webhookSecret string
	logger        *observability.Logger
}

func New(store GitHubStore, webhookSecret string, logger *observability.Logger) GitHubProcessor {
	return GitHubProcessor{
		store:         store,
		webhookSecret: webhookSecret,
		logger:        logger,
	}
}

// ValidateSignature verifies the HMAC-SHA256 signature from GitHub
func (p *GitHubProcessor) ValidateSignature(payload []byte, signature string) error {
	if !strings.HasPrefix(signature, "sha256=") {
		return ErrInvalidSignature
	}

	mac := hmac.New(sha256.New, []byte(p.webhookSecret))
	mac.Write(payload)
	expectedMAC := hex.EncodeToString(mac.Sum(nil))
	expectedSig := "sha256=" + expectedMAC

	if !hmac.Equal([]byte(signature), []byte(expectedSig)) {
		return ErrInvalidSignature
	}
	return nil
}

// HandleWebhookEvent validates the signature, deduplicates, and persists the event
func (p *GitHubProcessor) HandleWebhookEvent(ctx context.Context, deliveryID string, eventType string, payload []byte, signature string) error {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "delivery_id", Value: deliveryID},
		observability.Field{Key: "event_type", Value: eventType},
		observability.Field{Key: "operation", Value: "handle_webhook_event"},
	)

	if err := p.ValidateSignature(payload, signature); err != nil {
		p.logger.Warn(ctx, "invalid webhook signature received")
		return ErrInvalidSignature
	}

	_, err := p.store.GetGitHubEventByDeliveryID(ctx, deliveryID)
	if err == nil {
		// Event already exists — duplicate delivery
		p.logger.Warn(ctx, "duplicate webhook event received")
		return ErrDuplicateEvent
	}
	if !errors.Is(err, store.ErrNotFound) {
		p.logger.Error(ctx, "failed to check for duplicate event", err)
		return err
	}

	params := store.CreateGitHubEventParams{
		EventType:  eventType,
		DeliveryID: deliveryID,
		Payload:    store.JSONB{},
	}

	_, err = p.store.CreateGitHubEvent(ctx, params)
	if err != nil {
		p.logger.Error(ctx, "failed to persist GitHub event", err)
		return err
	}

	return nil
}
