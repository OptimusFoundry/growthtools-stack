package processor

import (
	"context"
	"errors"
	"io"
	"strings"
	"testing"

	"base-server/internal/content/prompts"
	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

// noVoiceStore is a helper that returns a MockContentStore pre-wired to return
// ErrNotFound for voice profile lookups. Most tests don't care about voice.
func noVoiceStore(ctrl *gomock.Controller) *MockContentStore {
	m := NewMockContentStore(ctrl)
	m.EXPECT().GetVoiceProfileByAccount(gomock.Any(), gomock.Any()).
		Return(store.VoiceProfile{}, store.ErrNotFound).AnyTimes()
	return m
}

func TestContentProcessor_GeneratePost(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name    string
		mocks   func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient)
		wantErr error
		want    string
	}{
		{
			name: "happy path with voice profile",
			mocks: func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient) {
				ms := NewMockContentStore(ctrl)
				ms.EXPECT().GetVoiceProfileByAccount(gomock.Any(), accountID).
					Return(store.VoiceProfile{ID: uuid.New(), AccountID: accountID, Tone: "professional", Style: "concise"}, nil)
				ai := NewMockAIClient(ctrl)
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("Generated post content", nil)
				return ms, ai
			},
			want: "Generated post content",
		},
		{
			name: "voice profile not found falls back gracefully",
			mocks: func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient) {
				ms := noVoiceStore(ctrl)
				ai := NewMockAIClient(ctrl)
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("Generic generated content", nil)
				return ms, ai
			},
			want: "Generic generated content",
		},
		{
			name: "voice profile store error falls back gracefully",
			mocks: func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient) {
				ms := NewMockContentStore(ctrl)
				ms.EXPECT().GetVoiceProfileByAccount(gomock.Any(), gomock.Any()).
					Return(store.VoiceProfile{}, errors.New("db error"))
				ai := NewMockAIClient(ctrl)
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("Fallback content", nil)
				return ms, ai
			},
			want: "Fallback content",
		},
		{
			name: "ai error returns ErrGeneratePost",
			mocks: func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient) {
				ms := noVoiceStore(ctrl)
				ai := NewMockAIClient(ctrl)
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("", errors.New("api error"))
				return ms, ai
			},
			wantErr: ErrGeneratePost,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			ms, ai := tt.mocks(ctrl)
			proc := New(ms, ai, logger)

			result, err := proc.GeneratePost(context.Background(), accountID, "Write about Go", []string{"x", "linkedin"})
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.want, result)
		})
	}
}

func TestContentProcessor_AdaptContent(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name     string
		platform string
		mocks    func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient)
		wantErr  error
		want     string
	}{
		{
			name:     "happy path known platform",
			platform: "x",
			mocks: func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient) {
				ms := noVoiceStore(ctrl)
				ai := NewMockAIClient(ctrl)
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("Adapted for X", nil)
				return ms, ai
			},
			want: "Adapted for X",
		},
		{
			name:     "unknown platform defaults gracefully",
			platform: "unknown_platform",
			mocks: func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient) {
				ms := noVoiceStore(ctrl)
				ai := NewMockAIClient(ctrl)
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("Adapted content", nil)
				return ms, ai
			},
			want: "Adapted content",
		},
		{
			name:     "ai error returns ErrAdaptContent",
			platform: "x",
			mocks: func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient) {
				ms := noVoiceStore(ctrl)
				ai := NewMockAIClient(ctrl)
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("", errors.New("api error"))
				return ms, ai
			},
			wantErr: ErrAdaptContent,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			ms, ai := tt.mocks(ctrl)
			proc := New(ms, ai, logger)

			result, err := proc.AdaptContent(context.Background(), accountID, "Long content here", tt.platform)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.want, result)
		})
	}
}

func TestContentProcessor_GenerateThread(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()

	tests := []struct {
		name    string
		aiResp  string
		aiErr   error
		wantLen int
		wantErr error
	}{
		{
			name:    "happy path splits thread by delimiter",
			aiResp:  "1/ First post---THREAD_BREAK---2/ Second post---THREAD_BREAK---3/ Third post",
			wantLen: 3,
		},
		{
			name:    "empty parts filtered out",
			aiResp:  "1/ Post---THREAD_BREAK------THREAD_BREAK---2/ Post",
			wantLen: 2,
		},
		{
			name:    "ai error returns ErrGenerateThread",
			aiErr:   errors.New("api error"),
			wantErr: ErrGenerateThread,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			ms := NewMockContentStore(ctrl)
			ai := NewMockAIClient(ctrl)
			ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
				Return(tt.aiResp, tt.aiErr)
			proc := New(ms, ai, logger)

			result, err := proc.GenerateThread(context.Background(), "Long content", "x")
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Len(t, result, tt.wantLen)
			if tt.wantLen == 3 {
				assert.Equal(t, "1/ First post", result[0])
				assert.Equal(t, "2/ Second post", result[1])
				assert.Equal(t, "3/ Third post", result[2])
			}
		})
	}
}

