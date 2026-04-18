package processor

import (
	"context"
	"errors"
	"testing"
	"time"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

func TestPostProcessor_CreatePost(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().CreatePost(gomock.Any(), gomock.Any()).Return(
			store.Post{ID: postID, AccountID: accountID, Content: "test content", Status: "draft"}, nil,
		)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		result, err := proc.CreatePost(context.Background(), store.CreatePostParams{
			AccountID:   accountID,
			Content:     "test content",
			ContentType: "post",
			Status:      "draft",
			Source:      "manual",
		})

		require.NoError(t, err)
		assert.Equal(t, postID, result.ID)
		assert.Equal(t, "test content", result.Content)
	})

	t.Run("store error returns ErrFailedCreatePost", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().CreatePost(gomock.Any(), gomock.Any()).Return(
			store.Post{}, errors.New("db error"),
		)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		_, err := proc.CreatePost(context.Background(), store.CreatePostParams{
			AccountID: accountID,
			Content:   "test",
		})

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrFailedCreatePost)
	})
}

func TestPostProcessor_GetPost(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().GetPostByID(gomock.Any(), accountID, postID).Return(
			store.Post{ID: postID, AccountID: accountID, Content: "found"}, nil,
		)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		result, err := proc.GetPost(context.Background(), accountID, postID)

		require.NoError(t, err)
		assert.Equal(t, postID, result.ID)
		assert.Equal(t, "found", result.Content)
	})

	t.Run("not found returns ErrPostNotFound", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().GetPostByID(gomock.Any(), accountID, postID).Return(
			store.Post{}, store.ErrNotFound,
		)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		_, err := proc.GetPost(context.Background(), accountID, postID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrPostNotFound)
	})

	t.Run("other error returns ErrFailedCreatePost", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().GetPostByID(gomock.Any(), accountID, postID).Return(
			store.Post{}, errors.New("db error"),
		)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		_, err := proc.GetPost(context.Background(), accountID, postID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrFailedCreatePost)
	})
}

func TestPostProcessor_ListPosts(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().ListPosts(gomock.Any(), gomock.Any()).Return(
			[]store.Post{{ID: uuid.New(), Content: "post1"}, {ID: uuid.New(), Content: "post2"}}, nil,
		)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		result, err := proc.ListPosts(context.Background(), store.ListPostsParams{AccountID: accountID, Limit: 10})

		require.NoError(t, err)
		assert.Len(t, result, 2)
	})

	t.Run("store error propagates", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().ListPosts(gomock.Any(), gomock.Any()).Return(
			nil, errors.New("db error"),
		)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		_, err := proc.ListPosts(context.Background(), store.ListPostsParams{AccountID: accountID})

		require.Error(t, err)
	})
}

func TestPostProcessor_UpdatePost(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		newContent := "updated content"
		mockStore.EXPECT().UpdatePost(gomock.Any(), accountID, postID, gomock.Any()).Return(
			store.Post{ID: postID, AccountID: accountID, Content: newContent}, nil,
		)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		result, err := proc.UpdatePost(context.Background(), accountID, postID, store.UpdatePostParams{Content: &newContent})

		require.NoError(t, err)
		assert.Equal(t, "updated content", result.Content)
	})

	t.Run("not found returns ErrPostNotFound", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().UpdatePost(gomock.Any(), accountID, postID, gomock.Any()).Return(
			store.Post{}, store.ErrNotFound,
		)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		_, err := proc.UpdatePost(context.Background(), accountID, postID, store.UpdatePostParams{})

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrPostNotFound)
	})

	t.Run("other error returns ErrFailedUpdatePost", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().UpdatePost(gomock.Any(), accountID, postID, gomock.Any()).Return(
			store.Post{}, errors.New("db error"),
		)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		_, err := proc.UpdatePost(context.Background(), accountID, postID, store.UpdatePostParams{})

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrFailedUpdatePost)
	})
}

