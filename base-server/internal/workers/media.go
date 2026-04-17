package workers

import (
	"context"
	"strings"
	"time"

	"base-server/internal/infra/observability"
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
//
// If signing fails the raw URL is kept — it's the same surface area the
// code had before this function existed, so failure mode is no worse
// than historical. Errors are logged so operators can see a flaky KMS
// or S3 signer without chasing mysterious publish failures.
func mediaURLsForPublish(
	ctx context.Context,
	signer URLSigner,
	items []store.Media,
	logger *observability.Logger,
) []string {
	urls := make([]string, 0, len(items))
	for _, m := range items {
		urls = append(urls, resolveMediaURL(ctx, signer, m, logger))
	}
	return urls
}

func resolveMediaURL(
	ctx context.Context,
	signer URLSigner,
	m store.Media,
	logger *observability.Logger,
) string {
	if signer == nil || !strings.HasPrefix(m.S3URL, "s3://") {
		return m.S3URL
	}
	signed, err := signer.PresignGetURL(ctx, m.S3Key, mediaPresignTTL)
	if err != nil {
		logger.Error(ctx, "failed to presign media url for publish; falling back to raw S3 URL", err)
		return m.S3URL
	}
	return signed
}
