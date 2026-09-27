package workers

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuildPostSpec_ThreadSegments(t *testing.T) {
	t.Parallel()

	mediaID := uuid.New()
	post := store.Post{Content: "base", MediaIDs: store.UUIDArray{mediaID}}
	s := &mockAsyncStore{mockPublishStore: mockPublishStore{
		getMediaByIDs: func(_ context.Context, _ []uuid.UUID) ([]store.Media, error) {
			return []store.Media{{ID: mediaID, S3URL: "https://cdn.example.com/a.png"}}, nil
		},
	}}
	segs := func(raw string) *json.RawMessage {
		m := json.RawMessage(raw)
		return &m
	}
	content := "platform copy"

	tests := []struct {
		name         string
		segments     *json.RawMessage
		wantSegments int
	}{
		{
			// Drafts saved before the assembly fix wrap a single post in a
			// one-item thread with no imageIndex. Adapters treat any
			// segments as a thread and attach media per segment, so this
			// shape silently dropped every image. It must publish as a
			// single post.
			name:         "one segment without image is a single post",
			segments:     segs(`[{"content":"platform copy"}]`),
			wantSegments: 0,
		},
		{
			name:         "no segments stays a single post",
			segments:     nil,
			wantSegments: 0,
		},
		{
			name:         "real thread keeps its segments",
			segments:     segs(`[{"content":"one","image_index":1},{"content":"two"}]`),
			wantSegments: 2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			pp := store.PlatformPost{Platform: "x", Content: &content, ThreadSegments: tt.segments}

			spec, err := buildPostSpec(context.Background(), s, pp, post, nil, observability.NewLogger())

			require.NoError(t, err)
			assert.Len(t, spec.Segments, tt.wantSegments)
			assert.Equal(t, []string{"https://cdn.example.com/a.png"}, spec.MediaURLs)
			assert.Equal(t, "platform copy", spec.Content)
		})
	}
}

// publishableSegments is shared by the async, legacy and retry publish paths,
// so the one-item normalisation must hold for all of them.
func TestPublishableSegments(t *testing.T) {
	t.Parallel()

	raw := func(s string) *json.RawMessage {
		m := json.RawMessage(s)
		return &m
	}
	tests := []struct {
		name    string
		in      *json.RawMessage
		want    int
		wantErr bool
	}{
		{name: "nil", in: nil, want: 0},
		{name: "empty array", in: raw(`[]`), want: 0},
		{name: "one segment, no image", in: raw(`[{"content":"a"}]`), want: 0},
		{name: "one segment with image stays a thread", in: raw(`[{"content":"a","image_index":1}]`), want: 1},
		// AI drafts wrote camelCase until 2026-09-27; it must still count.
		{name: "legacy camelCase image key stays a thread", in: raw(`[{"content":"a","imageIndex":1}]`), want: 1},
		{name: "two segments", in: raw(`[{"content":"a"},{"content":"b"}]`), want: 2},
		{name: "malformed", in: raw(`{`), wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := publishableSegments(tt.in)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Len(t, got, tt.want)
			if tt.want > 0 && strings.Contains(tt.name, "image") {
				require.NotNil(t, got[0].ImageIndex)
				assert.Equal(t, 1, *got[0].ImageIndex)
			}
		})
	}
}
