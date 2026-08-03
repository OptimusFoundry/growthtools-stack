package processor

import (
	"context"
	"errors"
	"testing"

	aiblog "base-server/internal/ai/blog"
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
			ListBlogPostsFn: func(ctx context.Context, aID uuid.UUID, status *string, limit, offset int) ([]store.BlogPostListItem, error) {
				return []store.BlogPostListItem{{ID: uuid.New(), Title: "Post 1"}, {ID: uuid.New(), Title: "Post 2"}}, nil
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
			ListBlogPostsFn: func(ctx context.Context, aID uuid.UUID, status *string, limit, offset int) ([]store.BlogPostListItem, error) {
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
			GetBlogPostByIDFn: func(ctx context.Context, aID, pID uuid.UUID) (store.BlogPost, error) {
				return store.BlogPost{ID: postID, Slug: "some-slug"}, nil
			},
			DeleteBlogPostFn: func(ctx context.Context, aID, pID uuid.UUID) error {
				return nil
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)

		result, err := proc.DeleteBlogPost(context.Background(), accountID, postID)

		require.NoError(t, err)
		assert.Equal(t, "Blog post deleted successfully", result.Message)
		assert.Empty(t, result.SiteDeleteError)
	})

	t.Run("not found (store-level)", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockBlogStore{
			GetBlogPostByIDFn: func(ctx context.Context, aID, pID uuid.UUID) (store.BlogPost, error) {
				return store.BlogPost{ID: postID, Slug: "some-slug"}, nil
			},
			DeleteBlogPostFn: func(ctx context.Context, aID, pID uuid.UUID) error {
				return store.ErrNotFound
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)

		_, err := proc.DeleteBlogPost(context.Background(), accountID, postID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrBlogPostNotFound)
	})

	t.Run("other error propagated", func(t *testing.T) {
		t.Parallel()
		dbErr := errors.New("db error")
		mockStore := &MockBlogStore{
			GetBlogPostByIDFn: func(ctx context.Context, aID, pID uuid.UUID) (store.BlogPost, error) {
				return store.BlogPost{}, nil
			},
			DeleteBlogPostFn: func(ctx context.Context, aID, pID uuid.UUID) error {
				return dbErr
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)

		result, err := proc.DeleteBlogPost(context.Background(), accountID, postID)

		assert.ErrorIs(t, err, dbErr)
		assert.Empty(t, result)
	})

	t.Run("post-not-found short-circuit", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockBlogStore{
			GetBlogPostByIDFn: func(ctx context.Context, aID, pID uuid.UUID) (store.BlogPost, error) {
				return store.BlogPost{}, store.ErrNotFound
			},
			// DeleteBlogPostFn intentionally left nil — calling it would panic,
			// proving the store-level delete is never attempted.
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)
		proc.SetSitePublisher(&MockSitePublisher{
			// DeleteBlogFromSiteFn intentionally left nil — calling it would panic,
			// proving the site-delete is never attempted.
		})

		result, err := proc.DeleteBlogPost(context.Background(), accountID, postID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrBlogPostNotFound)
		assert.Empty(t, result)
	})

	t.Run("site-delete success — no error captured", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockBlogStore{
			GetBlogPostByIDFn: func(ctx context.Context, aID, pID uuid.UUID) (store.BlogPost, error) {
				return store.BlogPost{ID: postID, Slug: "some-slug"}, nil
			},
			DeleteBlogPostFn: func(ctx context.Context, aID, pID uuid.UUID) error {
				return nil
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)
		proc.SetSitePublisher(&MockSitePublisher{
			DeleteBlogFromSiteFn: func(ctx context.Context, aID uuid.UUID, post store.BlogPost) error {
				return nil
			},
		})

		result, err := proc.DeleteBlogPost(context.Background(), accountID, postID)

		require.NoError(t, err)
		assert.Empty(t, result.SiteDeleteError)
		assert.Equal(t, "Blog post deleted successfully", result.Message)
	})

	t.Run("site-delete error captured but store-delete still proceeds", func(t *testing.T) {
		t.Parallel()
		storeDeleteCalled := false
		mockStore := &MockBlogStore{
			GetBlogPostByIDFn: func(ctx context.Context, aID, pID uuid.UUID) (store.BlogPost, error) {
				return store.BlogPost{ID: postID, Slug: "some-slug"}, nil
			},
			DeleteBlogPostFn: func(ctx context.Context, aID, pID uuid.UUID) error {
				storeDeleteCalled = true
				return nil
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)
		proc.SetSitePublisher(&MockSitePublisher{
			DeleteBlogFromSiteFn: func(ctx context.Context, aID uuid.UUID, post store.BlogPost) error {
				return errors.New("github unreachable")
			},
		})

		result, err := proc.DeleteBlogPost(context.Background(), accountID, postID)

		require.NoError(t, err)
		assert.True(t, storeDeleteCalled, "store delete must still proceed after site-delete failure")
		assert.Equal(t, "github unreachable", result.SiteDeleteError)
		assert.Equal(t, "Blog post deleted successfully", result.Message)
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
		assert.Equal(t, "published", result.Post.Status)
		assert.Empty(t, result.SitePublishError)
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

func TestBlogProcessor_PublishBlogPost_SitePublishTail(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()

	tests := []struct {
		name          string
		sitePublisher *MockSitePublisher
		assert        func(t *testing.T, result BlogPublishResult, err error)
	}{
		{
			name:          "no site publisher wired is a no-op",
			sitePublisher: nil,
			assert: func(t *testing.T, result BlogPublishResult, err error) {
				require.NoError(t, err)
				assert.Equal(t, "published", result.Post.Status)
				assert.Empty(t, result.SitePublishError)
			},
		},
		{
			name: "site publisher returns empty PR URL is a no-op",
			sitePublisher: &MockSitePublisher{
				PublishBlogToSiteFn: func(ctx context.Context, aID uuid.UUID, post store.BlogPost) (string, error) {
					return "", nil
				},
			},
			assert: func(t *testing.T, result BlogPublishResult, err error) {
				require.NoError(t, err)
				assert.Equal(t, "published", result.Post.Status)
				assert.Empty(t, result.SitePublishError)
			},
		},
		{
			name: "site publisher returns PR URL and persist succeeds returns persisted post",
			sitePublisher: &MockSitePublisher{
				PublishBlogToSiteFn: func(ctx context.Context, aID uuid.UUID, post store.BlogPost) (string, error) {
					return "https://github.com/x/y/pull/1", nil
				},
			},
			assert: func(t *testing.T, result BlogPublishResult, err error) {
				require.NoError(t, err)
				assert.Equal(t, "site-pr-persisted", result.Post.Status)
				assert.Empty(t, result.SitePublishError)
			},
		},
		{
			name: "site publisher returns PR URL but persist fails leaves original post and reports error",
			sitePublisher: &MockSitePublisher{
				PublishBlogToSiteFn: func(ctx context.Context, aID uuid.UUID, post store.BlogPost) (string, error) {
					return "https://github.com/x/y/pull/1", nil
				},
			},
			assert: func(t *testing.T, result BlogPublishResult, err error) {
				require.NoError(t, err)
				assert.Equal(t, "published", result.Post.Status)
				assert.Equal(t, "persist failed", result.SitePublishError)
			},
		},
		{
			name: "site publisher errors leaves original post and reports error",
			sitePublisher: &MockSitePublisher{
				PublishBlogToSiteFn: func(ctx context.Context, aID uuid.UUID, post store.BlogPost) (string, error) {
					return "", errors.New("github unreachable")
				},
			},
			assert: func(t *testing.T, result BlogPublishResult, err error) {
				require.NoError(t, err)
				assert.Equal(t, "published", result.Post.Status)
				assert.Equal(t, "github unreachable", result.SitePublishError)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			setPRShouldFail := tt.name == "site publisher returns PR URL but persist fails leaves original post and reports error"

			mockStore := &MockBlogStore{
				GetBlogPostByIDFn: func(ctx context.Context, aID, pID uuid.UUID) (store.BlogPost, error) {
					return store.BlogPost{ID: pID, Status: "draft"}, nil
				},
				PublishBlogPostFn: func(ctx context.Context, aID, pID uuid.UUID) (store.BlogPost, error) {
					return store.BlogPost{ID: pID, Status: "published"}, nil
				},
				SetBlogPostSitePRFn: func(ctx context.Context, aID, pID uuid.UUID, prURL string) (store.BlogPost, error) {
					if setPRShouldFail {
						return store.BlogPost{}, errors.New("persist failed")
					}
					return store.BlogPost{ID: pID, Status: "site-pr-persisted"}, nil
				},
			}
			proc := New(mockStore, &MockBlogGenerator{}, logger)
			if tt.sitePublisher != nil {
				proc.SetSitePublisher(tt.sitePublisher)
			}

			result, err := proc.PublishBlogPost(context.Background(), accountID, postID)
			tt.assert(t, result, err)
		})
	}
}

func TestBlogProcessor_RetrySitePublish(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()

	t.Run("returns ErrBlogPostNotFound when post does not exist", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockBlogStore{
			GetBlogPostByIDFn: func(ctx context.Context, aID, pID uuid.UUID) (store.BlogPost, error) {
				return store.BlogPost{}, store.ErrNotFound
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)

		_, err := proc.RetrySitePublish(context.Background(), accountID, postID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrBlogPostNotFound)
	})

	t.Run("returns store error other than not-found unmapped", func(t *testing.T) {
		t.Parallel()
		dbErr := errors.New("db error")
		mockStore := &MockBlogStore{
			GetBlogPostByIDFn: func(ctx context.Context, aID, pID uuid.UUID) (store.BlogPost, error) {
				return store.BlogPost{}, dbErr
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)

		_, err := proc.RetrySitePublish(context.Background(), accountID, postID)

		require.Error(t, err)
		assert.ErrorIs(t, err, dbErr)
	})

	t.Run("returns ErrBlogPostNotPublished when post is still a draft", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockBlogStore{
			GetBlogPostByIDFn: func(ctx context.Context, aID, pID uuid.UUID) (store.BlogPost, error) {
				return store.BlogPost{ID: pID, Status: store.BlogStatusDraft}, nil
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)

		_, err := proc.RetrySitePublish(context.Background(), accountID, postID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrBlogPostNotPublished)
	})

	t.Run("published post with successful site publish does not re-flip status", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockBlogStore{
			GetBlogPostByIDFn: func(ctx context.Context, aID, pID uuid.UUID) (store.BlogPost, error) {
				return store.BlogPost{ID: pID, Status: store.BlogStatusPublished}, nil
			},
			// PublishBlogPostFn intentionally left nil — calling it would panic,
			// proving RetrySitePublish never re-flips internal publish state.
			SetBlogPostSitePRFn: func(ctx context.Context, aID, pID uuid.UUID, prURL string) (store.BlogPost, error) {
				return store.BlogPost{ID: pID, Status: store.BlogStatusPublished, SitePRURL: &prURL}, nil
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)
		proc.SetSitePublisher(&MockSitePublisher{
			PublishBlogToSiteFn: func(ctx context.Context, aID uuid.UUID, post store.BlogPost) (string, error) {
				return "https://github.com/x/y/pull/2", nil
			},
		})

		result, err := proc.RetrySitePublish(context.Background(), accountID, postID)

		require.NoError(t, err)
		assert.Equal(t, store.BlogStatusPublished, result.Post.Status)
		require.NotNil(t, result.Post.SitePRURL)
		assert.Equal(t, "https://github.com/x/y/pull/2", *result.Post.SitePRURL)
		assert.Empty(t, result.SitePublishError)
	})

	t.Run("published post with failed site publish leaves post unchanged and reports error", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockBlogStore{
			GetBlogPostByIDFn: func(ctx context.Context, aID, pID uuid.UUID) (store.BlogPost, error) {
				return store.BlogPost{ID: pID, Status: store.BlogStatusPublished}, nil
			},
		}
		proc := New(mockStore, &MockBlogGenerator{}, logger)
		proc.SetSitePublisher(&MockSitePublisher{
			PublishBlogToSiteFn: func(ctx context.Context, aID uuid.UUID, post store.BlogPost) (string, error) {
				return "", errors.New("github unreachable")
			},
		})

		result, err := proc.RetrySitePublish(context.Background(), accountID, postID)

		require.NoError(t, err)
		assert.Equal(t, store.BlogStatusPublished, result.Post.Status)
		assert.Equal(t, "github unreachable", result.SitePublishError)
	})
}

func TestBlogProcessor_GenerateBlogPost_VoiceProfile(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	t.Run("voice profile configured is passed through to the generator", func(t *testing.T) {
		t.Parallel()
		industry := "SaaS"
		var gotVoice *aiblog.VoiceContext
		mockStore := &MockBlogStore{
			GetBlogPostBySlugFn: func(ctx context.Context, aID uuid.UUID, slug string) (store.BlogPost, error) {
				return store.BlogPost{}, store.ErrNotFound
			},
			CreateBlogPostFn: func(ctx context.Context, params store.CreateBlogPostParams) (store.BlogPost, error) {
				return store.BlogPost{ID: uuid.New(), AccountID: params.AccountID, Title: params.Title, Slug: params.Slug}, nil
			},
			GetVoiceProfileByAccountFn: func(ctx context.Context, aID uuid.UUID) (store.VoiceProfile, error) {
				return store.VoiceProfile{Tone: "witty", Style: "punchy", Industry: &industry}, nil
			},
		}
		mockGen := &MockBlogGenerator{
			GenerateFn: func(ctx context.Context, req aiblog.Request) (aiblog.Result, error) {
				gotVoice = req.Voice
				return aiblog.Result{Title: "Test", Content: "content"}, nil
			},
		}
		proc := New(mockStore, mockGen, logger)

		_, err := proc.GenerateBlogPost(context.Background(), accountID, "write about X", nil, nil)

		require.NoError(t, err)
		require.NotNil(t, gotVoice)
		assert.Equal(t, "witty", gotVoice.Tone)
		assert.Equal(t, "punchy", gotVoice.Style)
		assert.Equal(t, "SaaS", gotVoice.Industry)
	})

	t.Run("no voice profile configured generates without one, not an error", func(t *testing.T) {
		t.Parallel()
		voiceCalled := false
		mockStore := &MockBlogStore{
			GetBlogPostBySlugFn: func(ctx context.Context, aID uuid.UUID, slug string) (store.BlogPost, error) {
				return store.BlogPost{}, store.ErrNotFound
			},
			CreateBlogPostFn: func(ctx context.Context, params store.CreateBlogPostParams) (store.BlogPost, error) {
				return store.BlogPost{ID: uuid.New(), AccountID: params.AccountID, Title: params.Title, Slug: params.Slug}, nil
			},
			GetVoiceProfileByAccountFn: func(ctx context.Context, aID uuid.UUID) (store.VoiceProfile, error) {
				voiceCalled = true
				return store.VoiceProfile{}, store.ErrNotFound
			},
		}
		var gotVoice *aiblog.VoiceContext
		hadVoice := false
		mockGen := &MockBlogGenerator{
			GenerateFn: func(ctx context.Context, req aiblog.Request) (aiblog.Result, error) {
				gotVoice = req.Voice
				hadVoice = true
				return aiblog.Result{Title: "Test", Content: "content"}, nil
			},
		}
		proc := New(mockStore, mockGen, logger)

		_, err := proc.GenerateBlogPost(context.Background(), accountID, "write about X", nil, nil)

		require.NoError(t, err)
		assert.True(t, voiceCalled, "voice profile lookup must be attempted")
		assert.True(t, hadVoice, "generator must still be called")
		assert.Nil(t, gotVoice)
	})
}
