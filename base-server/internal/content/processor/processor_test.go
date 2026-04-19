package processor_test

import (
	"context"
	"errors"
	"io"
	"strings"
	"testing"

	"base-server/internal/ai/mediadescriber"
	"base-server/internal/ai/socialposts"
	"base-server/internal/content/processor"
	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"go.uber.org/mock/gomock"
)

//go:generate go run go.uber.org/mock/mockgen@latest -source=processor.go -destination=mocks_test.go -package=processor_test

func TestStreamGenerateWithImages(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	ctx := context.Background()
	logger := observability.NewLogger()

	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockStore := NewMockContentStore(ctrl)
	mockS3 := NewMockS3Fetcher(ctrl)
	mockDescriber := NewMockDescriber(ctrl)
	mockGenerator := NewMockGenerator(ctrl)

	// Voice profile fetch
	mockStore.EXPECT().
		GetVoiceProfileByAccount(ctx, accountID).
		Return(store.VoiceProfile{
			Tone:  "professional",
			Style: "engaging",
		}, nil)

	// Describe images
	mockDescriber.EXPECT().
		DescribeBatch(ctx, gomock.Any()).
		Return([]mediadescriber.Description{
			{Index: 1, Description: "Test image"},
		})

	// Generator stream
	eventCh := make(chan socialposts.Event, 2)
	eventCh <- socialposts.PhaseEvent{Phase: "generating"}
	eventCh <- socialposts.ErrorEvent{Err: errors.New("test error")}
	close(eventCh)

	mockGenerator.EXPECT().
		GenerateStream(ctx, gomock.Any()).
		Return(eventCh, nil)

	proc := processor.New(mockStore, mockS3, mockDescriber, mockGenerator, logger)

	params := processor.StreamGenerateParams{
		AccountID: accountID,
		Prompt:    "test",
		Platforms: []string{"x"},
		Mode:      socialposts.ModeSingle,
		Images: []aiclient.ImageData{
			{MIMEType: "image/png", Data: []byte("fake")},
		},
	}

	ch, err := proc.StreamGenerate(ctx, params)
	if err != nil {
		t.Fatalf("StreamGenerate failed: %v", err)
	}

	// Consume events
	count := 0
	for range ch {
		count++
	}
	if count != 2 {
		t.Errorf("expected 2 events, got %d", count)
	}
}

func TestStreamGenerateWithMediaIDs(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	mediaID := uuid.New()
	ctx := context.Background()
	logger := observability.NewLogger()

	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockStore := NewMockContentStore(ctrl)
	mockS3 := NewMockS3Fetcher(ctrl)
	mockDescriber := NewMockDescriber(ctrl)
	mockGenerator := NewMockGenerator(ctrl)

	// Voice profile fetch (graceful fallback)
	mockStore.EXPECT().
		GetVoiceProfileByAccount(ctx, accountID).
		Return(store.VoiceProfile{}, errors.New("voice not found"))

	// Get media by IDs
	mockStore.EXPECT().
		GetMediaByIDs(ctx, gomock.Any()).
		Return([]store.Media{
			{
				ID:        mediaID,
				AccountID: accountID,
				S3Key:     "s3://bucket/key",
			},
		}, nil)

	// S3 fetch
	mockS3.EXPECT().
		GetFile(ctx, "s3://bucket/key").
		Return(io.NopCloser(strings.NewReader("fake image data")), "image/png", nil)

	// Describe media
	mockDescriber.EXPECT().
		DescribeBatch(ctx, gomock.Any()).
		Return([]mediadescriber.Description{
			{Index: 1, Description: "S3 image"},
		})

	// Generator stream
	eventCh := make(chan socialposts.Event, 1)
	close(eventCh)

	mockGenerator.EXPECT().
		GenerateStream(ctx, gomock.Any()).
		Return(eventCh, nil)

	proc := processor.New(mockStore, mockS3, mockDescriber, mockGenerator, logger)

	params := processor.StreamGenerateParams{
		AccountID: accountID,
		Prompt:    "test",
		Platforms: []string{"x"},
		Mode:      socialposts.ModeSingle,
		MediaIDs:  []uuid.UUID{mediaID},
	}

	ch, err := proc.StreamGenerate(ctx, params)
	if err != nil {
		t.Fatalf("StreamGenerate failed: %v", err)
	}

	// Consume events
	for range ch {
	}
}

func TestStreamGenerateTextOnly(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	ctx := context.Background()
	logger := observability.NewLogger()

	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockStore := NewMockContentStore(ctrl)
	mockS3 := NewMockS3Fetcher(ctrl)
	mockDescriber := NewMockDescriber(ctrl)
	mockGenerator := NewMockGenerator(ctrl)

	// Voice profile fetch
	mockStore.EXPECT().
		GetVoiceProfileByAccount(ctx, accountID).
		Return(store.VoiceProfile{Tone: "casual"}, nil)

	// Generator stream (no media description)
	eventCh := make(chan socialposts.Event, 1)
	close(eventCh)

	mockGenerator.EXPECT().
		GenerateStream(ctx, gomock.Any()).
		Return(eventCh, nil)

	proc := processor.New(mockStore, mockS3, mockDescriber, mockGenerator, logger)

	params := processor.StreamGenerateParams{
		AccountID: accountID,
		Prompt:    "test",
		Platforms: []string{"x"},
		Mode:      socialposts.ModeSingle,
	}

	ch, err := proc.StreamGenerate(ctx, params)
	if err != nil {
		t.Fatalf("StreamGenerate failed: %v", err)
	}

	// Consume events
	for range ch {
	}
}

func TestStreamGenerateMediaIDPathWithNoValidMedia(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	mediaID := uuid.New()
	ctx := context.Background()
	logger := observability.NewLogger()

	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockStore := NewMockContentStore(ctrl)
	mockS3 := NewMockS3Fetcher(ctrl)
	mockDescriber := NewMockDescriber(ctrl)
	mockGenerator := NewMockGenerator(ctrl)

	// Voice profile fetch
	mockStore.EXPECT().
		GetVoiceProfileByAccount(ctx, accountID).
		Return(store.VoiceProfile{}, nil)

	// Get media by IDs — returns empty
	mockStore.EXPECT().
		GetMediaByIDs(ctx, gomock.Any()).
		Return([]store.Media{}, nil)

	proc := processor.New(mockStore, mockS3, mockDescriber, mockGenerator, logger)

	params := processor.StreamGenerateParams{
		AccountID: accountID,
		Prompt:    "test",
		Platforms: []string{"x"},
		Mode:      socialposts.ModeSingle,
		MediaIDs:  []uuid.UUID{mediaID},
	}

	_, err := proc.StreamGenerate(ctx, params)
	if err == nil {
		t.Errorf("expected error for no valid media")
	}
	if err != processor.ErrNoValidMedia {
		t.Errorf("expected ErrNoValidMedia, got %v", err)
	}
}
