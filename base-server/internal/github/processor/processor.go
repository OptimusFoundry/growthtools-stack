package processor

//go:generate go run go.uber.org/mock/mockgen@latest -source=processor.go -destination=mocks_test.go -package=processor

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"sync"
	"time"

	contentProc "base-server/internal/content/processor"
	githubclient "base-server/internal/infra/clients/github"
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

// GitHubStore defines the database operations required by GitHubProcessor
type GitHubStore interface {
	// Webhook event operations (pre-existing)
	CreateGitHubEvent(ctx context.Context, params store.CreateGitHubEventParams) (store.GitHubEvent, error)
	GetGitHubEventByDeliveryID(ctx context.Context, deliveryID string) (store.GitHubEvent, error)
	ListUnprocessedGitHubEvents(ctx context.Context, limit int) ([]store.GitHubEvent, error)
	MarkGitHubEventProcessed(ctx context.Context, id uuid.UUID, postID *uuid.UUID) error

	// OAuth connection operations
	CreateOrUpdateGitHubConnection(ctx context.Context, userID uuid.UUID, githubUserID int64, username, token, scope string) (store.GitHubConnection, error)
	GetGitHubConnectionByUserID(ctx context.Context, userID uuid.UUID) (store.GitHubConnection, error)
	GetGitHubConnectionByID(ctx context.Context, id uuid.UUID) (store.GitHubConnection, error)
	SoftDeleteGitHubConnection(ctx context.Context, userID uuid.UUID) error

	// Repo operations
	CreateGitHubRepo(ctx context.Context, connectionID uuid.UUID, ghRepoID int64, owner, name string, defaultBranch *string, webhookID *int64, webhookSecret string) (store.GitHubRepo, error)
	ListGitHubReposByConnection(ctx context.Context, connectionID uuid.UUID) ([]store.GitHubRepo, error)
	GetGitHubRepoByConnectionAndName(ctx context.Context, connectionID uuid.UUID, owner, name string) (store.GitHubRepo, error)
	GetGitHubRepoByGitHubID(ctx context.Context, githubRepoID int64) (store.GitHubRepo, error)
	GetGitHubRepoByOwnerName(ctx context.Context, owner, name string) (store.GitHubRepo, error)
	UpdateGitHubRepoID(ctx context.Context, repoID uuid.UUID, githubRepoID int64) error
	SoftDeleteGitHubRepo(ctx context.Context, repoID uuid.UUID) error

	// Commit operations
	InsertGitHubCommit(ctx context.Context, repoID uuid.UUID, sha string, authorName, authorEmail *string, message string, branch, commitURL *string, pushedAt time.Time, payload *json.RawMessage) (store.GitHubCommit, bool, error)
	GetGitHubCommitByRepoSHA(ctx context.Context, repoID uuid.UUID, sha string) (store.GitHubCommit, error)
	MarkGitHubCommitCaptureRequested(ctx context.Context, commitID uuid.UUID) (bool, error)
	UpdateGitHubCommitCapture(ctx context.Context, commitID uuid.UUID, captureOutput json.RawMessage) error
	UpdateGitHubCommitPostID(ctx context.Context, commitID, postID uuid.UUID) error
	ListGitHubCommitsByConnection(ctx context.Context, connectionID uuid.UUID, limit, offset int) ([]store.GitHubCommitSummary, error)
	CountGitHubCommitsByConnection(ctx context.Context, connectionID uuid.UUID) (int, error)
	GetGitHubCommitByIDForUser(ctx context.Context, userID, commitID uuid.UUID) (store.GitHubCommit, error)
	MarkGitHubCommitSkipped(ctx context.Context, commitID uuid.UUID, reason string) error
}

// CommitClassifier decides whether a pushed commit is worth running the
// capture + draft pipeline on. Returning an error is treated as fail-open
// by callers — the commit proceeds rather than being silently dropped.
type CommitClassifier interface {
	ClassifyCommit(ctx context.Context, message, diff string) (contentProc.CommitVerdict, error)
}

// GitHubClient defines the GitHub API calls required by GitHubProcessor
type GitHubClient interface {
	ExchangeOAuthCode(ctx context.Context, code string) (githubclient.OAuthTokenResponse, error)
	GetAuthenticatedUser(ctx context.Context, token string) (githubclient.GitHubUser, error)
	ListUserRepos(ctx context.Context, token string, page int) ([]githubclient.GitHubRepo, error)
	CreateWebhook(ctx context.Context, token, owner, name, webhookURL, secret string) (int64, error)
	DeleteWebhook(ctx context.Context, token, owner, name string, hookID int64) error
	GetRepoReadme(ctx context.Context, token, owner, name string) (string, error)
	GetCommitDiff(ctx context.Context, token, owner, name, sha string) (string, error)
}