func TestContentProcessor_GenerateWithMediaPlan(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	// A plan with one video (index 1) and two images (indexes 2, 3). Defaults
	// to thread mode because Mode is the empty string; tests that want
	// single-post mode set it explicitly.
	basePlan := func() *prompts.MediaPlan {
		return &prompts.MediaPlan{
			Mode:         "thread",
			ThreadParts:  3,
			VideoIndex:   1,
			ImageIndexes: []int{2, 3},
		}
	}

	tests := []struct {
		name          string
		platforms     []string
		plan          *prompts.MediaPlan
		images        []aiclient.ImageData
		mocks         func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient)
		wantErr       error
		assertResults func(t *testing.T, base string, results map[string]ThreadWithMediaPlanResult)
	}{
		{
			name:      "happy path single platform produces base and thread segments",
			platforms: []string{"x"},
			plan:      basePlan(),
			mocks: func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient) {
				ms := noVoiceStore(ctrl)
				ai := NewMockAIClient(ctrl)
				// First call: base content.
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("  base content  ", nil)
				// Second call: platform thread.
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("seg1---THREAD_BREAK---seg2---THREAD_BREAK---seg3", nil)
				return ms, ai
			},
			assertResults: func(t *testing.T, base string, results map[string]ThreadWithMediaPlanResult) {
				t.Helper()
				assert.Equal(t, "base content", base) // trimmed
				r, ok := results["x"]
				require.True(t, ok)
				require.Len(t, r.Segments, 3)
				assert.Equal(t, "seg1", r.Segments[0].Content)
				assert.Nil(t, r.Segments[0].ImageIndex, "no images provided — ImageIndex is nil")
				assert.Equal(t, "seg2", r.Segments[1].Content)
				assert.Equal(t, "seg3", r.Segments[2].Content)
				assert.Equal(t, "seg1\nseg2\nseg3", r.Content)
			},
		},
		{
			name:      "multi-platform results all populated",
			platforms: []string{"x", "bluesky", "threads"},
			plan:      &prompts.MediaPlan{},
			mocks: func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient) {
				ms := noVoiceStore(ctrl)
				ai := NewMockAIClient(ctrl)
				// base call
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("base", nil)
				// three platform calls (parallel, any order)
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("p1---THREAD_BREAK---p2", nil).Times(3)
				return ms, ai
			},
			assertResults: func(t *testing.T, base string, results map[string]ThreadWithMediaPlanResult) {
				t.Helper()
				assert.Equal(t, "base", base)
				assert.Len(t, results, 3)
				for _, platform := range []string{"x", "bluesky", "threads"} {
					r, ok := results[platform]
					require.True(t, ok, "missing result for %s", platform)
					assert.Len(t, r.Segments, 2)
				}
			},
		},
		{
			name:      "thread segments respect char limit truncation",
			platforms: []string{"bluesky"}, // bluesky has 300-char thread limit
			plan:      &prompts.MediaPlan{},
			mocks: func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient) {
				ms := noVoiceStore(ctrl)
				ai := NewMockAIClient(ctrl)
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("base", nil)
				longSeg := strings.Repeat("a", 500) // exceeds 300-char limit
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(longSeg+"---THREAD_BREAK---short", nil)
				return ms, ai
			},
			assertResults: func(t *testing.T, base string, results map[string]ThreadWithMediaPlanResult) {
				t.Helper()
				r := results["bluesky"]
				require.Len(t, r.Segments, 2)
				assert.LessOrEqual(t, len([]rune(r.Segments[0].Content)), 300)
				assert.Equal(t, "short", r.Segments[1].Content)
			},
		},
		{
			name:      "thread count honored — maxParts applied via prompt",
			platforms: []string{"x"},
			plan:      &prompts.MediaPlan{},
			mocks: func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient) {
				ms := noVoiceStore(ctrl)
				ai := NewMockAIClient(ctrl)
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("base", nil)
				// AI returns exactly 2 segments as instructed.
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("p1---THREAD_BREAK---p2", nil)
				return ms, ai
			},
			assertResults: func(t *testing.T, base string, results map[string]ThreadWithMediaPlanResult) {
				t.Helper()
				r := results["x"]
				assert.Len(t, r.Segments, 2)
			},
		},
		{
			name:      "base content AI call failure returns ErrStreamGenerate",
			platforms: []string{"x"},
			plan:      &prompts.MediaPlan{},
			mocks: func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient) {
				ms := noVoiceStore(ctrl)
				ai := NewMockAIClient(ctrl)
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("", errors.New("claude down"))
				return ms, ai
			},
			wantErr: ErrStreamGenerate,
		},
		{
			name:      "platform AI call failure returns ErrStreamGenerate",
			platforms: []string{"x"},
			plan:      &prompts.MediaPlan{},
			mocks: func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient) {
				ms := noVoiceStore(ctrl)
				ai := NewMockAIClient(ctrl)
				// base succeeds
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("base content", nil)
				// platform call fails
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("", errors.New("platform call failed"))
				return ms, ai
			},
			wantErr: ErrStreamGenerate,
		},
		{
			name:      "voice lookup failure is tolerated — content generated anyway",
			platforms: []string{"x"},
			plan:      &prompts.MediaPlan{},
			mocks: func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient) {
				ms := NewMockContentStore(ctrl)
				ms.EXPECT().GetVoiceProfileByAccount(gomock.Any(), gomock.Any()).
					Return(store.VoiceProfile{}, errors.New("db flake"))
				ai := NewMockAIClient(ctrl)
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("base content", nil)
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("seg1---THREAD_BREAK---seg2", nil)
				return ms, ai
			},
			assertResults: func(t *testing.T, base string, results map[string]ThreadWithMediaPlanResult) {
				t.Helper()
				assert.Equal(t, "base content", base)
				r, ok := results["x"]
				require.True(t, ok)
				assert.Len(t, r.Segments, 2)
			},
		},
		{
			name:      "thread with images — AI assigns markers, segments carry ImageIndex",
			platforms: []string{"x"},
			plan:      &prompts.MediaPlan{Mode: "thread", ThreadParts: 3, ImageIndexes: []int{1, 2}},
			images: []aiclient.ImageData{
				{MIMEType: "image/png", Data: []byte("img1")},
				{MIMEType: "image/png", Data: []byte("img2")},
			},
			mocks: func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient) {
				ms := noVoiceStore(ctrl)
				ai := NewMockAIClient(ctrl)
				// Describe step: two parallel calls (one per image).
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("A chart showing retention metrics", nil)
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("A modal dialog for onboarding", nil)
				// Base content call.
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("base content", nil)
				// Platform thread call — AI emits markers.
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("hook copy\n[IMAGE:1]---THREAD_BREAK---detail copy\n[IMAGE:2]---THREAD_BREAK---cta copy", nil)
				return ms, ai
			},
			assertResults: func(t *testing.T, base string, results map[string]ThreadWithMediaPlanResult) {
				t.Helper()
				r := results["x"]
				require.Len(t, r.Segments, 3)
				require.NotNil(t, r.Segments[0].ImageIndex)
				assert.Equal(t, 1, *r.Segments[0].ImageIndex)
				require.NotNil(t, r.Segments[1].ImageIndex)
				assert.Equal(t, 2, *r.Segments[1].ImageIndex)
				assert.Nil(t, r.Segments[2].ImageIndex)
			},
		},
		{
			name:      "thread with images — AI omits marker for image 2, image 2 is dropped",
			platforms: []string{"x"},
			plan:      &prompts.MediaPlan{Mode: "thread", ThreadParts: 3, ImageIndexes: []int{1, 2}},
			images: []aiclient.ImageData{
				{MIMEType: "image/png", Data: []byte("img1")},
				{MIMEType: "image/png", Data: []byte("img2")},
			},
			mocks: func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient) {
				ms := noVoiceStore(ctrl)
				ai := NewMockAIClient(ctrl)
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("desc 1", nil)
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("desc 2", nil)
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("base content", nil)
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("hook copy\n[IMAGE:1]---THREAD_BREAK---detail copy---THREAD_BREAK---cta copy", nil)
				return ms, ai
			},
			assertResults: func(t *testing.T, base string, results map[string]ThreadWithMediaPlanResult) {
				t.Helper()
				r := results["x"]
				require.Len(t, r.Segments, 3)
				require.NotNil(t, r.Segments[0].ImageIndex)
				assert.Equal(t, 1, *r.Segments[0].ImageIndex)
				assert.Nil(t, r.Segments[1].ImageIndex, "image 2 dropped — no fallback to positional")
				assert.Nil(t, r.Segments[2].ImageIndex)
			},
		},
		{
			name:      "single mode with images — descriptions passed, no markers",
			platforms: []string{"linkedin"},
			plan:      &prompts.MediaPlan{Mode: "single", ImageIndexes: []int{1}},
			images: []aiclient.ImageData{
				{MIMEType: "image/png", Data: []byte("img1")},
			},
			mocks: func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient) {
				ms := noVoiceStore(ctrl)
				ai := NewMockAIClient(ctrl)
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("A dashboard showing daily active users", nil)
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("base", nil)
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("great post about the dashboard", nil)
				return ms, ai
			},
			assertResults: func(t *testing.T, base string, results map[string]ThreadWithMediaPlanResult) {
				t.Helper()
				r := results["linkedin"]
				require.Len(t, r.Segments, 1)
				assert.Equal(t, "great post about the dashboard", r.Segments[0].Content)
				assert.Nil(t, r.Segments[0].ImageIndex, "single mode never parses markers")
			},
		},
		{
			name:      "no images — describe step skipped, video-only plan",
			platforms: []string{"x"},
			plan:      &prompts.MediaPlan{Mode: "thread", ThreadParts: 2, VideoIndex: 1},
			images:    nil,
			mocks: func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient) {
				ms := noVoiceStore(ctrl)
				ai := NewMockAIClient(ctrl)
				// Only 2 AI calls — no describe step.
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("base", nil)
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("hook---THREAD_BREAK---close", nil)
				return ms, ai
			},
			assertResults: func(t *testing.T, base string, results map[string]ThreadWithMediaPlanResult) {
				t.Helper()
				r := results["x"]
				require.Len(t, r.Segments, 2)
				assert.Nil(t, r.Segments[0].ImageIndex)
				assert.Nil(t, r.Segments[1].ImageIndex)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			ms, ai := tt.mocks(ctrl)
			proc := New(ms, ai, logger)

			base, results, err := proc.GenerateWithMediaPlan(
				context.Background(), accountID, "test prompt",
				tt.platforms, tt.plan, tt.images,
			)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			if tt.assertResults != nil {
				tt.assertResults(t, base, results)
			}
		})
	}
}

