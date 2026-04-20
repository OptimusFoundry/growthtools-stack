// Package mediadescriber converts raw image or video bytes into a concise text
// Description using a multimodal AI call. The Description is the shared
// currency consumed by mediaplanner, socialposts, and blog.
package mediadescriber

//go:generate go run go.uber.org/mock/mockgen@latest -source=mediadescriber.go -destination=mocks_test.go -package=mediadescriber

import (
	"context"
	"strings"

	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"

	"golang.org/x/sync/errgroup"
)

// AIClient is the subset of aiclient.Client used by this package.
type AIClient interface {
	CreateMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error)
}

// Kind identifies the media type.
type Kind string

const (
	KindImage Kind = "image"
	KindVideo Kind = "video"
)

// Media is a single piece of media to describe.
type Media struct {
	// Index is 1-based; it is preserved in the returned Description so
	// callers can correlate descriptions back to the original media slice.
	Index    int
	Kind     Kind
	MIMEType string
	Data     []byte
}

// Description is the AI-produced summary for one piece of media.
// It is the shared currency of the ai/* packages — all downstream callers
// consume []Description rather than raw bytes.
type Description struct {
	Index    int
	Kind     Kind
	MIMEType string
	// Description is 1–2 sentences describing the media.
	Description string
	// Usable is false when the media is broken, blank, or a stuck loading
	// screen. Downstream callers should drop unusable descriptions.
	Usable bool
	// Issue is populated when Usable is false; it explains why the media
	// was flagged so operators can see it in logs.
	Issue string
}

const (
	imageSystemPrompt = `Describe this image concisely for social media context. Focus on key visual elements, mood, and subject matter. Respond with 1–2 sentences only. No preamble.`

	videoSystemPrompt = `Describe this video clip concisely for social media context. Focus on what action or change is shown, the mood, and the key moment.

If the video is broken, stuck on a loading state, mostly blank/dark, fails to play, or shows only a spinner — respond with exactly: UNUSABLE: <one sentence reason>

Otherwise respond with 1–2 sentences describing the content. No preamble.`
)

// Describer calls the AI to produce descriptions for media items.
type Describer struct {
	aiClient AIClient
	logger   *observability.Logger
}

// New creates a Describer.
func New(aiClient AIClient, logger *observability.Logger) *Describer {
	return &Describer{aiClient: aiClient, logger: logger}
}

// Describe produces an AI description for a single media item.
// If the AI call fails, a fail-soft Description with Usable=false is returned
// so the caller can proceed without one item.
func (d *Describer) Describe(ctx context.Context, m Media) (Description, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "operation", Value: "describe_media"},
		observability.Field{Key: "media_index", Value: m.Index},
		observability.Field{Key: "media_kind", Value: string(m.Kind)},
	)

	var sysPrompt string
	if m.Kind == KindVideo {
		sysPrompt = videoSystemPrompt
	} else {
		sysPrompt = imageSystemPrompt
	}

	messages := []aiclient.Message{
		{
			Role:    "user",
			Content: "Describe this media.",
			Images:  []aiclient.ImageData{{MIMEType: m.MIMEType, Data: m.Data}},
		},
	}

	raw, err := d.aiClient.CreateMessage(ctx, sysPrompt, messages, 256)
	if err != nil {
		d.logger.Error(ctx, "failed to describe media via ai", err)
		return Description{
			Index:    m.Index,
			Kind:     m.Kind,
			MIMEType: m.MIMEType,
			Usable:   false,
			Issue:    "ai call failed",
		}, nil // fail-soft: caller proceeds without this description
	}

	text := strings.TrimSpace(raw)
	if text == "" {
		return Description{
			Index:    m.Index,
			Kind:     m.Kind,
			MIMEType: m.MIMEType,
			Usable:   false,
			Issue:    "ai returned empty description",
		}, nil
	}

	// Video-only: the model signals unusable clips with the UNUSABLE: prefix.
	if m.Kind == KindVideo && strings.HasPrefix(text, "UNUSABLE:") {
		issue := strings.TrimSpace(strings.TrimPrefix(text, "UNUSABLE:"))
		return Description{
			Index:    m.Index,
			Kind:     m.Kind,
			MIMEType: m.MIMEType,
			Usable:   false,
			Issue:    issue,
		}, nil
	}

	return Description{
		Index:       m.Index,
		Kind:        m.Kind,
		MIMEType:    m.MIMEType,
		Description: text,
		Usable:      true,
	}, nil
}

// DescribeBatch describes a slice of media items in parallel.
// Each item is described independently — a failure for one item does not
// affect others. All items produce a Description entry (Usable=false on
// error). The returned slice is in the same order as the input.
func (d *Describer) DescribeBatch(ctx context.Context, items []Media) []Description {
	results := make([]Description, len(items))
	g, gCtx := errgroup.WithContext(ctx)

	for i, item := range items {
		g.Go(func() error {
			desc, _ := d.Describe(gCtx, item) // errors are already fail-soft inside Describe
			results[i] = desc
			return nil
		})
	}

	_ = g.Wait()
	return results
}
