package kafka

import (
	"context"
	"fmt"

	"base-server/internal/infra/observability"

	kafkago "github.com/segmentio/kafka-go"
)

// MessageHandler processes a consumed Kafka message
type MessageHandler func(ctx context.Context, key, value []byte) error

// Consumer wraps a kafka-go reader for consuming messages
type Consumer struct {
	reader  *kafkago.Reader
	logger  *observability.Logger
	handler MessageHandler
	topic   string
}

// NewConsumer creates a new Kafka consumer for a specific topic
func NewConsumer(brokers, groupID, topic string, handler MessageHandler, logger *observability.Logger) *Consumer {
	reader := kafkago.NewReader(kafkago.ReaderConfig{
		Brokers:  []string{brokers},
		GroupID:  groupID,
		Topic:    topic,
		MinBytes: 1,
		MaxBytes: 10e6, // 10MB
	})

	return &Consumer{
		reader:  reader,
		logger:  logger,
		handler: handler,
		topic:   topic,
	}
}

// Start begins consuming messages in a loop until context is cancelled
func (c *Consumer) Start(ctx context.Context) error {
	c.logger.Info(ctx, fmt.Sprintf("starting consumer for topic %s", c.topic))

	for {
		select {
		case <-ctx.Done():
			c.logger.Info(ctx, fmt.Sprintf("stopping consumer for topic %s", c.topic))
			return c.reader.Close()
		default:
			msg, err := c.reader.FetchMessage(ctx)
			if err != nil {
				if ctx.Err() != nil {
					return nil // context cancelled
				}
				c.logger.Error(ctx, "failed to fetch kafka message", err)
				continue
			}

			if err := c.handler(ctx, msg.Key, msg.Value); err != nil {
				c.logger.Error(ctx, fmt.Sprintf("failed to process message from %s", c.topic), err)
				// Still commit the message to avoid reprocessing failures
			}

			if err := c.reader.CommitMessages(ctx, msg); err != nil {
				c.logger.Error(ctx, "failed to commit kafka message", err)
			}
		}
	}
}

// Close closes the consumer
func (c *Consumer) Close() error {
	return c.reader.Close()
}
