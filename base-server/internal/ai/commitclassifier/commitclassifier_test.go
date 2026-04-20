package commitclassifier

import (
	"context"
	"errors"
	"strings"
	"testing"

	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"

	"go.uber.org/mock/gomock"
)

func newLogger() *observability.Logger { return observability.NewLogger() }

func TestClassifier_Classify_Worthwhile(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	mock := NewMockAIClient(ctrl)
	mock.EXPECT().CreateJSONMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return(`{"worthwhile":true,"reason":"adds new /pricing page"}`, nil)

	c := New(mock, newLogger())
	v, err := c.Classify(context.Background(), "feat: add pricing page", "--- diff ---")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !v.Worthwhile {
		t.Fatal("expected Worthwhile=true")
	}
	if v.Reason != "adds new /pricing page" {
		t.Fatalf("unexpected reason: %q", v.Reason)
	}
}

func TestClassifier_Classify_NotWorthwhile(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	mock := NewMockAIClient(ctrl)
	mock.EXPECT().CreateJSONMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return(`{"worthwhile":false,"reason":"test-only change"}`, nil)

	c := New(mock, newLogger())
	v, err := c.Classify(context.Background(), "test: add unit tests", "--- diff ---")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if v.Worthwhile {
		t.Fatal("expected Worthwhile=false")
	}
}

func TestClassifier_Classify_EmptyResponse_FailOpen(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	mock := NewMockAIClient(ctrl)
	mock.EXPECT().CreateJSONMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return("", nil)

	c := New(mock, newLogger())
	v, err := c.Classify(context.Background(), "feat: something", "diff")
	if err != nil {
		t.Fatalf("expected nil error on empty response fail-open, got %v", err)
	}
	if !v.Worthwhile {
		t.Fatal("expected fail-open Worthwhile=true on empty response")
	}
}

func TestClassifier_Classify_AIError_ReturnsErrClassify(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	mock := NewMockAIClient(ctrl)
	mock.EXPECT().CreateJSONMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return("", errors.New("provider error"))

	c := New(mock, newLogger())
	_, err := c.Classify(context.Background(), "feat: something", "diff")
	if !errors.Is(err, ErrClassify) {
		t.Fatalf("expected ErrClassify, got %v", err)
	}
}

func TestClassifier_Classify_DiffTruncatedAt40k(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	mock := NewMockAIClient(ctrl)

	var captured string
	mock.EXPECT().CreateJSONMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		DoAndReturn(func(_ context.Context, _ string, msgs []aiclient.Message, _ int) (string, error) {
			captured = msgs[0].Content
			return `{"worthwhile":true,"reason":"ok"}`, nil
		})

	longDiff := strings.Repeat("x", 50_000)
	c := New(mock, newLogger())
	_, _ = c.Classify(context.Background(), "feat: x", longDiff)

	if !strings.Contains(captured, "… [truncated]") {
		t.Fatal("expected truncation marker in AI message")
	}
}
