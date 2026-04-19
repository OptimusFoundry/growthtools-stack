package httpclient

import (
	"net/http"

	"base-server/internal/infra/observability"
)

// TracingTransport is an http.RoundTripper that reads X-Request-ID and X-User-ID
// from the request's context and adds them as outbound headers. It is inert when
// the context does not carry those values (e.g., worker-initiated calls at boot).
//
// Wrap any *http.Client's Transport with NewTracingTransport before passing it to
// a client constructor. The wrapped transport falls back to http.DefaultTransport
// when inner is nil.
type TracingTransport struct {
	inner http.RoundTripper
}

// NewTracingTransport returns a TracingTransport wrapping inner.
// Pass nil to wrap http.DefaultTransport.
func NewTracingTransport(inner http.RoundTripper) *TracingTransport {
	if inner == nil {
		inner = http.DefaultTransport
	}
	return &TracingTransport{inner: inner}
}

// NewTracingClient returns an *http.Client whose Transport is a TracingTransport
// wrapping http.DefaultTransport. Use this as the default constructor in bootstrap.
func NewTracingClient() *http.Client {
	return &http.Client{Transport: NewTracingTransport(nil)}
}

// RoundTrip implements http.RoundTripper.
func (t *TracingTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	ctx := req.Context()
	reqID := observability.GetRequestID(ctx)
	userID := observability.GetUserID(ctx)

	if reqID != "" || userID != "" {
		req = req.Clone(ctx)
		if reqID != "" {
			req.Header.Set("X-Request-ID", reqID)
		}
		if userID != "" {
			req.Header.Set("X-User-ID", userID)
		}
	}
	return t.inner.RoundTrip(req)
}
