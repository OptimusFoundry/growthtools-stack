//go:build integration

package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"testing"
	"time"

	"base-server/internal/ai/commitclassifier"
	"base-server/internal/ai/mediadescriber"
	"base-server/internal/ai/mediaplanner"
	"base-server/internal/ai/socialposts"
	githubprocessor "base-server/internal/github/processor"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	postsprocessor "base-server/internal/posts/processor"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestDraftGeneration_PathA exercises the full Path A wiring from commit to draft post.
// It constructs mocked AI clients and verifies that GenerateDraftFromCommit:
// 1. Classifies the commit as worthwhile
// 2. Describes captured media (video + image)
// 3. Plans which media to keep and post mode
// 4. Generates social posts
// 5. Saves a draft post with platform-specific variants
// 6. Links the commit back to the post.
func TestDraftGeneration_PathA(t *testing.T) {
	t.Parallel()
	c := testClient(t)
	ctx := context.Background()

	tests := []struct {
		name string
		// setup creates fixtures and returns commitID
		setup func(t *testing.T) uuid.UUID
		// assert checks DB state post-generation
		assert func(t *testing.T, commitID uuid.UUID, post store.Post, platformPosts []store.PlatformPost)
	}{
		{
			name: "happy path: classify worthwhile, describe media, plan thread mode, generate drafts for x platform",
			setup: func(t *testing.T) uuid.UUID {
				// Seed: user -> account -> github connection -> repo -> commit
				user := seedUserWithAccount(t, c.Store)
				conn := seedGitHubConnection(t, c.Store, user.UserID)

				// Add an active X platform connection for the account so drafts will be generated for it.
				_, err := c.Store.GetDB().ExecContext(ctx,
					`INSERT INTO platform_connections (id, account_id, platform, platform_user_id, status, access_token, token_expires_at)
					 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
					uuid.New(), user.AccountID, "x", "test-user-"+uuid.New().String()[:8], "active", "fake-x-token", time.Now().Add(24*time.Hour))
				require.NoError(t, err)

				// Seed a repo and commit with capture_output containing 1 video + 1 image
				videoKey := "captures/video-" + uuid.New().String()[:8] + ".mp4"
				imageKey := "captures/image-" + uuid.New().String()[:8] + ".png"
				capturePayload := map[string]interface{}{
					"uploaded": []map[string]string{
						{"key": videoKey},
						{"key": imageKey},
					},
				}
				payload, err := json.Marshal(capturePayload)
				require.NoError(t, err)

				// Create repo + commit directly via DB since seedGitHubCommit is basic
				ghRepoID := int64(2000000000) + int64(uuid.New().ID())
				defaultBranch := "main"
				repo, err := c.Store.CreateGitHubRepo(ctx, conn.ID, ghRepoID, "testowner", "my-repo", &defaultBranch, nil, "hook-secret")
				require.NoError(t, err)

				commitID := uuid.New()
				sha := "sha-" + uuid.New().String()
				_, err = c.Store.GetDB().ExecContext(ctx,
					`INSERT INTO github_commits (id, repo_id, sha, message, pushed_at, capture_output)
					 VALUES ($1, $2, $3, $4, $5, $6)`,
					commitID, repo.ID, sha, "feat: add new editor feature", time.Now().UTC(), payload)
				require.NoError(t, err)

				return commitID
			},
			assert: func(t *testing.T, commitID uuid.UUID, post store.Post, platformPosts []store.PlatformPost) {
				// Verify post was created
				assert.NotEqual(t, uuid.Nil, post.ID)
				assert.NotEmpty(t, post.Content)

				// Verify commit was linked to the post
				commit, err := c.Store.GetDB().QueryContext(ctx, `SELECT post_id FROM github_commits WHERE id = $1`, commitID)
				require.NoError(t, err)
				defer commit.Close()
				require.True(t, commit.Next())
				var postID *uuid.UUID
				err = commit.Scan(&postID)
				require.NoError(t, err)
				assert.NotNil(t, postID)
				assert.Equal(t, post.ID, *postID)

				// Verify platform posts were created (for X)
				assert.NotEmpty(t, platformPosts, "should have platform posts for X")
				xPost := platformPosts[0]
				assert.Equal(t, "x", xPost.Platform)
				// Platform posts start with 'pending' status
				assert.Equal(t, store.PlatformPostStatusPending, xPost.Status)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Create fixtures
			commitID := tt.setup(t)

			// Set up fake AI client
			logger := observability.NewLogger()
			fakeAI := newFakeAIClient()

			// Create the AI packages using the fake client
			classifier := commitclassifier.New(fakeAI, logger)
			describer := mediadescriber.New(fakeAI, logger)
			planner := mediaplanner.New(fakeAI, logger)
			generator := socialposts.New(fakeAI, logger)

			// Create a simple in-process S3 fetcher mock
			fakeS3Fetcher := &fakeS3Fetcher{}

			// Create a simple in-process S3 head mock
			fakeS3Head := &fakeS3Head{}

			// Create a real posts processor (not mocked) for the integration test
			eventPublisher := &fakeEventPublisher{}
			postsProc := postsprocessor.New(c.Store, eventPublisher, logger)

			// Construct the DraftGenerator
			draftGen := githubprocessor.NewDraftGenerator(
				c.Store,
				classifier,
				describer,
				planner,
				generator,
				&postsProc,
				fakeS3Head,
				fakeS3Fetcher,
				"test-bucket",
				logger,
			)

			// Execute the main flow
			err := draftGen.GenerateDraftFromCommit(ctx, commitID)
			require.NoError(t, err, "GenerateDraftFromCommit should succeed")

			// Retrieve the created post and platform posts from the DB
			commit, err := c.Store.GetGitHubCommitForDraft(ctx, commitID)
			require.NoError(t, err)
			require.NotNil(t, commit.PostID, "commit.PostID should be set")

			post, err := c.Store.GetPostByID(ctx, commit.AccountID, *commit.PostID)
			require.NoError(t, err)

			// Retrieve platform posts for the generated post via the store
			platformPosts, err := c.Store.GetPlatformPostsByPostID(ctx, post.ID)
			require.NoError(t, err)

			// Run assertions
			tt.assert(t, commitID, post, platformPosts)
		})
	}
}

// fakeS3Fetcher implements the S3Fetcher interface for testing
type fakeS3Fetcher struct{}

func (f *fakeS3Fetcher) GetFile(ctx context.Context, key string) (io.ReadCloser, string, error) {
	// Return fake media data
	fakeData := []byte("fake-video-or-image-data")
	mimeType := "application/octet-stream"
	if len(key) > 4 && key[len(key)-4:] == ".png" {
		mimeType = "image/png"
	} else if len(key) > 4 && key[len(key)-4:] == ".mp4" {
		mimeType = "video/mp4"
	}
	return io.NopCloser(bytes.NewReader(fakeData)), mimeType, nil
}

// fakeS3Head implements the S3HeadClient interface for testing
type fakeS3Head struct{}

func (f *fakeS3Head) HeadObject(ctx context.Context, key string) (int64, string, error) {
	contentType := "application/octet-stream"
	if len(key) > 4 && key[len(key)-4:] == ".png" {
		contentType = "image/png"
	} else if len(key) > 4 && key[len(key)-4:] == ".mp4" {
		contentType = "video/mp4"
	}
	return 1024, contentType, nil
}

// fakeEventPublisher implements the EventPublisher interface
type fakeEventPublisher struct{}

func (f *fakeEventPublisher) Publish(ctx context.Context, topic string, key string, value interface{}) error {
	return nil
}
