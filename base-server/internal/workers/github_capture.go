package workers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"base-server/internal/infra/clients/kafka"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// TopicCaptureResults is where the capture-worker publishes outcomes. Name is
// mirrored in the github processor (TopicCaptureRequests is the request side).
const TopicCaptureResults = "github.capture.results"

// TopicDraftGenerate is the topic CaptureResultWorker publishes to after
// persisting a successful capture. DraftGeneratorWorker consumes it and
// produces an AI draft post from the commit + captured media.
const TopicDraftGenerate = "github.draft.generate"

// TopicBlogGenerate is published alongside TopicDraftGenerate on a
// successful capture. BlogGeneratorWorker consumes it and produces a
// long-form blog-post draft from the commit + captured artefacts.
const TopicBlogGenerate = "github.blog.generate"

// TopicShowcaseDraftGenerate is published after a capture result is routed
// to a showcase_jobs row (rather than a github_commits row).
// ShowcaseDraftGeneratorWorker consumes it and produces a draft post from
// the brief + captured artefacts.
const TopicShowcaseDraftGenerate = "showcase.draft.generate"

// DraftGenerateEvent is the github.draft.generate message body.
type DraftGenerateEvent struct {
	CommitID uuid.UUID `json:"commit_id"`
}

// BlogGenerateEvent is the github.blog.generate message body.
type BlogGenerateEvent struct {
	CommitID uuid.UUID `json:"commit_id"`
}

// ShowcaseDraftGenerateEvent is the showcase.draft.generate message body.
type ShowcaseDraftGenerateEvent struct {
	JobID uuid.UUID `json:"job_id"`
}

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
	UpdateShowcaseJobCapture(ctx context.Context, jobID uuid.UUID, captureOutput json.RawMessage) error
	UpdateShowcaseJobFailed(ctx context.Context, jobID uuid.UUID, errMsg string) error
}

// DraftEventPublisher is the Kafka producer dependency used to fan out a
// draft-generation request after a successful capture.
type DraftEventPublisher interface {
	Publish(ctx context.Context, topic, key string, payload any) error
}

// CaptureResultWorker reads github.capture.results and persists the capture
// output (or failure marker) onto the originating github_commits row. On
// success it also publishes github.draft.generate so the draft-generator
// worker can pick the commit up asynchronously.
type CaptureResultWorker struct {
	consumer  *kafka.Consumer
	store     CaptureResultStore
	publisher DraftEventPublisher
	logger    *observability.Logger
}

// NewCaptureResultWorker wires a consumer for the capture-result topic.
// publisher may be nil; when nil the worker still persists capture_output but
// skips emitting the draft-generate event (useful in tests/local dev).
func NewCaptureResultWorker(brokers, groupID string, captureStore CaptureResultStore, publisher DraftEventPublisher, logger *observability.Logger) *CaptureResultWorker {
	w := &CaptureResultWorker{
		store:     captureStore,
		publisher: publisher,
		logger:    logger,
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
			"commit":     msg.SHA,
			"captureDir": msg.CaptureDir,
			"stepCount":  msg.StepCount,
			"uploaded":   msg.Uploaded,
		}
	} else {
		errMsg := msg.Error
		if errMsg == "" {
			errMsg = "capture-worker reported failure without detail"
		}
		// Include any salvaged artifacts (plan.json, partial transcripts,
		// explore screenshots) so the commit detail page can link to them
		// for debugging even when the run failed.
		failurePayload := map[string]any{"error": errMsg}
		if len(msg.Uploaded) > 0 {
			failurePayload["uploaded"] = msg.Uploaded
		}
		if msg.CaptureDir != "" {
			failurePayload["captureDir"] = msg.CaptureDir
		}
		payload = failurePayload
	}

	raw, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal capture_output: %w", err)
	}

	branch, err := w.persistCapture(ctx, msg, raw)
	if err != nil {
		w.logger.Error(ctx, "failed to persist capture result", err)
		return err
	}

	switch branch {
	case "":
		// Matched neither table — already logged in persistCapture. Drop the
		// message; there's nothing to route it to.
		return nil
	case "showcase":
		if !msg.Success {
			if err := w.store.UpdateShowcaseJobFailed(ctx, msg.CommitID, msg.Error); err != nil {
				w.logger.Error(ctx, "failed to mark showcase job failed", err)
				return err
			}
			return nil
		}
		if w.publisher != nil {
			event := ShowcaseDraftGenerateEvent{JobID: msg.CommitID}
			if err := w.publisher.Publish(ctx, TopicShowcaseDraftGenerate, msg.CommitID.String(), event); err != nil {
				w.logger.Error(ctx, "failed to publish showcase.draft.generate event", err)
			}
		}
		return nil
	default: // "github"
		// Fan out to both the draft and the blog generator on success only —
		// failed captures don't produce usable artefacts. The two publishes are
		// independent: a failure on one is logged but does not prevent the other.
		if msg.Success && w.publisher != nil {
			draftEvent := DraftGenerateEvent{CommitID: msg.CommitID}
			if err := w.publisher.Publish(ctx, TopicDraftGenerate, msg.CommitID.String(), draftEvent); err != nil {
				w.logger.Error(ctx, "failed to publish draft.generate event", err)
			}

			blogEvent := BlogGenerateEvent{CommitID: msg.CommitID}
			if err := w.publisher.Publish(ctx, TopicBlogGenerate, msg.CommitID.String(), blogEvent); err != nil {
				w.logger.Error(ctx, "failed to publish blog.generate event", err)
			}
		}
		return nil
	}
}

// persistCapture writes the capture result onto the row it belongs to. It
// tries github_commits first (the common case), and falls back to
// showcase_jobs when the commit_id doesn't match a github_commits row. It
// returns which branch the write landed on ("github"/"showcase"), or ""
// when neither table has a matching row (message dropped).
func (w *CaptureResultWorker) persistCapture(ctx context.Context, msg CaptureResultMessage, raw json.RawMessage) (string, error) {
	err := w.store.UpdateGitHubCommitCapture(ctx, msg.CommitID, raw)
	if err == nil {
		return "github", nil
	}
	if !errors.Is(err, store.ErrNotFound) {
		return "", err
	}

	err = w.store.UpdateShowcaseJobCapture(ctx, msg.CommitID, raw)
	if err == nil {
		return "showcase", nil
	}
	if !errors.Is(err, store.ErrNotFound) {
		return "", err
	}

	w.logger.Warn(ctx, "capture result matched neither github_commits nor showcase_jobs")
	return "", nil
}

// Start runs the consumer loop until ctx is cancelled.
func (w *CaptureResultWorker) Start(ctx context.Context) error {
	return w.consumer.Start(ctx)
}

// Name reports the worker name for the manager's log lines.
func (w *CaptureResultWorker) Name() string {
	return "github-capture-result-worker"
}
