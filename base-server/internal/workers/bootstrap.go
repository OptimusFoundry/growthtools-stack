package workers

import (
	"context"
	"sync"

	"base-server/internal/infra/observability"
)

// Worker is an interface for background workers
type Worker interface {
	Start(ctx context.Context) error
	Name() string
}

// Manager manages all background workers
type Manager struct {
	workers []Worker
	logger  *observability.Logger
}

// NewManager creates a new worker manager
func NewManager(logger *observability.Logger) *Manager {
	return &Manager{
		logger: logger,
	}
}

// Register adds a worker to the manager
func (m *Manager) Register(w Worker) {
	m.workers = append(m.workers, w)
}

// StartAll starts all registered workers in goroutines
func (m *Manager) StartAll(ctx context.Context) {
	var wg sync.WaitGroup

	for _, w := range m.workers {
		wg.Add(1)
		go func(worker Worker) {
			defer wg.Done()
			m.logger.Info(ctx, "starting worker: "+worker.Name())
			if err := worker.Start(ctx); err != nil {
				m.logger.Error(ctx, "worker "+worker.Name()+" stopped with error", err)
			}
		}(w)
	}

	// Wait for context cancellation
	<-ctx.Done()
	m.logger.Info(ctx, "shutting down all workers")
}
