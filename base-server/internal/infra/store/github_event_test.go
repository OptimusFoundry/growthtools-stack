package store

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCreateGitHubEvent(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	event, err := s.CreateGitHubEvent(ctx, CreateGitHubEventParams{
		AccountID:  accountID,
		RepoName:   "user/my-repo",
		EventType:  "push",
		Payload:    JSONB{"ref": "refs/heads/main", "commits": float64(3)},
		DeliveryID: "delivery-" + uuid.New().String(),
	})
	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, event.ID)
	assert.Equal(t, accountID, event.AccountID)
	assert.Equal(t, "user/my-repo", event.RepoName)
	assert.Equal(t, "push", event.EventType)
	assert.False(t, event.Processed)
	assert.Nil(t, event.PostID)
}

func TestGetGitHubEventByDeliveryID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	deliveryID := "delivery-" + uuid.New().String()
	created, err := s.CreateGitHubEvent(ctx, CreateGitHubEventParams{
		AccountID:  accountID,
		RepoName:   "user/repo",
		EventType:  "pull_request",
		Payload:    JSONB{"action": "opened"},
		DeliveryID: deliveryID,
	})
	require.NoError(t, err)

	got, err := s.GetGitHubEventByDeliveryID(ctx, deliveryID)
	require.NoError(t, err)
	assert.Equal(t, created.ID, got.ID)
	assert.Equal(t, deliveryID, got.DeliveryID)

	// Not found
	_, err = s.GetGitHubEventByDeliveryID(ctx, "nonexistent-delivery-id")
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestListUnprocessedGitHubEvents(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	// Create two unprocessed events
	for i := 0; i < 2; i++ {
		_, err := s.CreateGitHubEvent(ctx, CreateGitHubEventParams{
			AccountID:  accountID,
			RepoName:   "user/repo",
			EventType:  "push",
			Payload:    JSONB{"num": float64(i)},
			DeliveryID: "delivery-unprocessed-" + uuid.New().String(),
		})
		require.NoError(t, err)
	}

	events, err := s.ListUnprocessedGitHubEvents(ctx, 100)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(events), 2)
	for _, e := range events {
		assert.False(t, e.Processed)
	}
}

func TestMarkGitHubEventProcessed(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	event, err := s.CreateGitHubEvent(ctx, CreateGitHubEventParams{
		AccountID:  accountID,
		RepoName:   "user/repo",
		EventType:  "push",
		Payload:    JSONB{"action": "completed"},
		DeliveryID: "delivery-mark-" + uuid.New().String(),
	})
	require.NoError(t, err)
	assert.False(t, event.Processed)

	// Create a post to link
	post, err := s.CreatePost(ctx, CreatePostParams{
		AccountID:   accountID,
		Content:     "generated from github event",
		ContentType: ContentTypeText,
		Status:      PostStatusDraft,
		Source:      PostSourceGitHubEvent,
	})
	require.NoError(t, err)

	err = s.MarkGitHubEventProcessed(ctx, event.ID, &post.ID)
	require.NoError(t, err)

	got, err := s.GetGitHubEventByDeliveryID(ctx, event.DeliveryID)
	require.NoError(t, err)
	assert.True(t, got.Processed)
	assert.Equal(t, &post.ID, got.PostID)

	// Mark without post ID
	event2, err := s.CreateGitHubEvent(ctx, CreateGitHubEventParams{
		AccountID:  accountID,
		RepoName:   "user/repo",
		EventType:  "push",
		Payload:    JSONB{},
		DeliveryID: "delivery-mark2-" + uuid.New().String(),
	})
	require.NoError(t, err)

	err = s.MarkGitHubEventProcessed(ctx, event2.ID, nil)
	require.NoError(t, err)

	got2, err := s.GetGitHubEventByDeliveryID(ctx, event2.DeliveryID)
	require.NoError(t, err)
	assert.True(t, got2.Processed)
	assert.Nil(t, got2.PostID)

	// Not found
	err = s.MarkGitHubEventProcessed(ctx, uuid.New(), nil)
	assert.ErrorIs(t, err, ErrNotFound)
}
