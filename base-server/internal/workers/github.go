package workers

import (
	"context"
	"encoding/json"
	"fmt"

	"base-server/internal/infra/clients/kafka"
	"base-server/internal/infra/observability"

	"github.com/google/uuid"
)

// GitHubEventMessage represents a github.event Kafka message
type GitHubEventMessage struct {
	EventID   uuid.UUID `json:"event_id"`
	AccountID uuid.UUID `json:"account_id"`
	EventType string    `json:"event_type"`
	RepoName  string    `json:"repo_name"`
}

// GitHubWorker consumes github.event events and generates draft posts
type GitHubWorker struct {
	consumer *kafka.Consumer
	logger   *observability.Logger
}

// NewGitHubWorker creates a new GitHub event processing worker
func NewGitHubWorker(brokers, groupID string, logger *observability.Logger) *GitHubWorker {
	w := &GitHubWorker{
		logger: logger,
	}

	w.consumer = kafka.NewConsumer(brokers, groupID, "github.event", w.handle, logger)
	return w
}

func (w *GitHubWorker) handle(ctx context.Context, key, value []byte) error {
	var event GitHubEventMessage
	if err := json.Unmarshal(value, &event); err != nil {
		return fmt.Errorf("failed to unmarshal github event: %w", err)
	}

	w.logger.Info(ctx, fmt.Sprintf("processing github event %s: %s on %s", event.EventID, event.EventType, event.RepoName))

	// TODO: Use content processor to generate a draft post from the event
	// 1. Get event details from store
	// 2. Generate post content via Claude AI
	// 3. Create draft post
	// 4. Mark event as processed

	return nil
}

func (w *GitHubWorker) Start(ctx context.Context) error {
	return w.consumer.Start(ctx)
}

func (w *GitHubWorker) Name() string {
	return "github-worker"
}
