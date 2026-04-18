package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// AIConversation represents an AI chat conversation
type AIConversation struct {
	ID        uuid.UUID  `db:"id" json:"id"`
	AccountID uuid.UUID  `db:"account_id" json:"account_id"`
	Title     *string    `db:"title" json:"title,omitempty"`
	CreatedAt time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt time.Time  `db:"updated_at" json:"updated_at"`
	DeletedAt *time.Time `db:"deleted_at" json:"deleted_at,omitempty"`
}

// AIMessage represents a message in an AI conversation
type AIMessage struct {
	ID             uuid.UUID `db:"id" json:"id"`
	ConversationID uuid.UUID `db:"conversation_id" json:"conversation_id"`
	Role           string    `db:"role" json:"role"`
	Content        string    `db:"content" json:"content"`
	CreatedAt      time.Time `db:"created_at" json:"created_at"`
}

const sqlCreateAIConversation = `
INSERT INTO ai_conversations (account_id, title)
VALUES ($1, $2)
RETURNING id, account_id, title, created_at, updated_at, deleted_at
`

func (s *Store) CreateAIConversation(ctx context.Context, accountID uuid.UUID, title *string) (AIConversation, error) {
	var conv AIConversation
	err := s.db.GetContext(ctx, &conv, sqlCreateAIConversation, accountID, title)
	if err != nil {
		return AIConversation{}, fmt.Errorf("failed to create ai conversation: %w", err)
	}
	return conv, nil
}

const sqlGetAIConversationByID = `
SELECT id, account_id, title, created_at, updated_at, deleted_at
FROM ai_conversations
WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL
`

func (s *Store) GetAIConversationByID(ctx context.Context, accountID, id uuid.UUID) (AIConversation, error) {
	var conv AIConversation
	err := s.db.GetContext(ctx, &conv, sqlGetAIConversationByID, id, accountID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return AIConversation{}, ErrNotFound
		}
		return AIConversation{}, fmt.Errorf("failed to get ai conversation: %w", err)
	}
	return conv, nil
}

const sqlListAIConversations = `
SELECT id, account_id, title, created_at, updated_at, deleted_at
FROM ai_conversations
WHERE account_id = $1 AND deleted_at IS NULL
ORDER BY updated_at DESC
LIMIT $2 OFFSET $3
`

func (s *Store) ListAIConversations(ctx context.Context, accountID uuid.UUID, limit, offset int) ([]AIConversation, error) {
	if limit <= 0 {
		limit = 20
	}
	conversations := make([]AIConversation, 0)
	err := s.db.SelectContext(ctx, &conversations, sqlListAIConversations, accountID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list ai conversations: %w", err)
	}
	return conversations, nil
}

const sqlDeleteAIConversation = `
UPDATE ai_conversations
SET deleted_at = CURRENT_TIMESTAMP
WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL
`

func (s *Store) DeleteAIConversation(ctx context.Context, accountID, id uuid.UUID) error {
	res, err := s.db.ExecContext(ctx, sqlDeleteAIConversation, id, accountID)
	if err != nil {
		return fmt.Errorf("failed to delete ai conversation: %w", err)
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

const sqlUpdateAIConversationTitle = `
UPDATE ai_conversations
SET title = $3, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL
`

func (s *Store) UpdateAIConversationTitle(ctx context.Context, accountID, id uuid.UUID, title string) error {
	res, err := s.db.ExecContext(ctx, sqlUpdateAIConversationTitle, id, accountID, title)
	if err != nil {
		return fmt.Errorf("failed to update ai conversation title: %w", err)
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

// AI Messages

const sqlCreateAIMessage = `
INSERT INTO ai_messages (conversation_id, role, content)
VALUES ($1, $2, $3)
RETURNING id, conversation_id, role, content, created_at
`

func (s *Store) CreateAIMessage(ctx context.Context, conversationID uuid.UUID, role, content string) (AIMessage, error) {
	var msg AIMessage
	err := s.db.GetContext(ctx, &msg, sqlCreateAIMessage, conversationID, role, content)
	if err != nil {
		return AIMessage{}, fmt.Errorf("failed to create ai message: %w", err)
	}
	return msg, nil
}

const sqlGetAIMessagesByConversation = `
SELECT id, conversation_id, role, content, created_at
FROM ai_messages
WHERE conversation_id = $1
ORDER BY created_at ASC
`

func (s *Store) GetAIMessagesByConversation(ctx context.Context, conversationID uuid.UUID) ([]AIMessage, error) {
	messages := make([]AIMessage, 0)
	err := s.db.SelectContext(ctx, &messages, sqlGetAIMessagesByConversation, conversationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get ai messages: %w", err)
	}
	return messages, nil
}
