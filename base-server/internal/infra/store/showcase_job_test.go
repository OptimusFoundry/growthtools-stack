package store

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================================
// CreateShowcaseJob
// ============================================================================

func TestStore_CreateShowcaseJob(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name  string
		setup func(t *testing.T) CreateShowcaseJobParams
	}{
		{
			name: "happy path inserts job with pending status and round-tripped story ids",
			setup: func(t *testing.T) CreateShowcaseJobParams {
				t.Helper()
				accountID := createTestAccount(t, s)
				return CreateShowcaseJobParams{
					AccountID:     accountID,
					Brief:         "a hero section showing off our pricing table",
					ComponentName: "PricingTable",
					StoryIDs:      []string{"pricing-table--default", "pricing-table--dark"},
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			params := tt.setup(t)
			got, err := s.CreateShowcaseJob(ctx, params)
			require.NoError(t, err)
			assert.NotEqual(t, uuid.Nil, got.ID)
			assert.Equal(t, "pending", got.Status)
			assert.Equal(t, StringArray(params.StoryIDs), got.StoryIDs)
			assert.Equal(t, params.AccountID, got.AccountID)
			assert.Equal(t, params.Brief, got.Brief)
			assert.Equal(t, params.ComponentName, got.ComponentName)
		})
	}
}

// ============================================================================
// GetShowcaseJobForDraft
// ============================================================================

func TestStore_GetShowcaseJobForDraft(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) (jobID uuid.UUID, want ShowcaseJob)
		wantErr error
	}{
		{
			name: "found returns brief, component name, status, and account id",
			setup: func(t *testing.T) (uuid.UUID, ShowcaseJob) {
				t.Helper()
				accountID := createTestAccount(t, s)
				created, err := s.CreateShowcaseJob(ctx, CreateShowcaseJobParams{
					AccountID:     accountID,
					Brief:         "showcase our new dashboard widget",
					ComponentName: "DashboardWidget",
					StoryIDs:      []string{"dashboard-widget--default"},
				})
				require.NoError(t, err)
				return created.ID, created
			},
		},
		{
			name: "not found for unknown job id",
			setup: func(t *testing.T) (uuid.UUID, ShowcaseJob) {
				t.Helper()
				return uuid.New(), ShowcaseJob{}
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			jobID, want := tt.setup(t)
			got, err := s.GetShowcaseJobForDraft(ctx, jobID)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, want.Brief, got.Brief)
			assert.Equal(t, want.ComponentName, got.ComponentName)
			assert.Equal(t, want.Status, got.Status)
			assert.Equal(t, want.AccountID, got.AccountID)
		})
	}
}

// ============================================================================
// UpdateShowcaseJobStatus
// ============================================================================

func TestStore_UpdateShowcaseJobStatus(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) uuid.UUID
		status  string
		wantErr error
	}{
		{
			name: "happy path transitions status to capturing",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				accountID := createTestAccount(t, s)
				created, err := s.CreateShowcaseJob(ctx, CreateShowcaseJobParams{
					AccountID:     accountID,
					Brief:         "brief",
					ComponentName: "Comp",
					StoryIDs:      []string{"comp--default"},
				})
				require.NoError(t, err)
				return created.ID
			},
			status: "capturing",
		},
		{
			name: "not found for unknown job id",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				return uuid.New()
			},
			status:  "capturing",
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			jobID := tt.setup(t)
			err := s.UpdateShowcaseJobStatus(ctx, jobID, tt.status)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			got, err := s.GetShowcaseJobForDraft(ctx, jobID)
			require.NoError(t, err)
			assert.Equal(t, tt.status, got.Status)
		})
	}
}

// ============================================================================
// UpdateShowcaseJobCapture
// ============================================================================

func TestStore_UpdateShowcaseJobCapture(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) uuid.UUID
		wantErr error
	}{
		{
			name: "happy path sets capture output and transitions to drafting",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				accountID := createTestAccount(t, s)
				created, err := s.CreateShowcaseJob(ctx, CreateShowcaseJobParams{
					AccountID:     accountID,
					Brief:         "brief",
					ComponentName: "Comp",
					StoryIDs:      []string{"comp--default"},
				})
				require.NoError(t, err)
				return created.ID
			},
		},
		{
			name: "not found for unknown job id",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				return uuid.New()
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			jobID := tt.setup(t)
			captureOutput := json.RawMessage(`{"uploaded":[]}`)
			err := s.UpdateShowcaseJobCapture(ctx, jobID, captureOutput)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			got, err := s.GetShowcaseJobForDraft(ctx, jobID)
			require.NoError(t, err)
			require.NotNil(t, got.CaptureOutput)
			assert.JSONEq(t, string(captureOutput), string(*got.CaptureOutput))
			assert.Equal(t, "drafting", got.Status)
		})
	}
}

// ============================================================================
// UpdateShowcaseJobPostID
// ============================================================================

func TestStore_UpdateShowcaseJobPostID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) (uuid.UUID, uuid.UUID) // jobID, postID
		wantErr error
	}{
		{
			name: "happy path links job to post and transitions to done",
			setup: func(t *testing.T) (uuid.UUID, uuid.UUID) {
				t.Helper()
				accountID := createTestAccount(t, s)
				created, err := s.CreateShowcaseJob(ctx, CreateShowcaseJobParams{
					AccountID:     accountID,
					Brief:         "brief",
					ComponentName: "Comp",
					StoryIDs:      []string{"comp--default"},
				})
				require.NoError(t, err)
				post, err := s.CreatePost(ctx, CreatePostParams{
					AccountID:   accountID,
					Content:     "showcase post",
					ContentType: ContentTypeText,
					Status:      PostStatusDraft,
					Source:      PostSourceManual,
				})
				require.NoError(t, err)
				return created.ID, post.ID
			},
		},
		{
			name: "not found for unknown job id",
			setup: func(t *testing.T) (uuid.UUID, uuid.UUID) {
				t.Helper()
				return uuid.New(), uuid.New()
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			jobID, postID := tt.setup(t)
			err := s.UpdateShowcaseJobPostID(ctx, jobID, postID)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			got, err := s.GetShowcaseJobForDraft(ctx, jobID)
			require.NoError(t, err)
			require.NotNil(t, got.PostID)
			assert.Equal(t, postID, *got.PostID)
			assert.Equal(t, "done", got.Status)
		})
	}
}

// ============================================================================
// UpdateShowcaseJobFailed
// ============================================================================

func TestStore_UpdateShowcaseJobFailed(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) uuid.UUID
		wantErr error
	}{
		{
			name: "happy path transitions job to failed",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				accountID := createTestAccount(t, s)
				created, err := s.CreateShowcaseJob(ctx, CreateShowcaseJobParams{
					AccountID:     accountID,
					Brief:         "brief",
					ComponentName: "Comp",
					StoryIDs:      []string{"comp--default"},
				})
				require.NoError(t, err)
				return created.ID
			},
		},
		{
			name: "not found for unknown job id",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				return uuid.New()
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			jobID := tt.setup(t)
			err := s.UpdateShowcaseJobFailed(ctx, jobID, "capture worker exploded")
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			got, err := s.GetShowcaseJobForDraft(ctx, jobID)
			require.NoError(t, err)
			assert.Equal(t, "failed", got.Status)
		})
	}
}
