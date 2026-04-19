package mocks

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
)

// MockServer wraps an httptest.Server with a per-test expectation queue.
// One MockServer instance per upstream service; shared across all tests.
// Tests register expectations before making API calls; t.Cleanup fires per-test
// verification and removal.
type MockServer struct {
	Server    *httptest.Server // expose so testenv can read .URL
	mu        sync.Mutex
	queues    map[string][]*Expectation // key: "METHOD /path"
	unmatched []unmatchedRequest
}

type unmatchedRequest struct {
	method  string
	path    string
	headers http.Header
}

// Expectation represents a single registered HTTP interaction.
type Expectation struct {
	method      string
	path        string
	ownerToken  string // t.Name() of the registering test
	minTimes    int    // 0 = any; set by Times/AtLeast
	maxTimes    int    // -1 = unlimited; set by AnyTimes; >0 set by Times
	callCount   int
	statusCode  int
	body        []byte
	contentType string
	bodyMatcher func(body []byte) error

	// Header filters — used for matching priority (see matching order below).
	filterRequestID string // match if X-Request-ID == this value
	filterUserID    string // match if X-User-ID == this value
	filterAuth      string // match if Authorization == this value

	owner *MockServer
}

// NewMockServer creates and starts a new httptest.Server with the mock handler.
func NewMockServer() *MockServer {
	m := &MockServer{
		queues: make(map[string][]*Expectation),
	}
	m.Server = httptest.NewServer(http.HandlerFunc(m.serveHTTP))
	return m
}

// serveHTTP handles incoming requests against registered expectations.
func (m *MockServer) serveHTTP(w http.ResponseWriter, r *http.Request) {
	m.mu.Lock()

	key := r.Method + " " + r.URL.Path
	queue := m.queues[key]

	// Find available candidates (not yet exhausted).
	var candidates []*Expectation
	for _, e := range queue {
		if e.maxTimes == -1 || e.callCount < e.maxTimes {
			candidates = append(candidates, e)
		}
	}

	if len(candidates) == 0 {
		m.unmatched = append(m.unmatched, unmatchedRequest{
			method:  r.Method,
			path:    r.URL.Path,
			headers: r.Header.Clone(),
		})
		m.mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(w, `{"error":"unexpected request: %s %s"}`, r.Method, r.URL.Path)
		return
	}

	// Evaluate matching priority.
	var matched *Expectation

	requestID := r.Header.Get("X-Request-ID")
	userID := r.Header.Get("X-User-ID")
	auth := r.Header.Get("Authorization")

	// Priority 1 — Request-ID match.
	if requestID != "" {
		for _, e := range candidates {
			if e.filterRequestID != "" && e.filterRequestID == requestID {
				matched = e
				break
			}
		}
	}

	// Priority 2 — User-ID match.
	if matched == nil && userID != "" {
		for _, e := range candidates {
			if e.filterUserID != "" && e.filterUserID == userID {
				matched = e
				break
			}
		}
	}

	// Priority 3 — Auth match.
	if matched == nil && auth != "" {
		for _, e := range candidates {
			if e.filterAuth != "" && e.filterAuth == auth {
				matched = e
				break
			}
		}
	}

	// Priority 4 — FIFO unfiltered.
	if matched == nil {
		for _, e := range candidates {
			if e.filterRequestID == "" && e.filterUserID == "" && e.filterAuth == "" {
				matched = e
				break
			}
		}
	}

	if matched == nil {
		m.unmatched = append(m.unmatched, unmatchedRequest{
			method:  r.Method,
			path:    r.URL.Path,
			headers: r.Header.Clone(),
		})
		m.mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(w, `{"error":"no matching expectation for: %s %s"}`, r.Method, r.URL.Path)
		return
	}

	// Read body for matcher if needed.
	var reqBody []byte
	if matched.bodyMatcher != nil {
		m.mu.Unlock()
		var err error
		reqBody, err = io.ReadAll(r.Body)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		if matchErr := matched.bodyMatcher(reqBody); matchErr != nil {
			w.WriteHeader(http.StatusBadRequest)
			fmt.Fprintf(w, "%s", matchErr.Error())
			return
		}
		m.mu.Lock()
	}

	// Increment call count.
	matched.callCount++

	// Remove if exhausted.
	if matched.maxTimes > 0 && matched.callCount >= matched.maxTimes {
		newQueue := make([]*Expectation, 0, len(queue))
		for _, e := range queue {
			if e != matched {
				newQueue = append(newQueue, e)
			}
		}
		m.queues[key] = newQueue
	}

	statusCode := matched.statusCode
	body := matched.body
	contentType := matched.contentType
	if statusCode == 0 {
		statusCode = http.StatusOK
	}

	m.mu.Unlock()

	if contentType != "" {
		w.Header().Set("Content-Type", contentType)
	}
	w.WriteHeader(statusCode)
	if len(body) > 0 {
		w.Write(body)
	}
}

