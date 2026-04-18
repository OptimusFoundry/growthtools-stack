package observability

import (
	"context"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Middleware adds observability fields to Gin context and handles panics.
func Middleware(l *Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Create an initial context with some observability fields.
		ctx := context.Background()
		requestID := c.Request.Header.Get("X-Request-ID")
		if requestID == "" {
			requestID = fmt.Sprintf("req-%s", uuid.New().String())
			c.Request.Header.Set("X-Request-ID", requestID)
		}
		// Add request ID to response headers
		c.Writer.Header().Set("X-Request-ID", requestID)

		ctx = WithFields(ctx,
			Field{"request_id", requestID},
			Field{"path", c.Request.URL.Path},
			Field{"method", c.Request.Method},
			Field{"client_ip", GetRealClientIP(c)},
			Field{"user_agent", GetRealUserAgent(c)},
		)

		// Add content length if present
		if c.Request.ContentLength > 0 {
			ctx = WithFields(ctx, Field{"content_length", c.Request.ContentLength})
		}

		// Add query parameters if present (be careful not to log sensitive data)
		if len(c.Request.URL.RawQuery) > 0 {
			ctx = WithFields(ctx, Field{"query_params", c.Request.URL.RawQuery})
		}

		// Store the context in Gin context for later use.
		c.Request = c.Request.WithContext(ctx)

		// Process the request.
		start := time.Now()
		// Capture any panic and handle it.
		defer func() {
			if r := recover(); r != nil {
				// Handle the panic and log the error.
				l.Error(c.Request.Context(), "Recovered from panic", fmt.Errorf("reason: %+v", r))
				c.AbortWithStatus(500) // Respond with a 500 error.
			}

			// Skip additional logging for health check endpoint.
			if c.Request.URL.Path == "/health" {
				return
			}
			// Calculate the request latency.
			latency := time.Since(start)
			// Additional logging after request processing.
			ctx = WithFields(ctx, Field{"latency_ns", latency.Nanoseconds()})
			l.Info(ctx, "Request processed")

			// Emit additional metrics or logging.
			// For example, you could log the request method, status, and latency.
			status := c.Writer.Status() // Get the response status code.
			l.Metrics(c.Request.Context(),
				MetricField{"method", c.Request.Method},
				MetricField{"path", c.Request.URL.Path},
				MetricField{"status", status},
				MetricField{"latency", latency},
				MetricField{"request_id", c.Request.Header.Get("X-Request-ID")},
			)
		}()
		c.Next() // Proceed with request handling.
	}
}