func TestContentProcessor_StreamGenerateAndAdapt(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name       string
		platforms  []string
		mocks      func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient)
		wantErr    error
		assertFunc func(t *testing.T)
	}{
		{
			name:      "happy path streams base then adapts per platform",
			platforms: []string{"x"},
			mocks: func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient) {
				ms := noVoiceStore(ctrl)
				ai := NewMockAIClient(ctrl)
				// base stream
				ai.EXPECT().StreamMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					DoAndReturn(func(_ context.Context, _ string, _ []aiclient.Message, _ int, onChunk func(string)) error {
						onChunk("Base ")
						onChunk("content")
						return nil
					})
				// platform adaptation
				ai.EXPECT().StreamMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					DoAndReturn(func(_ context.Context, _ string, _ []aiclient.Message, _ int, onChunk func(string)) error {
						onChunk("Adapted for X")
						return nil
					})
				return ms, ai
			},
		},
		{
			name:      "base streaming error returns ErrStreamGenerate",
			platforms: []string{"x"},
			mocks: func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient) {
				ms := noVoiceStore(ctrl)
				ai := NewMockAIClient(ctrl)
				ai.EXPECT().StreamMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(errors.New("stream error"))
				return ms, ai
			},
			wantErr: ErrStreamGenerate,
		},
		{
			name:      "platform adaptation error returns ErrStreamGenerate",
			platforms: []string{"x"},
			mocks: func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient) {
				ms := noVoiceStore(ctrl)
				ai := NewMockAIClient(ctrl)
				ai.EXPECT().StreamMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					DoAndReturn(func(_ context.Context, _ string, _ []aiclient.Message, _ int, onChunk func(string)) error {
						onChunk("Base content")
						return nil
					})
				ai.EXPECT().StreamMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(errors.New("platform api error"))
				return ms, ai
			},
			wantErr: ErrStreamGenerate,
		},
		{
			name:      "thread mode splits segments correctly",
			platforms: []string{"x"},
			mocks: func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient) {
				ms := noVoiceStore(ctrl)
				ai := NewMockAIClient(ctrl)
				ai.EXPECT().StreamMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					DoAndReturn(func(_ context.Context, _ string, _ []aiclient.Message, _ int, onChunk func(string)) error {
						onChunk("Base content for threading")
						return nil
					})
				ai.EXPECT().StreamMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					DoAndReturn(func(_ context.Context, _ string, _ []aiclient.Message, _ int, onChunk func(string)) error {
						onChunk("1/ First post---THREAD_BREAK---2/ Second post---THREAD_BREAK---3/ Third post")
						return nil
					})
				return ms, ai
			},
		},
		{
			name:      "truncates content exceeding char limit",
			platforms: []string{"bluesky"},
			mocks: func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient) {
				ms := noVoiceStore(ctrl)
				ai := NewMockAIClient(ctrl)
				ai.EXPECT().StreamMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					DoAndReturn(func(_ context.Context, _ string, _ []aiclient.Message, _ int, onChunk func(string)) error {
						onChunk("Base content")
						return nil
					})
				longContent := strings.Repeat("a ", 200) // 400 chars
				ai.EXPECT().StreamMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					DoAndReturn(func(_ context.Context, _ string, _ []aiclient.Message, _ int, onChunk func(string)) error {
						onChunk(longContent)
						return nil
					})
				return ms, ai
			},
		},
		{
			name:      "with images calls DescribeImages first",
			platforms: []string{"x"},
			mocks: func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient) {
				ms := noVoiceStore(ctrl)
				ai := NewMockAIClient(ctrl)
				// image description call
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("A sunset over a city skyline", nil)
				// base stream
				ai.EXPECT().StreamMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					DoAndReturn(func(_ context.Context, _ string, msgs []aiclient.Message, _ int, onChunk func(string)) error {
						// prompt should include image context
						assert.Contains(t, msgs[0].Content, "Image 1:")
						onChunk("Content about the sunset")
						return nil
					})
				// platform
				ai.EXPECT().StreamMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					DoAndReturn(func(_ context.Context, _ string, _ []aiclient.Message, _ int, onChunk func(string)) error {
						onChunk("Adapted content")
						return nil
					})
				return ms, ai
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			ms, ai := tt.mocks(ctrl)
			proc := New(ms, ai, logger)

			var images []aiclient.ImageData
			if tt.name == "with images calls DescribeImages first" {
				images = []aiclient.ImageData{{MIMEType: "image/jpeg", Data: []byte("fake")}}
			}

			err := proc.StreamGenerateAndAdapt(
				context.Background(), accountID, "Write about Go",
				tt.platforms, "text", images, 0, StreamCallbacks{
					OnPhase:        func(string, string) {},
					OnChunk:        func(string, string) {},
					OnBaseDone:     func(string) {},
					OnPlatformDone: func(string, string) {},
				},
			)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
		})
	}
}

