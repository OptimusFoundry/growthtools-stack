package processor

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// TopicCaptureRequests is the Kafka topic base-server publishes to when a
// commit should be handed off to the capture-worker. The capture-worker
// consumes this and publishes outcomes to TopicCaptureResults.
const TopicCaptureRequests = "github.capture.requests"

// CaptureRequest is the github.capture.requests message body.
type CaptureRequest struct {
	CommitID uuid.UUID `json:"commit_id"`
	SHA      string    `json:"sha"`
	Owner    string    `json:"owner"`
	Repo     string    `json:"repo"`
	Message  string    `json:"message"`
	// Diff is the unified diff fetched from GitHub server-side using the
	// user's OAuth token, so the capture-worker doesn't need a local git
	// checkout or any credentials of its own. May be empty for commits
	// GitHub considers too large to render.
	Diff   string `json:"diff,omitempty"`
	AppURL string `json:"app_url,omitempty"`
}

// pushPayload is the subset of GitHub's push-event payload we actually use.
// Full schema: https://docs.github.com/en/webhooks/webhook-events-and-payloads#push
type pushPayload struct {
	Ref        string `json:"ref"` // e.g. refs/heads/main
	Repository struct {
		ID       int64  `json:"id"`
		Name     string `json:"name"`
		FullName string `json:"full_name"` // "owner/repo"
		Owner    struct {
			Login string `json:"login"`
		} `json:"owner"`
	} `json:"repository"`
	Commits []struct {
		ID        string `json:"id"` // SHA
		Message   string `json:"message"`
		URL       string `json:"url"`
		Timestamp string `json:"timestamp"`
		Author    struct {
			Name  string `json:"name"`
			Email string `json:"email"`
		} `json:"author"`
	} `json:"commits"`
}

// workflowRunPayload is the subset of GitHub's workflow_run-event payload we
// care about. We gate capture on conclusion=="success" so the agent only
// runs against commits the user has actually deployed.
// Schema: https://docs.github.com/en/webhooks/webhook-events-and-payloads#workflow_run
type workflowRunPayload struct {
	Action      string `json:"action"` // "requested" | "in_progress" | "completed"
	WorkflowRun struct {
		ID         int64  `json:"id"`
		HeadSHA    string `json:"head_sha"`
		HeadBranch string `json:"head_branch"`
		Status     string `json:"status"`     // "queued" | "in_progress" | "completed"
		Conclusion string `json:"conclusion"` // "success" | "failure" | ...
		Name       string `json:"name"`
	} `json:"workflow_run"`
}

// validateSignatureWith verifies the HMAC-SHA256 signature against an
// explicit secret (the per-repo webhook_secret).
func validateSignatureWith(payload []byte, signature, secret string) error {
	if !strings.HasPrefix(signature, "sha256=") {
		return ErrInvalidSignature
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expectedSig := "sha256=" + hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(signature), []byte(expectedSig)) {
		return ErrInvalidSignature
	}
	return nil
}

