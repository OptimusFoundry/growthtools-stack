package handler

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"base-server/internal/github/processor"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func TestHandler_HandleRegenerateDraft(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)

	accountID := uuid.New()
	postID := uuid.New()
	mediaID := uuid.New()

	tests := []struct {
		name      string
		postParam string
		body      string
		regenErr  error
		// callsRegen is false when the handler must reject the request
		// before reaching the regenerator.
		callsRegen bool
		wantStatus int
	}{
		{"happy path", postID.String(), `{"media_ids":["` + mediaID.String() + `"]}`, nil, true, http.StatusOK},
		{"bad post id", "nope", `{"media_ids":[]}`, nil, false, http.StatusBadRequest},
		{"bad body", postID.String(), `{"media_ids":"x"}`, nil, false, http.StatusBadRequest},
		{"no media", postID.String(), `{"media_ids":[]}`, processor.ErrRegenerateNoMedia, true, http.StatusBadRequest},
		{"not in pool", postID.String(), `{"media_ids":[]}`, processor.ErrRegenerateMediaNotInPool, true, http.StatusBadRequest},
		{"not draft", postID.String(), `{"media_ids":[]}`, processor.ErrRegenerateNotDraft, true, http.StatusConflict},
		{"not a commit post", postID.String(), `{"media_ids":[]}`, processor.ErrRegenerateUnsupported, true, http.StatusConflict},
		{"post missing", postID.String(), `{"media_ids":[]}`, processor.ErrRegeneratePostNotFound, true, http.StatusNotFound},
		{"generation failed", postID.String(), `{"media_ids":[]}`, processor.ErrDraftGenerationFailed, true, http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			regen := NewMockDraftRegenerator(ctrl)
			if tt.callsRegen {
				wantMedia := []uuid.UUID{}
				if tt.name == "happy path" {
					wantMedia = []uuid.UUID{mediaID}
				}
				regen.EXPECT().
					RegenerateDraftWithMedia(gomock.Any(), accountID, postID, wantMedia).
					Return(store.Post{ID: postID}, tt.regenErr)
			}
			h := New(nil, "", observability.NewLogger()).WithDraftRegenerator(regen)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(tt.body))
			c.Request.Header.Set("Content-Type", "application/json")
			c.Params = gin.Params{{Key: "id", Value: tt.postParam}}
			c.Set("Account-ID", accountID.String())

			h.HandleRegenerateDraft(c)

			assert.Equal(t, tt.wantStatus, w.Code, w.Body.String())
		})
	}
}