func TestPostProcessor_DeletePost(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().DeletePost(gomock.Any(), accountID, postID).Return(nil)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		err := proc.DeletePost(context.Background(), accountID, postID)

		require.NoError(t, err)
	})

	t.Run("not found returns ErrPostNotFound", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().DeletePost(gomock.Any(), accountID, postID).Return(store.ErrNotFound)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		err := proc.DeletePost(context.Background(), accountID, postID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrPostNotFound)
	})

	t.Run("other error returns ErrFailedDeletePost", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().DeletePost(gomock.Any(), accountID, postID).Return(errors.New("db error"))
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		err := proc.DeletePost(context.Background(), accountID, postID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrFailedDeletePost)
	})
}

func TestPostProcessor_PublishPost(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().GetPostByID(gomock.Any(), accountID, postID).Return(
			store.Post{ID: postID, AccountID: accountID}, nil,
		)
		mockStore.EXPECT().GetPlatformPostsByPostID(gomock.Any(), postID).Return(
			[]store.PlatformPost{}, nil,
		)
		mockStore.EXPECT().CreatePlatformPost(gomock.Any(), gomock.Any()).Return(
			store.PlatformPost{ID: uuid.New()}, nil,
		).Times(2)
		mockStore.EXPECT().UpdatePostStatus(gomock.Any(), accountID, postID, "publishing", (*time.Time)(nil)).Return(nil)
		mockPublisher := NewMockEventPublisher(ctrl)
		mockPublisher.EXPECT().Publish(gomock.Any(), "post.publish", postID.String(), gomock.Any()).Return(nil)
		proc := New(mockStore, mockPublisher, logger)

		err := proc.PublishPost(context.Background(), accountID, postID, []string{"x", "linkedin"})

		require.NoError(t, err)
	})

	t.Run("post not found", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().GetPostByID(gomock.Any(), accountID, postID).Return(
			store.Post{}, store.ErrNotFound,
		)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		err := proc.PublishPost(context.Background(), accountID, postID, []string{"x"})

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrPostNotFound)
	})

	t.Run("create platform post error", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().GetPostByID(gomock.Any(), accountID, postID).Return(
			store.Post{ID: postID}, nil,
		)
		mockStore.EXPECT().GetPlatformPostsByPostID(gomock.Any(), postID).Return(
			[]store.PlatformPost{}, nil,
		)
		mockStore.EXPECT().CreatePlatformPost(gomock.Any(), gomock.Any()).Return(
			store.PlatformPost{}, errors.New("db error"),
		)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		err := proc.PublishPost(context.Background(), accountID, postID, []string{"x"})

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrFailedUpdatePost)
	})

	t.Run("update status error", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().GetPostByID(gomock.Any(), accountID, postID).Return(
			store.Post{ID: postID}, nil,
		)
		mockStore.EXPECT().GetPlatformPostsByPostID(gomock.Any(), postID).Return(
			[]store.PlatformPost{}, nil,
		)
		mockStore.EXPECT().CreatePlatformPost(gomock.Any(), gomock.Any()).Return(
			store.PlatformPost{}, nil,
		)
		mockStore.EXPECT().UpdatePostStatus(gomock.Any(), accountID, postID, "publishing", (*time.Time)(nil)).Return(
			errors.New("db error"),
		)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		err := proc.PublishPost(context.Background(), accountID, postID, []string{"x"})

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrFailedUpdatePost)
	})
}

func TestPostProcessor_SchedulePost(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()
	scheduledAt := time.Now().Add(24 * time.Hour)

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().GetPostByID(gomock.Any(), accountID, postID).Return(
			store.Post{ID: postID, AccountID: accountID}, nil,
		)
		mockStore.EXPECT().UpdatePost(gomock.Any(), accountID, postID, gomock.Any()).Return(
			store.Post{ID: postID, Status: "scheduled"}, nil,
		)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		result, err := proc.SchedulePost(context.Background(), accountID, postID, scheduledAt)

		require.NoError(t, err)
		assert.Equal(t, "scheduled", result.Status)
	})

	t.Run("post not found", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().GetPostByID(gomock.Any(), accountID, postID).Return(
			store.Post{}, store.ErrNotFound,
		)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		_, err := proc.SchedulePost(context.Background(), accountID, postID, scheduledAt)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrPostNotFound)
	})

	t.Run("update error", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().GetPostByID(gomock.Any(), accountID, postID).Return(
			store.Post{ID: postID}, nil,
		)
		mockStore.EXPECT().UpdatePost(gomock.Any(), accountID, postID, gomock.Any()).Return(
			store.Post{}, errors.New("db error"),
		)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		_, err := proc.SchedulePost(context.Background(), accountID, postID, scheduledAt)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrFailedUpdatePost)
	})
}

