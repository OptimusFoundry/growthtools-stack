package observability

import (
	"context"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// Logger represents a custom logger with Zap integration.
type Logger struct {
	zapLogger *zap.Logger
}

// NewLogger creates a new instance of custom logger.
func NewLogger() *Logger {
	zapLogger, _ := zap.NewProduction()
	zapLogger = zapLogger.WithOptions(zap.AddCallerSkip(1))
	zapLogger = zapLogger.WithOptions(zap.AddStacktrace(zapcore.ErrorLevel))
	return &Logger{zapLogger: zapLogger}
}

// loggerFromContext creates a logger with fields from context.
func (l *Logger) loggerFromContext(ctx context.Context) *zap.Logger {
	fields := getObservabilityFields(ctx)
	zapFields := make([]zapcore.Field, len(fields))

	for i, f := range fields {
		zapFields[i] = zap.Any(f.Key, f.Value)
	}

	return l.zapLogger.With(zapFields...)
}

// Info logs an informational message with context-based fields.
func (l *Logger) Info(ctx context.Context, msg string) {
	l.loggerFromContext(ctx).Info(msg)
}

// InfoWithError logs an informational message with context and an error.
func (l *Logger) InfoWithError(ctx context.Context, msg string, err error) {
	l.loggerFromContext(ctx).Info(msg, zap.Error(err))
}

// Error logs an error message with context-based fields.
func (l *Logger) Error(ctx context.Context, msg string, err error) {
	l.loggerFromContext(ctx).Error(msg, zap.Error(err))
}

// Warn logs a warning message with context-based fields.
func (l *Logger) Warn(ctx context.Context, msg string) {
	l.loggerFromContext(ctx).Warn(msg)
}

// Debug logs a debug message with context-based fields.
func (l *Logger) Debug(ctx context.Context, msg string) {
	l.loggerFromContext(ctx).Debug(msg)
}

// Fatal logs a fatal message with context-based fields.
func (l *Logger) Fatal(ctx context.Context, msg string, err error) {
	l.loggerFromContext(ctx).Fatal(msg, zap.Error(err))
}

// Metrics logs metrics-related information using custom MetricField type.
func (l *Logger) Metrics(ctx context.Context, fields ...MetricField) {
	merged := mergeFields(ctx, fields)
	// Log with correct stack depth and context.
	l.zapLogger.Info("Metrics", merged...)
}
