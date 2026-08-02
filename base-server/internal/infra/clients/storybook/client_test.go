package storybook

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"base-server/internal/infra/observability"
)

func TestClient_FetchIndex(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()

	tests := []struct {
		name       string
		statusCode int
		body       string
		wantErr    bool
		wantIndex  Index
	}{
		{
			name:       "well-formed index decodes successfully",
			statusCode: http.StatusOK,
			body:       `{"entries":{"primitives-button--default":{"id":"primitives-button--default","title":"Primitives/Button","name":"Default","importPath":"./src/proto-design-system/components/primitives/Button/Button.stories.tsx","type":"story"}}}`,
			wantIndex: Index{Entries: map[string]IndexEntry{
				"primitives-button--default": {ID: "primitives-button--default", Title: "Primitives/Button", Name: "Default", ImportPath: "./src/proto-design-system/components/primitives/Button/Button.stories.tsx", Type: "story"},
			}},
		},
		{
			name:       "non-2xx status returns error",
			statusCode: http.StatusNotFound,
			body:       "not found",
			wantErr:    true,
		},
		{
			name:       "malformed JSON body returns error",
			statusCode: http.StatusOK,
			body:       "not json{{{",
			wantErr:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				assert.Equal(t, "/index.json", r.URL.Path)
				w.WriteHeader(tt.statusCode)
				_, _ = w.Write([]byte(tt.body))
			}))
			defer server.Close()

			client := NewClient(logger)
			got, err := client.FetchIndex(context.Background(), server.URL)
			if tt.wantErr {
				require.Error(t, err)
				assert.Equal(t, Index{}, got)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.wantIndex, got)
		})
	}
}
