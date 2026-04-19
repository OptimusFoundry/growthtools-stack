package processor

import (
	"context"
	"errors"
	"testing"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBlogProcessor_CreateBlogPost(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		postID := uuid.New()
		mockStore := &MockBlogStore{
			GetBlogPostBySlugFn: func(ctx context.Context, aID uuid.UUID, slug string) (store.BlogPost, error) {
				return store.BlogPost{}, store.ErrNotFound
			},
			CreateBlogPostFn: func(ctx context.Context, params store.CreateBlogPostParams) (store.BlogPost, error) {
				return store.BlogPost{ID: postID, AccountID: params.AccountID, Title: params.Title, Slug: params.Slug}, nil
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)

		result, err := proc.CreateBlogPost(context.Background(), store.CreateBlogPostParams{
			AccountID: accountID,
			Title:     "Test Post",
			Slug:      "test-post",
			Content:   "Test content",
			Status:    "draft",
		})

		require.NoError(t, err)
		assert.Equal(t, postID, result.ID)
		assert.Equal(t, "Test Post", result.Title)
	})

	t.Run("slug already exists", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockBlogStore{
			GetBlogPostBySlugFn: func(ctx context.Context, aID uuid.UUID, slug string) (store.BlogPost, error) {
				return store.BlogPost{ID: uuid.New(), Slug: slug}, nil
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)

		_, err := proc.CreateBlogPost(context.Background(), store.CreateBlogPostParams{
			AccountID: accountID,
			Title:     "Test Post",
			Slug:      "existing-slug",
			Content:   "content",
			Status:    "draft",
		})

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrSlugAlreadyExists)
	})

	t.Run("slug check store error", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockBlogStore{
			GetBlogPostBySlugFn: func(ctx context.Context, aID uuid.UUID, slug string) (store.BlogPost, error) {
				return store.BlogPost{}, errors.New("db error")
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)

		_, err := proc.CreateBlogPost(context.Background(), store.CreateBlogPostParams{
			AccountID: accountID,
			Slug:      "test",
		})

		require.Error(t, err)
	})

	t.Run("create store error", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockBlogStore{
			GetBlogPostBySlugFn: func(ctx context.Context, aID uuid.UUID, slug string) (store.BlogPost, error) {
				return store.BlogPost{}, store.ErrNotFound
			},
			CreateBlogPostFn: func(ctx context.Context, params store.CreateBlogPostParams) (store.BlogPost, error) {
				return store.BlogPost{}, errors.New("db error")
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)

		_, err := proc.CreateBlogPost(context.Background(), store.CreateBlogPostParams{
			AccountID: accountID,
			Slug:      "test",
		})

		require.Error(t, err)
	})
}

func TestBlogProcessor_GetBlogPost(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockBlogStore{
			GetBlogPostByIDFn: func(ctx context.Context, aID, pID uuid.UUID) (store.BlogPost, error) {
				return store.BlogPost{ID: pID, Title: "My Post"}, nil
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)

		result, err := proc.GetBlogPost(context.Background(), accountID, postID)

		require.NoError(t, err)
		assert.Equal(t, "My Post", result.Post.Title)
		assert.Empty(t, result.Media)
	})

	t.Run("not found", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockBlogStore{
			GetBlogPostByIDFn: func(ctx context.Context, aID, pID uuid.UUID) (store.BlogPost, error) {
				return store.BlogPost{}, store.ErrNotFound
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)

		_, err := proc.GetBlogPost(context.Background(), accountID, postID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrBlogPostNotFound)
	})

	t.Run("other error propagated", func(t *testing.T) {
		t.Parallel()
		dbErr := errors.New("db error")
		mockStore := &MockBlogStore{
			GetBlogPostByIDFn: func(ctx context.Context, aID, pID uuid.UUID) (store.BlogPost, error) {
				return store.BlogPost{}, dbErr
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)

		_, err := proc.GetBlogPost(context.Background(), accountID, postID)

		require.Error(t, err)
		assert.ErrorIs(t, err, dbErr)
	})
}

func TestBlogProcessor_ListBlogPosts(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockBlogStore{
			ListBlogPostsFn: func(ctx context.Context, aID uuid.UUID, status *string, limit, offset int) ([]store.BlogPost, error) {
				return []store.BlogPost{{ID: uuid.New(), Title: "Post 1"}, {ID: uuid.New(), Title: "Post 2"}}, nil
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)

		result, err := proc.ListBlogPosts(context.Background(), accountID, nil, 10, 0)

		require.NoError(t, err)
		assert.Len(t, result, 2)
	})

	t.Run("store error propagated", func(t *testing.T) {
		t.Parallel()
		dbErr := errors.New("db error")
		mockStore := &MockBlogStore{
			ListBlogPostsFn: func(ctx context.Context, aID uuid.UUID, status *string, limit, offset int) ([]store.BlogPost, error) {
				return nil, dbErr
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)

		_, err := proc.ListBlogPosts(context.Background(), accountID, nil, 10, 0)

		require.Error(t, err)
		assert.ErrorIs(t, err, dbErr)
	})
}

