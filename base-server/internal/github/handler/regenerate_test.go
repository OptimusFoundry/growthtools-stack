package handler

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"base-server/internal/github/processor"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

type fakeRegenerator struct {
	gotMedia []uuid.UUID
	err      error
}

func (f *fakeRegenerator) RegenerateDraftWithMedia(_ context.Context, _, postID uuid.UUID, mediaIDs []uuid.UUID) (store.Post, error) {
	f.gotMedia = mediaIDs
	return store.Post{ID: postID}, f.err
}

func TestHandler_HandleRegenerateDraft(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)

	accountID := uuid.New()
	postID := uuid.New()
	mediaID := uuid.New()

	tests := []struct {
		name       string
		postParam  string
		body       string
		regenErr   error
		wantStatus int
	}{
		{"happy path", postID.String(), `{"media_ids":["` + mediaID.String() + `"]}`, nil, http.StatusOK},
		{"bad post id", "nope", `{"media_ids":[]}`, nil, http.StatusBadRequest},
		{"bad body", postID.String(), `{"media_ids":"x"}`, nil, http.StatusBadRequest},
		{"no media", postID.String(), `{"media_ids":[]}`, processor.ErrRegenerateNoMedia, http.StatusBadRequest},
		{"not in pool", postID.String(), `{"media_ids":[]}`, processor.ErrRegenerateMediaNotInPool, http.StatusBadRequest},
		{"not draft", postID.String(), `{"media_ids":[]}`, processor.ErrRegenerateNotDraft, http.StatusConflict},
		{"not a commit post", postID.String(), `{"media_ids":[]}`, processor.ErrRegenerateUnsupported, http.StatusConflict},
		{"post missing", postID.String(), `{"media_ids":[]}`, processor.ErrRegeneratePostNotFound, http.StatusNotFound},
		{"generation failed", postID.String(), `{"media_ids":[]}`, processor.ErrDraftGenerationFailed, http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			regen := &fakeRegenerator{err: tt.regenErr}
			h := New(nil, "", observability.NewLogger()).WithDraftRegenerator(regen)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(tt.body))
			c.Request.Header.Set("Content-Type", "application/json")
			c.Params = gin.Params{{Key: "id", Value: tt.postParam}}
			c.Set("Account-ID", accountID.String())

			h.HandleRegenerateDraft(c)

			assert.Equal(t, tt.wantStatus, w.Code, w.Body.String())
			if tt.name == "happy path" {
				assert.Equal(t, []uuid.UUID{mediaID}, regen.gotMedia)
			}
		})
	}
}