// EventPublisher is the Kafka producer dependency (post and github both
// already use this shape elsewhere in the codebase).
type EventPublisher interface {
	Publish(ctx context.Context, topic, key string, payload any) error
}

// URLSigner turns a private storage key into a time-limited URL the browser
// can fetch directly. The S3 client implements this via presigned GetObject;
// bootstrap leaves it nil for local/dev storage.
type URLSigner interface {
	PresignGetURL(ctx context.Context, key string, ttl time.Duration) (string, error)
}

// presignTTL is how long the rewritten capture URLs stay valid. One hour is
// plenty for a browsing session and short enough that a leaked URL from a log
// doesn't hand out long-term access.
const presignTTL = time.Hour

var (
	ErrInvalidSignature    = errors.New("invalid webhook signature")
	ErrDuplicateEvent      = errors.New("duplicate webhook event")
	ErrInvalidOAuthState   = errors.New("invalid or expired oauth state")
	ErrOAuthExchangeFailed = errors.New("oauth code exchange failed")
	ErrConnectionNotFound  = errors.New("github connection not found")
	ErrRepoNotFound        = errors.New("github repo not found")
	ErrRepoAlreadyLinked   = errors.New("github repo already linked")
	ErrFailedDisconnect    = errors.New("failed to disconnect github")
	ErrCommitNotFound      = errors.New("github commit not found")
	ErrFailedGetCommit     = errors.New("failed to get github commit")
)

// oauthStateCache is a short-lived in-process store of state → userID.
// TODO: replace with Redis for multi-instance deployments.
type oauthStateEntry struct {
	userID    uuid.UUID
	expiresAt time.Time
}

type GitHubProcessor struct {
	store         GitHubStore
	githubClient  GitHubClient
	publisher     EventPublisher
	urlSigner     URLSigner
	classifier    CommitClassifier
	webhookSecret string
	webAppHost    string
	oauthClientID string
	// oauthStates maps random state string → oauthStateEntry. Pointer so
	// the processor can still be passed by value (sync.Map itself embeds
	// sync.noCopy and can't be copied).
	oauthStates *sync.Map
	logger      *observability.Logger
}

// SetURLSigner wires the presign dependency after construction so we don't
// churn every existing New/NewWithOAuth callsite in tests. Pass nil to leave
// capture URLs unrewritten (local/dev storage).
func (p *GitHubProcessor) SetURLSigner(signer URLSigner) {
	p.urlSigner = signer
}

// SetCommitClassifier wires the classifier that decides which pushed
// commits to run through capture + draft. Nil is allowed — the processor
// falls back to capturing every commit, matching the pre-filter behaviour.
func (p *GitHubProcessor) SetCommitClassifier(c CommitClassifier) {
	p.classifier = c
}

func New(store GitHubStore, webhookSecret string, logger *observability.Logger) GitHubProcessor {
	return GitHubProcessor{
		store:         store,
		webhookSecret: webhookSecret,
		oauthStates:   &sync.Map{},
		logger:        logger,
	}
}

// NewWithOAuth creates a GitHubProcessor with OAuth and webhook capabilities.
// publisher may be nil; when nil, commits are persisted but no capture is
// enqueued — useful in tests and local dev without Kafka.
func NewWithOAuth(
	store GitHubStore,
	githubClient GitHubClient,
	publisher EventPublisher,
	webhookSecret string,
	oauthClientID string,
	webAppHost string,
	logger *observability.Logger,
) GitHubProcessor {
	return GitHubProcessor{
		store:         store,
		githubClient:  githubClient,
		publisher:     publisher,
		webhookSecret: webhookSecret,
		oauthClientID: oauthClientID,
		webAppHost:    webAppHost,
		oauthStates:   &sync.Map{},
		logger:        logger,
	}
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

// ============================================================================
// OAuth flow
// ============================================================================

// AvailableRepo is a GitHub repo with a flag indicating whether it is already connected
type AvailableRepo struct {
	githubclient.GitHubRepo
	Connected bool `json:"connected"`
}

// generateState creates a cryptographically random hex string for use as OAuth state
func generateState() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("failed to generate random state: %w", err)
	}
	return hex.EncodeToString(b), nil
}

// generateSecret creates a cryptographically random hex string for use as webhook secret
func generateSecret() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("failed to generate webhook secret: %w", err)
	}
	return hex.EncodeToString(b), nil
}

