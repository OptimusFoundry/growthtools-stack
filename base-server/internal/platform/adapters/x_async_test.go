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
	"base-server/internal/platform/clients/x"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// asyncXAPIServer responds to X API paths needed by async adapter tests.
// It supports configuring per-response upload results including processing info.
type asyncXAPIServer struct {
	t               *testing.T
	uploadErr       bool
	uploadMediaID   string
	processingInfo  *x.ProcessingInfo // nil = no processing info (image path)
	statusResponses []*x.ProcessingInfo
	statusCallCount int
	createTweetID   string
	createTweetErr  bool
	tweetCalls      int
}

func (s *asyncXAPIServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch {
	case (r.URL.Path == "/2/media/upload" || r.URL.Path == "/1.1/media/upload.json") && r.Method == http.MethodPost:
		if s.uploadErr {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprint(w, `{"detail":"upload failed"}`)
			return
		}
		mediaID := s.uploadMediaID
		if mediaID == "" {
			mediaID = "media-async-001"
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		if s.processingInfo != nil {
			piJSON, _ := json.Marshal(s.processingInfo)
			// v1.1 response shape (used by chunked video FINALIZE)
			fmt.Fprintf(w, `{"media_id_string":%q,"processing_info":%s}`, mediaID, string(piJSON))
		} else {
			// v2 response shape (image)
			fmt.Fprintf(w, `{"data":{"id":%q,"media_key":"3_x"}}`, mediaID)
		}

	case r.URL.Path == "/2/media/upload" && r.Method == http.MethodGet:
		// STATUS endpoint
		if s.statusCallCount < len(s.statusResponses) {
			pi := s.statusResponses[s.statusCallCount]
			s.statusCallCount++
			piJSON, _ := json.Marshal(pi)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			fmt.Fprintf(w, `{"data":{"processing_info":%s}}`, string(piJSON))
		} else {
			// Default: succeeded
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			fmt.Fprint(w, `{"data":{"processing_info":{"state":"succeeded"}}}`)
		}

	case r.URL.Path == "/2/tweets" && r.Method == http.MethodPost:
		s.tweetCalls++
		if s.createTweetErr {
			w.WriteHeader(http.StatusForbidden)
			fmt.Fprint(w, `{"detail":"forbidden"}`)
			return
		}
		id := s.createTweetID
		if id == "" {
			id = "tweet-async-001"
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		fmt.Fprintf(w, `{"data":{"id":%q}}`, id)

	default:
		http.NotFound(w, r)
	}
}

func newXAdapterWithAsyncAPI(srv *httptest.Server) *XAdapter {
	logger := observability.NewLogger()
	client := x.NewClient("", "", srv.URL, srv.Client(), logger)
	return NewXAdapter(client, logger)
}

func TestXAdapter_StartPublish(t *testing.T) {
	t.Parallel()

	conn := store.PlatformConnection{
		Platform:       "x",
		AccessToken:    "token",
		PlatformUserID: "user1",
	}

	t.Run("no media returns empty handle readyNow=true", func(t *testing.T) {
		t.Parallel()

		api := &asyncXAPIServer{t: t}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newXAdapterWithAsyncAPI(srv)
		raw, readyNow, err := adapter.StartPublish(context.Background(), PostSpec{Content: "text only"}, conn)
		require.NoError(t, err)
		assert.True(t, readyNow)

		var handle xMediaHandle
		require.NoError(t, json.Unmarshal(raw, &handle))
		assert.Len(t, handle.Items, 0)
	})

	t.Run("image upload succeeds, readyNow=true (no processing info)", func(t *testing.T) {
		t.Parallel()

		mediaSrv := downloadOnlyServer(t, http.StatusOK, []byte("imgbytes"), "image/jpeg")
		api := &asyncXAPIServer{t: t, uploadMediaID: "img-001"}
		apiSrv := httptest.NewServer(api)
		t.Cleanup(apiSrv.Close)

		adapter := newXAdapterWithAsyncAPI(apiSrv)
		raw, readyNow, err := adapter.StartPublish(context.Background(), PostSpec{
			Content:   "with image",
			MediaURLs: []string{mediaSrv.URL},
		}, conn)
		require.NoError(t, err)
		assert.True(t, readyNow)

		var handle xMediaHandle
		require.NoError(t, json.Unmarshal(raw, &handle))
		require.Len(t, handle.Items, 1)
		assert.Equal(t, "succeeded", handle.Items[0].State)
		assert.Equal(t, "img-001", handle.Items[0].MediaID)
	})

	t.Run("video upload with pending processing, readyNow=false", func(t *testing.T) {
		t.Parallel()

		mediaSrv := downloadOnlyServer(t, http.StatusOK, []byte("vidbytes"), "video/mp4")
		api := &asyncXAPIServer{
			t:              t,
			uploadMediaID:  "vid-001",
			processingInfo: &x.ProcessingInfo{State: "pending", CheckAfterSecs: 5},
		}
		apiSrv := httptest.NewServer(api)
		t.Cleanup(apiSrv.Close)

		adapter := newXAdapterWithAsyncAPI(apiSrv)
		raw, readyNow, err := adapter.StartPublish(context.Background(), PostSpec{
			Content:   "with video",
			MediaURLs: []string{mediaSrv.URL},
		}, conn)
		require.NoError(t, err)
		assert.False(t, readyNow)

		var handle xMediaHandle
		require.NoError(t, json.Unmarshal(raw, &handle))
		require.Len(t, handle.Items, 1)
		assert.Equal(t, "pending", handle.Items[0].State)
	})

	t.Run("download failure returns error", func(t *testing.T) {
		t.Parallel()

		mediaSrv := downloadOnlyServer(t, http.StatusNotFound, nil, "")
		api := &asyncXAPIServer{t: t}
		apiSrv := httptest.NewServer(api)
		t.Cleanup(apiSrv.Close)

		adapter := newXAdapterWithAsyncAPI(apiSrv)
		_, _, err := adapter.StartPublish(context.Background(), PostSpec{
			Content:   "text",
			MediaURLs: []string{mediaSrv.URL},
		}, conn)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "download media")
	})

	t.Run("upload failure returns error", func(t *testing.T) {
		t.Parallel()

		mediaSrv := downloadOnlyServer(t, http.StatusOK, []byte("imgbytes"), "image/jpeg")
		api := &asyncXAPIServer{t: t, uploadErr: true}
		apiSrv := httptest.NewServer(api)
		t.Cleanup(apiSrv.Close)

		adapter := newXAdapterWithAsyncAPI(apiSrv)
		_, _, err := adapter.StartPublish(context.Background(), PostSpec{
			Content:   "text",
			MediaURLs: []string{mediaSrv.URL},
		}, conn)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "upload media")
	})
}