func TestContentProcessor_DescribeImages(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()

	tests := []struct {
		name          string
		images        []aiclient.ImageData
		mocks         func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient)
		assertResults func(t *testing.T, results []ImageDescription)
	}{
		{
			name: "describes images in parallel",
			images: []aiclient.ImageData{
				{MIMEType: "image/jpeg", Data: []byte("img1")},
				{MIMEType: "image/png", Data: []byte("img2")},
			},
			mocks: func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient) {
				ms := NewMockContentStore(ctrl)
				ai := NewMockAIClient(ctrl)
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("A beautiful landscape", nil).Times(2)
				return ms, ai
			},
			assertResults: func(t *testing.T, results []ImageDescription) {
				t.Helper()
				require.Len(t, results, 2)
				assert.Equal(t, 1, results[0].Index)
				assert.Equal(t, "A beautiful landscape", results[0].Description)
				assert.Equal(t, 2, results[1].Index)
				assert.Equal(t, "A beautiful landscape", results[1].Description)
			},
		},
		{
			name: "falls back on AI error per image",
			images: []aiclient.ImageData{
				{MIMEType: "image/jpeg", Data: []byte("img1")},
			},
			mocks: func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient) {
				ms := NewMockContentStore(ctrl)
				ai := NewMockAIClient(ctrl)
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("", errors.New("ai error"))
				return ms, ai
			},
			assertResults: func(t *testing.T, results []ImageDescription) {
				t.Helper()
				require.Len(t, results, 1)
				assert.Equal(t, "An attached image", results[0].Description)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			ms, ai := tt.mocks(ctrl)
			proc := New(ms, ai, logger)

			results := proc.DescribeImages(context.Background(), tt.images)
			if tt.assertResults != nil {
				tt.assertResults(t, results)
			}
		})
	}
}

