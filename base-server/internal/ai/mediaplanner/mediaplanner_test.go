package mediaplanner_test

import (
	"context"
	"errors"
	"testing"

	"base-server/internal/ai/mediadescriber"
	"base-server/internal/ai/mediaplanner"
	"base-server/internal/infra/observability"

	"go.uber.org/mock/gomock"
)

func newLogger() *observability.Logger { return observability.NewLogger() }

func TestPlanner_SelectAndDecide_SingleWithMedia(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	mock := mediaplanner.NewMockAIClient(ctrl)
	mock.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return(`{"keep_indexes":[1],"mode":"single","thread_parts":0,"reason":"video shows the change"}`, nil)

	p := mediaplanner.New(mock, newLogger())
	req := mediaplanner.SelectRequest{
		CommitMessage: "feat: add new editor",
		Descriptions: []mediadescriber.Description{
			{Index: 1, Kind: mediadescriber.KindVideo, Usable: true, Description: "A video of the new editor"},
			{Index: 2, Kind: mediadescriber.KindImage, Usable: true, Description: "A screenshot"},
		},
	}
	d, err := p.SelectAndDecide(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if d.Mode != "single" {
		t.Fatalf("expected single, got %q", d.Mode)
	}
	if len(d.KeepIndexes) != 1 || d.KeepIndexes[0] != 1 {
		t.Fatalf("expected [1], got %v", d.KeepIndexes)
	}
}

func TestPlanner_SelectAndDecide_ThreadWithTwoParts(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	mock := mediaplanner.NewMockAIClient(ctrl)
	mock.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return(`{"keep_indexes":[1,2],"mode":"thread","thread_parts":2,"reason":"enough for two parts"}`, nil)

	p := mediaplanner.New(mock, newLogger())
	req := mediaplanner.SelectRequest{
		CommitMessage: "feat: big feature",
		Descriptions: []mediadescriber.Description{
			{Index: 1, Kind: mediadescriber.KindVideo, Usable: true, Description: "video"},
			{Index: 2, Kind: mediadescriber.KindImage, Usable: true, Description: "image"},
		},
	}
	d, err := p.SelectAndDecide(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if d.Mode != "thread" {
		t.Fatalf("expected thread, got %q", d.Mode)
	}
	if d.ThreadParts != 2 {
		t.Fatalf("expected 2 parts, got %d", d.ThreadParts)
	}
}

func TestPlanner_SelectAndDecide_ThreadPartsClampedTo3(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	mock := mediaplanner.NewMockAIClient(ctrl)
	mock.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return(`{"keep_indexes":[],"mode":"thread","thread_parts":10,"reason":"too many"}`, nil)

	p := mediaplanner.New(mock, newLogger())
	d, err := p.SelectAndDecide(context.Background(), mediaplanner.SelectRequest{CommitMessage: "x"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if d.ThreadParts != 3 {
		t.Fatalf("expected clamped to 3, got %d", d.ThreadParts)
	}
}

func TestPlanner_SelectAndDecide_InvalidIndexesDropped(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	mock := mediaplanner.NewMockAIClient(ctrl)
	mock.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return(`{"keep_indexes":[0,5,999],"mode":"single","thread_parts":0,"reason":"x"}`, nil)

	p := mediaplanner.New(mock, newLogger())
	req := mediaplanner.SelectRequest{
		CommitMessage: "x",
		Descriptions:  []mediadescriber.Description{{Index: 1, Usable: true}},
	}
	d, err := p.SelectAndDecide(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(d.KeepIndexes) != 0 {
		t.Fatalf("expected no valid indexes, got %v", d.KeepIndexes)
	}
}

func TestPlanner_SelectAndDecide_AIError(t *testing.T) {
	t.Parallel()
	ctrl := gomock.NewController(t)
	mock := mediaplanner.NewMockAIClient(ctrl)
	mock.EXPECT().CreateMessage(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return("", errors.New("timeout"))

	p := mediaplanner.New(mock, newLogger())
	_, err := p.SelectAndDecide(context.Background(), mediaplanner.SelectRequest{CommitMessage: "x"})
	if !errors.Is(err, mediaplanner.ErrSelectAndDecide) {
		t.Fatalf("expected ErrSelectAndDecide, got %v", err)
	}
}
