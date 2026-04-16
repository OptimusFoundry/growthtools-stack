package adapters

import (
	"errors"
	"fmt"
)

var ErrAdapterNotFound = errors.New("adapter not found for platform")

// AdapterRegistry maps platform names to their adapter instances.
type AdapterRegistry struct {
	adapters map[string]PlatformAdapter
}

// NewAdapterRegistry creates a new AdapterRegistry with the given adapters.
func NewAdapterRegistry(adapters map[string]PlatformAdapter) *AdapterRegistry {
	return &AdapterRegistry{
		adapters: adapters,
	}
}

// Get returns the adapter for the given platform name.
// Returns ErrAdapterNotFound if no adapter is registered for the platform.
func (r *AdapterRegistry) Get(platform string) (PlatformAdapter, error) {
	adapter, ok := r.adapters[platform]
	if !ok {
		return nil, fmt.Errorf("%w: %s", ErrAdapterNotFound, platform)
	}
	return adapter, nil
}

// Register adds or replaces an adapter for a platform.
func (r *AdapterRegistry) Register(platform string, adapter PlatformAdapter) {
	r.adapters[platform] = adapter
}

// Platforms returns the list of registered platform names.
func (r *AdapterRegistry) Platforms() []string {
	platforms := make([]string, 0, len(r.adapters))
	for p := range r.adapters {
		platforms = append(platforms, p)
	}
	return platforms
}

// GetAll returns a copy of all registered adapters.
func (r *AdapterRegistry) GetAll() map[string]PlatformAdapter {
	result := make(map[string]PlatformAdapter, len(r.adapters))
	for k, v := range r.adapters {
		result[k] = v
	}
	return result
}
