package platforms_test

import (
	"testing"

	"base-server/internal/ai/platforms"
)

func TestGet_KnownPlatform(t *testing.T) {
	t.Parallel()
	c := platforms.Get("x")
	if c.CharLimit != 280 {
		t.Fatalf("expected 280, got %d", c.CharLimit)
	}
	if !c.SupportsThreads {
		t.Fatal("expected x to support threads")
	}
}

func TestGet_CaseInsensitive(t *testing.T) {
	t.Parallel()
	c := platforms.Get("LinkedIn")
	if c.ID != "linkedin" {
		t.Fatalf("expected id 'linkedin', got %q", c.ID)
	}
}

func TestGet_UnknownPlatform_DefaultsToSensibleValues(t *testing.T) {
	t.Parallel()
	c := platforms.Get("newplatform")
	if c.CharLimit == 0 {
		t.Fatal("expected non-zero default char limit")
	}
	if c.ID != "newplatform" {
		t.Fatalf("expected id 'newplatform', got %q", c.ID)
	}
}

func TestAll_ReturnAllEightPlatforms(t *testing.T) {
	t.Parallel()
	all := platforms.All()
	if len(all) != 8 {
		t.Fatalf("expected 8 platforms, got %d", len(all))
	}
}

func TestAll_DeterministicOrder(t *testing.T) {
	t.Parallel()
	first := platforms.All()
	second := platforms.All()
	for i := range first {
		if first[i].ID != second[i].ID {
			t.Fatalf("order not deterministic at index %d: %q vs %q", i, first[i].ID, second[i].ID)
		}
	}
}
