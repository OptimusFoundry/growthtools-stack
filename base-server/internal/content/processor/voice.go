package processor

import (
	"context"
	"errors"

	"base-server/internal/content/prompts"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// getVoiceContext fetches the account's voice profile and converts it to a VoiceContext.
// Returns nil if no profile is configured (graceful fallback).
func (p *ContentProcessor) getVoiceContext(ctx context.Context, accountID uuid.UUID) *prompts.VoiceContext {
	vp, err := p.store.GetVoiceProfileByAccount(ctx, accountID)
	if err != nil {
		if !errors.Is(err, store.ErrNotFound) {
			p.logger.Error(ctx, "failed to get voice profile", err)
		}
		return nil
	}

	voice := &prompts.VoiceContext{
		Tone:         vp.Tone,
		Style:        vp.Style,
		ExamplePosts: vp.ExamplePosts,
	}
	if vp.Industry != nil {
		voice.Industry = *vp.Industry
	}
	if vp.TargetAudience != nil {
		voice.TargetAudience = *vp.TargetAudience
	}
	if vp.CustomInstructions != nil {
		voice.CustomInstructions = *vp.CustomInstructions
	}

	return voice
}
