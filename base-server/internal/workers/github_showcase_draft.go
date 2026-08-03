package workers

import (
	"context"
	"encoding/json"
	"fmt"

	"base-server/internal/infra/clients/kafka"
	"base-server/internal/infra/observability"

	"github.com/google/uuid"
)

// ShowcaseDraftGenerator is the processor dependency the worker needs. The
// concrete type lives in internal/github/processor.
type ShowcaseDraftGenerator interface {
	GenerateDraftFromShowcaseJob(ctx context.Context, jobID uuid.UUID) error
}

// ShowcaseDraftGeneratorWorker consumes showcase.draft.generate events and
// invokes the draft generator to turn a completed showcase capture into a
// draft post.
type ShowcaseDraftGeneratorWorker struct {
	consumer  *kafka.Consumer
	generator ShowcaseDraftGenerator
	logger    *observability.Logger
}

// NewShowcaseDraftGeneratorWorker wires a consumer for the showcase
// draft-generate topic.
func NewShowcaseDraftGeneratorWorker(brokers, groupID string, generator ShowcaseDraftGenerator, logger *observability.Logger) *ShowcaseDraftGeneratorWorker {
	w := &ShowcaseDraftGeneratorWorker{
		generator: generator,
		logger:    logger,
	}
	w.consumer = kafka.NewConsumer(brokers, groupID, TopicShowcaseDraftGenerate, w.handle, logger)
	return w
}

func (w *ShowcaseDraftGeneratorWorker) handle(ctx context.Context, key, value []byte) error {
	var event ShowcaseDraftGenerateEvent
	if err := json.Unmarshal(value, &event); err != nil {
		return fmt.Errorf("failed to unmarshal showcase draft generate event: %w", err)
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "job_id", Value: event.JobID.String()},
	)

	if err := w.generator.GenerateDraftFromShowcaseJob(ctx, event.JobID); err != nil {
		w.logger.Error(ctx, "showcase draft generation failed", err)
	}
	return nil
}

// Start runs the consumer loop until ctx is cancelled.
func (w *ShowcaseDraftGeneratorWorker) Start(ctx context.Context) error {
	return w.consumer.Start(ctx)
}

// Name reports the worker name for the manager's log lines.
func (w *ShowcaseDraftGeneratorWorker) Name() string {
	return "showcase-draft-generator-worker"
}
