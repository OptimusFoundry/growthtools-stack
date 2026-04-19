package processor

//go:generate go run go.uber.org/mock/mockgen@latest -source=processor.go -destination=mocks_test.go -package=processor_test

import (
	"context"
	"errors"
	"io"
	"strings"

	"base-server/internal/ai/mediadescriber"
	"base-server/internal/ai/socialposts"
	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

var (
	ErrNoValidMedia     = errors.New("no valid media provided")
	ErrVoiceProfileFail = errors.New("voice profile fetch failed")
)

// ContentStore is the minimal DB surface the processor needs.
type ContentStore interface {
	GetVoiceProfileByAccount(ctx context.Context, accountID uuid.UUID) (store.VoiceProfile, error)
	GetMediaByIDs(ctx context.Context, ids []uuid.UUID) ([]store.Media, error)
}

// S3Fetcher reads an S3 object body.
type S3Fetcher interface {
	GetFile(ctx context.Context, key string) (io.ReadCloser, string, error)
}

// Describer is the subset of mediadescriber.Describer used here.
type Describer interface {
	DescribeBatch(ctx context.Context, media []mediadescriber.Media) []mediadescriber.Description
}

// Generator is the subset of socialposts.Generator used here.
type Generator interface {
	GenerateStream(ctx context.Context, req socialposts.Request) (<-chan socialposts.Event, error)
}

// StreamGenerateParams is everything the HTTP layer forwards to us.
type StreamGenerateParams struct {
	AccountID   uuid.UUID
	Prompt      string
	Platforms   []string
	Mode        socialposts.Mode
	ThreadParts int
	Images      []aiclient.ImageData
	MediaIDs    []uuid.UUID
}

type ContentProcessor struct {
	store     ContentStore
	s3Fetch   S3Fetcher
	describer Describer
	generator Generator
	logger    *observability.Logger
}

func New(
	store ContentStore,
	s3Fetch S3Fetcher,
	describer Describer,
	generator Generator,
	logger *observability.Logger,
) ContentProcessor {
	return ContentProcessor{
		store:     store,
		s3Fetch:   s3Fetch,
		describer: describer,
		generator: generator,
		logger:    logger,
	}
}

// StreamGenerate runs the full pipeline: fetch voice + media, describe, generate.
// Returns a channel of socialposts.Event the handler relays as SSE.
func (p *ContentProcessor) StreamGenerate(ctx context.Context, params StreamGenerateParams) (<-chan socialposts.Event, error) {
	// Fetch voice profile (graceful fallback if not found).
	voiceCtx, err := p.getVoiceContext(ctx, params.AccountID)
	if err != nil {
		p.logger.Error(ctx, "failed to fetch voice profile", err)
		// Continue without voice profile; it's optional.
	}

	// Build []mediadescriber.Media.
	descriptions := make([]mediadescriber.Description, 0)

	// Prefer media IDs if both supplied.
	if len(params.MediaIDs) > 0 {
		descs, errDescs := p.describeMediaFromIDs(ctx, params.AccountID, params.MediaIDs)
		if errDescs != nil {
			return nil, errDescs
		}
		descriptions = descs
	} else if len(params.Images) > 0 {
		// Wrap images as mediadescriber.Media.
		mediaItems := make([]mediadescriber.Media, len(params.Images))
		for i, img := range params.Images {
			mediaItems[i] = mediadescriber.Media{
				Index:    i + 1,
				Kind:     mediadescriber.KindImage,
				MIMEType: img.MIMEType,
				Data:     img.Data,
			}
		}
		descriptions = p.describer.DescribeBatch(ctx, mediaItems)
	}

	// Build socialposts.Request.
	genReq := socialposts.Request{
		Prompt:    params.Prompt,
		Platforms: params.Platforms,
		Mode:      params.Mode,
		Media:     descriptions,
		Voice:     voiceCtx,
	}

	if params.Mode == socialposts.ModeThread {
		genReq.ThreadParts = params.ThreadParts
		if genReq.ThreadParts < 2 {
			genReq.ThreadParts = 3
		}
		if genReq.ThreadParts > 3 {
			genReq.ThreadParts = 3
		}
	}

	// Call generator and return the channel directly.
	return p.generator.GenerateStream(ctx, genReq)
}

// describeMediaFromIDs fetches media rows by ID, downloads from S3, and describes them.
func (p *ContentProcessor) describeMediaFromIDs(
	ctx context.Context,
	accountID uuid.UUID,
	mediaIDs []uuid.UUID,
) ([]mediadescriber.Description, error) {
	if len(mediaIDs) == 0 {
		return nil, ErrNoValidMedia
	}

	// Fetch media rows from database.
	rows, err := p.store.GetMediaByIDs(ctx, mediaIDs)
	if err != nil {
		p.logger.Error(ctx, "failed to load media rows", err)
		return nil, err
	}

	// Build a map for quick lookup.
	rowByID := make(map[uuid.UUID]store.Media, len(rows))
	for _, r := range rows {
		rowByID[r.ID] = r
	}

	// Fetch S3 bytes for each media item.
	mediaItems := make([]mediadescriber.Media, 0, len(mediaIDs))

	for i, id := range mediaIDs {
		row, ok := rowByID[id]
		if !ok || row.AccountID != accountID {
			continue
		}
		if row.S3Key == "" {
			continue
		}

		// Fetch from S3.
		body, mimeType, fetchErr := p.s3Fetch.GetFile(ctx, row.S3Key)
		if fetchErr != nil {
			p.logger.Error(ctx, "failed to fetch media from S3", fetchErr)
			continue
		}
		defer body.Close()

		// Read bytes.
		data, readErr := io.ReadAll(body)
		if readErr != nil {
			p.logger.Error(ctx, "failed to read media bytes from S3", readErr)
			continue
		}

		// Determine kind from MIME type.
		var kind mediadescriber.Kind
		if strings.HasPrefix(mimeType, "video/") {
			kind = mediadescriber.KindVideo
		} else {
			kind = mediadescriber.KindImage
		}

		mediaItems = append(mediaItems, mediadescriber.Media{
			Index:    i + 1,
			Kind:     kind,
			MIMEType: mimeType,
			Data:     data,
		})
	}

	if len(mediaItems) == 0 {
		return nil, ErrNoValidMedia
	}

	// Describe media.
	return p.describer.DescribeBatch(ctx, mediaItems), nil
}

// getVoiceContext fetches the voice profile for an account and converts it to socialposts.VoiceContext.
func (p *ContentProcessor) getVoiceContext(ctx context.Context, accountID uuid.UUID) (*socialposts.VoiceContext, error) {
	vp, err := p.store.GetVoiceProfileByAccount(ctx, accountID)
	if err != nil {
		return nil, err
	}

	vc := &socialposts.VoiceContext{
		Tone:         vp.Tone,
		Style:        vp.Style,
		ExamplePosts: vp.ExamplePosts,
	}
	if vp.Industry != nil {
		vc.Industry = *vp.Industry
	}
	if vp.TargetAudience != nil {
		vc.TargetAudience = *vp.TargetAudience
	}
	if vp.CustomInstructions != nil {
		vc.CustomInstructions = *vp.CustomInstructions
	}
	return vc, nil
}