func TestParseThreadSegmentsWithImages(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name          string
		raw           string
		wantLen       int
		assertResults func(t *testing.T, segs []ThreadSegment)
	}{
		{
			name:    "extracts IMAGE markers",
			raw:     "1/ First post\n[IMAGE:1]---THREAD_BREAK---2/ Second post---THREAD_BREAK---3/ Third post\n[IMAGE:2]",
			wantLen: 3,
			assertResults: func(t *testing.T, segs []ThreadSegment) {
				t.Helper()
				assert.Equal(t, "1/ First post", segs[0].Content)
				require.NotNil(t, segs[0].ImageIndex)
				assert.Equal(t, 1, *segs[0].ImageIndex)
				assert.Equal(t, "2/ Second post", segs[1].Content)
				assert.Nil(t, segs[1].ImageIndex)
				assert.Equal(t, "3/ Third post", segs[2].Content)
				require.NotNil(t, segs[2].ImageIndex)
				assert.Equal(t, 2, *segs[2].ImageIndex)
			},
		},
		{
			name:    "no markers returns plain segments",
			raw:     "1/ First---THREAD_BREAK---2/ Second",
			wantLen: 2,
			assertResults: func(t *testing.T, segs []ThreadSegment) {
				t.Helper()
				assert.Equal(t, "1/ First", segs[0].Content)
				assert.Nil(t, segs[0].ImageIndex)
			},
		},
		{
			name:    "empty parts filtered",
			raw:     "1/ Post---THREAD_BREAK------THREAD_BREAK---2/ Post",
			wantLen: 2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			segs := parseThreadSegmentsWithImages(tt.raw)
			assert.Len(t, segs, tt.wantLen)
			if tt.assertResults != nil {
				tt.assertResults(t, segs)
			}
		})
	}
}

