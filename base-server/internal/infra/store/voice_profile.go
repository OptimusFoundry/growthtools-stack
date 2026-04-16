package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"
)

// CreateVoiceProfileParams represents parameters for creating a voice profile
type CreateVoiceProfileParams struct {
	AccountID          uuid.UUID
	Tone               string
	Style              string
	ExamplePosts       StringArray
	Industry           *string
	TargetAudience     *string
	CustomInstructions *string
}

const sqlCreateVoiceProfile = `
INSERT INTO voice_profiles (account_id, tone, style, example_posts, industry, target_audience, custom_instructions)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, account_id, tone, style, example_posts, industry, target_audience, custom_instructions, created_at, updated_at
`

func (s *Store) CreateVoiceProfile(ctx context.Context, params CreateVoiceProfileParams) (VoiceProfile, error) {
	var vp VoiceProfile
	err := s.db.GetContext(ctx, &vp, sqlCreateVoiceProfile,
		params.AccountID, params.Tone, params.Style, params.ExamplePosts,
		params.Industry, params.TargetAudience, params.CustomInstructions)
	if err != nil {
		return VoiceProfile{}, fmt.Errorf("failed to create voice profile: %w", err)
	}
	return vp, nil
}

const sqlGetVoiceProfileByAccount = `
SELECT id, account_id, tone, style, example_posts, industry, target_audience, custom_instructions, created_at, updated_at
FROM voice_profiles
WHERE account_id = $1
`

func (s *Store) GetVoiceProfileByAccount(ctx context.Context, accountID uuid.UUID) (VoiceProfile, error) {
	var vp VoiceProfile
	err := s.db.GetContext(ctx, &vp, sqlGetVoiceProfileByAccount, accountID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return VoiceProfile{}, ErrNotFound
		}
		return VoiceProfile{}, fmt.Errorf("failed to get voice profile: %w", err)
	}
	return vp, nil
}

// UpdateVoiceProfileParams represents parameters for updating a voice profile
type UpdateVoiceProfileParams struct {
	Tone               *string
	Style              *string
	ExamplePosts       StringArray
	Industry           *string
	TargetAudience     *string
	CustomInstructions *string
}

const sqlUpdateVoiceProfile = `
UPDATE voice_profiles
SET tone = COALESCE($2, tone),
    style = COALESCE($3, style),
    example_posts = COALESCE($4, example_posts),
    industry = COALESCE($5, industry),
    target_audience = COALESCE($6, target_audience),
    custom_instructions = COALESCE($7, custom_instructions),
    updated_at = CURRENT_TIMESTAMP
WHERE account_id = $1
RETURNING id, account_id, tone, style, example_posts, industry, target_audience, custom_instructions, created_at, updated_at
`

func (s *Store) UpdateVoiceProfile(ctx context.Context, accountID uuid.UUID, params UpdateVoiceProfileParams) (VoiceProfile, error) {
	var vp VoiceProfile
	err := s.db.GetContext(ctx, &vp, sqlUpdateVoiceProfile,
		accountID, params.Tone, params.Style, params.ExamplePosts,
		params.Industry, params.TargetAudience, params.CustomInstructions)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return VoiceProfile{}, ErrNotFound
		}
		return VoiceProfile{}, fmt.Errorf("failed to update voice profile: %w", err)
	}
	return vp, nil
}
