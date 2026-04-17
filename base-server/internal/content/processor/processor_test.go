package processor

import (
	"context"
	"errors"
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

	// A plan with one video (index 1) and two images (indexes 2, 3).
	basePlan := &prompts.MediaPlan{
		VideoIndex:   1,
		ImageIndexes: []int{2, 3},
	}

	tests := []struct {
		name          string
		platforms     []string
		maxParts      int
		plan          *prompts.MediaPlan
		mocks         func(ctrl *gomock.Controller) (*MockContentStore, *MockAIClient)
		wantErr       error
		assertResults func(t *testing.T, base string, results map[string]ThreadWithMediaPlanResult)
	}{
		{
			name:      "happy path single platform produces base and thread segments",
			platforms: []string{"x"},
			maxParts:  3,
			plan:      basePlan,
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
				assert.Nil(t, r.Segments[0].ImageIndex, "caller assigns image index")
				assert.Equal(t, "seg2", r.Segments[1].Content)
				assert.Equal(t, "seg3", r.Segments[2].Content)
				assert.Equal(t, "seg1\nseg2\nseg3", r.Content)
			},
		},
		{
			name:      "multi-platform results all populated",
			platforms: []string{"x", "bluesky", "threads"},
			maxParts:  7,
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
			maxParts:  3,
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
			maxParts:  2,
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
			maxParts:  3,
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
			maxParts:  3,
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
			maxParts:  3,
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
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			ms, ai := tt.mocks(ctrl)
			proc := New(ms, ai, logger)

			base, results, err := proc.GenerateWithMediaPlan(
				context.Background(), accountID, "test prompt",
				tt.platforms, tt.maxParts, tt.plan,
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

func TestContentProcessor_SelectMeaningfulImages(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()

	threeImages := []aiclient.ImageData{
		{MIMEType: "image/png", Data: []byte("a")},
		{MIMEType: "image/png", Data: []byte("b")},
		{MIMEType: "image/png", Data: []byte("c")},
	}

	tests := []struct {
		name     string
		images   []aiclient.ImageData
		aiReply  string
		aiErr    error
		want     []int
		wantErr  error
		skipMock bool
	}{
		{
			name:     "no images returns nil without calling AI",
			images:   nil,
			want:     nil,
			skipMock: true,
		},
		{
			name:    "AI picks a subset — indexes returned in ascending order",
			images:  threeImages,
			aiReply: `{"selected":[3,1]}`,
			want:    []int{1, 3},
		},
		{
			name:    "AI returns empty selection",
			images:  threeImages,
			aiReply: `{"selected":[]}`,
			want:    []int{},
		},
		{
			name:    "out-of-range and duplicate indexes are cleaned up",
			images:  threeImages,
			aiReply: `{"selected":[0, 2, 2, 99, 1]}`,
			want:    []int{1, 2},
		},
		{
			name:    "AI trims markdown fences and whitespace are tolerated",
			images:  threeImages,
			aiReply: "  {\"selected\":[2]}  \n",
			want:    []int{2},
		},
		{
			name:    "AI call fails maps to ErrSelectImages",
			images:  threeImages,
			aiErr:   errors.New("anthropic timeout"),
			wantErr: ErrSelectImages,
		},
		{
			name:    "unparseable response maps to ErrSelectImages",
			images:  threeImages,
			aiReply: "not json",
			wantErr: ErrSelectImages,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			ai := NewMockAIClient(ctrl)
			if !tt.skipMock {
				ai.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(tt.aiReply, tt.aiErr)
			}
			proc := New(noVoiceStore(ctrl), ai, logger)
			got, err := proc.SelectMeaningfulImages(context.Background(), tt.images)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}
