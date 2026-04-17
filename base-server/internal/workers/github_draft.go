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

// DraftGenerator is the processor dependency the worker needs. The concrete
// type lives in internal/github/processor.
type DraftGenerator interface {
	GenerateDraftFromCommit(ctx context.Context, commitID uuid.UUID) error
}

// DraftGeneratorWorker consumes github.draft.generate events and invokes the
// draft generator to turn a completed capture into a draft post.
type DraftGeneratorWorker struct {
	consumer  *kafka.Consumer
	generator DraftGenerator
	logger    *observability.Logger
}

// NewDraftGeneratorWorker wires a consumer for the draft-generate topic.
func NewDraftGeneratorWorker(brokers, groupID string, generator DraftGenerator, logger *observability.Logger) *DraftGeneratorWorker {
	w := &DraftGeneratorWorker{
		generator: generator,
		logger:    logger,
	}
	w.consumer = kafka.NewConsumer(brokers, groupID, TopicDraftGenerate, w.handle, logger)
	return w
}

func (w *DraftGeneratorWorker) handle(ctx context.Context, key, value []byte) error {
	var event DraftGenerateEvent
	if err := json.Unmarshal(value, &event); err != nil {
		return fmt.Errorf("failed to unmarshal draft generate event: %w", err)
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "commit_id", Value: event.CommitID.String()},
	)

	err := w.generator.GenerateDraftFromCommit(ctx, event.CommitID)
	if err == nil {
		return nil
	}
	// Guard-tripped is an expected no-op (already drafted / no platforms /
	// capture failed). Don't re-queue — there's no progress to make.
	if errors.Is(err, githubProcessor.ErrDraftGuardTripped) {
		return nil
	}
	// Hard failures are logged in the processor. We return nil rather than
	// retrying indefinitely — an AI call that blew up once is unlikely to
	// recover on kafka redelivery, and the user can regenerate from the UI.
	return nil
}

// Start runs the consumer loop until ctx is cancelled.
func (w *DraftGeneratorWorker) Start(ctx context.Context) error {
	return w.consumer.Start(ctx)
}

// Name reports the worker name for the manager's log lines.
func (w *DraftGeneratorWorker) Name() string {
	return "github-draft-generator-worker"
}
