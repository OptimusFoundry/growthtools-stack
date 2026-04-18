package adapters

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	"base-server/internal/platform/clients/linkedin"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// linkedinAPIServer handles LinkedIn REST API endpoints needed by adapter tests.
type linkedinAPIServer struct {
	t                  *testing.T
	createPostErr      bool
	initUploadErr      bool
	uploadImageErr     bool
	postURN            string
	uploadURL          string
	imageURN           string
	createPostCalls    int
	initUploadCalls    int
	uploadImageCalls   int
}

func (s *linkedinAPIServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.URL.Path == "/rest/posts" && r.Method == http.MethodPost:
		s.createPostCalls++
		if s.createPostErr {
			w.WriteHeader(http.StatusForbidden)
			fmt.Fprint(w, `{"status":403,"message":"Not Authorized"}`)
			return
		}
		urn := s.postURN
		if urn == "" {
			urn = fmt.Sprintf("urn:li:ugcPost:test-%d", s.createPostCalls)
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("x-restli-id", urn)
		w.WriteHeader(http.StatusCreated)

	case r.URL.Path == "/rest/images" && r.URL.Query().Get("action") == "initializeUpload" && r.Method == http.MethodPost:
		s.initUploadCalls++
		if s.initUploadErr {
			w.WriteHeader(http.StatusBadRequest)
			fmt.Fprint(w, `{"status":400,"message":"Bad Request"}`)
			return
		}
		uploadURL := s.uploadURL
		if uploadURL == "" {
			// Point to our own server for the PUT upload
			uploadURL = fmt.Sprintf("http://%s/upload-target", r.Host)
		}
		imageURN := s.imageURN
		if imageURN == "" {
			imageURN = fmt.Sprintf("urn:li:image:test-%d", s.initUploadCalls)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"value":{"uploadUrl":%q,"image":%q}}`, uploadURL, imageURN)

	case r.URL.Path == "/upload-target" && r.Method == http.MethodPut:
		s.uploadImageCalls++
		if s.uploadImageErr {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusCreated)

	default:
		http.NotFound(w, r)
	}
}

func newLinkedInAdapterWithAPI(srv *httptest.Server) *LinkedInAdapter {
	logger := observability.NewLogger()
	client := linkedin.NewTestClient(srv.URL, srv.Client(), logger)
	return NewLinkedInAdapter(client, logger)
}

func TestLinkedInAdapter_Publish(t *testing.T) {
	t.Parallel()

	conn := store.PlatformConnection{
		Platform:       "linkedin",
		AccessToken:    "token",
		PlatformUserID: "pers123",
	}

	t.Run("text-only post succeeds", func(t *testing.T) {
		t.Parallel()

		api := &linkedinAPIServer{t: t, postURN: "urn:li:ugcPost:textonly"}
		srv := httptest.NewServer(api)
		t.Cleanup(srv.Close)

		adapter := newLinkedInAdapterWithAPI(srv)
		result, err := adapter.Publish(context.Background(), "hello linkedin", nil, conn)
		require.NoError(t, err)
		assert.Equal(t, "urn:li:ugcPost:textonly", result.PlatformPostID)
		assert.Contains(t, result.URL, "urn:li:ugcPost:textonly")
		assert.Equal(t, 1, api.createPostCalls)
		assert.Equal(t, 0, api.initUploadCalls)
	})

	t.Run("image post: download + init + upload succeeds", func(t *testing.T) {
		t.Parallel()

		mediaSrv := downloadOnlyServer(t, http.StatusOK, []byte("imgbytes"), "image/jpeg")
		api := &linkedinAPIServer{
			t:        t,
			postURN:  "urn:li:ugcPost:withimg",
			imageURN: "urn:li:image:img001",
		}
		// Set uploadURL to point to the api server's upload-target
		apiSrv := httptest.NewServer(api)
		t.Cleanup(apiSrv.Close)
		// Override uploadURL to use the test server
		api.uploadURL = apiSrv.URL + "/upload-target"

		adapter := newLinkedInAdapterWithAPI(apiSrv)
		result, err := adapter.Publish(context.Background(), "with image", []string{mediaSrv.URL}, conn)
		require.NoError(t, err)
		assert.Equal(t, "urn:li:ugcPost:withimg", result.PlatformPostID)
		assert.Equal(t, 1, api.initUploadCalls)
		assert.Equal(t, 1, api.uploadImageCalls)
		assert.Equal(t, 1, api.createPostCalls)
	})

	t.Run("download failure returns error", func(t *testing.T) {
		t.Parallel()

		mediaSrv := downloadOnlyServer(t, http.StatusNotFound, nil, "")
		api := &linkedinAPIServer{t: t}
		apiSrv := httptest.NewServer(api)
		t.Cleanup(apiSrv.Close)

		adapter := newLinkedInAdapterWithAPI(apiSrv)
		_, err := adapter.Publish(context.Background(), "text", []string{mediaSrv.URL}, conn)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "download media")
		assert.Equal(t, 0, api.createPostCalls)
	})

	t.Run("InitializeImageUpload failure returns error", func(t *testing.T) {
		t.Parallel()

		mediaSrv := downloadOnlyServer(t, http.StatusOK, []byte("imgbytes"), "image/jpeg")
		api := &linkedinAPIServer{t: t, initUploadErr: true}
		apiSrv := httptest.NewServer(api)
		t.Cleanup(apiSrv.Close)

		adapter := newLinkedInAdapterWithAPI(apiSrv)
		_, err := adapter.Publish(context.Background(), "text", []string{mediaSrv.URL}, conn)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "initialize image upload")
		assert.Equal(t, 0, api.createPostCalls)
	})

	t.Run("UploadImage failure returns error", func(t *testing.T) {
		t.Parallel()

		mediaSrv := downloadOnlyServer(t, http.StatusOK, []byte("imgbytes"), "image/jpeg")
		api := &linkedinAPIServer{t: t, uploadImageErr: true}
		apiSrv := httptest.NewServer(api)
		t.Cleanup(apiSrv.Close)
		api.uploadURL = apiSrv.URL + "/upload-target"

		adapter := newLinkedInAdapterWithAPI(apiSrv)
		_, err := adapter.Publish(context.Background(), "text", []string{mediaSrv.URL}, conn)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "upload image")
		assert.Equal(t, 0, api.createPostCalls)
	})

	t.Run("CreatePost failure returns error", func(t *testing.T) {
		t.Parallel()

		api := &linkedinAPIServer{t: t, createPostErr: true}
		apiSrv := httptest.NewServer(api)
		t.Cleanup(apiSrv.Close)

		adapter := newLinkedInAdapterWithAPI(apiSrv)
		_, err := adapter.Publish(context.Background(), "text", nil, conn)
		require.Error(t, err)
	})
}
