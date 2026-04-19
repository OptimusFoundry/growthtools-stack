package adapters

import (
	"context"
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

// blueskyAPIServer handles all Bluesky AT Protocol endpoints needed for adapter tests.
type blueskyAPIServer struct {
	t              *testing.T
	sessionErr     bool
	uploadBlobErr  bool
	createRecordErr bool
	recordCalls    int
	blobCalls      int
}

func (s *blueskyAPIServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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
		s.blobCalls++
		if s.uploadBlobErr {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprint(w, `{"error":"UploadLimitExceeded"}`)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"blob":{"$type":"blob","ref":{"$link":"bafytest"},"mimeType":"image/jpeg","size":100}}`)

	case "/xrpc/com.atproto.repo.createRecord":
		s.recordCalls++
		if s.createRecordErr {
			w.WriteHeader(http.StatusForbidden)
			fmt.Fprint(w, `{"error":"InvalidToken"}`)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"uri":"at://did:plc:test123/app.bsky.feed.post/rkey%d","cid":"cid123"}`, s.recordCalls)

	default:
		http.NotFound(w, r)
	}
}

func newBlueskyAdapterWithAPI(srv *httptest.Server) *BlueskyAdapter {
	logger := observability.NewLogger()
	client := bluesky.NewClient(srv.URL, srv.Client(), logger)
	return NewBlueskyAdapter(client, logger)
}

func TestBlueskyAdapter_Publish(t *testing.T) {
	t.Parallel()

	conn := store.PlatformConnection{
		Platform:       "bluesky",
		AccessToken:    "apppassword",
		PlatformUserID: "user.bsky.social",
	}

	t.Run("happy path text only", func(t *testing.T) {
		t.Parallel()

		api := &blueskyAPIServer{t: t}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newBlueskyAdapterWithAPI(srv)
		result, err := adapter.Publish(context.Background(), "hello world", nil, conn)
		require.NoError(t, err)
		assert.NotEmpty(t, result.PlatformPostID)
		assert.Equal(t, 1, api.recordCalls)
	})

	t.Run("happy path with image: download + upload blob + record", func(t *testing.T) {
		t.Parallel()

		mediaSrv := downloadOnlyServer(t, http.StatusOK, []byte("imgbytes"), "image/jpeg")
		api := &blueskyAPIServer{t: t}
		apiSrv := httptest.NewServer(api)
		t.Cleanup(apiSrv.Close)

		adapter := newBlueskyAdapterWithAPI(apiSrv)
		result, err := adapter.Publish(context.Background(), "with image", []string{mediaSrv.URL}, conn)
		require.NoError(t, err)
		assert.NotEmpty(t, result.PlatformPostID)
		assert.Equal(t, 1, api.blobCalls, "blob should have been uploaded")
		assert.Equal(t, 1, api.recordCalls)
	})

	t.Run("auth failure returns error", func(t *testing.T) {
		t.Parallel()

		api := &blueskyAPIServer{t: t, sessionErr: true}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newBlueskyAdapterWithAPI(srv)
		_, err := adapter.Publish(context.Background(), "text", nil, conn)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "auth failed")
		assert.Equal(t, 0, api.recordCalls)
	})

	t.Run("download failure returns error", func(t *testing.T) {
		t.Parallel()

		mediaSrv := downloadOnlyServer(t, http.StatusNotFound, nil, "")
		api := &blueskyAPIServer{t: t}
		apiSrv := httptest.NewServer(api)
		t.Cleanup(apiSrv.Close)

		adapter := newBlueskyAdapterWithAPI(apiSrv)
		_, err := adapter.Publish(context.Background(), "text", []string{mediaSrv.URL}, conn)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "download media")
		assert.Equal(t, 0, api.recordCalls)
	})

	t.Run("UploadBlob failure returns error", func(t *testing.T) {
		t.Parallel()

		mediaSrv := downloadOnlyServer(t, http.StatusOK, []byte("imgbytes"), "image/jpeg")
		api := &blueskyAPIServer{t: t, uploadBlobErr: true}
		apiSrv := httptest.NewServer(api)
		t.Cleanup(apiSrv.Close)

		adapter := newBlueskyAdapterWithAPI(apiSrv)
		_, err := adapter.Publish(context.Background(), "text", []string{mediaSrv.URL}, conn)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "upload blob")
		assert.Equal(t, 0, api.recordCalls)
	})

	t.Run("CreateRecord failure returns error", func(t *testing.T) {
		t.Parallel()

		api := &blueskyAPIServer{t: t, createRecordErr: true}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newBlueskyAdapterWithAPI(srv)
		_, err := adapter.Publish(context.Background(), "text", nil, conn)
		require.Error(t, err)
		assert.Equal(t, 1, api.recordCalls)
	})
}

