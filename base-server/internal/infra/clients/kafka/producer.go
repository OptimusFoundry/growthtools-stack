package kafka

import (
	"context"
	"encoding/json"
	"fmt"

	"base-server/internal/infra/observability"

	kafkago "github.com/segmentio/kafka-go"
)

// Producer wraps a kafka-go writer for publishing messages
type Producer struct {
	writer *kafkago.Writer
	logger *observability.Logger
}

// NewProducer creates a new Kafka producer
func NewProducer(brokers string, logger *observability.Logger) *Producer {
	writer := &kafkago.Writer{
		Addr:         kafkago.TCP(brokers),
		Balancer:     &kafkago.LeastBytes{},
		RequiredAcks: kafkago.RequireOne,
	}

	return &Producer{
		writer: writer,
		logger: logger,
	}
}

// Publish sends a message to the specified topic
func (p *Producer) Publish(ctx context.Context, topic, key string, payload any) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal kafka message: %w", err)
	}

	msg := kafkago.Message{
		Topic: topic,
		Key:   []byte(key),
		Value: data,
	}

	if err := p.writer.WriteMessages(ctx, msg); err != nil {
		p.logger.Error(ctx, "failed to publish kafka message", err)
		return fmt.Errorf("failed to publish to %s: %w", topic, err)
	}

	p.logger.Info(ctx, fmt.Sprintf("published message to %s with key %s", topic, key))
	return nil
}

// Close closes the producer
func (p *Producer) Close() error {
	return p.writer.Close()
}
