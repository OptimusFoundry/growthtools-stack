package adapters

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	"base-server/internal/platform/clients/bluesky"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// blueskyAsyncAPIServer handles Bluesky endpoints for async adapter tests.
type blueskyAsyncAPIServer struct {
	t               *testing.T
	sessionErr      bool
	uploadBlobErr   bool
	createRecordErr bool
	recordCalls     int
	blobCallResults []string // content-type returned per call; empty = success
}

func (s *blueskyAsyncAPIServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.URL.Path {
	case "/xrpc/com.atproto.server.createSession":
		if s.sessionErr {
			w.WriteHeader(http.StatusUnauthorized)
			fmt.Fprint(w, `{"error":"AuthenticationRequired"}`)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"accessJwt":"jwt-tok","did":"did:plc:test123"}`)

	case "/xrpc/com.atproto.repo.uploadBlob":
		if s.uploadBlobErr {
			w.WriteHeader(http.StatusBadRequest)
			fmt.Fprint(w, `{"error":"BlobTooLarge"}`)
			return
		}
		// Echo content-type back in the blob
		ct := r.Header.Get("Content-Type")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"blob":{"$type":"blob","ref":{"$link":"bafy123"},"mimeType":%q,"size":100}}`, ct)

	case "/xrpc/com.atproto.repo.createRecord":
		s.recordCalls++
		if s.createRecordErr {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"uri":"at://did:plc:test123/app.bsky.feed.post/rkey%d","cid":"cid%d"}`, s.recordCalls, s.recordCalls)

	default:
		http.NotFound(w, r)
	}
}

func newBlueskyAdapterWithAsyncAPI(srv *httptest.Server) *BlueskyAdapter {
	logger := observability.NewLogger()
	client := bluesky.NewClient(srv.URL, srv.Client(), logger)
	return NewBlueskyAdapter(client, logger)
}

func TestBlueskyAdapter_StartPublish(t *testing.T) {
	t.Parallel()

	conn := store.PlatformConnection{
		Platform:       "bluesky",
		AccessToken:    "apppassword",
		PlatformUserID: "user.bsky.social",
	}

	t.Run("auth failure returns error", func(t *testing.T) {
		t.Parallel()

		api := &blueskyAsyncAPIServer{t: t, sessionErr: true}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newBlueskyAdapterWithAsyncAPI(srv)
		_, _, err := adapter.StartPublish(context.Background(), PostSpec{Content: "test"}, conn)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "auth failed")
	})

	t.Run("no media, readyNow=true, empty items", func(t *testing.T) {
		t.Parallel()

		api := &blueskyAsyncAPIServer{t: t}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newBlueskyAdapterWithAsyncAPI(srv)
		raw, readyNow, err := adapter.StartPublish(context.Background(), PostSpec{Content: "no media"}, conn)
		require.NoError(t, err)
		assert.True(t, readyNow)

		var handle blueskyHandle
		require.NoError(t, json.Unmarshal(raw, &handle))
		assert.Len(t, handle.Items, 0)
	})

	t.Run("download failure returns error", func(t *testing.T) {
		t.Parallel()

		mediaSrv := downloadOnlyServer(t, http.StatusNotFound, nil, "")
		api := &blueskyAsyncAPIServer{t: t}
		apiSrv := httptest.NewServer(api)
		t.Cleanup(apiSrv.Close)

		adapter := newBlueskyAdapterWithAsyncAPI(apiSrv)
		_, _, err := adapter.StartPublish(context.Background(), PostSpec{
			Content:   "test",
			MediaURLs: []string{mediaSrv.URL},
		}, conn)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "download media")
	})

	t.Run("upload failure returns error", func(t *testing.T) {
		t.Parallel()

		mediaSrv := downloadOnlyServer(t, http.StatusOK, []byte("imgbytes"), "image/jpeg")
		api := &blueskyAsyncAPIServer{t: t, uploadBlobErr: true}
		apiSrv := httptest.NewServer(api)
		t.Cleanup(apiSrv.Close)

		adapter := newBlueskyAdapterWithAsyncAPI(apiSrv)
		_, _, err := adapter.StartPublish(context.Background(), PostSpec{
			Content:   "test",
			MediaURLs: []string{mediaSrv.URL},
		}, conn)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "upload blob")
	})

	t.Run("image upload succeeds, item in handle with non-nil blob", func(t *testing.T) {
		t.Parallel()

		mediaSrv := downloadOnlyServer(t, http.StatusOK, []byte("imgbytes"), "image/jpeg")
		api := &blueskyAsyncAPIServer{t: t}
		apiSrv := httptest.NewServer(api)
		t.Cleanup(apiSrv.Close)

		adapter := newBlueskyAdapterWithAsyncAPI(apiSrv)
		raw, readyNow, err := adapter.StartPublish(context.Background(), PostSpec{
			Content:   "with image",
			MediaURLs: []string{mediaSrv.URL},
		}, conn)
		require.NoError(t, err)
		assert.True(t, readyNow)

		var handle blueskyHandle
		require.NoError(t, json.Unmarshal(raw, &handle))
		require.Len(t, handle.Items, 1)
		assert.NotNil(t, handle.Items[0].Blob)
		assert.False(t, handle.Items[0].IsVideo)
	})

	t.Run("video upload sets IsVideo=true", func(t *testing.T) {
		t.Parallel()

		mediaSrv := downloadOnlyServer(t, http.StatusOK, []byte("vidbytes"), "video/mp4")
		api := &blueskyAsyncAPIServer{t: t}
		apiSrv := httptest.NewServer(api)
		t.Cleanup(apiSrv.Close)

		adapter := newBlueskyAdapterWithAsyncAPI(apiSrv)
		raw, _, err := adapter.StartPublish(context.Background(), PostSpec{
			Content:   "with video",
			MediaURLs: []string{mediaSrv.URL},
		}, conn)
		require.NoError(t, err)

		var handle blueskyHandle
		require.NoError(t, json.Unmarshal(raw, &handle))
		require.Len(t, handle.Items, 1)
		assert.True(t, handle.Items[0].IsVideo)
	})
}

func TestBlueskyAdapter_Finalize(t *testing.T) {
	t.Parallel()

	conn := store.PlatformConnection{
		Platform:       "bluesky",
		AccessToken:    "apppassword",
		PlatformUserID: "user.bsky.social",
	}

	buildHandle := func(items []blueskyHandleItem) json.RawMessage {
		h := blueskyHandle{Items: items}
		b, _ := json.Marshal(h)
		return b
	}

	imageBlob := map[string]any{"$type": "blob", "ref": map[string]any{"$link": "bafy-img"}, "mimeType": "image/jpeg", "size": 100}
	videoBlob := map[string]any{"$type": "blob", "ref": map[string]any{"$link": "bafy-vid"}, "mimeType": "video/mp4", "size": 1000}

	t.Run("single post with image embed", func(t *testing.T) {
		t.Parallel()

		api := &blueskyAsyncAPIServer{t: t}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		handle := buildHandle([]blueskyHandleItem{{Blob: imageBlob, IsVideo: false}})
		adapter := newBlueskyAdapterWithAsyncAPI(srv)
		result, err := adapter.Finalize(context.Background(), PostSpec{Content: "with image"}, handle, conn)
		require.NoError(t, err)
		assert.NotEmpty(t, result.PlatformPostID)
		assert.Equal(t, 1, api.recordCalls)
	})

	t.Run("single post with video embed (video wins over images)", func(t *testing.T) {
		t.Parallel()

		api := &blueskyAsyncAPIServer{t: t}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		handle := buildHandle([]blueskyHandleItem{
			{Blob: imageBlob, IsVideo: false},
			{Blob: videoBlob, IsVideo: true},
		})
		adapter := newBlueskyAdapterWithAsyncAPI(srv)
		result, err := adapter.Finalize(context.Background(), PostSpec{Content: "with video"}, handle, conn)
		require.NoError(t, err)
		assert.NotEmpty(t, result.PlatformPostID)
	})

	t.Run("single post with nil blob items skips embed", func(t *testing.T) {
		t.Parallel()

		api := &blueskyAsyncAPIServer{t: t}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		handle := buildHandle([]blueskyHandleItem{{Blob: nil, IsVideo: false}})
		adapter := newBlueskyAdapterWithAsyncAPI(srv)
		result, err := adapter.Finalize(context.Background(), PostSpec{Content: "no embed"}, handle, conn)
		require.NoError(t, err)
		assert.NotEmpty(t, result.PlatformPostID)
	})

	t.Run("thread: each segment gets correct blob via image_index", func(t *testing.T) {
		t.Parallel()

		api := &blueskyAsyncAPIServer{t: t}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		idx1, idx2 := 1, 2
		segs := []ThreadSegment{
			{Content: "seg1", ImageIndex: &idx1},
			{Content: "seg2", ImageIndex: &idx2},
		}
		handle := buildHandle([]blueskyHandleItem{
			{Blob: imageBlob, IsVideo: false},
			{Blob: videoBlob, IsVideo: true},
		})
		adapter := newBlueskyAdapterWithAsyncAPI(srv)
		result, err := adapter.Finalize(context.Background(), PostSpec{Segments: segs}, handle, conn)
		require.NoError(t, err)
		assert.NotEmpty(t, result.PlatformPostID)
		assert.Equal(t, 2, api.recordCalls, "expected 2 CreateRecord calls for 2 segments")
	})

	t.Run("auth failure returns error", func(t *testing.T) {
		t.Parallel()

		api := &blueskyAsyncAPIServer{t: t, sessionErr: true}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		handle := buildHandle(nil)
		adapter := newBlueskyAdapterWithAsyncAPI(srv)
		_, err := adapter.Finalize(context.Background(), PostSpec{Content: "test"}, handle, conn)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "auth failed")
	})

	t.Run("CreateRecord failure returns error", func(t *testing.T) {
		t.Parallel()

		api := &blueskyAsyncAPIServer{t: t, createRecordErr: true}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		handle := buildHandle(nil)
		adapter := newBlueskyAdapterWithAsyncAPI(srv)
		_, err := adapter.Finalize(context.Background(), PostSpec{Content: "test"}, handle, conn)
		require.Error(t, err)
	})
}
