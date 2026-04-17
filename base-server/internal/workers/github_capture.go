package workers

import (
	"context"
	"encoding/json"
	"fmt"

	"base-server/internal/infra/clients/kafka"
	"base-server/internal/infra/observability"

	"github.com/google/uuid"
)

// TopicCaptureResults is where the capture-worker publishes outcomes. Name is
// mirrored in the github processor (TopicCaptureRequests is the request side).
const TopicCaptureResults = "github.capture.results"

// CaptureUpload mirrors the capture-worker's upload entry in its result
// message. Keep in sync with capture-worker/kafka.ts.
type CaptureUpload struct {
	Key string `json:"key"`
	URL string `json:"url,omitempty"`
}

// CaptureResultMessage is the github.capture.results body.
type CaptureResultMessage struct {
	CommitID   uuid.UUID       `json:"commit_id"`
	SHA        string          `json:"sha"`
	Success    bool            `json:"success"`
	StepCount  int             `json:"step_count,omitempty"`
	CaptureDir string          `json:"capture_dir,omitempty"`
	Uploaded   []CaptureUpload `json:"uploaded,omitempty"`
	Error      string          `json:"error,omitempty"`
}

// CaptureResultStore is the slice of the store the worker needs.
type CaptureResultStore interface {
	UpdateGitHubCommitCapture(ctx context.Context, commitID uuid.UUID, captureOutput json.RawMessage) error
}

// CaptureResultWorker reads github.capture.results and persists the capture
// output (or failure marker) onto the originating github_commits row.
type CaptureResultWorker struct {
	consumer *kafka.Consumer
	store    CaptureResultStore
	logger   *observability.Logger
}

// NewCaptureResultWorker wires a consumer for the capture-result topic.
func NewCaptureResultWorker(brokers, groupID string, captureStore CaptureResultStore, logger *observability.Logger) *CaptureResultWorker {
	w := &CaptureResultWorker{
		store:  captureStore,
		logger: logger,
	}
	w.consumer = kafka.NewConsumer(brokers, groupID, TopicCaptureResults, w.handle, logger)
	return w
}

func (w *CaptureResultWorker) handle(ctx context.Context, key, value []byte) error {
	var msg CaptureResultMessage
	if err := json.Unmarshal(value, &msg); err != nil {
		return fmt.Errorf("failed to unmarshal capture result: %w", err)
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "commit_id", Value: msg.CommitID.String()},
		observability.Field{Key: "sha", Value: msg.SHA},
		observability.Field{Key: "success", Value: msg.Success},
	)

	// Persist the raw message (minus commit_id/sha which are already on the
	// row) so the UI can render uploaded media or the error marker. We keep
	// the shape compatible with the prior inline capture_output so the
	// frontend parser keeps working.
	var payload any
	if msg.Success {
		payload = map[string]any{
			"commit":      msg.SHA,
			"captureDir":  msg.CaptureDir,
			"stepCount":   msg.StepCount,
			"uploaded":    msg.Uploaded,
		}
	} else {
		errMsg := msg.Error
		if errMsg == "" {
			errMsg = "capture-worker reported failure without detail"
		}
		payload = map[string]any{"error": errMsg}
	}

	raw, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal capture_output: %w", err)
	}

	if err := w.store.UpdateGitHubCommitCapture(ctx, msg.CommitID, raw); err != nil {
		w.logger.Error(ctx, "failed to persist capture result", err)
		return err
	}
	return nil
}

// Start runs the consumer loop until ctx is cancelled.
func (w *CaptureResultWorker) Start(ctx context.Context) error {
	return w.consumer.Start(ctx)
}

// Name reports the worker name for the manager's log lines.
func (w *CaptureResultWorker) Name() string {
	return "github-capture-result-worker"
}
