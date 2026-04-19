package server

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	apisetup "base-server/internal/infra/api"
	"base-server/internal/infra/bootstrap"
	"base-server/internal/infra/config"
	"base-server/internal/infra/observability"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// Server encapsulates the HTTP server and its dependencies
type Server struct {
	httpServer *http.Server
	router     *gin.Engine
	deps       *bootstrap.Dependencies
	config     *config.Config
	logger     *observability.Logger
}

// New creates a new Server instance
func New(cfg *config.Config, deps *bootstrap.Dependencies, logger *observability.Logger) *Server {
	return &Server{
		config: cfg,
		deps:   deps,
		logger: logger,
	}
}

// Setup configures the HTTP router with middleware and routes
func (s *Server) Setup() {
	s.router = gin.New()

	// Configure CORS
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowCredentials = true
	corsConfig.AllowMethods = []string{"GET", "PUT", "PATCH", "POST", "OPTIONS", "DELETE"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Last-Event-ID", "Cache-Control", "Connection", "Accept", "Transfer-Encoding"}
	corsConfig.AllowOrigins = []string{s.config.Services.WebAppURI}

	// Allow localhost in non-production
	if os.Getenv("GO_ENV") != "production" {
		corsConfig.AllowOrigins = []string{"http://localhost:3000", "https://accounts.google.com"}
	}

	// Apply middleware
	s.router.Use(cors.New(corsConfig))
	s.router.Use(observability.Middleware(s.logger))

	// Register routes
	rootRouter := s.router.Group("/")
	api := apisetup.New(
		rootRouter,
		s.deps.AdminHandler,
		s.deps.AuthHandler,
		s.deps.BillingHandler,
		s.deps.ContentHandler,
		s.deps.ChatHandler,
		s.deps.PlatformsHandler,
		s.deps.PostsHandler,
		s.deps.MediaHandler,
		s.deps.GitHubHandler,
		s.deps.BlogHandler,
		s.deps.AnalyticsHandler,
		s.deps.SettingsHandler,
	)
	api.RegisterRoutes()

	// Handle 404 for unmatched routes
	s.router.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "The requested resource was not found",
			"code":  "NOT_FOUND",
		})
	})
}

// Router exposes the configured gin engine as an http.Handler so tests
// can drive the real router via httptest.NewServer without starting the
// production HTTP listener. Must be called after Setup().
func (s *Server) Router() http.Handler {
	return s.router
}

// Start begins listening for HTTP requests and background workers
func (s *Server) Start(ctx context.Context) error {
	// Start background workers
	if s.deps.WorkerManager != nil {
		go s.deps.WorkerManager.StartAll(ctx)
		s.logger.Info(ctx, "Worker manager started")
	}

	// Create HTTP server
	s.httpServer = &http.Server{
		Addr:    fmt.Sprintf(":%d", s.config.Server.Port),
		Handler: s.router,
	}

	// Run the server in a goroutine so that it doesn't block
	go func() {
		s.logger.Info(ctx, fmt.Sprintf("Server starting on port %d", s.config.Server.Port))
		if err := s.httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			s.logger.Error(ctx, "server failed to start", err)
			os.Exit(1)
		}
	}()

	return nil
}

// WaitForShutdown blocks until a shutdown signal is received, then gracefully shuts down
func (s *Server) WaitForShutdown(ctx context.Context) error {
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// Block until a signal is received
	<-quit
	s.logger.Info(ctx, "Shutting down server...")

	// The context is used to inform the server it has 5 seconds to finish
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := s.httpServer.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("server forced to shutdown: %w", err)
	}

	// Cleanup dependencies
	s.deps.Cleanup()

	s.logger.Info(ctx, "Server exited gracefully")
	return nil
}