func TestPostProcessor_GetPostWithPlatformPosts(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().GetPostByID(gomock.Any(), accountID, postID).Return(
			store.Post{ID: postID, Content: "post content"}, nil,
		)
		mockStore.EXPECT().GetPlatformPostsByPostID(gomock.Any(), postID).Return(
			[]store.PlatformPost{{ID: uuid.New(), Platform: "x"}}, nil,
		)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		result, err := proc.GetPostWithPlatformPosts(context.Background(), accountID, postID)

		require.NoError(t, err)
		assert.Equal(t, "post content", result.Post.Content)
		assert.Len(t, result.PlatformPosts, 1)
	})

	t.Run("post not found", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().GetPostByID(gomock.Any(), accountID, postID).Return(
			store.Post{}, store.ErrNotFound,
		)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		_, err := proc.GetPostWithPlatformPosts(context.Background(), accountID, postID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrPostNotFound)
	})

	t.Run("platform posts error", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().GetPostByID(gomock.Any(), accountID, postID).Return(
			store.Post{ID: postID}, nil,
		)
		mockStore.EXPECT().GetPlatformPostsByPostID(gomock.Any(), postID).Return(
			nil, errors.New("db error"),
		)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		_, err := proc.GetPostWithPlatformPosts(context.Background(), accountID, postID)

		require.Error(t, err)
	})
}

func TestPostProcessor_SaveDraft(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().CreatePost(gomock.Any(), gomock.Any()).Return(
			store.Post{ID: postID, AccountID: accountID, Content: "base blurb", Status: "draft"}, nil,
		)
		xContent := "adapted X text"
		mockStore.EXPECT().CreatePlatformPost(gomock.Any(), gomock.Any()).Return(
			store.PlatformPost{ID: uuid.New(), PostID: postID, Platform: "x"}, nil,
		)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		result, err := proc.SaveDraft(context.Background(), SaveDraftParams{
			AccountID:   accountID,
			Content:     "base blurb",
			ContentType: "text",
			AIGenerated: true,
			Platforms: []PlatformDraftContent{
				{Platform: "x", Content: &xContent},
			},
		})

		require.NoError(t, err)
		assert.Equal(t, postID, result.ID)
		assert.Equal(t, "draft", result.Status)
	})

	t.Run("create post error returns ErrFailedSaveDraft", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().CreatePost(gomock.Any(), gomock.Any()).Return(
			store.Post{}, errors.New("db error"),
		)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		_, err := proc.SaveDraft(context.Background(), SaveDraftParams{
			AccountID: accountID,
			Content:   "test",
		})

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrFailedSaveDraft)
	})

	t.Run("create platform post error returns ErrFailedSaveDraft", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().CreatePost(gomock.Any(), gomock.Any()).Return(
			store.Post{ID: postID, AccountID: accountID}, nil,
		)
		mockStore.EXPECT().CreatePlatformPost(gomock.Any(), gomock.Any()).Return(
			store.PlatformPost{}, errors.New("db error"),
		)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		xContent := "x text"
		_, err := proc.SaveDraft(context.Background(), SaveDraftParams{
			AccountID: accountID,
			Content:   "test",
			Platforms: []PlatformDraftContent{
				{Platform: "x", Content: &xContent},
			},
		})

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrFailedSaveDraft)
	})
}