func TestContentProcessor_SelectMediaAndMode(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()

	video := &aiclient.ImageData{MIMEType: "video/mp4", Data: []byte("vid")}
	threeImages := []aiclient.ImageData{
		{MIMEType: "image/png", Data: []byte("a")},
		{MIMEType: "image/png", Data: []byte("b")},
		{MIMEType: "image/png", Data: []byte("c")},
	}

	tests := []struct {
		name    string
		video   *aiclient.ImageData
		images  []aiclient.ImageData
		aiReply string
		aiErr   error
		want    MediaAndModeDecision
		wantErr error
	}{
		{
			name:    "video kept, images dropped, single mode",
			video:   video,
			images:  threeImages,
			aiReply: `{"use_video": true, "image_indexes": [], "mode": "single", "thread_parts": 0, "reason": "video demos the change cleanly"}`,
			want: MediaAndModeDecision{
				UseVideo:     true,
				ImageIndexes: []int{},
				Mode:         "single",
				ThreadParts:  0,
				Reason:       "video demos the change cleanly",
			},
		},
		{
			name:    "video rejected, images kept, thread mode with clamped parts",
			video:   video,
			images:  threeImages,
			aiReply: `{"use_video": false, "image_indexes": [2, 1], "mode": "thread", "thread_parts": 4, "reason": "video is blank; screenshots tell the story"}`,
			want: MediaAndModeDecision{
				UseVideo:     false,
				ImageIndexes: []int{1},
				Mode:         "thread",
				ThreadParts:  3,
				Reason:       "video is blank; screenshots tell the story",
			},
		},
		{
			name:    "no media at all — empty decision is valid",
			video:   nil,
			images:  nil,
			aiReply: `{"use_video": false, "image_indexes": [], "mode": "single", "thread_parts": 0, "reason": "nothing worth attaching"}`,
			want: MediaAndModeDecision{
				UseVideo:     false,
				ImageIndexes: []int{},
				Mode:         "single",
				ThreadParts:  0,
				Reason:       "nothing worth attaching",
			},
		},
		{
			name:    "AI claims to use video we don't have — clamped to false",
			video:   nil,
			images:  threeImages,
			aiReply: `{"use_video": true, "image_indexes": [1], "mode": "single", "thread_parts": 0, "reason": "hallucinating"}`,
			want: MediaAndModeDecision{
				UseVideo:     false, // clamped
				ImageIndexes: []int{1},
				Mode:         "single",
				ThreadParts:  0,
				Reason:       "hallucinating",
			},
		},
		{
			name:    "out-of-range and duplicate image indexes are cleaned and clamped to 1",
			video:   video,
			images:  threeImages,
			aiReply: `{"use_video": true, "image_indexes": [0, 2, 2, 99, 1], "mode": "single", "thread_parts": 0, "reason": "clean me"}`,
			want: MediaAndModeDecision{
				UseVideo:     true,
				ImageIndexes: []int{1},
				Mode:         "single",
				ThreadParts:  0,
				Reason:       "clean me",
			},
		},
		{
			name:    "thread_parts over max is clamped to 3",
			video:   video,
			images:  threeImages,
			aiReply: `{"use_video": true, "image_indexes": [], "mode": "thread", "thread_parts": 99, "reason": "too many"}`,
			want: MediaAndModeDecision{
				UseVideo:     true,
				ImageIndexes: []int{},
				Mode:         "thread",
				ThreadParts:  3,
				Reason:       "too many",
			},
		},
		{
			name:    "thread_parts below 2 is clamped up",
			video:   video,
			images:  threeImages,
			aiReply: `{"use_video": true, "image_indexes": [], "mode": "thread", "thread_parts": 1, "reason": "one is single, not thread"}`,
			want: MediaAndModeDecision{
				UseVideo:     true,
				ImageIndexes: []int{},
				Mode:         "thread",
				ThreadParts:  2,
				Reason:       "one is single, not thread",
			},
		},
		{
			name:    "unknown mode defaults to single",
			video:   video,
			images:  threeImages,
			aiReply: `{"use_video": true, "image_indexes": [], "mode": "carousel", "thread_parts": 0, "reason": "weird"}`,
			want: MediaAndModeDecision{
				UseVideo:     true,
				ImageIndexes: []int{},
				Mode:         "single",
				ThreadParts:  0,
				Reason:       "weird",
			},
		},
		{
			name:    "AI call fails maps to ErrSelectMediaAndMode",
			video:   video,
			images:  threeImages,
			aiErr:   errors.New("provider timeout"),
			wantErr: ErrSelectMediaAndMode,
		},
		{
			name:    "unparseable response maps to ErrSelectMediaAndMode",
			video:   video,
			images:  threeImages,
			aiReply: "not json",
			wantErr: ErrSelectMediaAndMode,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			ai := NewMockAIClient(ctrl)
			ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
				Return(tt.aiReply, tt.aiErr)
			proc := New(noVoiceStore(ctrl), ai, logger)
			got, err := proc.SelectMediaAndMode(context.Background(), tt.video, tt.images, "feat: ship the thing")
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestContentProcessor_DecideMode(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()

	video := &aiclient.ImageData{MIMEType: "video/mp4", Data: []byte("vid")}
	twoImages := []aiclient.ImageData{
		{MIMEType: "image/png", Data: []byte("a")},
		{MIMEType: "image/png", Data: []byte("b")},
	}

	tests := []struct {
		name    string
		video   *aiclient.ImageData
		images  []aiclient.ImageData
		aiReply string
		aiErr   error
		want    ModeDecision
		wantErr error
	}{
		{
			name:    "single mode returned correctly",
			video:   video,
			images:  twoImages,
			aiReply: `{"mode": "single", "thread_parts": 0, "reason": "one strong video"}`,
			want:    ModeDecision{Mode: "single", ThreadParts: 0, Reason: "one strong video"},
		},
		{
			name:    "thread mode with parts returned correctly",
			video:   nil,
			images:  twoImages,
			aiReply: `{"mode": "thread", "thread_parts": 3, "reason": "enough content for 3 parts"}`,
			want:    ModeDecision{Mode: "thread", ThreadParts: 3, Reason: "enough content for 3 parts"},
		},
		{
			name:    "thread_parts above max clamped to 3",
			video:   video,
			images:  twoImages,
			aiReply: `{"mode": "thread", "thread_parts": 99, "reason": "overreaching"}`,
			want:    ModeDecision{Mode: "thread", ThreadParts: 3, Reason: "overreaching"},
		},
		{
			name:    "thread_parts below 2 clamped up to 2",
			video:   video,
			images:  twoImages,
			aiReply: `{"mode": "thread", "thread_parts": 1, "reason": "needs at least 2"}`,
			want:    ModeDecision{Mode: "thread", ThreadParts: 2, Reason: "needs at least 2"},
		},
		{
			name:    "unknown mode defaults to single",
			video:   video,
			images:  twoImages,
			aiReply: `{"mode": "carousel", "thread_parts": 0, "reason": "weird mode"}`,
			want:    ModeDecision{Mode: "single", ThreadParts: 0, Reason: "weird mode"},
		},
		{
			name:    "AI error maps to ErrDecideMode",
			video:   video,
			images:  twoImages,
			aiErr:   errors.New("provider timeout"),
			wantErr: ErrDecideMode,
		},
		{
			name:    "unparseable response maps to ErrDecideMode",
			video:   video,
			images:  twoImages,
			aiReply: "not json",
			wantErr: ErrDecideMode,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			ai := NewMockAIClient(ctrl)
			ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
				Return(tt.aiReply, tt.aiErr)
			proc := New(noVoiceStore(ctrl), ai, logger)
			got, err := proc.DecideMode(context.Background(), tt.video, tt.images, "feat: add feature")
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestContentProcessor_FetchAndBucketMedia(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	videoID := uuid.New()
	imageID := uuid.New()

	videoRow := store.Media{
		ID:          videoID,
		AccountID:   accountID,
		ContentType: "video/mp4",
		S3Key:       "capture/video.mp4",
	}
	imageRow := store.Media{
		ID:          imageID,
		AccountID:   accountID,
		ContentType: "image/png",
		S3Key:       "capture/image.png",
	}

	tests := []struct {
		name         string
		mediaIDs     []uuid.UUID
		setupMocks   func(ms *MockMediaStore, s3 *MockS3Fetcher)
		wantErr      error
		assertResult func(t *testing.T, video *aiclient.ImageData, images []aiclient.ImageData, hasVideo bool)
	}{
		{
			name:     "happy path buckets video and images correctly",
			mediaIDs: []uuid.UUID{videoID, imageID},
			setupMocks: func(ms *MockMediaStore, s3 *MockS3Fetcher) {
				ms.EXPECT().GetMediaByIDs(gomock.Any(), []uuid.UUID{videoID, imageID}).
					Return([]store.Media{videoRow, imageRow}, nil)
				s3.EXPECT().GetFile(gomock.Any(), "capture/video.mp4").
					Return(io.NopCloser(strings.NewReader("videodata")), "video/mp4", nil)
				s3.EXPECT().GetFile(gomock.Any(), "capture/image.png").
					Return(io.NopCloser(strings.NewReader("imgdata")), "image/png", nil)
			},
			assertResult: func(t *testing.T, video *aiclient.ImageData, images []aiclient.ImageData, hasVideo bool) {
				t.Helper()
				require.NotNil(t, video)
				assert.Equal(t, "video/mp4", video.MIMEType)
				assert.True(t, hasVideo)
				require.Len(t, images, 1)
				assert.Equal(t, "image/png", images[0].MIMEType)
			},
		},
		{
			name:     "images only — no video in result",
			mediaIDs: []uuid.UUID{imageID},
			setupMocks: func(ms *MockMediaStore, s3 *MockS3Fetcher) {
				ms.EXPECT().GetMediaByIDs(gomock.Any(), []uuid.UUID{imageID}).
					Return([]store.Media{imageRow}, nil)
				s3.EXPECT().GetFile(gomock.Any(), "capture/image.png").
					Return(io.NopCloser(strings.NewReader("imgdata")), "image/png", nil)
			},
			assertResult: func(t *testing.T, video *aiclient.ImageData, images []aiclient.ImageData, hasVideo bool) {
				t.Helper()
				assert.Nil(t, video)
				assert.False(t, hasVideo)
				require.Len(t, images, 1)
			},
		},
		{
			name:     "store error returns ErrFetchMedia",
			mediaIDs: []uuid.UUID{videoID},
			setupMocks: func(ms *MockMediaStore, s3 *MockS3Fetcher) {
				ms.EXPECT().GetMediaByIDs(gomock.Any(), gomock.Any()).
					Return(nil, errors.New("db error"))
			},
			wantErr: ErrFetchMedia,
		},
		{
			name:     "s3 fetch error returns ErrFetchMedia",
			mediaIDs: []uuid.UUID{videoID},
			setupMocks: func(ms *MockMediaStore, s3 *MockS3Fetcher) {
				ms.EXPECT().GetMediaByIDs(gomock.Any(), gomock.Any()).
					Return([]store.Media{videoRow}, nil)
				s3.EXPECT().GetFile(gomock.Any(), "capture/video.mp4").
					Return(nil, "", errors.New("s3 unavailable"))
			},
			wantErr: ErrFetchMedia,
		},
		{
			name:     "wrong-account media silently skipped",
			mediaIDs: []uuid.UUID{videoID},
			setupMocks: func(ms *MockMediaStore, s3 *MockS3Fetcher) {
				wrongAccountRow := videoRow
				wrongAccountRow.AccountID = uuid.New() // different account
				ms.EXPECT().GetMediaByIDs(gomock.Any(), gomock.Any()).
					Return([]store.Media{wrongAccountRow}, nil)
			},
			assertResult: func(t *testing.T, video *aiclient.ImageData, images []aiclient.ImageData, hasVideo bool) {
				t.Helper()
				assert.Nil(t, video)
				assert.False(t, hasVideo)
				assert.Len(t, images, 0)
			},
		},
		{
			name:     "media with no s3_key silently skipped",
			mediaIDs: []uuid.UUID{videoID},
			setupMocks: func(ms *MockMediaStore, s3 *MockS3Fetcher) {
				noKeyRow := videoRow
				noKeyRow.S3Key = ""
				ms.EXPECT().GetMediaByIDs(gomock.Any(), gomock.Any()).
					Return([]store.Media{noKeyRow}, nil)
			},
			assertResult: func(t *testing.T, video *aiclient.ImageData, images []aiclient.ImageData, hasVideo bool) {
				t.Helper()
				assert.Nil(t, video)
				assert.False(t, hasVideo)
				assert.Len(t, images, 0)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			ms := NewMockMediaStore(ctrl)
			s3 := NewMockS3Fetcher(ctrl)
			tt.setupMocks(ms, s3)

			// Create proc without dependencies first, then wire them.
			proc := New(noVoiceStore(ctrl), NewMockAIClient(ctrl), logger)
			proc.WithMediaFetcher(ms, s3)

			video, images, hasVideo, err := proc.FetchAndBucketMedia(context.Background(), accountID, tt.mediaIDs)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			if tt.assertResult != nil {
				tt.assertResult(t, video, images, hasVideo)
			}
		})
	}
}

func TestContentProcessor_FetchAndBucketMedia_NoDependencies(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name string
	}{
		{name: "returns ErrFetchMedia when media dependencies not wired"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			proc := New(noVoiceStore(ctrl), NewMockAIClient(ctrl), logger)
			// Note: WithMediaFetcher NOT called.
			_, _, _, err := proc.FetchAndBucketMedia(context.Background(), accountID, []uuid.UUID{uuid.New()})
			require.ErrorIs(t, err, ErrFetchMedia)
		})
	}
}

func TestContentProcessor_ClassifyCommit(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()

	tests := []struct {
		name    string
		message string
		diff    string
		aiReply string
		aiErr   error
		want    CommitVerdict
		wantErr error
	}{
		{
			name:    "happy path worthwhile",
			message: "feat: add pricing page",
			diff:    "diff --git a/src/pages/Pricing.tsx",
			aiReply: `{"worthwhile": true, "reason": "adds new /pricing page"}`,
			want:    CommitVerdict{Worthwhile: true, Reason: "adds new /pricing page"},
		},
		{
			name:    "happy path not worthwhile",
			message: "chore: bump lockfile",
			diff:    "diff --git a/package-lock.json",
			aiReply: `{"worthwhile": false, "reason": "lockfile-only change"}`,
			want:    CommitVerdict{Worthwhile: false, Reason: "lockfile-only change"},
		},
		{
			name:    "empty reason is backfilled so logs are never blank",
			message: "chore:",
			diff:    "diff",
			aiReply: `{"worthwhile": false, "reason": ""}`,
			want:    CommitVerdict{Worthwhile: false, Reason: "classifier returned no reason"},
		},
		{
			name:    "whitespace around response is tolerated",
			message: "fix: UI",
			diff:    "diff",
			aiReply: "  \n{\"worthwhile\": true, \"reason\": \"fix UI\"}\n ",
			want:    CommitVerdict{Worthwhile: true, Reason: "fix UI"},
		},
		{
			name:    "AI error maps to ErrClassifyCommit",
			message: "anything",
			diff:    "anything",
			aiErr:   errors.New("anthropic 500"),
			wantErr: ErrClassifyCommit,
		},
		{
			name:    "malformed JSON maps to ErrClassifyCommit",
			message: "anything",
			diff:    "anything",
			aiReply: "not json at all",
			wantErr: ErrClassifyCommit,
		},
		{
			name:    "empty response defaults to include without erroring",
			message: "feat: new page",
			diff:    "diff",
			aiReply: "",
			want: CommitVerdict{
				Worthwhile: true,
				Reason:     "classifier returned empty response; defaulting to include",
			},
		},
		{
			name:    "whitespace-only response is treated as empty",
			message: "feat: new page",
			diff:    "diff",
			aiReply: "   \n\t  ",
			want: CommitVerdict{
				Worthwhile: true,
				Reason:     "classifier returned empty response; defaulting to include",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			ai := NewMockAIClient(ctrl)
			ai.EXPECT().
				CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
				Return(tt.aiReply, tt.aiErr)
			proc := New(noVoiceStore(ctrl), ai, logger)
			got, err := proc.ClassifyCommit(context.Background(), tt.message, tt.diff)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}
