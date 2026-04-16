package store

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCreateVoiceProfile(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	industry := "SaaS"
	audience := "Solo founders"
	instructions := "Keep it casual and helpful"

	vp, err := s.CreateVoiceProfile(ctx, CreateVoiceProfileParams{
		AccountID:          accountID,
		Tone:               "professional",
		Style:              "concise",
		ExamplePosts:       StringArray{"Just shipped v2.0!", "Open sourced our CLI tool"},
		Industry:           &industry,
		TargetAudience:     &audience,
		CustomInstructions: &instructions,
	})
	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, vp.ID)
	assert.Equal(t, accountID, vp.AccountID)
	assert.Equal(t, "professional", vp.Tone)
	assert.Equal(t, "concise", vp.Style)
	assert.Equal(t, &industry, vp.Industry)
	assert.Equal(t, &audience, vp.TargetAudience)
	assert.Equal(t, &instructions, vp.CustomInstructions)
}

func TestGetVoiceProfileByAccount(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	// Not found before creation
	_, err := s.GetVoiceProfileByAccount(ctx, accountID)
	assert.ErrorIs(t, err, ErrNotFound)

	created, err := s.CreateVoiceProfile(ctx, CreateVoiceProfileParams{
		AccountID: accountID,
		Tone:      "casual",
		Style:     "storytelling",
	})
	require.NoError(t, err)

	got, err := s.GetVoiceProfileByAccount(ctx, accountID)
	require.NoError(t, err)
	assert.Equal(t, created.ID, got.ID)
	assert.Equal(t, "casual", got.Tone)
	assert.Equal(t, "storytelling", got.Style)

	// Not found for other account
	otherAccount := createTestAccount(t, s)
	_, err = s.GetVoiceProfileByAccount(ctx, otherAccount)
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestUpdateVoiceProfile(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	_, err := s.CreateVoiceProfile(ctx, CreateVoiceProfileParams{
		AccountID: accountID,
		Tone:      "formal",
		Style:     "academic",
	})
	require.NoError(t, err)

	newTone := "casual"
	newIndustry := "DevTools"
	updated, err := s.UpdateVoiceProfile(ctx, accountID, UpdateVoiceProfileParams{
		Tone:     &newTone,
		Industry: &newIndustry,
	})
	require.NoError(t, err)
	assert.Equal(t, "casual", updated.Tone)
	assert.Equal(t, "academic", updated.Style) // unchanged
	assert.Equal(t, &newIndustry, updated.Industry)

	// Not found for account without a profile
	otherAccount := createTestAccount(t, s)
	_, err = s.UpdateVoiceProfile(ctx, otherAccount, UpdateVoiceProfileParams{Tone: &newTone})
	assert.ErrorIs(t, err, ErrNotFound)
}