func TestBlueskyAdapter_PublishThread(t *testing.T) {
	t.Parallel()

	conn := store.PlatformConnection{
		Platform:       "bluesky",
		AccessToken:    "apppassword",
		PlatformUserID: "user.bsky.social",
	}

	t.Run("empty segments returns error", func(t *testing.T) {
		t.Parallel()

		api := &blueskyAPIServer{t: t}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newBlueskyAdapterWithAPI(srv)
		_, err := adapter.PublishThread(context.Background(), nil, nil, conn)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "no thread segments")
	})

	t.Run("segment media download failure returns error", func(t *testing.T) {
		t.Parallel()

		mediaSrv := downloadOnlyServer(t, http.StatusNotFound, nil, "")
		api := &blueskyAPIServer{t: t}
		apiSrv := httptest.NewServer(api)
		t.Cleanup(apiSrv.Close)

		idx := 1
		segs := []ThreadSegment{{Content: "seg1", ImageIndex: &idx}}
		adapter := newBlueskyAdapterWithAPI(apiSrv)
		_, err := adapter.PublishThread(context.Background(), segs, []string{mediaSrv.URL}, conn)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "download media")
		assert.Equal(t, 0, api.recordCalls)
	})

	t.Run("segment blob upload failure returns error", func(t *testing.T) {
		t.Parallel()

		mediaSrv := downloadOnlyServer(t, http.StatusOK, []byte("imgbytes"), "image/jpeg")
		api := &blueskyAPIServer{t: t, uploadBlobErr: true}
		apiSrv := httptest.NewServer(api)
		t.Cleanup(apiSrv.Close)

		idx := 1
		segs := []ThreadSegment{{Content: "seg1", ImageIndex: &idx}}
		adapter := newBlueskyAdapterWithAPI(apiSrv)
		_, err := adapter.PublishThread(context.Background(), segs, []string{mediaSrv.URL}, conn)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "upload blob")
		assert.Equal(t, 0, api.recordCalls)
	})

	t.Run("segment 2 record failure returns first result with error", func(t *testing.T) {
		t.Parallel()

		callCount := 0
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			switch r.URL.Path {
			case "/xrpc/com.atproto.server.createSession":
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusOK)
				fmt.Fprint(w, `{"accessJwt":"jwt-tok","did":"did:plc:test123"}`)
			case "/xrpc/com.atproto.repo.createRecord":
				callCount++
				if callCount >= 2 {
					w.WriteHeader(http.StatusInternalServerError)
					fmt.Fprint(w, `{"error":"ratelimit"}`)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusOK)
				fmt.Fprintf(w, `{"uri":"at://did:plc:test123/app.bsky.feed.post/rkey%d","cid":"cid%d"}`, callCount, callCount)
			default:
				http.NotFound(w, r)
			}
		}))
		t.Cleanup(srv.Close)

		adapter := newBlueskyAdapterWithAPI(srv)
		segs := []ThreadSegment{{Content: "seg1"}, {Content: "seg2"}}
		_, err := adapter.PublishThread(context.Background(), segs, nil, conn)
		require.Error(t, err)
		assert.Equal(t, 2, callCount)
	})
}
