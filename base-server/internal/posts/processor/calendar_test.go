package processor

import (
	"context"
	"errors"
	"testing"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

func TestGetCalendarMonth_Happy(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	ctrl := gomock.NewController(t)
	mockStore := NewMockPostStore(ctrl)
	mockPublisher := NewMockEventPublisher(ctrl)

	statusRows := []store.CalendarStatusRow{
		{Day: "2026-04-05", StatusDraft: 1, StatusScheduled: 2},
		{Day: "2026-04-15", StatusPublished: 3},
	}
	platformRows := []store.CalendarPlatformRow{
		{Day: "2026-04-05", Platform: store.PlatformX, Count: 2},
		{Day: "2026-04-05", Platform: store.PlatformLinkedIn, Count: 1},
		{Day: "2026-04-15", Platform: store.PlatformBlueSky, Count: 3},
	}

	mockStore.EXPECT().GetCalendarStatusCounts(gomock.Any(), store.CalendarParams{
		AccountID: accountID,
		Year:      2026,
		Month:     4,
	}).Return(statusRows, nil)

	mockStore.EXPECT().GetCalendarPlatformCounts(gomock.Any(), store.CalendarParams{
		AccountID: accountID,
		Year:      2026,
		Month:     4,
	}).Return(platformRows, nil)

	proc := New(mockStore, mockPublisher, logger)
	result, err := proc.GetCalendarMonth(context.Background(), accountID, 2026, 4)

	require.NoError(t, err)
	assert.Equal(t, "2026-04", result.Month)
	assert.Len(t, result.Days, 2)

	// Sorted by date.
	assert.Equal(t, "2026-04-05", result.Days[0].Date)
	assert.Equal(t, 1, result.Days[0].ByStatus.Draft)
	assert.Equal(t, 2, result.Days[0].ByStatus.Scheduled)
	assert.Equal(t, 2, result.Days[0].ByPlatform.X)
	assert.Equal(t, 1, result.Days[0].ByPlatform.LinkedIn)

	assert.Equal(t, "2026-04-15", result.Days[1].Date)
	assert.Equal(t, 3, result.Days[1].ByStatus.Published)
	assert.Equal(t, 3, result.Days[1].ByPlatform.BlueSky)

	// Month totals.
	assert.Equal(t, 1, result.MonthTotals.ByStatus.Draft)
	assert.Equal(t, 2, result.MonthTotals.ByStatus.Scheduled)
	assert.Equal(t, 3, result.MonthTotals.ByStatus.Published)
	assert.Equal(t, 2, result.MonthTotals.ByPlatform.X)
	assert.Equal(t, 1, result.MonthTotals.ByPlatform.LinkedIn)
	assert.Equal(t, 3, result.MonthTotals.ByPlatform.BlueSky)
}

func TestGetCalendarMonth_InvalidYear(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	ctrl := gomock.NewController(t)
	mockStore := NewMockPostStore(ctrl)
	// Store methods must NOT be called for invalid params.
	mockPublisher := NewMockEventPublisher(ctrl)

	proc := New(mockStore, mockPublisher, logger)
	_, err := proc.GetCalendarMonth(context.Background(), accountID, 1900, 1)

	require.Error(t, err)
	assert.ErrorIs(t, err, ErrInvalidCalendarParams)
}

func TestGetCalendarMonth_InvalidMonth(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	ctrl := gomock.NewController(t)
	mockStore := NewMockPostStore(ctrl)
	mockPublisher := NewMockEventPublisher(ctrl)

	proc := New(mockStore, mockPublisher, logger)
	_, err := proc.GetCalendarMonth(context.Background(), accountID, 2026, 13)

	require.Error(t, err)
	assert.ErrorIs(t, err, ErrInvalidCalendarParams)
}

func TestGetCalendarMonth_StoreError_Status(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	ctrl := gomock.NewController(t)
	mockStore := NewMockPostStore(ctrl)
	mockPublisher := NewMockEventPublisher(ctrl)

	mockStore.EXPECT().GetCalendarStatusCounts(gomock.Any(), gomock.Any()).
		Return(nil, errors.New("db error"))

	proc := New(mockStore, mockPublisher, logger)
	_, err := proc.GetCalendarMonth(context.Background(), accountID, 2026, 4)

	require.Error(t, err)
	assert.ErrorIs(t, err, ErrInvalidCalendarParams)
}

func TestGetCalendarMonth_EmptyMonth(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	ctrl := gomock.NewController(t)
	mockStore := NewMockPostStore(ctrl)
	mockPublisher := NewMockEventPublisher(ctrl)

	mockStore.EXPECT().GetCalendarStatusCounts(gomock.Any(), gomock.Any()).
		Return([]store.CalendarStatusRow{}, nil)
	mockStore.EXPECT().GetCalendarPlatformCounts(gomock.Any(), gomock.Any()).
		Return([]store.CalendarPlatformRow{}, nil)

	proc := New(mockStore, mockPublisher, logger)
	result, err := proc.GetCalendarMonth(context.Background(), accountID, 2026, 4)

	require.NoError(t, err)
	assert.Equal(t, "2026-04", result.Month)
	assert.Empty(t, result.Days)
	assert.Equal(t, StatusBreakdown{}, result.MonthTotals.ByStatus)
	assert.Equal(t, PlatformBreakdown{}, result.MonthTotals.ByPlatform)
}
