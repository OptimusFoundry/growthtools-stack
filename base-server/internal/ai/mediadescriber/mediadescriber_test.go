package mediadescriber

import (
	"context"
	"errors"
	"testing"

	"base-server/internal/infra/observability"

	"go.uber.org/mock/gomock"
)

func newLogger() *observability.Logger { return observability.NewLogger() }

func TestDescriber_Describe_ImageHappyPath(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	mockAI := NewMockAIClient(ctrl)
	mockAI.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return("A screenshot showing the new editor UI.", nil)

	d := New(mockAI, newLogger())
	desc, err := d.Describe(context.Background(), Media{
		Index: 1, Kind: KindImage, MIMEType: "image/png", Data: []byte("fake"),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !desc.Usable {
		t.Fatalf("expected Usable=true, got issue=%q", desc.Issue)
	}
	if desc.Description != "A screenshot showing the new editor UI." {
		t.Fatalf("unexpected description: %q", desc.Description)
	}
}

func TestDescriber_Describe_VideoUnusable(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	mockAI := NewMockAIClient(ctrl)
	mockAI.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return("UNUSABLE: blank loading screen", nil)

	d := New(mockAI, newLogger())
	desc, err := d.Describe(context.Background(), Media{
		Index: 1, Kind: KindVideo, MIMEType: "video/mp4", Data: []byte("fake"),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if desc.Usable {
		t.Fatal("expected Usable=false for blank video")
	}
	if desc.Issue == "" {
		t.Fatal("expected Issue to be populated")
	}
}

func TestDescriber_Describe_AIError_FailSoft(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	mockAI := NewMockAIClient(ctrl)
	mockAI.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return("", errors.New("provider timeout"))

	d := New(mockAI, newLogger())
	desc, err := d.Describe(context.Background(), Media{
		Index: 2, Kind: KindImage, MIMEType: "image/jpeg", Data: []byte("x"),
	})
	// Describe is fail-soft: no error returned to caller
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if desc.Usable {
		t.Fatal("expected Usable=false on AI error")
	}
	if desc.Index != 2 {
		t.Fatalf("expected index preserved, got %d", desc.Index)
	}
}

func TestDescriber_DescribeBatch_PreservesOrder(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	mockAI := NewMockAIClient(ctrl)
	mockAI.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return("desc A", nil).Times(1)
	mockAI.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return("desc B", nil).Times(1)

	d := New(mockAI, newLogger())
	items := []Media{
		{Index: 1, Kind: KindImage, MIMEType: "image/png", Data: []byte("a")},
		{Index: 2, Kind: KindImage, MIMEType: "image/jpeg", Data: []byte("b")},
	}
	results := d.DescribeBatch(context.Background(), items)
	if len(results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(results))
	}
	if results[0].Index != 1 || results[1].Index != 2 {
		t.Fatalf("order not preserved: [%d, %d]", results[0].Index, results[1].Index)
	}
}

func TestDescriber_DescribeBatch_EmptyInput(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	mockAI := NewMockAIClient(ctrl)
	d := New(mockAI, newLogger())
	results := d.DescribeBatch(context.Background(), nil)
	if len(results) != 0 {
		t.Fatalf("expected empty slice, got %d", len(results))
	}
}