// InitOAuth generates a random state, caches it, and returns the GitHub authorization URL
func (p *GitHubProcessor) InitOAuth(ctx context.Context, userID uuid.UUID) (string, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "user_id", Value: userID.String()},
		observability.Field{Key: "operation", Value: "init_oauth"},
	)

	state, err := generateState()
	if err != nil {
		p.logger.Error(ctx, "failed to generate oauth state", err)
		return "", ErrOAuthExchangeFailed
	}

	p.oauthStates.Store(state, oauthStateEntry{
		userID:    userID,
		expiresAt: time.Now().Add(10 * time.Minute),
	})

	authorizeURL := fmt.Sprintf(
		"https://github.com/login/oauth/authorize?client_id=%s&redirect_uri=%s&scope=repo&state=%s",
		p.oauthClientID,
		p.webAppHost+"/api/github/oauth/callback",
		state,
	)
	return authorizeURL, nil
}

// CompleteOAuth validates the state, exchanges the code, fetches the user, and persists the connection
func (p *GitHubProcessor) CompleteOAuth(ctx context.Context, state, code string) (uuid.UUID, error) {
	ctx = observability.WithFields(ctx, observability.Field{Key: "operation", Value: "complete_oauth"})

	raw, ok := p.oauthStates.LoadAndDelete(state)
	if !ok {
		return uuid.Nil, ErrInvalidOAuthState
	}
	entry := raw.(oauthStateEntry)
	if time.Now().After(entry.expiresAt) {
		return uuid.Nil, ErrInvalidOAuthState
	}

	ctx = observability.WithFields(ctx, observability.Field{Key: "user_id", Value: entry.userID.String()})

	tokenResp, err := p.githubClient.ExchangeOAuthCode(ctx, code)
	if err != nil {
		p.logger.Error(ctx, "failed to exchange oauth code", err)
		return uuid.Nil, ErrOAuthExchangeFailed
	}

	ghUser, err := p.githubClient.GetAuthenticatedUser(ctx, tokenResp.AccessToken)
	if err != nil {
		p.logger.Error(ctx, "failed to get github user", err)
		return uuid.Nil, ErrOAuthExchangeFailed
	}

	_, err = p.store.CreateOrUpdateGitHubConnection(ctx, entry.userID, ghUser.ID, ghUser.Login, tokenResp.AccessToken, tokenResp.Scope)
	if err != nil {
		p.logger.Error(ctx, "failed to store github connection", err)
		return uuid.Nil, ErrOAuthExchangeFailed
	}

	return entry.userID, nil
}

// GetConnection returns the stored GitHub connection for a user (token is stripped)
func (p *GitHubProcessor) GetConnection(ctx context.Context, userID uuid.UUID) (store.GitHubConnection, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "user_id", Value: userID.String()},
		observability.Field{Key: "operation", Value: "get_connection"},
	)

	conn, err := p.store.GetGitHubConnectionByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return store.GitHubConnection{}, ErrConnectionNotFound
		}
		p.logger.Error(ctx, "failed to get github connection", err)
		return store.GitHubConnection{}, ErrConnectionNotFound
	}
	// Strip token before returning
	conn.AccessToken = ""
	return conn, nil
}

// Disconnect deletes webhooks (best-effort) then soft-deletes connection + repos
func (p *GitHubProcessor) Disconnect(ctx context.Context, userID uuid.UUID) error {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "user_id", Value: userID.String()},
		observability.Field{Key: "operation", Value: "disconnect"},
	)

	conn, err := p.store.GetGitHubConnectionByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return ErrConnectionNotFound
		}
		p.logger.Error(ctx, "failed to get github connection for disconnect", err)
		return ErrFailedDisconnect
	}

	repos, err := p.store.ListGitHubReposByConnection(ctx, conn.ID)
	if err != nil {
		p.logger.Error(ctx, "failed to list github repos for disconnect", err)
		// Continue anyway — soft-delete is more important
	}

	for _, repo := range repos {
		if repo.WebhookID != nil {
			if delErr := p.githubClient.DeleteWebhook(ctx, conn.AccessToken, repo.Owner, repo.Name, *repo.WebhookID); delErr != nil {
				// Best-effort: log but continue
				p.logger.Error(ctx, fmt.Sprintf("failed to delete webhook for repo %s/%s", repo.Owner, repo.Name), delErr)
			}
		}
	}

	if err := p.store.SoftDeleteGitHubConnection(ctx, userID); err != nil {
		p.logger.Error(ctx, "failed to soft-delete github connection", err)
		return ErrFailedDisconnect
	}
	return nil
}

