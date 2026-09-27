package processor

import (
	"encoding/json"
	"testing"

	"base-server/internal/ai/socialposts"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAssemblePlatformDrafts_SinglePostHasNoThreadSegments(t *testing.T) {
	t.Parallel()

	drafts := assemblePlatformDrafts(
		map[string]socialposts.PlatformResult{
			"x": socialposts.SinglePost{PlatformName: "x", Content: "hello"},
		},
		[]string{"x"},
		store.UUIDArray{uuid.New()},
	)

	require.Len(t, drafts, 1)
	require.NotNil(t, drafts[0].Content)
	assert.Equal(t, "hello", *drafts[0].Content)
	// Any thread_segments make publish adapters post a thread and attach
	// media only per segment imageIndex, which drops a single post's images.
	assert.Nil(t, drafts[0].ThreadSegments)
}

func TestAssemblePlatformDrafts_ThreadUsesSnakeCaseImageIndex(t *testing.T) {
	t.Parallel()

	drafts := assemblePlatformDrafts(
		map[string]socialposts.PlatformResult{
			"x": socialposts.Thread{PlatformName: "x", Segments: []socialposts.Segment{
				socialposts.MediaSegment{Content: "one", ImageIndex: 1},
				socialposts.TextSegment{Content: "two"},
			}},
		},
		[]string{"x"},
		store.UUIDArray{uuid.New()},
	)

	require.Len(t, drafts, 1)
	require.NotNil(t, drafts[0].ThreadSegments)
	var segs []map[string]any
	require.NoError(t, json.Unmarshal(*drafts[0].ThreadSegments, &segs))
	require.Len(t, segs, 2)
	// Adapters, the webapp and UnlinkMediaFromPost all read image_index.
	assert.EqualValues(t, 1, segs[0]["image_index"])
	assert.NotContains(t, segs[0], "imageIndex")
	assert.NotContains(t, segs[1], "image_index")
}
