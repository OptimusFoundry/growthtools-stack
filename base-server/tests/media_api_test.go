//go:build integration

package tests

import (
	"context"
	"io"
	"net/http"
	"testing"
	"time"

	mediaHandler "base-server/internal/media/handler"
	mediaProcessor "base-server/internal/media/processor"
	"base-server/internal/infra/store"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

// mockMediaStore implements mediaProcessor.MediaStore for testing.
type mockMediaStore struct {
	media map[uuid.UUID]store.Media
}

func newMockMediaStore() *mockMediaStore {
	return &mockMediaStore{
		media: make(map[uuid.UUID]store.Media),
	}
}

func (m *mockMediaStore) CreateMedia(_ context.Context, params store.CreateMediaParams) (store.Media, error) {
	now := time.Now().UTC()
	media := store.Media{
		ID:          uuid.New(),
		AccountID:   params.AccountID,
		Filename:    params.Filename,
		ContentType: params.ContentType,
		S3Key:       params.S3Key,
		S3URL:       params.S3URL,
		SizeBytes:   params.SizeBytes,
		Source:      params.Source,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	m.media[media.ID] = media
	return media, nil
}

func (m *mockMediaStore) GetMediaByID(_ context.Context, accountID, mediaID uuid.UUID) (store.Media, error) {
	media, ok := m.media[mediaID]
	if !ok || media.AccountID != accountID {
		return store.Media{}, store.ErrNotFound
	}
	return media, nil
}

func (m *mockMediaStore) ListMediaByAccount(_ context.Context, accountID uuid.UUID, limit, offset int) ([]store.Media, error) {
	var result []store.Media
	for _, med := range m.media {
		if med.AccountID == accountID {
			result = append(result, med)
		}
	}
	if offset >= len(result) {
		return []store.Media{}, nil
	}
	end := offset + limit
	if end > len(result) {
		end = len(result)
	}
	return result[offset:end], nil
}

func (m *mockMediaStore) DeleteMedia(_ context.Context, accountID, mediaID uuid.UUID) error {
	media, ok := m.media[mediaID]
	if !ok || media.AccountID != accountID {
		return store.ErrNotFound
	}
	delete(m.media, mediaID)
	return nil
}

func (m *mockMediaStore) CountMediaByAccount(_ context.Context, accountID uuid.UUID) (int, error) {
	count := 0
	for _, med := range m.media {
		if med.AccountID == accountID {
			count++
		}
	}
	return count, nil
}

// mockS3Client implements mediaProcessor.FileStore for testing.
type mockS3Client struct{}

func (m *mockS3Client) UploadFile(_ context.Context, key string, _ io.Reader, _ string) (string, error) {
	return "https://s3.example.com/" + key, nil
}

func (m *mockS3Client) DeleteFile(_ context.Context, _ string) error {
	return nil
}

func (m *mockS3Client) GetFile(_ context.Context, _ string) (io.ReadCloser, string, error) {
	return io.NopCloser(nil), "application/octet-stream", nil
}

func (m *mockS3Client) GeneratePresignedURL(_ context.Context, key string, _ time.Duration) (string, error) {
	return "https://s3.example.com/" + key + "?presigned=true", nil
}

// setupMediaRouter sets up a Gin router with the media handler and mock store.
func setupMediaRouter(accountID uuid.UUID) (*gin.Engine, *mockMediaStore) {
	mockStore := newMockMediaStore()
	s3Client := &mockS3Client{}
	logger := testLogger()

	proc := mediaProcessor.New(mockStore, s3Client, "https://s3.example.com", logger)
	handler := mediaHandler.New(proc, logger)

	router := setupTestRouter()
	protected := router.Group("/api/protected", mockAuthMiddleware(accountID))
	{
		protected.GET("/media", handler.HandleList)
		protected.DELETE("/media/:id", handler.HandleDelete)
	}

	return router, mockStore
}

func TestMediaAPI_ListMedia(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, mockStore := setupMediaRouter(accountID)

	// Seed some media
	for i := 0; i < 2; i++ {
		id := uuid.New()
		mockStore.media[id] = store.Media{
			ID:          id,
			AccountID:   accountID,
			Filename:    "test.png",
			ContentType: "image/png",
			S3Key:       accountID.String() + "/" + id.String(),
			S3URL:       "https://s3.example.com/" + id.String(),
			SizeBytes:   1024,
			Source:      "upload",
			CreatedAt:   time.Now().UTC(),
			UpdatedAt:   time.Now().UTC(),
		}
	}

	w := makeRequest(t, router, http.MethodGet, "/api/protected/media", nil)
	assertStatus(t, w, http.StatusOK)

	var media []store.Media
	parseResponseBody(t, w, &media)
	assert.Len(t, media, 2)
}

func TestMediaAPI_ListMedia_Empty(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupMediaRouter(accountID)

	w := makeRequest(t, router, http.MethodGet, "/api/protected/media", nil)
	assertStatus(t, w, http.StatusOK)

	var media []store.Media
	parseResponseBody(t, w, &media)
	assert.Empty(t, media)
}

func TestMediaAPI_ListMedia_Pagination(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, mockStore := setupMediaRouter(accountID)

	// Seed 5 media items
	for i := 0; i < 5; i++ {
		id := uuid.New()
		mockStore.media[id] = store.Media{
			ID:          id,
			AccountID:   accountID,
			Filename:    "test.png",
			ContentType: "image/png",
			S3Key:       accountID.String() + "/" + id.String(),
			S3URL:       "https://s3.example.com/" + id.String(),
			SizeBytes:   1024,
			Source:      "upload",
			CreatedAt:   time.Now().UTC(),
			UpdatedAt:   time.Now().UTC(),
		}
	}

	w := makeRequest(t, router, http.MethodGet, "/api/protected/media?limit=2&offset=0", nil)
	assertStatus(t, w, http.StatusOK)

	var media []store.Media
	parseResponseBody(t, w, &media)
	assert.Len(t, media, 2)
}

func TestMediaAPI_DeleteMedia(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, mockStore := setupMediaRouter(accountID)

	mediaID := uuid.New()
	mockStore.media[mediaID] = store.Media{
		ID:          mediaID,
		AccountID:   accountID,
		Filename:    "to-delete.png",
		ContentType: "image/png",
		S3Key:       accountID.String() + "/" + mediaID.String(),
		S3URL:       "https://s3.example.com/" + mediaID.String(),
		SizeBytes:   2048,
		Source:      "upload",
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
	}

	w := makeRequest(t, router, http.MethodDelete, "/api/protected/media/"+mediaID.String(), nil)
	assertStatus(t, w, http.StatusOK)

	var resp messageResponse
	parseResponseBody(t, w, &resp)
	assert.Contains(t, resp.Message, "deleted")

	_, exists := mockStore.media[mediaID]
	assert.False(t, exists)
}

func TestMediaAPI_DeleteMedia_NotFound(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupMediaRouter(accountID)

	fakeID := uuid.New()
	w := makeRequest(t, router, http.MethodDelete, "/api/protected/media/"+fakeID.String(), nil)
	assertNotFound(t, w)
}

func TestMediaAPI_DeleteMedia_InvalidID(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupMediaRouter(accountID)

	w := makeRequest(t, router, http.MethodDelete, "/api/protected/media/not-a-uuid", nil)
	assertStatus(t, w, http.StatusBadRequest)
}

func TestMediaAPI_DeleteMedia_CrossAccountIsolation(t *testing.T) {
	t.Parallel()

	accountA := uuid.New()
	accountB := uuid.New()

	_, mockStoreA := setupMediaRouter(accountA)
	routerB, _ := setupMediaRouter(accountB)

	// Create media owned by account A
	mediaID := uuid.New()
	mockStoreA.media[mediaID] = store.Media{
		ID:          mediaID,
		AccountID:   accountA,
		Filename:    "private.png",
		ContentType: "image/png",
		S3Key:       accountA.String() + "/" + mediaID.String(),
		S3URL:       "https://s3.example.com/" + mediaID.String(),
		SizeBytes:   1024,
		Source:      "upload",
	}

	// Account B tries to delete account A's media
	w := makeRequest(t, routerB, http.MethodDelete, "/api/protected/media/"+mediaID.String(), nil)
	assertNotFound(t, w)
}
