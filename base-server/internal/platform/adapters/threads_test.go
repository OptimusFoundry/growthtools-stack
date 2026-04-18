package adapters

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	"base-server/internal/platform/clients/threads"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// threadsAPIServer handles Threads API endpoints for adapter tests.
// Routes by suffix matching because userID is embedded in the path.
type threadsAPIServer struct {
	t                *testing.T
	createThreadErr  bool
	publishThreadErr bool
	containerStatus  string // "FINISHED", "IN_PROGRESS", "ERROR", "EXPIRED"
	containerErrMsg  string
	publishedID      string
	permalink        string
	createCalls      int
	publishCalls     int
}

func (s *threadsAPIServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	switch {
	case strings.HasSuffix(path, "/threads") && r.Method == http.MethodPost:
		s.createCalls++
		if s.createThreadErr {
			w.WriteHeader(http.StatusBadRequest)
			fmt.Fprint(w, `{"error":{"message":"create failed"}}`)
			return
		}
		cid := fmt.Sprintf("ctr-%d", s.createCalls)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"id":%q}`, cid)

	case strings.HasSuffix(path, "/threads_publish") && r.Method == http.MethodPost:
		s.publishCalls++
		if s.publishThreadErr {
			w.WriteHeader(http.StatusBadRequest)
			fmt.Fprint(w, `{"error":{"message":"publish failed"}}`)
			return
		}
		pid := s.publishedID
		if pid == "" {
			pid = fmt.Sprintf("post-%d", s.publishCalls)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"id":%q}`, pid)

	case r.Method == http.MethodGet && r.URL.Query().Get("access_token") != "":
		fields := r.URL.Query().Get("fields")
		if strings.Contains(fields, "status") {
			// Container status check
			status := s.containerStatus
			if status == "" {
				status = "FINISHED"
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			if s.containerErrMsg != "" {
				fmt.Fprintf(w, `{"status":%q,"error_message":%q}`, status, s.containerErrMsg)
			} else {
				fmt.Fprintf(w, `{"status":%q}`, status)
			}
		} else {
			// Permalink or other GET
			pl := s.permalink
			if pl == "" {
				pl = "https://www.threads.net/@user/post/abc123"
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			fmt.Fprintf(w, `{"permalink":%q}`, pl)
		}

	default:
		http.NotFound(w, r)
	}
}

func newThreadsAdapterWithAPI(srv *httptest.Server) *ThreadsAdapter {
	logger := observability.NewLogger()
	client := threads.NewTestClient(srv.URL, srv.Client(), logger)
	return NewThreadsAdapter(client, logger)
}

func TestThreadsAdapter_Publish(t *testing.T) {
	t.Parallel()

	conn := store.PlatformConnection{
		Platform:       "threads",
		AccessToken:    "token",
		PlatformUserID: "user123",
	}

	t.Run("text-only post succeeds", func(t *testing.T) {
		t.Parallel()

		api := &threadsAPIServer{t: t, publishedID: "post-001"}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newThreadsAdapterWithAPI(srv)
		result, err := adapter.Publish(context.Background(), "hello threads", nil, conn)
		require.NoError(t, err)
		assert.Equal(t, "post-001", result.PlatformPostID)
		assert.Equal(t, 1, api.createCalls)
		assert.Equal(t, 1, api.publishCalls)
	})

	t.Run("CreateThread failure returns error", func(t *testing.T) {
		t.Parallel()

		api := &threadsAPIServer{t: t, createThreadErr: true}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newThreadsAdapterWithAPI(srv)
		_, err := adapter.Publish(context.Background(), "text", nil, conn)
		require.Error(t, err)
		assert.Equal(t, 0, api.publishCalls)
	})

	t.Run("PublishThread (publish step) failure returns error", func(t *testing.T) {
		t.Parallel()

		api := &threadsAPIServer{t: t, publishThreadErr: true}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newThreadsAdapterWithAPI(srv)
		_, err := adapter.Publish(context.Background(), "text", nil, conn)
		require.Error(t, err)
		assert.Equal(t, 1, api.createCalls)
	})
}