func TestXAdapter_CheckReady(t *testing.T) {
	t.Parallel()

	conn := store.PlatformConnection{
		Platform:    "x",
		AccessToken: "token",
	}

	buildHandle := func(items []xMediaItem) json.RawMessage {
		h := xMediaHandle{Items: items}
		b, _ := json.Marshal(h)
		return b
	}

	t.Run("all items succeeded, returns ready=true", func(t *testing.T) {
		t.Parallel()

		api := &asyncXAPIServer{t: t}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newXAdapterWithAsyncAPI(srv)
		handle := buildHandle([]xMediaItem{
			{MediaID: "m1", State: "succeeded"},
			{MediaID: "m2", State: "succeeded"},
		})
		ready, _, err := adapter.CheckReady(context.Background(), handle, conn)
		require.NoError(t, err)
		assert.True(t, ready)
	})

	t.Run("one item pending, polls and transitions to succeeded", func(t *testing.T) {
		t.Parallel()

		api := &asyncXAPIServer{
			t: t,
			statusResponses: []*x.ProcessingInfo{
				{State: "succeeded"},
			},
		}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newXAdapterWithAsyncAPI(srv)
		handle := buildHandle([]xMediaItem{
			{MediaID: "m1", State: "pending"},
		})
		ready, _, err := adapter.CheckReady(context.Background(), handle, conn)
		require.NoError(t, err)
		assert.True(t, ready)
		assert.Equal(t, 1, api.statusCallCount)
	})

	t.Run("one item pending, polls and updates state", func(t *testing.T) {
		t.Parallel()

		api := &asyncXAPIServer{
			t: t,
			statusResponses: []*x.ProcessingInfo{
				{State: "in_progress", CheckAfterSecs: 3},
			},
		}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newXAdapterWithAsyncAPI(srv)
		handle := buildHandle([]xMediaItem{
			{MediaID: "m1", State: "pending"},
		})
		ready, updatedRaw, err := adapter.CheckReady(context.Background(), handle, conn)
		require.NoError(t, err)
		assert.False(t, ready)

		var updatedHandle xMediaHandle
		require.NoError(t, json.Unmarshal(updatedRaw, &updatedHandle))
		assert.Equal(t, "in_progress", updatedHandle.Items[0].State)
	})

	t.Run("empty MediaID returns error immediately", func(t *testing.T) {
		t.Parallel()

		api := &asyncXAPIServer{t: t}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newXAdapterWithAsyncAPI(srv)
		handle := buildHandle([]xMediaItem{
			{MediaID: "", State: ""},
		})
		_, _, err := adapter.CheckReady(context.Background(), handle, conn)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "failed to upload")
	})

	t.Run("item processing failed returns error", func(t *testing.T) {
		t.Parallel()

		api := &asyncXAPIServer{
			t: t,
			statusResponses: []*x.ProcessingInfo{
				{State: "failed"},
			},
		}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newXAdapterWithAsyncAPI(srv)
		handle := buildHandle([]xMediaItem{
			{MediaID: "m1", State: "pending"},
		})
		_, _, err := adapter.CheckReady(context.Background(), handle, conn)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "processing failed")
	})

	t.Run("invalid handle JSON returns error", func(t *testing.T) {
		t.Parallel()

		api := &asyncXAPIServer{t: t}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newXAdapterWithAsyncAPI(srv)
		_, _, err := adapter.CheckReady(context.Background(), json.RawMessage(`not json`), conn)
		require.Error(t, err)
	})
}