// HandleWebhookEvent routes a signed webhook delivery:
//  1. Dedupe on delivery_id.
//  2. Parse the payload enough to find the repo (untrusted until signature
//     is verified against that repo's webhook_secret).
//  3. Verify signature with the per-repo secret.
//  4. Persist the raw event, then for push events write each commit and
//     asynchronously fan out to the capture-worker.
func (p *GitHubProcessor) HandleWebhookEvent(ctx context.Context, deliveryID string, eventType string, payload []byte, signature string) error {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "delivery_id", Value: deliveryID},
		observability.Field{Key: "event_type", Value: eventType},
		observability.Field{Key: "operation", Value: "handle_webhook_event"},
	)

	// 1. Dedupe.
	_, err := p.store.GetGitHubEventByDeliveryID(ctx, deliveryID)
	if err == nil {
		p.logger.Warn(ctx, "duplicate webhook event received")
		return ErrDuplicateEvent
	}
	if !errors.Is(err, store.ErrNotFound) {
		p.logger.Error(ctx, "failed to check for duplicate event", err)
		return err
	}

	// 2. Find the repo. All of GitHub's event payloads include a
	//    "repository" object, so we can pre-parse it to look up the
	//    per-repo secret. If the event has no repository field (e.g.
	//    meta / ping), fall back to the global secret.
	var envelope struct {
		Repository struct {
			ID       int64  `json:"id"`
			Name     string `json:"name"`
			FullName string `json:"full_name"`
			Owner    struct {
				Login string `json:"login"`
			} `json:"owner"`
		} `json:"repository"`
	}
	_ = json.Unmarshal(payload, &envelope) // best-effort; zero-value is fine

	var repo store.GitHubRepo
	var repoFound bool
	if envelope.Repository.ID > 0 {
		if r, lookupErr := p.store.GetGitHubRepoByGitHubID(ctx, envelope.Repository.ID); lookupErr == nil {
			repo = r
			repoFound = true
		}
	}
	if !repoFound && envelope.Repository.Owner.Login != "" && envelope.Repository.Name != "" {
		if r, lookupErr := p.store.GetGitHubRepoByOwnerName(ctx, envelope.Repository.Owner.Login, envelope.Repository.Name); lookupErr == nil {
			repo = r
			repoFound = true
		}
	}

	// 3. Verify signature. Prefer per-repo secret, fall back to the
	//    global one so ping deliveries at App-install time still pass.
	secret := p.webhookSecret
	if repoFound && repo.WebhookSecret != "" {
		secret = repo.WebhookSecret
	}
	if err := validateSignatureWith(payload, signature, secret); err != nil {
		p.logger.Warn(ctx, "invalid webhook signature received")
		return ErrInvalidSignature
	}

	// 4. If no repo is linked to this delivery we have no account to attribute
	//    the event to, so we acknowledge it (200) without persisting.
	if !repoFound {
		return nil
	}

	// Persist the raw event now that we have a valid account_id from the repo.
	if _, err := p.store.CreateGitHubEvent(ctx, store.CreateGitHubEventParams{
		AccountID:  repo.AccountID,
		RepoName:   repo.Owner + "/" + repo.Name,
		EventType:  eventType,
		DeliveryID: deliveryID,
		Payload:    store.JSONB{},
	}); err != nil {
		p.logger.Error(ctx, "failed to persist GitHub event", err)
		return err
	}

	// Backfill github_repo_id if we connected before knowing it.
	if repo.GitHubRepoID == 0 && envelope.Repository.ID > 0 {
		if err := p.store.UpdateGitHubRepoID(ctx, repo.ID, envelope.Repository.ID); err != nil {
			p.logger.Error(ctx, "failed to backfill github_repo_id", err)
		} else {
			repo.GitHubRepoID = envelope.Repository.ID
		}
	}

	switch eventType {
	case "push":
		return p.handlePush(ctx, repo, payload)
	case "workflow_run":
		return p.handleWorkflowRun(ctx, repo, payload)
	}
	return nil
}

// handlePush persists commits from a push delivery but does NOT enqueue
// capture yet — we wait until workflow_run tells us CI finished, so the
// Playwright agent runs against the deployed version of the code, not the
// version from 30s ago that's still building.
func (p *GitHubProcessor) handlePush(ctx context.Context, repo store.GitHubRepo, payload []byte) error {
	var push pushPayload
	if err := json.Unmarshal(payload, &push); err != nil {
		p.logger.Error(ctx, "failed to parse push payload", err)
		return nil // event is persisted; don't force GitHub to retry
	}

	branch := strings.TrimPrefix(push.Ref, "refs/heads/")
	for _, c := range push.Commits {
		pushedAt, timeErr := time.Parse(time.RFC3339, c.Timestamp)
		if timeErr != nil {
			pushedAt = time.Now().UTC()
		}
		authorName := c.Author.Name
		authorEmail := c.Author.Email
		branchCopy := branch
		urlCopy := c.URL

		if _, _, insErr := p.store.InsertGitHubCommit(
			ctx,
			repo.ID,
			c.ID,
			&authorName,
			&authorEmail,
			c.Message,
			&branchCopy,
			&urlCopy,
			pushedAt,
			nil,
		); insErr != nil {
			p.logger.Error(ctx, fmt.Sprintf("failed to insert commit %s", c.ID), insErr)
		}
	}
	return nil
}

// handleWorkflowRun fires when a GitHub Actions run reports completed.
// Only the first successful workflow_run per commit_sha kicks off the
// capture pipeline — MarkGitHubCommitCaptureRequested enforces idempotency,
// so multiple successful workflows on the same SHA still trigger one run.
func (p *GitHubProcessor) handleWorkflowRun(ctx context.Context, repo store.GitHubRepo, payload []byte) error {
	var run workflowRunPayload
	if err := json.Unmarshal(payload, &run); err != nil {
		p.logger.Error(ctx, "failed to parse workflow_run payload", err)
		return nil
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "workflow_name", Value: run.WorkflowRun.Name},
		observability.Field{Key: "workflow_conclusion", Value: run.WorkflowRun.Conclusion},
		observability.Field{Key: "head_sha", Value: run.WorkflowRun.HeadSHA},
	)

	if run.Action != "completed" || run.WorkflowRun.Conclusion != "success" {
		return nil
	}

	commit, err := p.store.GetGitHubCommitByRepoSHA(ctx, repo.ID, run.WorkflowRun.HeadSHA)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			// Workflow ran against a commit we never saw a push for (e.g.
			// the repo was connected after it was pushed). Nothing to do.
			p.logger.Warn(ctx, "workflow_run for unknown commit; skipping")
			return nil
		}
		p.logger.Error(ctx, "failed to look up commit for workflow_run", err)
		return nil
	}

	claimed, err := p.store.MarkGitHubCommitCaptureRequested(ctx, commit.ID)
	if err != nil {
		p.logger.Error(ctx, "failed to mark commit capture_requested_at", err)
		return nil
	}
	if !claimed {
		// Another workflow_run:completed:success for the same commit
		// already kicked this off.
		return nil
	}

	if p.publisher == nil {
		return nil
	}
	p.enqueueCaptureRequests(context.WithoutCancel(ctx), repo, []store.GitHubCommit{commit})
	return nil
}