func TestThreadsAdapter_StartPublish(t *testing.T) {
	t.Parallel()

	conn := store.PlatformConnection{
		Platform:       "threads",
		AccessToken:    "token",
		PlatformUserID: "user123",
	}

	t.Run("text-only single post, readyNow=true (no video)", func(t *testing.T) {
		t.Parallel()

		api := &threadsAPIServer{t: t}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newThreadsAdapterWithAPI(srv)
		raw, readyNow, err := adapter.StartPublish(context.Background(), PostSpec{Content: "text only"}, conn)
		require.NoError(t, err)
		assert.True(t, readyNow)

		var handle threadsHandle
		require.NoError(t, json.Unmarshal(raw, &handle))
		assert.NotEmpty(t, handle.ContainerID)
		assert.False(t, handle.IsVideo)
	})

	t.Run("image single post, readyNow=true", func(t *testing.T) {
		t.Parallel()

		api := &threadsAPIServer{t: t}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newThreadsAdapterWithAPI(srv)
		// Non-.mp4 URL = image
		raw, readyNow, err := adapter.StartPublish(context.Background(), PostSpec{
			Content:   "with image",
			MediaURLs: []string{"https://example.com/photo.jpg"},
		}, conn)
		require.NoError(t, err)
		assert.True(t, readyNow)

		var handle threadsHandle
		require.NoError(t, json.Unmarshal(raw, &handle))
		assert.False(t, handle.IsVideo)
	})

	t.Run("video single post, readyNow=false", func(t *testing.T) {
		t.Parallel()

		api := &threadsAPIServer{t: t}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newThreadsAdapterWithAPI(srv)
		// .mp4 extension triggers video path
		raw, readyNow, err := adapter.StartPublish(context.Background(), PostSpec{
			Content:   "with video",
			MediaURLs: []string{"https://example.com/video.mp4"},
		}, conn)
		require.NoError(t, err)
		assert.False(t, readyNow)

		var handle threadsHandle
		require.NoError(t, json.Unmarshal(raw, &handle))
		assert.True(t, handle.IsVideo)
	})

	t.Run("CreateThread failure returns error", func(t *testing.T) {
		t.Parallel()

		api := &threadsAPIServer{t: t, createThreadErr: true}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newThreadsAdapterWithAPI(srv)
		_, _, err := adapter.StartPublish(context.Background(), PostSpec{Content: "text"}, conn)
		require.Error(t, err)
	})

	t.Run("thread spec: takes text from segments[0]", func(t *testing.T) {
		t.Parallel()

		api := &threadsAPIServer{t: t}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newThreadsAdapterWithAPI(srv)
		segs := []ThreadSegment{
			{Content: "first segment"},
			{Content: "second segment"},
		}
		raw, _, err := adapter.StartPublish(context.Background(), PostSpec{Segments: segs}, conn)
		require.NoError(t, err)
		assert.NotNil(t, raw)
		assert.Equal(t, 1, api.createCalls, "only segment[0] container created in StartPublish")
	})
}

