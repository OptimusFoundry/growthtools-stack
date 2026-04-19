package httpclient

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"base-server/internal/infra/observability"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// captureHeadersTransport records the headers seen on outbound requests.
type captureHeadersTransport struct {
	captured http.Header
}

func (t *captureHeadersTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	t.captured = req.Header.Clone()
	w := httptest.NewRecorder()
	w.WriteHeader(http.StatusOK)
	return w.Result(), nil
}

func TestTracingTransport_BothHeaders(t *testing.T) {
	t.Parallel()

	cap := &captureHeadersTransport{}
	transport := NewTracingTransport(cap)

	ctx := observability.SetRequestID(t.Context(), "req-abc-123")
	ctx = observability.SetUserID(ctx, "user-uuid-456")

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://example.com/test", nil)
	require.NoError(t, err)

	_, err = transport.RoundTrip(req)
	require.NoError(t, err)

	assert.Equal(t, "req-abc-123", cap.captured.Get("X-Request-ID"), "X-Request-ID should be propagated")
	assert.Equal(t, "user-uuid-456", cap.captured.Get("X-User-ID"), "X-User-ID should be propagated")
}

func TestTracingTransport_RequestIDOnly(t *testing.T) {
	t.Parallel()

	cap := &captureHeadersTransport{}
	transport := NewTracingTransport(cap)

	ctx := observability.SetRequestID(t.Context(), "req-only-111")

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://example.com/test", nil)
	require.NoError(t, err)

	_, err = transport.RoundTrip(req)
	require.NoError(t, err)

	assert.Equal(t, "req-only-111", cap.captured.Get("X-Request-ID"), "X-Request-ID should be propagated")
	assert.Empty(t, cap.captured.Get("X-User-ID"), "X-User-ID should not be present when not set")
}

func TestTracingTransport_NoContextValues(t *testing.T) {
	t.Parallel()

	cap := &captureHeadersTransport{}
	transport := NewTracingTransport(cap)

	req, err := http.NewRequestWithContext(t.Context(), http.MethodGet, "http://example.com/test", nil)
	require.NoError(t, err)

	_, err = transport.RoundTrip(req)
	require.NoError(t, err)

	assert.Empty(t, cap.captured.Get("X-Request-ID"), "X-Request-ID should not be present when context has no value")
	assert.Empty(t, cap.captured.Get("X-User-ID"), "X-User-ID should not be present when context has no value")
}