// Expect registers a new expectation for the given method and path.
// The expectation is owned by the calling test (t.Name()).
// Returns *Expectation for chaining.
// Must call Times, AtLeast, or AnyTimes to complete registration and bind t.Cleanup.
func (m *MockServer) Expect(t *testing.T, method, path string) *Expectation {
	t.Helper()
	e := &Expectation{
		method:     method,
		path:       path,
		ownerToken: t.Name(),
		maxTimes:   -1, // default: unlimited until Times/AtLeast sets it
		owner:      m,
	}
	return e
}

// ForRequestID constrains this expectation to only match requests whose
// X-Request-ID header equals id.
func (e *Expectation) ForRequestID(id string) *Expectation {
	e.filterRequestID = id
	return e
}

// ForUserID constrains this expectation to only match requests whose
// X-User-ID header equals id.
func (e *Expectation) ForUserID(id string) *Expectation {
	e.filterUserID = id
	return e
}

// ForAuth constrains this expectation to only match requests whose
// Authorization header equals token.
func (e *Expectation) ForAuth(token string) *Expectation {
	e.filterAuth = token
	return e
}

// Times sets an exact call count requirement and registers t.Cleanup.
func (e *Expectation) Times(n int, t *testing.T) *Expectation {
	t.Helper()
	e.minTimes = n
	e.maxTimes = n
	e.register(t)
	t.Cleanup(func() {
		e.owner.mu.Lock()
		defer e.owner.mu.Unlock()
		if e.callCount != n {
			t.Errorf("mock expectation %s %s (owner: %s): expected exactly %d call(s), got %d",
				e.method, e.path, e.ownerToken, n, e.callCount)
		}
		e.owner.removeExpectation(e)
	})
	return e
}

// AtLeast sets a minimum call count requirement and registers t.Cleanup.
func (e *Expectation) AtLeast(n int, t *testing.T) *Expectation {
	t.Helper()
	e.minTimes = n
	e.maxTimes = -1 // unlimited
	e.register(t)
	t.Cleanup(func() {
		e.owner.mu.Lock()
		defer e.owner.mu.Unlock()
		if e.callCount < n {
			t.Errorf("mock expectation %s %s (owner: %s): expected at least %d call(s), got %d",
				e.method, e.path, e.ownerToken, n, e.callCount)
		}
		e.owner.removeExpectation(e)
	})
	return e
}

// AnyTimes marks the expectation as optional and registers t.Cleanup.
func (e *Expectation) AnyTimes(t *testing.T) *Expectation {
	t.Helper()
	e.minTimes = 0
	e.maxTimes = -1 // unlimited
	e.register(t)
	t.Cleanup(func() {
		e.owner.mu.Lock()
		defer e.owner.mu.Unlock()
		e.owner.removeExpectation(e)
	})
	return e
}

// Return sets the HTTP status code and raw body bytes to respond with.
func (e *Expectation) Return(statusCode int, body []byte) *Expectation {
	e.statusCode = statusCode
	e.body = body
	return e
}

// ReturnJSON marshals v to JSON and sets Content-Type: application/json.
func (e *Expectation) ReturnJSON(statusCode int, v any) *Expectation {
	body, err := json.Marshal(v)
	if err != nil {
		panic(fmt.Sprintf("mocks: ReturnJSON marshal failed: %v", err))
	}
	e.statusCode = statusCode
	e.body = body
	e.contentType = "application/json"
	return e
}

// ReturnStatus sets only the status code with an empty body.
func (e *Expectation) ReturnStatus(statusCode int) *Expectation {
	e.statusCode = statusCode
	return e
}

// AssertBodyJSON registers an optional body-matcher.
func (e *Expectation) AssertBodyJSON(fn func(body []byte) error) *Expectation {
	e.bodyMatcher = fn
	return e
}

// register adds the expectation to the mock server's queue.
func (e *Expectation) register(t *testing.T) {
	t.Helper()
	key := e.method + " " + e.path
	e.owner.mu.Lock()
	defer e.owner.mu.Unlock()
	e.owner.queues[key] = append(e.owner.queues[key], e)
}

// removeExpectation removes e from its queue. Must be called with mu held.
func (m *MockServer) removeExpectation(e *Expectation) {
	key := e.method + " " + e.path
	queue := m.queues[key]
	newQueue := make([]*Expectation, 0, len(queue))
	for _, candidate := range queue {
		if candidate != e {
			newQueue = append(newQueue, candidate)
		}
	}
	m.queues[key] = newQueue
}

// DrainUnmatched reports any unmatched requests accumulated during a test.
// Called by testenv per-test cleanup for each mock server.
func (m *MockServer) DrainUnmatched(t *testing.T) {
	t.Helper()
	m.mu.Lock()
	unmatched := m.unmatched
	m.unmatched = nil
	m.mu.Unlock()

	for _, u := range unmatched {
		t.Errorf("mock server received unexpected request: %s %s", u.method, u.path)
	}
}

// Stop shuts down the mock server.
func (m *MockServer) Stop() {
	m.Server.Close()
}
