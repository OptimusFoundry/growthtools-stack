package processor

//go:generate go run go.uber.org/mock/mockgen@latest -source=processor.go -destination=mocks_test.go -package=processor

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"time"

	"base-server/internal/ai/commitclassifier"
	githubclient "base-server/internal/infra/clients/github"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

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
	ErrGitHubNotConnected  = errors.New("github account not connected")
	ErrSitePublishFailed   = errors.New("site publish failed")
)

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
	GetGitHubRepoByID(ctx context.Context, repoID uuid.UUID) (store.GitHubRepo, error)
	UpdateGitHubRepoID(ctx context.Context, repoID uuid.UUID, githubRepoID int64) error
	SoftDeleteGitHubRepo(ctx context.Context, repoID uuid.UUID) error

	// Commit operations
	InsertGitHubCommit(ctx context.Context, repoID uuid.UUID, sha string, authorName, authorEmail *string, message string, branch, commitURL *string, pushedAt time.Time, payload *json.RawMessage) (store.GitHubCommit, bool, error)
	GetGitHubCommitByRepoSHA(ctx context.Context, repoID uuid.UUID, sha string) (store.GitHubCommit, error)
	MarkGitHubCommitCaptureRequested(ctx context.Context, commitID uuid.UUID) (bool, error)
	ResetGitHubCommitCapture(ctx context.Context, commitID uuid.UUID) error
	UpdateGitHubCommitCapture(ctx context.Context, commitID uuid.UUID, captureOutput json.RawMessage) error
	UpdateGitHubCommitPostID(ctx context.Context, commitID, postID uuid.UUID) error
	ListGitHubCommitsByConnection(ctx context.Context, connectionID uuid.UUID, limit, offset int) ([]store.GitHubCommitSummary, error)
	CountGitHubCommitsByConnection(ctx context.Context, connectionID uuid.UUID) (int, error)
	GetGitHubCommitByIDForUser(ctx context.Context, userID, commitID uuid.UUID) (store.GitHubCommit, error)
	MarkGitHubCommitSkipped(ctx context.Context, commitID uuid.UUID, reason string) error

	// Blog site-publish operations
	GetAccountByID(ctx context.Context, accountID uuid.UUID) (store.Account, error)
	GetSitePublishTargetByAccount(ctx context.Context, accountID uuid.UUID) (store.SitePublishTarget, error)
	GetMediaByIDs(ctx context.Context, ids []uuid.UUID) ([]store.Media, error)
}

// CommitClassifier decides whether a pushed commit is worth running the
// capture + draft pipeline on. Returning an error is treated as fail-open
// by callers — the commit proceeds rather than being silently dropped.
type CommitClassifier interface {
	Classify(ctx context.Context, message, diff string) (commitclassifier.Verdict, error)
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
	CreateBranch(ctx context.Context, token, owner, repo, baseBranch, newBranch string) error
	CreateOrUpdateFileContents(ctx context.Context, token, owner, repo, filePath, branch string, content []byte, commitMessage string) error
	CreatePullRequest(ctx context.Context, token, owner, repo, headBranch, baseBranch, title, body string) (string, error)
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
	publicURLBase string
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

// SetPublicURLBase wires the base URL used to rewrite s3 media keys into
// permanent public URLs when publishing blog posts to the external site.
func (p *GitHubProcessor) SetPublicURLBase(base string) {
	p.publicURLBase = base
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