func TestThreadsAdapter_CheckReady(t *testing.T) {
	t.Parallel()

	conn := store.PlatformConnection{
		Platform:    "threads",
		AccessToken: "token",
	}

	buildRawHandle := func(containerID string, isVideo bool) json.RawMessage {
		b, _ := json.Marshal(threadsHandle{ContainerID: containerID, IsVideo: isVideo})
		return b
	}

	t.Run("FINISHED status returns ready=true", func(t *testing.T) {
		t.Parallel()

		api := &threadsAPIServer{t: t, containerStatus: "FINISHED"}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newThreadsAdapterWithAPI(srv)
		ready, _, err := adapter.CheckReady(context.Background(), buildRawHandle("ctr-001", true), conn)
		require.NoError(t, err)
		assert.True(t, ready)
	})

	t.Run("IN_PROGRESS status returns ready=false", func(t *testing.T) {
		t.Parallel()

		api := &threadsAPIServer{t: t, containerStatus: "IN_PROGRESS"}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newThreadsAdapterWithAPI(srv)
		ready, _, err := adapter.CheckReady(context.Background(), buildRawHandle("ctr-001", true), conn)
		require.NoError(t, err)
		assert.False(t, ready)
	})

	t.Run("ERROR status returns error with message", func(t *testing.T) {
		t.Parallel()

		api := &threadsAPIServer{t: t, containerStatus: "ERROR", containerErrMsg: "transcode failed"}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newThreadsAdapterWithAPI(srv)
		_, _, err := adapter.CheckReady(context.Background(), buildRawHandle("ctr-001", true), conn)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "ERROR")
		assert.Contains(t, err.Error(), "transcode failed")
	})

	t.Run("EXPIRED status returns error", func(t *testing.T) {
		t.Parallel()

		api := &threadsAPIServer{t: t, containerStatus: "EXPIRED"}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newThreadsAdapterWithAPI(srv)
		_, _, err := adapter.CheckReady(context.Background(), buildRawHandle("ctr-001", true), conn)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "EXPIRED")
	})

	t.Run("invalid handle JSON returns error", func(t *testing.T) {
		t.Parallel()

		api := &threadsAPIServer{t: t}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newThreadsAdapterWithAPI(srv)
		_, _, err := adapter.CheckReady(context.Background(), json.RawMessage(`not json`), conn)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "unmarshal")
	})
}

func TestThreadsAdapter_Finalize(t *testing.T) {
	t.Parallel()

	conn := store.PlatformConnection{
		Platform:       "threads",
		AccessToken:    "token",
		PlatformUserID: "user123",
	}

	buildRawHandle := func(containerID string, isVideo bool) json.RawMessage {
		b, _ := json.Marshal(threadsHandle{ContainerID: containerID, IsVideo: isVideo})
		return b
	}

	t.Run("single post: publishes container, gets permalink", func(t *testing.T) {
		t.Parallel()

		api := &threadsAPIServer{
			t:           t,
			publishedID: "pub-001",
			permalink:   "https://www.threads.net/@user/post/pub001",
		}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newThreadsAdapterWithAPI(srv)
		result, err := adapter.Finalize(context.Background(), PostSpec{Content: "single"}, buildRawHandle("ctr-001", false), conn)
		require.NoError(t, err)
		assert.Equal(t, "pub-001", result.PlatformPostID)
		assert.Equal(t, "https://www.threads.net/@user/post/pub001", result.URL)
	})

	t.Run("multi-segment: publishes container 0 then walks remaining segments inline", func(t *testing.T) {
		t.Parallel()

		api := &threadsAPIServer{t: t}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		segs := []ThreadSegment{
			{Content: "seg1"},
			{Content: "seg2"},
		}
		adapter := newThreadsAdapterWithAPI(srv)
		result, err := adapter.Finalize(context.Background(), PostSpec{Segments: segs}, buildRawHandle("ctr-001", false), conn)
		require.NoError(t, err)
		assert.NotEmpty(t, result.PlatformPostID)
		// seg0 publish + 1 create for seg1 + 1 publish for seg1
		assert.Equal(t, 2, api.publishCalls, "seg0 publish + seg1 publish")
		assert.Equal(t, 1, api.createCalls, "create for seg1 only")
	})

	t.Run("PublishThread (publish step) failure returns error", func(t *testing.T) {
		t.Parallel()

		api := &threadsAPIServer{t: t, publishThreadErr: true}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newThreadsAdapterWithAPI(srv)
		_, err := adapter.Finalize(context.Background(), PostSpec{Content: "test"}, buildRawHandle("ctr-001", false), conn)
		require.Error(t, err)
	})

	t.Run("invalid handle JSON returns error", func(t *testing.T) {
		t.Parallel()

		api := &threadsAPIServer{t: t}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newThreadsAdapterWithAPI(srv)
		_, err := adapter.Finalize(context.Background(), PostSpec{Content: "test"}, json.RawMessage(`not json`), conn)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "unmarshal")
	})
}
