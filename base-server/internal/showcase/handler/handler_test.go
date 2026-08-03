package handler

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"base-server/internal/infra/apierrors"
	"base-server/internal/infra/observability"
	"base-server/internal/showcase/processor"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

var showcaseGinOnce sync.Once

func setupShowcaseRouter(h Handler, accountID uuid.UUID) *gin.Engine {
	showcaseGinOnce.Do(func() { gin.SetMode(gin.TestMode) })
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("Account-ID", accountID.String())
		c.Next()
	})
	r.POST("/showcase", h.HandleCreate)
	return r
}

func TestHandler_HandleCreate(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	jobID := uuid.New()
	brief := "a showcase brief about a form component"

	tests := []struct {
		name       string
		body       string
		mocks      func(m *MockShowcaseProcessorIface)
		wantStatus int
		wantCode   string
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "returns 202 with job_id and status=capturing on success",
			body: `{"brief":"` + brief + `"}`,
			mocks: func(m *MockShowcaseProcessorIface) {
				m.EXPECT().CreateShowcaseJob(gomock.Any(), accountID, brief).
					Return(jobID, nil)
			},
			wantStatus: http.StatusAccepted,
			wantBody: func(t *testing.T, body []byte) {
				t.Helper()
				var got CreateShowcaseJobResponse
				require.NoError(t, json.Unmarshal(body, &got))
				assert.Equal(t, jobID.String(), got.JobID)
				assert.Equal(t, "capturing", got.Status)
			},
		},
		{
			name: "returns 400 STORYBOOK_NOT_CONFIGURED when processor returns ErrStorybookNotConfigured",
			body: `{"brief":"` + brief + `"}`,
			mocks: func(m *MockShowcaseProcessorIface) {
				m.EXPECT().CreateShowcaseJob(gomock.Any(), accountID, brief).
					Return(uuid.Nil, processor.ErrStorybookNotConfigured)
			},
			wantStatus: http.StatusBadRequest,
			wantCode:   "STORYBOOK_NOT_CONFIGURED",
		},
		{
			name: "returns 400 SHOWCASE_NO_COMPONENT_MATCH when processor returns ErrNoComponentMatch",
			body: `{"brief":"` + brief + `"}`,
			mocks: func(m *MockShowcaseProcessorIface) {
				m.EXPECT().CreateShowcaseJob(gomock.Any(), accountID, brief).
					Return(uuid.Nil, processor.ErrNoComponentMatch)
			},
			wantStatus: http.StatusBadRequest,
			wantCode:   "SHOWCASE_NO_COMPONENT_MATCH",
		},
		{
			name: "returns 503 SHOWCASE_ENQUEUE_FAILED when processor returns ErrPublishFailed",
			body: `{"brief":"` + brief + `"}`,
			mocks: func(m *MockShowcaseProcessorIface) {
				m.EXPECT().CreateShowcaseJob(gomock.Any(), accountID, brief).
					Return(uuid.Nil, processor.ErrPublishFailed)
			},
			wantStatus: http.StatusServiceUnavailable,
			wantCode:   "SHOWCASE_ENQUEUE_FAILED",
		},
		{
			name: "returns 500 on an unrecognized/unwrapped processor error (AI transport failure)",
			body: `{"brief":"` + brief + `"}`,
			mocks: func(m *MockShowcaseProcessorIface) {
				m.EXPECT().CreateShowcaseJob(gomock.Any(), accountID, brief).
					Return(uuid.Nil, errors.New("ai transport error"))
			},
			wantStatus: http.StatusInternalServerError,
			wantCode:   "INTERNAL_ERROR",
		},
		{
			name:       "returns 400 on missing/empty brief (binding validation failure)",
			body:       `{"brief":""}`,
			mocks:      func(m *MockShowcaseProcessorIface) {},
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockShowcaseProcessorIface(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupShowcaseRouter(h, accountID)

			req := httptest.NewRequest(http.MethodPost, "/showcase", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)

			if tt.wantCode != "" {
				var errResp apierrors.ErrorResponse
				require.NoError(t, json.Unmarshal(w.Body.Bytes(), &errResp))
				assert.Equal(t, tt.wantCode, errResp.Code)
			}
			if tt.wantBody != nil {
				tt.wantBody(t, w.Body.Bytes())
			}
		})
	}
}
