package adapters

import (
	"context"
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

// fullAPIServer responds to all X API paths needed by adapter tests.
type fullAPIServer struct {
	t              *testing.T
	uploadErr      bool
	uploadMediaID  string
	createTweetID  string
	createTweetErr bool
	tweetCalls     int
}

func (s *fullAPIServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.URL.Path == "/2/media/upload" && r.Method == http.MethodPost:
		if s.uploadErr {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprint(w, `{"detail":"upload failed"}`)
			return
		}
		id := s.uploadMediaID
		if id == "" {
			id = "media-001"
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"data":{"id":%q,"media_key":"3_x"}}`, id)

	case r.URL.Path == "/2/tweets" && r.Method == http.MethodPost:
		s.tweetCalls++
		if s.createTweetErr {
			w.WriteHeader(http.StatusForbidden)
			fmt.Fprint(w, `{"detail":"forbidden"}`)
			return
		}
		id := s.createTweetID
		if id == "" {
			id = "tweet-001"
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		fmt.Fprintf(w, `{"data":{"id":%q}}`, id)

	default:
		http.NotFound(w, r)
	}
}

// downloadOnlyServer serves media bytes from a test URL.
func downloadOnlyServer(t *testing.T, status int, body []byte, ct string) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if ct != "" {
			w.Header().Set("Content-Type", ct)
		}
		w.WriteHeader(status)
		w.Write(body)
	}))
	t.Cleanup(srv.Close)
	return srv
}

// newXAdapterWithAPI creates an XAdapter backed by a test API server using NewTestClient.
func newXAdapterWithAPI(srv *httptest.Server) *XAdapter {
	logger := observability.NewLogger()
	client := x.NewClient("", "", srv.URL, srv.Client(), logger)
	return NewXAdapter(client, logger)
}

func TestXAdapter_Publish(t *testing.T) {
	t.Parallel()

	conn := store.PlatformConnection{
		Platform:       "x",
		AccessToken:    "token",
		PlatformUserID: "user1",
	}

	t.Run("happy path text-only post succeeds", func(t *testing.T) {
		t.Parallel()

		api := &fullAPIServer{t: t, createTweetID: "twt001"}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newXAdapterWithAPI(srv)
		result, err := adapter.Publish(context.Background(), "hello", nil, conn)
		require.NoError(t, err)
		assert.Equal(t, "twt001", result.PlatformPostID)
		assert.Contains(t, result.URL, "user1")
		assert.Contains(t, result.URL, "twt001")
	})

	t.Run("happy path with image: download + upload + tweet", func(t *testing.T) {
		t.Parallel()

		mediaSrv := downloadOnlyServer(t, http.StatusOK, []byte("imgbytes"), "image/jpeg")
		api := &fullAPIServer{t: t, uploadMediaID: "medi001", createTweetID: "twt002"}
		apiSrv := httptest.NewServer(api)
		t.Cleanup(apiSrv.Close)

		adapter := newXAdapterWithAPI(apiSrv)
		result, err := adapter.Publish(context.Background(), "check", []string{mediaSrv.URL}, conn)
		require.NoError(t, err)
		assert.Equal(t, "twt002", result.PlatformPostID)
	})

	t.Run("download failure returns error", func(t *testing.T) {
		t.Parallel()

		mediaSrv := downloadOnlyServer(t, http.StatusNotFound, nil, "")
		api := &fullAPIServer{t: t}
		apiSrv := httptest.NewServer(api)
		t.Cleanup(apiSrv.Close)

		adapter := newXAdapterWithAPI(apiSrv)
		_, err := adapter.Publish(context.Background(), "text", []string{mediaSrv.URL}, conn)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "download media")
		assert.Equal(t, 0, api.tweetCalls, "CreateTweet must not be called")
	})

	t.Run("UploadMedia failure returns error", func(t *testing.T) {
		t.Parallel()

		mediaSrv := downloadOnlyServer(t, http.StatusOK, []byte("bytes"), "image/jpeg")
		api := &fullAPIServer{t: t, uploadErr: true}
		apiSrv := httptest.NewServer(api)
		t.Cleanup(apiSrv.Close)

		adapter := newXAdapterWithAPI(apiSrv)
		_, err := adapter.Publish(context.Background(), "text", []string{mediaSrv.URL}, conn)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "upload media")
		assert.Equal(t, 0, api.tweetCalls)
	})

	t.Run("CreateTweet failure returns wrapped error", func(t *testing.T) {
		t.Parallel()

		api := &fullAPIServer{t: t, createTweetErr: true}
		apiSrv := httptest.NewServer(api)
		t.Cleanup(apiSrv.Close)

		adapter := newXAdapterWithAPI(apiSrv)
		_, err := adapter.Publish(context.Background(), "text", nil, conn)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "x adapter")
	})
}

func TestXAdapter_PublishThread(t *testing.T) {
	t.Parallel()

	conn := store.PlatformConnection{
		Platform:       "x",
		AccessToken:    "token",
		PlatformUserID: "user1",
	}

	t.Run("happy path single segment no media", func(t *testing.T) {
		t.Parallel()

		api := &fullAPIServer{t: t, createTweetID: "twt001"}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newXAdapterWithAPI(srv)
		result, err := adapter.PublishThread(context.Background(), []ThreadSegment{{Content: "seg1"}}, nil, conn)
		require.NoError(t, err)
		assert.Equal(t, "twt001", result.PlatformPostID)
	})

	t.Run("happy path multi-segment thread chain", func(t *testing.T) {
		t.Parallel()

		callCount := 0
		ids := []string{"twt001", "twt002"}
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

		adapter := newXAdapterWithAPI(srv)
		segs := []ThreadSegment{{Content: "seg1"}, {Content: "seg2"}}
		result, err := adapter.PublishThread(context.Background(), segs, nil, conn)
		require.NoError(t, err)
		assert.Equal(t, "twt001", result.PlatformPostID)
		assert.Equal(t, 2, callCount)
	})

	t.Run("empty segments returns error", func(t *testing.T) {
		t.Parallel()

		api := &fullAPIServer{t: t}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newXAdapterWithAPI(srv)
		_, err := adapter.PublishThread(context.Background(), nil, nil, conn)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "no thread segments")
	})

	t.Run("media download failure returns error", func(t *testing.T) {
		t.Parallel()

		mediaSrv := downloadOnlyServer(t, http.StatusNotFound, nil, "")
		api := &fullAPIServer{t: t}
		apiSrv := httptest.NewServer(api)
		t.Cleanup(apiSrv.Close)

		idx := 1
		segs := []ThreadSegment{{Content: "seg1", ImageIndex: &idx}}
		adapter := newXAdapterWithAPI(apiSrv)
		_, err := adapter.PublishThread(context.Background(), segs, []string{mediaSrv.URL}, conn)
		require.Error(t, err)
		assert.Equal(t, 0, api.tweetCalls)
	})

	t.Run("media upload failure returns error", func(t *testing.T) {
		t.Parallel()

		mediaSrv := downloadOnlyServer(t, http.StatusOK, []byte("bytes"), "image/jpeg")
		api := &fullAPIServer{t: t, uploadErr: true}
		apiSrv := httptest.NewServer(api)
		t.Cleanup(apiSrv.Close)

		idx := 1
		segs := []ThreadSegment{{Content: "seg1", ImageIndex: &idx}}
		adapter := newXAdapterWithAPI(apiSrv)
		_, err := adapter.PublishThread(context.Background(), segs, []string{mediaSrv.URL}, conn)
		require.Error(t, err)
		assert.Equal(t, 0, api.tweetCalls)
	})

	t.Run("CreateTweet failure on segment 2 returns error", func(t *testing.T) {
		t.Parallel()

		callCount := 0
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/2/tweets" {
				callCount++
				if callCount == 1 {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusCreated)
					fmt.Fprint(w, `{"data":{"id":"twt001"}}`)
					return
				}
				w.WriteHeader(http.StatusInternalServerError)
				return
			}
			http.NotFound(w, r)
		}))
		t.Cleanup(srv.Close)

		adapter := newXAdapterWithAPI(srv)
		segs := []ThreadSegment{{Content: "seg1"}, {Content: "seg2"}}
		_, err := adapter.PublishThread(context.Background(), segs, nil, conn)
		require.Error(t, err)
	})
}