func TestPostProcessor_RetryFailedPlatformPosts(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().GetPostByID(gomock.Any(), accountID, postID).Return(
			store.Post{ID: postID, AccountID: accountID}, nil,
		)
		mockStore.EXPECT().ResetPlatformPostsForRetry(gomock.Any(), postID).Return(nil)
		mockStore.EXPECT().UpdatePostStatus(gomock.Any(), accountID, postID, store.PostStatusPublishing, (*time.Time)(nil)).Return(nil)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		err := proc.RetryFailedPlatformPosts(context.Background(), accountID, postID)

		require.NoError(t, err)
	})

	t.Run("post not found returns ErrPostNotFound", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().GetPostByID(gomock.Any(), accountID, postID).Return(
			store.Post{}, store.ErrNotFound,
		)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		err := proc.RetryFailedPlatformPosts(context.Background(), accountID, postID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrPostNotFound)
	})

	t.Run("get post db error returns ErrFailedRetryPost", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().GetPostByID(gomock.Any(), accountID, postID).Return(
			store.Post{}, errors.New("db error"),
		)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		err := proc.RetryFailedPlatformPosts(context.Background(), accountID, postID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrFailedRetryPost)
	})

	t.Run("reset platform posts error returns ErrFailedRetryPost", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().GetPostByID(gomock.Any(), accountID, postID).Return(
			store.Post{ID: postID, AccountID: accountID}, nil,
		)
		mockStore.EXPECT().ResetPlatformPostsForRetry(gomock.Any(), postID).Return(errors.New("db error"))
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		err := proc.RetryFailedPlatformPosts(context.Background(), accountID, postID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrFailedRetryPost)
	})

	t.Run("update post status error returns ErrFailedRetryPost", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().GetPostByID(gomock.Any(), accountID, postID).Return(
			store.Post{ID: postID, AccountID: accountID}, nil,
		)
		mockStore.EXPECT().ResetPlatformPostsForRetry(gomock.Any(), postID).Return(nil)
		mockStore.EXPECT().UpdatePostStatus(gomock.Any(), accountID, postID, store.PostStatusPublishing, (*time.Time)(nil)).Return(
			errors.New("db error"),
		)
		mockPublisher := NewMockEventPublisher(ctrl)
		proc := New(mockStore, mockPublisher, logger)

		err := proc.RetryFailedPlatformPosts(context.Background(), accountID, postID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrFailedRetryPost)
	})
}

func TestPostProcessor_UnlinkMedia(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()
	mediaID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().UnlinkMediaFromPost(gomock.Any(), accountID, postID, mediaID).Return(nil)
		proc := New(mockStore, NewMockEventPublisher(ctrl), logger)

		err := proc.UnlinkMedia(context.Background(), accountID, postID, mediaID)
		require.NoError(t, err)
	})

	t.Run("not-found plus post missing maps to ErrPostNotFound", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().UnlinkMediaFromPost(gomock.Any(), accountID, postID, mediaID).Return(store.ErrNotFound)
		mockStore.EXPECT().GetPostByID(gomock.Any(), accountID, postID).Return(store.Post{}, store.ErrNotFound)
		proc := New(mockStore, NewMockEventPublisher(ctrl), logger)

		err := proc.UnlinkMedia(context.Background(), accountID, postID, mediaID)
		require.ErrorIs(t, err, ErrPostNotFound)
	})

	t.Run("not-found but post exists maps to ErrMediaNotAttached", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().UnlinkMediaFromPost(gomock.Any(), accountID, postID, mediaID).Return(store.ErrNotFound)
		mockStore.EXPECT().GetPostByID(gomock.Any(), accountID, postID).Return(store.Post{ID: postID}, nil)
		proc := New(mockStore, NewMockEventPublisher(ctrl), logger)

		err := proc.UnlinkMedia(context.Background(), accountID, postID, mediaID)
		require.ErrorIs(t, err, ErrMediaNotAttached)
	})

	t.Run("arbitrary store error maps to ErrFailedUnlinkMedia", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockStore.EXPECT().UnlinkMediaFromPost(gomock.Any(), accountID, postID, mediaID).Return(errors.New("db exploded"))
		proc := New(mockStore, NewMockEventPublisher(ctrl), logger)

		err := proc.UnlinkMedia(context.Background(), accountID, postID, mediaID)
		require.ErrorIs(t, err, ErrFailedUnlinkMedia)
	})
}