func TestXAdapter_Finalize(t *testing.T) {
	t.Parallel()

	conn := store.PlatformConnection{
		Platform:       "x",
		AccessToken:    "token",
		PlatformUserID: "user1",
	}

	buildHandle := func(items []xMediaItem) json.RawMessage {
		h := xMediaHandle{Items: items}
		b, _ := json.Marshal(h)
		return b
	}

	t.Run("single post with media IDs", func(t *testing.T) {
		t.Parallel()

		api := &asyncXAPIServer{t: t, createTweetID: "tweet-fin-001"}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		handle := buildHandle([]xMediaItem{
			{MediaID: "m1", State: "succeeded"},
			{MediaID: "m2", State: "succeeded"},
		})
		adapter := newXAdapterWithAsyncAPI(srv)
		result, err := adapter.Finalize(context.Background(), PostSpec{Content: "two media"}, handle, conn)
		require.NoError(t, err)
		assert.Equal(t, "tweet-fin-001", result.PlatformPostID)
		assert.Equal(t, 1, api.tweetCalls)
	})

	t.Run("thread post: segments with image_index", func(t *testing.T) {
		t.Parallel()

		callCount := 0
		ids := []string{"seg1-tweet", "seg2-tweet"}
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/2/tweets" {
				id := ids[callCount%len(ids)]
				callCount++
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusCreated)
				fmt.Fprintf(w, `{"data":{"id":%q}}`, id)
				return
			}
			http.NotFound(w, r)
		}))
		t.Cleanup(srv.Close)

		idx1, idx2 := 1, 2
		segs := []ThreadSegment{
			{Content: "seg1", ImageIndex: &idx1},
			{Content: "seg2", ImageIndex: &idx2},
		}
		handle := buildHandle([]xMediaItem{
			{MediaID: "m1", State: "succeeded"},
			{MediaID: "m2", State: "succeeded"},
		})
		adapter := newXAdapterWithAsyncAPI(srv)
		result, err := adapter.Finalize(context.Background(), PostSpec{Segments: segs}, handle, conn)
		require.NoError(t, err)
		assert.Equal(t, "seg1-tweet", result.PlatformPostID)
		assert.Equal(t, 2, callCount)
	})

	t.Run("empty MediaID items are skipped in single post", func(t *testing.T) {
		t.Parallel()

		api := &asyncXAPIServer{t: t, createTweetID: "tweet-skip-001"}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		handle := buildHandle([]xMediaItem{
			{MediaID: "m1", State: "succeeded"},
			{MediaID: "", State: ""},   // empty — should be skipped
		})
		adapter := newXAdapterWithAsyncAPI(srv)
		result, err := adapter.Finalize(context.Background(), PostSpec{Content: "one media"}, handle, conn)
		require.NoError(t, err)
		assert.Equal(t, "tweet-skip-001", result.PlatformPostID)
	})

	t.Run("CreateTweet failure returns error", func(t *testing.T) {
		t.Parallel()

		api := &asyncXAPIServer{t: t, createTweetErr: true}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		handle := buildHandle(nil)
		adapter := newXAdapterWithAsyncAPI(srv)
		_, err := adapter.Finalize(context.Background(), PostSpec{Content: "test"}, handle, conn)
		require.Error(t, err)
	})
}