func TestBlogProcessor_UpdateBlogPost(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		newTitle := "Updated Title"
		mockStore := &MockBlogStore{
			UpdateBlogPostFn: func(ctx context.Context, aID, pID uuid.UUID, params store.UpdateBlogPostParams) (store.BlogPost, error) {
				return store.BlogPost{ID: pID, Title: newTitle}, nil
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)

		result, err := proc.UpdateBlogPost(context.Background(), accountID, postID, store.UpdateBlogPostParams{Title: &newTitle})

		require.NoError(t, err)
		assert.Equal(t, "Updated Title", result.Title)
	})

	t.Run("not found", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockBlogStore{
			UpdateBlogPostFn: func(ctx context.Context, aID, pID uuid.UUID, params store.UpdateBlogPostParams) (store.BlogPost, error) {
				return store.BlogPost{}, store.ErrNotFound
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)

		_, err := proc.UpdateBlogPost(context.Background(), accountID, postID, store.UpdateBlogPostParams{})

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrBlogPostNotFound)
	})

	t.Run("other error propagated", func(t *testing.T) {
		t.Parallel()
		dbErr := errors.New("db error")
		mockStore := &MockBlogStore{
			UpdateBlogPostFn: func(ctx context.Context, aID, pID uuid.UUID, params store.UpdateBlogPostParams) (store.BlogPost, error) {
				return store.BlogPost{}, dbErr
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)

		_, err := proc.UpdateBlogPost(context.Background(), accountID, postID, store.UpdateBlogPostParams{})

		require.Error(t, err)
		assert.ErrorIs(t, err, dbErr)
	})
}

func TestBlogProcessor_DeleteBlogPost(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockBlogStore{
			DeleteBlogPostFn: func(ctx context.Context, aID, pID uuid.UUID) error {
				return nil
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)

		err := proc.DeleteBlogPost(context.Background(), accountID, postID)

		require.NoError(t, err)
	})

	t.Run("not found", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockBlogStore{
			DeleteBlogPostFn: func(ctx context.Context, aID, pID uuid.UUID) error {
				return store.ErrNotFound
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)

		err := proc.DeleteBlogPost(context.Background(), accountID, postID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrBlogPostNotFound)
	})

	t.Run("other error propagated", func(t *testing.T) {
		t.Parallel()
		dbErr := errors.New("db error")
		mockStore := &MockBlogStore{
			DeleteBlogPostFn: func(ctx context.Context, aID, pID uuid.UUID) error {
				return dbErr
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)

		err := proc.DeleteBlogPost(context.Background(), accountID, postID)

		require.Error(t, err)
		assert.ErrorIs(t, err, dbErr)
	})
}

func TestBlogProcessor_PublishBlogPost(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockBlogStore{
			GetBlogPostByIDFn: func(ctx context.Context, aID, pID uuid.UUID) (store.BlogPost, error) {
				return store.BlogPost{ID: pID, Status: "draft"}, nil
			},
			PublishBlogPostFn: func(ctx context.Context, aID, pID uuid.UUID) (store.BlogPost, error) {
				return store.BlogPost{ID: pID, Status: "published"}, nil
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)

		result, err := proc.PublishBlogPost(context.Background(), accountID, postID)

		require.NoError(t, err)
		assert.Equal(t, "published", result.Status)
	})

	t.Run("post not found on get", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockBlogStore{
			GetBlogPostByIDFn: func(ctx context.Context, aID, pID uuid.UUID) (store.BlogPost, error) {
				return store.BlogPost{}, store.ErrNotFound
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)

		_, err := proc.PublishBlogPost(context.Background(), accountID, postID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrBlogPostNotFound)
	})

	t.Run("publish store error not found", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockBlogStore{
			GetBlogPostByIDFn: func(ctx context.Context, aID, pID uuid.UUID) (store.BlogPost, error) {
				return store.BlogPost{ID: pID}, nil
			},
			PublishBlogPostFn: func(ctx context.Context, aID, pID uuid.UUID) (store.BlogPost, error) {
				return store.BlogPost{}, store.ErrNotFound
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)

		_, err := proc.PublishBlogPost(context.Background(), accountID, postID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrBlogPostNotFound)
	})

	t.Run("publish store error other", func(t *testing.T) {
		t.Parallel()
		dbErr := errors.New("db error")
		mockStore := &MockBlogStore{
			GetBlogPostByIDFn: func(ctx context.Context, aID, pID uuid.UUID) (store.BlogPost, error) {
				return store.BlogPost{ID: pID}, nil
			},
			PublishBlogPostFn: func(ctx context.Context, aID, pID uuid.UUID) (store.BlogPost, error) {
				return store.BlogPost{}, dbErr
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)

		_, err := proc.PublishBlogPost(context.Background(), accountID, postID)

		require.Error(t, err)
		assert.ErrorIs(t, err, dbErr)
	})
}
