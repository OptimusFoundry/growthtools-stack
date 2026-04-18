package workers

import (
	"context"
	"fmt"
	"strings"
	"time"

	"base-server/internal/infra/store"
)

// mediaPresignTTL is the lifetime of the presigned URLs the publish and
// retry workers hand to platform adapters. One hour is plenty for a
// publish attempt (most adapters either download locally in seconds, like
// X, or hand the URL to the platform's own fetcher, like Threads, which
// ingests within minutes) and short enough that a URL leaked into logs
// doesn't hand out long-term access to the artifact.
const mediaPresignTTL = time.Hour

// URLSigner turns an S3 object key into a time-limited HTTPS URL. The S3
// client implements this via PresignGetObject. Nil is acceptable — it
// means "local/dev storage" and we leave URLs alone (localdir already
// serves HTTPS-compatible URLs).
type URLSigner interface {
	PresignGetURL(ctx context.Context, key string, ttl time.Duration) (string, error)
}

// mediaURLsForPublish turns a slice of media rows into the URLs the
// platform adapters will fetch from. Any S3-scheme URL is presigned so
// downstream `http.Get` calls succeed and platforms that ingest a URL
// remotely (e.g. Threads' image_url) get a fetchable endpoint.
func mediaURLsForPublish(
	ctx context.Context,
	signer URLSigner,
	items []store.Media,
) ([]string, error) {
	urls := make([]string, 0, len(items))
	for _, m := range items {
		u, err := resolveMediaURL(ctx, signer, m)
		if err != nil {
			return nil, err
		}
		urls = append(urls, u)
	}
	return urls, nil
}

func resolveMediaURL(
	ctx context.Context,
	signer URLSigner,
	m store.Media,
) (string, error) {
	if signer == nil || !strings.HasPrefix(m.S3URL, "s3://") {
		return m.S3URL, nil
	}
	signed, err := signer.PresignGetURL(ctx, m.S3Key, mediaPresignTTL)
	if err != nil {
		return "", fmt.Errorf("presign media url for %s: %w", m.S3Key, err)
	}
	return signed, nil
}
