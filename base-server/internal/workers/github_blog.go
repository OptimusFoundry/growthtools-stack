package workers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	githubProcessor "base-server/internal/github/processor"
	"base-server/internal/infra/clients/kafka"
	"base-server/internal/infra/observability"

	"github.com/google/uuid"
)

// BlogGenerator is the processor dependency the blog worker needs.
type BlogGenerator interface {
	GenerateBlogFromCommit(ctx context.Context, commitID uuid.UUID) error
}

// BlogGeneratorWorker consumes github.blog.generate events and invokes the
// blog generator to turn a completed capture into a long-form draft blog
// post. Mirrors DraftGeneratorWorker exactly — same swallowing behaviour
// so Kafka doesn't retry AI failures indefinitely.
type BlogGeneratorWorker struct {
	consumer  *kafka.Consumer
	generator BlogGenerator
	logger    *observability.Logger
}

// NewBlogGeneratorWorker wires a consumer for the blog-generate topic.
func NewBlogGeneratorWorker(brokers, groupID string, generator BlogGenerator, logger *observability.Logger) *BlogGeneratorWorker {
	w := &BlogGeneratorWorker{generator: generator, logger: logger}
	w.consumer = kafka.NewConsumer(brokers, groupID, TopicBlogGenerate, w.handle, logger)
	return w
}

func (w *BlogGeneratorWorker) handle(ctx context.Context, key, value []byte) error {
	var event BlogGenerateEvent
	if err := json.Unmarshal(value, &event); err != nil {
		return fmt.Errorf("failed to unmarshal blog generate event: %w", err)
	}
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "commit_id", Value: event.CommitID.String()},
	)
	err := w.generator.GenerateBlogFromCommit(ctx, event.CommitID)
	if err == nil {
		return nil
	}
	if errors.Is(err, githubProcessor.ErrBlogGuardTripped) {
		return nil
	}
	// Swallow other errors — the processor already logged; Kafka redelivery
	// won't un-break an AI or GitHub-API failure.
	return nil
}

// Start runs the consumer loop until ctx is cancelled.
func (w *BlogGeneratorWorker) Start(ctx context.Context) error {
	return w.consumer.Start(ctx)
}

// Name reports the worker name for the manager's log lines.
func (w *BlogGeneratorWorker) Name() string {
	return "github-blog-generator-worker"
}
