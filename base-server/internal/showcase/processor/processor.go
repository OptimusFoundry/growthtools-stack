package processor

//go:generate go run go.uber.org/mock/mockgen@latest -source=processor.go -destination=mocks_test.go -package=processor

import (
	"context"
	"errors"
	"fmt"

	"base-server/internal/ai/componentmatcher"
	githubProcessor "base-server/internal/github/processor"
	storybookclient "base-server/internal/infra/clients/storybook"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// ShowcaseStore defines the database operations required by ShowcaseProcessor.
type ShowcaseStore interface {
	GetAccountByID(ctx context.Context, accountID uuid.UUID) (store.Account, error)
	GetGitHubConnectionByUserID(ctx context.Context, userID uuid.UUID) (store.GitHubConnection, error)
	ListGitHubReposByConnection(ctx context.Context, connectionID uuid.UUID) ([]store.GitHubRepo, error)
	CreateShowcaseJob(ctx context.Context, params store.CreateShowcaseJobParams) (store.ShowcaseJob, error)
	UpdateShowcaseJobStatus(ctx context.Context, jobID uuid.UUID, status string) error
	UpdateShowcaseJobFailed(ctx context.Context, jobID uuid.UUID, errMsg string) error
}

// StorybookClient defines the Storybook index fetch operation required by
// ShowcaseProcessor.
type StorybookClient interface {
	FetchIndex(ctx context.Context, baseURL string) (storybookclient.Index, error)
}

// EventPublisher defines the Kafka publish operation required by
// ShowcaseProcessor.
type EventPublisher interface {
	Publish(ctx context.Context, topic, key string, payload any) error
}

var (
	ErrStorybookNotConfigured = errors.New("account has no repo with storybook configured")
	ErrNoComponentMatch       = errors.New("brief did not confidently match a single component")
	ErrPublishFailed          = errors.New("failed to enqueue showcase capture request")
)

// ShowcaseProcessor implements the business logic for turning a natural
// language brief into a queued showcase capture job.
type ShowcaseProcessor struct {
	store           ShowcaseStore
	storybookClient StorybookClient
	matcher         *componentmatcher.Matcher
	publisher       EventPublisher
	logger          *observability.Logger
}

// New constructs a ShowcaseProcessor.
func New(store ShowcaseStore, storybookClient StorybookClient, matcher *componentmatcher.Matcher, publisher EventPublisher, logger *observability.Logger) ShowcaseProcessor {
	return ShowcaseProcessor{
		store:           store,
		storybookClient: storybookClient,
		matcher:         matcher,
		publisher:       publisher,
		logger:          logger,
	}
}

// CreateShowcaseJob resolves a natural-language brief to a single Storybook
// component and enqueues a capture request for it.
func (p *ShowcaseProcessor) CreateShowcaseJob(ctx context.Context, accountID uuid.UUID, brief string) (jobID uuid.UUID, err error) {
	account, err := p.store.GetAccountByID(ctx, accountID)
	if err != nil {
		p.logger.Error(ctx, "failed to load account for showcase job", err)
		return uuid.Nil, fmt.Errorf("get account: %w", err)
	}

	connection, err := p.store.GetGitHubConnectionByUserID(ctx, account.OwnerUserID)
	if err != nil {
		return uuid.Nil, ErrStorybookNotConfigured
	}

	repos, err := p.store.ListGitHubReposByConnection(ctx, connection.ID)
	if err != nil {
		p.logger.Error(ctx, "failed to list github repos for showcase job", err)
		return uuid.Nil, fmt.Errorf("list github repos: %w", err)
	}

	var repo *store.GitHubRepo
	for i := range repos {
		if repos[i].StorybookURL != nil {
			repo = &repos[i]
			break
		}
	}
	if repo == nil {
		return uuid.Nil, ErrStorybookNotConfigured
	}

	index, err := p.storybookClient.FetchIndex(ctx, *repo.StorybookURL)
	if err != nil {
		p.logger.Error(ctx, "failed to fetch storybook index for showcase job", err)
		return uuid.Nil, fmt.Errorf("fetch storybook index: %w", err)
	}

	names := distinctComponentNames(index)
	matched, err := p.matcher.Resolve(ctx, brief, names)
	if err != nil {
		return uuid.Nil, err
	}
	if matched == nil {
		return uuid.Nil, ErrNoComponentMatch
	}

	storyIDs, storyComponents := storyIDsForComponent(index, *matched)

	job, err := p.store.CreateShowcaseJob(ctx, store.CreateShowcaseJobParams{
		AccountID:     accountID,
		Brief:         brief,
		ComponentName: *matched,
		StoryIDs:      storyIDs,
	})
	if err != nil {
		p.logger.Error(ctx, "failed to create showcase job", err)
		return uuid.Nil, fmt.Errorf("create showcase job: %w", err)
	}

	req := githubProcessor.CaptureRequest{
		CommitID:        job.ID,
		SHA:             job.ID.String(),
		StoryIDs:        storyIDs,
		StorybookURL:    *repo.StorybookURL,
		StoryComponents: storyComponents,
	}

	if err := p.publisher.Publish(ctx, githubProcessor.TopicCaptureRequests, job.ID.String(), req); err != nil {
		p.logger.Error(ctx, "failed to publish showcase capture request", err)
		if updateErr := p.store.UpdateShowcaseJobFailed(ctx, job.ID, err.Error()); updateErr != nil {
			p.logger.Error(ctx, "failed to mark showcase job failed", updateErr)
		}
		return uuid.Nil, ErrPublishFailed
	}

	if err := p.store.UpdateShowcaseJobStatus(ctx, job.ID, "capturing"); err != nil {
		p.logger.Error(ctx, "failed to update showcase job status", err)
		return uuid.Nil, fmt.Errorf("update showcase job status: %w", err)
	}

	return job.ID, nil
}
