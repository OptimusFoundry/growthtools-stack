package processor

import (
	"context"
	"fmt"

	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// createCaptureMedia materializes one capture artifact (an S3 key under
// captures/<sha>/) as a media row owned by accountID. Size and content-type
// come from S3 HEAD when available; the extension-derived type wins so
// playback/preview never depends on how the worker uploaded the object.
func (g *DraftGenerator) createCaptureMedia(ctx context.Context, accountID uuid.UUID, key string) (store.Media, error) {
	var size int64
	var contentType string
	if g.s3Head != nil {
		s, ct, err := g.s3Head.HeadObject(ctx, key)
		if err != nil {
			g.logger.Error(ctx, "failed to head s3 object for media ingest", err)
		} else {
			size = s
			contentType = ct
		}
	}
	if extType := contentTypeFor(key); extType != "application/octet-stream" {
		contentType = extType
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	return g.store.CreateMedia(ctx, store.CreateMediaParams{
		AccountID:   accountID,
		Filename:    lastPathComponent(key),
		ContentType: contentType,
		S3Key:       key,
		S3URL:       fmt.Sprintf("s3://%s/%s", g.s3Bucket, key),
		SizeBytes:   size,
		Source:      mediaSource,
	})
}