// appURLFromReadme extracts the first app URL advertised in a README.
// Policy: README always contains the app URL (per project convention);
// we scan for the first https:// token that points at something other
// than github.com. Returns "" if nothing sensible is found so the
// caller can fall through to APP_URL env default.
var readmeURLRE = regexp.MustCompile(`https?://[^\s)>"']+`)

func appURLFromReadme(readme string) string {
	for _, candidate := range readmeURLRE.FindAllString(readme, -1) {
		// Strip trailing punctuation that markdown likes to leave behind.
		candidate = strings.TrimRight(candidate, ".,;:)")
		lower := strings.ToLower(candidate)
		if strings.Contains(lower, "github.com") || strings.Contains(lower, "githubusercontent.com") {
			continue
		}
		if strings.Contains(lower, "shields.io") || strings.Contains(lower, "badge") {
			continue
		}
		return candidate
	}
	return ""
}

// enqueueCaptureRequests publishes one github.capture.requests message per
// newly-inserted commit. The app URL (when derivable) comes from the repo
// README, and the unified diff comes from GitHub's API — both are fetched
// server-side using the user's stored OAuth token so the capture-worker
// never needs any credentials or a local git checkout of its own.
func (p *GitHubProcessor) enqueueCaptureRequests(ctx context.Context, repo store.GitHubRepo, commits []store.GitHubCommit) {
	// Borrow the user's token. connection_id on the repo points at the
	// github_connections PK, not the user id — GetGitHubConnectionByID is
	// the right lookup.
	conn, err := p.store.GetGitHubConnectionByID(ctx, repo.ConnectionID)
	if err != nil {
		p.logger.Error(ctx, "failed to load github connection for capture enqueue", err)
		return
	}

	// One README lookup per push.
	var appURL string
	if readme, readmeErr := p.githubClient.GetRepoReadme(ctx, conn.AccessToken, repo.Owner, repo.Name); readmeErr == nil {
		appURL = appURLFromReadme(readme)
	}

	const maxDiffChars = 40_000
	for _, commit := range commits {
		// Fetch the diff per commit. Failures are non-fatal — the capture
		// agent can still work off just the commit message.
		diff, diffErr := p.githubClient.GetCommitDiff(ctx, conn.AccessToken, repo.Owner, repo.Name, commit.SHA)
		if diffErr != nil {
			p.logger.Error(ctx, fmt.Sprintf("failed to fetch commit diff for %s", commit.SHA), diffErr)
		}
		if len(diff) > maxDiffChars {
			diff = diff[:maxDiffChars] + "\n… [truncated]"
		}

		// AI-driven filter: drop commits that aren't worth the capture +
		// post cost. Nil classifier or classifier errors fall through —
		// we'd rather capture noise than silently swallow a user feature.
		if p.classifier != nil {
			verdict, classifyErr := p.classifier.ClassifyCommit(ctx, commit.Message, diff)
			if classifyErr != nil {
				p.logger.Error(ctx, fmt.Sprintf("commit classifier failed for %s; proceeding with capture", commit.SHA), classifyErr)
			} else if !verdict.Worthwhile {
				p.logger.Info(ctx, fmt.Sprintf("skipping commit %s: %s", commit.SHA, verdict.Reason))
				if markErr := p.store.MarkGitHubCommitSkipped(ctx, commit.ID, verdict.Reason); markErr != nil {
					p.logger.Error(ctx, fmt.Sprintf("failed to persist skip reason for %s", commit.SHA), markErr)
				}
				continue
			} else {
				p.logger.Info(ctx, fmt.Sprintf("capturing commit %s: %s", commit.SHA, verdict.Reason))
			}
		}

		req := CaptureRequest{
			CommitID: commit.ID,
			SHA:      commit.SHA,
			Owner:    repo.Owner,
			Repo:     repo.Name,
			Message:  commit.Message,
			Diff:     diff,
			AppURL:   appURL,
		}
		if err := p.publisher.Publish(ctx, TopicCaptureRequests, commit.ID.String(), req); err != nil {
			p.logger.Error(ctx, fmt.Sprintf("failed to enqueue capture request for %s", commit.SHA), err)
		}
	}
}