// ListAvailableRepos fetches repos from GitHub and marks which are already connected
func (p *GitHubProcessor) ListAvailableRepos(ctx context.Context, userID uuid.UUID, page int) ([]AvailableRepo, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "user_id", Value: userID.String()},
		observability.Field{Key: "operation", Value: "list_available_repos"},
	)

	conn, err := p.store.GetGitHubConnectionByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, ErrConnectionNotFound
		}
		p.logger.Error(ctx, "failed to get github connection", err)
		return nil, ErrConnectionNotFound
	}

	ghRepos, err := p.githubClient.ListUserRepos(ctx, conn.AccessToken, page)
	if err != nil {
		p.logger.Error(ctx, "failed to list github repos from api", err)
		return nil, ErrFailedDisconnect
	}

	// Build a set of connected (owner, name) pairs
	localRepos, err := p.store.ListGitHubReposByConnection(ctx, conn.ID)
	if err != nil {
		p.logger.Error(ctx, "failed to list local github repos", err)
		// Non-fatal — just won't mark repos as connected
	}
	connectedSet := make(map[string]bool, len(localRepos))
	for _, r := range localRepos {
		connectedSet[r.Owner+"/"+r.Name] = true
	}

	result := make([]AvailableRepo, len(ghRepos))
	for i, r := range ghRepos {
		result[i] = AvailableRepo{
			GitHubRepo: r,
			Connected:  connectedSet[r.Owner.Login+"/"+r.Name],
		}
	}
	return result, nil
}

// ConnectRepo registers a webhook and stores the repo row
func (p *GitHubProcessor) ConnectRepo(ctx context.Context, userID uuid.UUID, owner, name string) (store.GitHubRepo, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "user_id", Value: userID.String()},
		observability.Field{Key: "repo", Value: owner + "/" + name},
		observability.Field{Key: "operation", Value: "connect_repo"},
	)

	conn, err := p.store.GetGitHubConnectionByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return store.GitHubRepo{}, ErrConnectionNotFound
		}
		p.logger.Error(ctx, "failed to get github connection", err)
		return store.GitHubRepo{}, ErrConnectionNotFound
	}

	secret, err := generateSecret()
	if err != nil {
		p.logger.Error(ctx, "failed to generate webhook secret", err)
		return store.GitHubRepo{}, ErrFailedDisconnect
	}

	webhookURL := p.webAppHost + "/api/github/webhook"
	hookID, err := p.githubClient.CreateWebhook(ctx, conn.AccessToken, owner, name, webhookURL, secret)
	if err != nil {
		p.logger.Error(ctx, "failed to create github webhook", err)
		return store.GitHubRepo{}, ErrFailedDisconnect
	}

	// We don't have the GitHub repo ID here without an extra API call.
	// Use 0 as a sentinel; a follow-up can enrich this from the webhook payload.
	var defaultBranch *string
	hookIDPtr := &hookID

	repo, err := p.store.CreateGitHubRepo(ctx, conn.ID, 0, owner, name, defaultBranch, hookIDPtr, secret)
	if err != nil {
		p.logger.Error(ctx, "failed to store github repo", err)
		return store.GitHubRepo{}, ErrFailedDisconnect
	}
	return repo, nil
}

// DisconnectRepo removes the webhook and soft-deletes the repo row
func (p *GitHubProcessor) DisconnectRepo(ctx context.Context, userID uuid.UUID, owner, name string) error {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "user_id", Value: userID.String()},
		observability.Field{Key: "repo", Value: owner + "/" + name},
		observability.Field{Key: "operation", Value: "disconnect_repo"},
	)

	conn, err := p.store.GetGitHubConnectionByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return ErrConnectionNotFound
		}
		p.logger.Error(ctx, "failed to get github connection", err)
		return ErrConnectionNotFound
	}

	repo, err := p.store.GetGitHubRepoByConnectionAndName(ctx, conn.ID, owner, name)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return ErrRepoNotFound
		}
		p.logger.Error(ctx, "failed to get github repo", err)
		return ErrRepoNotFound
	}

	if repo.WebhookID != nil {
		if delErr := p.githubClient.DeleteWebhook(ctx, conn.AccessToken, owner, name, *repo.WebhookID); delErr != nil {
			// Best-effort: log but continue to soft-delete
			p.logger.Error(ctx, "failed to delete webhook during repo disconnect", delErr)
		}
	}

	if err := p.store.SoftDeleteGitHubRepo(ctx, repo.ID); err != nil {
		p.logger.Error(ctx, "failed to soft-delete github repo", err)
		return ErrFailedDisconnect
	}
	return nil
}

