package store

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCreateAIConversation(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	title := "Help me write a tweet"
	conv, err := s.CreateAIConversation(ctx, accountID, &title)
	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, conv.ID)
	assert.Equal(t, accountID, conv.AccountID)
	assert.Equal(t, &title, conv.Title)
	assert.Nil(t, conv.DeletedAt)

	// Create without title
	conv2, err := s.CreateAIConversation(ctx, accountID, nil)
	require.NoError(t, err)
	assert.Nil(t, conv2.Title)
}

func TestGetAIConversationByID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	title := "Test conversation"
	created, err := s.CreateAIConversation(ctx, accountID, &title)
	require.NoError(t, err)

	got, err := s.GetAIConversationByID(ctx, accountID, created.ID)
	require.NoError(t, err)
	assert.Equal(t, created.ID, got.ID)
	assert.Equal(t, &title, got.Title)

	// Not found - wrong ID
	_, err = s.GetAIConversationByID(ctx, accountID, uuid.New())
	assert.ErrorIs(t, err, ErrNotFound)

	// Not found - wrong account
	_, err = s.GetAIConversationByID(ctx, uuid.New(), created.ID)
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestListAIConversations(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	for i := 0; i < 3; i++ {
		title := "Conversation " + uuid.New().String()[:8]
		_, err := s.CreateAIConversation(ctx, accountID, &title)
		require.NoError(t, err)
	}

	conversations, err := s.ListAIConversations(ctx, accountID, 10, 0)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(conversations), 3)

	// Pagination
	conversations, err = s.ListAIConversations(ctx, accountID, 2, 0)
	require.NoError(t, err)
	assert.Equal(t, 2, len(conversations))

	// Empty for other account
	other := createTestAccount(t, s)
	conversations, err = s.ListAIConversations(ctx, other, 10, 0)
	require.NoError(t, err)
	assert.Empty(t, conversations)
}

func TestDeleteAIConversation(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	title := "To be deleted"
	created, err := s.CreateAIConversation(ctx, accountID, &title)
	require.NoError(t, err)

	err = s.DeleteAIConversation(ctx, accountID, created.ID)
	require.NoError(t, err)

	// Should not be found
	_, err = s.GetAIConversationByID(ctx, accountID, created.ID)
	assert.ErrorIs(t, err, ErrNotFound)

	// Double delete
	err = s.DeleteAIConversation(ctx, accountID, created.ID)
	assert.ErrorIs(t, err, ErrNotFound)

	// Non-existent
	err = s.DeleteAIConversation(ctx, accountID, uuid.New())
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestUpdateAIConversationTitle(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	title := "Original title"
	created, err := s.CreateAIConversation(ctx, accountID, &title)
	require.NoError(t, err)

	err = s.UpdateAIConversationTitle(ctx, accountID, created.ID, "Updated title")
	require.NoError(t, err)

	got, err := s.GetAIConversationByID(ctx, accountID, created.ID)
	require.NoError(t, err)
	assert.Equal(t, "Updated title", *got.Title)

	// Not found
	err = s.UpdateAIConversationTitle(ctx, accountID, uuid.New(), "New title")
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestCreateAIMessage(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	conv, err := s.CreateAIConversation(ctx, accountID, nil)
	require.NoError(t, err)

	msg, err := s.CreateAIMessage(ctx, conv.ID, "user", "Help me write a post about Go testing")
	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, msg.ID)
	assert.Equal(t, conv.ID, msg.ConversationID)
	assert.Equal(t, "user", msg.Role)
	assert.Equal(t, "Help me write a post about Go testing", msg.Content)

	// Create assistant response
	msg2, err := s.CreateAIMessage(ctx, conv.ID, "assistant", "Here is a draft post about Go testing...")
	require.NoError(t, err)
	assert.Equal(t, "assistant", msg2.Role)
}

func TestGetAIMessagesByConversation(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	conv, err := s.CreateAIConversation(ctx, accountID, nil)
	require.NoError(t, err)

	// Create a sequence of messages
	_, err = s.CreateAIMessage(ctx, conv.ID, "user", "Message 1")
	require.NoError(t, err)
	_, err = s.CreateAIMessage(ctx, conv.ID, "assistant", "Response 1")
	require.NoError(t, err)
	_, err = s.CreateAIMessage(ctx, conv.ID, "user", "Message 2")
	require.NoError(t, err)

	messages, err := s.GetAIMessagesByConversation(ctx, conv.ID)
	require.NoError(t, err)
	assert.Equal(t, 3, len(messages))
	// Verify order (ASC by created_at)
	assert.Equal(t, "user", messages[0].Role)
	assert.Equal(t, "Message 1", messages[0].Content)
	assert.Equal(t, "assistant", messages[1].Role)
	assert.Equal(t, "user", messages[2].Role)

	// Empty for non-existent conversation
	messages, err = s.GetAIMessagesByConversation(ctx, uuid.New())
	require.NoError(t, err)
	assert.Empty(t, messages)
}
