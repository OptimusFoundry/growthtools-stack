//go:build integration

package tests

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"base-server/internal/infra/observability"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// setupTestRouter creates a Gin router in test mode.
func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	return r
}

// mockAuthMiddleware injects a test account ID into the Gin context,
// simulating the JWT auth middleware.
func mockAuthMiddleware(accountID uuid.UUID) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("Account-ID", accountID.String())
		c.Next()
	}
}

// testLogger returns a logger suitable for use in tests.
func testLogger() *observability.Logger {
	return observability.NewLogger()
}

// makeRequest performs an HTTP request against the given router and returns the recorder.
func makeRequest(t *testing.T, router *gin.Engine, method, path string, body interface{}) *httptest.ResponseRecorder {
	t.Helper()

	var reqBody io.Reader
	if body != nil {
		jsonBytes, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("failed to marshal request body: %v", err)
		}
		reqBody = bytes.NewReader(jsonBytes)
	}

	req := httptest.NewRequest(method, path, reqBody)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

// makeRequestWithHeaders performs an HTTP request with custom headers.
func makeRequestWithHeaders(t *testing.T, router *gin.Engine, method, path string, body interface{}, headers map[string]string) *httptest.ResponseRecorder {
	t.Helper()

	var reqBody io.Reader
	if body != nil {
		if b, ok := body.([]byte); ok {
			reqBody = bytes.NewReader(b)
		} else {
			jsonBytes, err := json.Marshal(body)
			if err != nil {
				t.Fatalf("failed to marshal request body: %v", err)
			}
			reqBody = bytes.NewReader(jsonBytes)
		}
	}

	req := httptest.NewRequest(method, path, reqBody)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

// parseResponseBody parses a JSON response body into the given target.
func parseResponseBody(t *testing.T, w *httptest.ResponseRecorder, target interface{}) {
	t.Helper()
	if err := json.Unmarshal(w.Body.Bytes(), target); err != nil {
		t.Fatalf("failed to parse response body: %v\nbody: %s", err, w.Body.String())
	}
}

// assertStatus checks that the response status code matches the expected value.
func assertStatus(t *testing.T, w *httptest.ResponseRecorder, expected int) {
	t.Helper()
	if w.Code != expected {
		t.Errorf("expected status %d, got %d; body: %s", expected, w.Code, w.Body.String())
	}
}

// strPtr returns a pointer to a string.
func strPtr(s string) *string {
	return &s
}

// errorResponse represents the standard API error response.
type errorResponse struct {
	Error string `json:"error"`
	Code  string `json:"code"`
}

// messageResponse represents a response containing just a message field.
type messageResponse struct {
	Message string `json:"message"`
}

// assertErrorResponse checks the response is an error with expected code and status.
func assertErrorResponse(t *testing.T, w *httptest.ResponseRecorder, expectedStatus int) {
	t.Helper()
	assertStatus(t, w, expectedStatus)

	var resp errorResponse
	parseResponseBody(t, w, &resp)
	if resp.Error == "" {
		t.Errorf("expected error message in response, got empty string")
	}
}

// assertNotFound checks the response is a 404.
func assertNotFound(t *testing.T, w *httptest.ResponseRecorder) {
	t.Helper()
	assertErrorResponse(t, w, http.StatusNotFound)
}