// GetCommit returns a single commit scoped to the requesting user's connection.
// The store query filters on user_id so a mismatched owner reads as not-found.
func (p *GitHubProcessor) GetCommit(ctx context.Context, userID, commitID uuid.UUID) (store.GitHubCommit, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "user_id", Value: userID.String()},
		observability.Field{Key: "commit_id", Value: commitID.String()},
		observability.Field{Key: "operation", Value: "get_commit"},
	)

	commit, err := p.store.GetGitHubCommitByIDForUser(ctx, userID, commitID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return store.GitHubCommit{}, ErrCommitNotFound
		}
		p.logger.Error(ctx, "failed to get github commit", err)
		return store.GitHubCommit{}, ErrFailedGetCommit
	}
	p.rewriteCaptureURLs(ctx, &commit)
	return commit, nil
}

// ListRecentCommits returns a page of commits across all repos for a user's
// connection along with the total row count so the UI can render full page
// navigation.
func (p *GitHubProcessor) ListRecentCommits(ctx context.Context, userID uuid.UUID, limit, offset int) ([]store.GitHubCommitSummary, int, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "user_id", Value: userID.String()},
		observability.Field{Key: "operation", Value: "list_recent_commits"},
	)

	conn, err := p.store.GetGitHubConnectionByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, 0, ErrConnectionNotFound
		}
		p.logger.Error(ctx, "failed to get github connection", err)
		return nil, 0, ErrConnectionNotFound
	}

	total, err := p.store.CountGitHubCommitsByConnection(ctx, conn.ID)
	if err != nil {
		p.logger.Error(ctx, "failed to count github commits", err)
		return nil, 0, ErrFailedDisconnect
	}

	commits, err := p.store.ListGitHubCommitsByConnection(ctx, conn.ID, limit, offset)
	if err != nil {
		p.logger.Error(ctx, "failed to list github commits", err)
		return nil, 0, ErrFailedDisconnect
	}

	// Summaries carry only a capture_artifact_count + capture_error; the full
	// capture_output (and therefore url rewriting) is GetCommit's job.
	return commits, total, nil
}

// captureOutputForRewrite mirrors the subset of capture_output we touch when
// rewriting URLs. We read into this shape, swap the urls, and marshal back.
type captureOutputForRewrite struct {
	Commit     string                `json:"commit,omitempty"`
	CaptureDir string                `json:"captureDir,omitempty"`
	StepCount  int                   `json:"stepCount,omitempty"`
	Uploaded   []captureUploadedItem `json:"uploaded,omitempty"`
	Error      string                `json:"error,omitempty"`
}

type captureUploadedItem struct {
	Key string `json:"key"`
	URL string `json:"url,omitempty"`
}

// rewriteCaptureURLs replaces `s3://bucket/key` entries in the commit's
// capture_output with presigned HTTPS URLs so the browser can fetch the
// artefacts directly. Any failure to parse or presign is logged and the
// original URL is left intact — a stale s3:// URL is no worse than dropping
// the commit entirely.
func (p *GitHubProcessor) rewriteCaptureURLs(ctx context.Context, commit *store.GitHubCommit) {
	if p.urlSigner == nil || commit == nil || commit.CaptureOutput == nil {
		return
	}

	var output captureOutputForRewrite
	if err := json.Unmarshal(*commit.CaptureOutput, &output); err != nil {
		p.logger.Error(ctx, "failed to decode capture_output for url rewrite", err)
		return
	}

	changed := false
	for i := range output.Uploaded {
		item := &output.Uploaded[i]
		if !strings.HasPrefix(item.URL, "s3://") {
			continue
		}
		// s3://bucket/key → split on first "/" after the scheme prefix.
		rest := strings.TrimPrefix(item.URL, "s3://")
		slash := strings.IndexByte(rest, '/')
		if slash < 0 {
			continue
		}
		key := rest[slash+1:]
		if key == "" {
			continue
		}
		signed, err := p.urlSigner.PresignGetURL(ctx, key, presignTTL)
		if err != nil {
			p.logger.Error(ctx, "failed to presign capture url", err)
			continue
		}
		item.URL = signed
		changed = true
	}

	if !changed {
		return
	}

	raw, err := json.Marshal(output)
	if err != nil {
		p.logger.Error(ctx, "failed to re-encode capture_output after url rewrite", err)
		return
	}
	rawMsg := json.RawMessage(raw)
	commit.CaptureOutput = &rawMsg
}
