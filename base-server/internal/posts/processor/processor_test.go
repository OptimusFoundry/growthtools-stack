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

	t.Run("title auto-generated when nil", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockTitler := NewMockTitleGenerator(ctrl)
		mockPublisher := NewMockEventPublisher(ctrl)

		mockTitler.EXPECT().GenerateTitle(gomock.Any(), "test content").
			Return("Test Title", nil)
		mockStore.EXPECT().CreatePost(gomock.Any(), gomock.Any()).
			DoAndReturn(func(ctx context.Context, params store.CreatePostParams) (store.Post, error) {
				require.NotNil(t, params.Title)
				assert.Equal(t, "Test Title", *params.Title)
				return store.Post{ID: postID, AccountID: accountID, Title: params.Title}, nil
			})

		proc := New(mockStore, mockPublisher, logger)
		proc.SetTitler(mockTitler)

		result, err := proc.CreatePost(context.Background(), store.CreatePostParams{
			AccountID:   accountID,
			Content:     "test content",
			ContentType: "post",
			Status:      "draft",
			Source:      "manual",
		})

		require.NoError(t, err)
		require.NotNil(t, result.Title)
		assert.Equal(t, "Test Title", *result.Title)
	})

	t.Run("title respected when provided", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockPublisher := NewMockEventPublisher(ctrl)

		myTitle := "My Title"
		mockStore.EXPECT().CreatePost(gomock.Any(), gomock.Any()).
			DoAndReturn(func(ctx context.Context, params store.CreatePostParams) (store.Post, error) {
				require.NotNil(t, params.Title)
				assert.Equal(t, "My Title", *params.Title)
				return store.Post{ID: postID, AccountID: accountID, Title: params.Title}, nil
			})

		proc := New(mockStore, mockPublisher, logger)

		result, err := proc.CreatePost(context.Background(), store.CreatePostParams{
			AccountID:   accountID,
			Title:       &myTitle,
			Content:     "test content",
			ContentType: "post",
			Status:      "draft",
			Source:      "manual",
		})

		require.NoError(t, err)
		require.NotNil(t, result.Title)
		assert.Equal(t, "My Title", *result.Title)
	})

	t.Run("AI failure falls back to truncation", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockTitler := NewMockTitleGenerator(ctrl)
		mockPublisher := NewMockEventPublisher(ctrl)

		content := "Short content line one\nLine two"
		mockTitler.EXPECT().GenerateTitle(gomock.Any(), content).
			Return("", errors.New("ai down"))
		mockStore.EXPECT().CreatePost(gomock.Any(), gomock.Any()).
			DoAndReturn(func(ctx context.Context, params store.CreatePostParams) (store.Post, error) {
				require.NotNil(t, params.Title)
				assert.Equal(t, "Short content line one", *params.Title)
				return store.Post{ID: postID, AccountID: accountID, Title: params.Title}, nil
			})

		proc := New(mockStore, mockPublisher, logger)
		proc.SetTitler(mockTitler)

		result, err := proc.CreatePost(context.Background(), store.CreatePostParams{
			AccountID:   accountID,
			Content:     content,
			ContentType: "post",
			Status:      "draft",
			Source:      "manual",
		})

		require.NoError(t, err)
		require.NotNil(t, result.Title)
		assert.Equal(t, "Short content line one", *result.Title)
	})

	t.Run("empty content leaves title nil", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockPublisher := NewMockEventPublisher(ctrl)

		mockStore.EXPECT().CreatePost(gomock.Any(), gomock.Any()).
			DoAndReturn(func(ctx context.Context, params store.CreatePostParams) (store.Post, error) {
				assert.Nil(t, params.Title)
				return store.Post{ID: postID, AccountID: accountID}, nil
			})

		proc := New(mockStore, mockPublisher, logger)

		result, err := proc.CreatePost(context.Background(), store.CreatePostParams{
			AccountID:   accountID,
			Content:     "",
			ContentType: "post",
			Status:      "draft",
			Source:      "manual",
		})

		require.NoError(t, err)
		assert.Nil(t, result.Title)
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
			[]store.PostListItem{{ID: uuid.New()}, {ID: uuid.New()}}, nil,
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

func TestPostProcessor_UpdateDraft_PreservesMediaIDs(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()
	mediaID1 := uuid.New()
	mediaID2 := uuid.New()

	t.Run("media_ids are written to UpdatePostParams", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockPublisher := NewMockEventPublisher(ctrl)

		expectedMediaIDs := store.UUIDArray{mediaID1, mediaID2}
		contentType := "text"
		platformContent := "platform content"

		mockStore.EXPECT().UpdatePost(
			gomock.Any(),
			accountID,
			postID,
			gomock.AssignableToTypeOf(store.UpdatePostParams{}),
		).DoAndReturn(func(_ context.Context, _, _ uuid.UUID, p store.UpdatePostParams) (store.Post, error) {
			require.Equal(t, expectedMediaIDs, p.MediaIDs)
			require.Equal(t, "hello", *p.Content)
			require.Equal(t, contentType, *p.ContentType)
			return store.Post{ID: postID, AccountID: accountID, Content: "hello"}, nil
		})
		mockStore.EXPECT().DeletePlatformPostsByPostID(gomock.Any(), postID).Return(nil)
		mockStore.EXPECT().CreatePlatformPost(gomock.Any(), gomock.Any()).Return(store.PlatformPost{}, nil)

		proc := New(mockStore, mockPublisher, logger)
		result, err := proc.UpdateDraft(context.Background(), UpdateDraftParams{
			AccountID:   accountID,
			PostID:      postID,
			Content:     "hello",
			ContentType: contentType,
			MediaIDs:    expectedMediaIDs,
			Platforms: []PlatformDraftContent{
				{Platform: "x", Content: &platformContent},
			},
		})

		require.NoError(t, err)
		assert.Equal(t, postID, result.ID)
	})

	t.Run("nil media_ids are not set on UpdatePostParams (COALESCE-preserve)", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockPublisher := NewMockEventPublisher(ctrl)

		mockStore.EXPECT().UpdatePost(
			gomock.Any(),
			accountID,
			postID,
			gomock.AssignableToTypeOf(store.UpdatePostParams{}),
		).DoAndReturn(func(_ context.Context, _, _ uuid.UUID, p store.UpdatePostParams) (store.Post, error) {
			require.Nil(t, p.MediaIDs, "nil MediaIDs must not be set so COALESCE preserves existing value")
			return store.Post{ID: postID, AccountID: accountID, Content: "hello"}, nil
		})
		mockStore.EXPECT().DeletePlatformPostsByPostID(gomock.Any(), postID).Return(nil)
		// no platforms → no CreatePlatformPost calls

		proc := New(mockStore, mockPublisher, logger)
		_, err := proc.UpdateDraft(context.Background(), UpdateDraftParams{
			AccountID:   accountID,
			PostID:      postID,
			Content:     "hello",
			ContentType: "text",
			MediaIDs:    nil, // explicitly nil — caller did not provide media_ids
		})

		require.NoError(t, err)
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

	t.Run("auto-generates title", func(t *testing.T) {
		t.Parallel()
		ctrl := gomock.NewController(t)
		mockStore := NewMockPostStore(ctrl)
		mockTitler := NewMockTitleGenerator(ctrl)
		mockPublisher := NewMockEventPublisher(ctrl)

		mockTitler.EXPECT().GenerateTitle(gomock.Any(), "Some draft content").
			Return("Draft Title", nil)
		mockStore.EXPECT().CreatePost(gomock.Any(), gomock.Any()).
			DoAndReturn(func(ctx context.Context, params store.CreatePostParams) (store.Post, error) {
				require.NotNil(t, params.Title)
				assert.Equal(t, "Draft Title", *params.Title)
				return store.Post{ID: postID, AccountID: accountID, Title: params.Title, Status: "draft"}, nil
			})
		xContent := "adapted X text"
		mockStore.EXPECT().CreatePlatformPost(gomock.Any(), gomock.Any()).Return(
			store.PlatformPost{ID: uuid.New(), PostID: postID, Platform: "x"}, nil,
		)

		proc := New(mockStore, mockPublisher, logger)
		proc.SetTitler(mockTitler)

		result, err := proc.SaveDraft(context.Background(), SaveDraftParams{
			AccountID:   accountID,
			Content:     "Some draft content",
			ContentType: "text",
			Platforms: []PlatformDraftContent{
				{Platform: "x", Content: &xContent},
			},
		})

		require.NoError(t, err)
		require.NotNil(t, result.Title)
		assert.Equal(t, "Draft Title", *result.Title)
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
		mockStore.EXPECT().GetPlatformPostsByPostID(gomock.Any(), postID).Return(
			[]store.PlatformPost{{Platform: "x"}, {Platform: "linkedin"}}, nil,
		)
		mockPublisher := NewMockEventPublisher(ctrl)
		mockPublisher.EXPECT().Publish(gomock.Any(), "post.publish", postID.String(), gomock.Any()).Return(nil)
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
