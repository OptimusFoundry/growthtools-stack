# Kafka Integration Patterns

Uses `github.com/segmentio/kafka-go`. Env vars: `KAFKA_BROKERS`, `KAFKA_TOPIC`, `KAFKA_CONSUMER_GROUP`.

## Event Type Definition

```go
// internal/{feature}/events/events.go
package events

const (
    EventPostCreated = "post.created"
    EventPostUpdated = "post.updated"
    EventPostDeleted = "post.deleted"
)

type PostEvent struct {
    EventType string        `json:"event_type"`
    Timestamp time.Time     `json:"timestamp"`
    Data      PostEventData `json:"data"`
}

type PostEventData struct {
    PostID    uuid.UUID `json:"post_id"`
    AccountID uuid.UUID `json:"account_id"`
    Action    string    `json:"action"`
}
```

## Producer

```go
// internal/{feature}/producer/producer.go
package producer

import (
    "context"
    "encoding/json"
    "time"

    "base-server/internal/{feature}/events"
    "base-server/internal/infra/observability"

    "github.com/segmentio/kafka-go"
)

type Producer struct {
    writer *kafka.Writer
    logger *observability.Logger
}

func New(brokers []string, topic string, logger *observability.Logger) *Producer {
    return &Producer{
        writer: &kafka.Writer{
            Addr:         kafka.TCP(brokers...),
            Topic:        topic,
            Balancer:     &kafka.LeastBytes{},
            RequiredAcks: kafka.RequireAll,
            Async:        false,
        },
        logger: logger,
    }
}

func (p *Producer) PublishPostCreated(ctx context.Context, postID, accountID uuid.UUID) error {
    return p.publish(ctx, events.PostEvent{
        EventType: events.EventPostCreated,
        Timestamp: time.Now().UTC(),
        Data:      events.PostEventData{PostID: postID, AccountID: accountID, Action: "created"},
    })
}

func (p *Producer) publish(ctx context.Context, event events.PostEvent) error {
    ctx = observability.WithFields(ctx, observability.Field{Key: "event_type", Value: event.EventType})

    payload, err := json.Marshal(event)
    if err != nil {
        p.logger.Error(ctx, "failed to marshal event", err)
        return err
    }

    if err := p.writer.WriteMessages(ctx, kafka.Message{
        Key:   []byte(event.Data.PostID.String()), // use entity ID as key for ordering
        Value: payload,
    }); err != nil {
        p.logger.Error(ctx, "failed to publish event", err)
        return err
    }

    p.logger.Info(ctx, "event published")
    return nil
}

func (p *Producer) Close() error { return p.writer.Close() }
```

## Consumer / Worker

```go
// internal/{feature}/worker/worker.go
package worker

import (
    "context"
    "encoding/json"

    "base-server/internal/{feature}/events"
    "base-server/internal/infra/observability"

    "github.com/segmentio/kafka-go"
)

type Worker struct {
    reader    *kafka.Reader
    processor FeatureProcessor // interface defined in this package
    logger    *observability.Logger
}

func New(brokers []string, topic, groupID string, processor FeatureProcessor, logger *observability.Logger) *Worker {
    return &Worker{
        reader: kafka.NewReader(kafka.ReaderConfig{
            Brokers:  brokers,
            Topic:    topic,
            GroupID:  groupID,
            MinBytes: 1,
            MaxBytes: 10e6,
        }),
        processor: processor,
        logger:    logger,
    }
}

func (w *Worker) Start(ctx context.Context) error {
    w.logger.Info(ctx, "worker starting")
    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        default:
            msg, err := w.reader.ReadMessage(ctx)
            if err != nil {
                w.logger.Error(ctx, "failed to read message", err)
                continue
            }
            if err := w.processMessage(ctx, msg); err != nil {
                w.logger.Error(ctx, "failed to process message", err)
                // consider dead-letter queue for persistent failures
            }
        }
    }
}

func (w *Worker) processMessage(ctx context.Context, msg kafka.Message) error {
    var event events.PostEvent
    if err := json.Unmarshal(msg.Value, &event); err != nil {
        return err
    }

    ctx = observability.WithFields(ctx,
        observability.Field{Key: "event_type", Value: event.EventType},
        observability.Field{Key: "post_id", Value: event.Data.PostID.String()},
    )

    switch event.EventType {
    case events.EventPostCreated:
        return w.processor.HandlePostCreated(ctx, event.Data)
    case events.EventPostUpdated:
        return w.processor.HandlePostUpdated(ctx, event.Data)
    default:
        w.logger.Warn(ctx, "unknown event type, skipping")
        return nil
    }
}

func (w *Worker) Stop() error { return w.reader.Close() }
```

## Bootstrap Integration

```go
// internal/infra/bootstrap/bootstrap.go

// Producer
postProducer := postproducer.New(cfg.KafkaBrokers, "post-events", logger)

// Worker
postWorker := postworker.New(
    cfg.KafkaBrokers,
    "post-events",
    "post-consumers",
    postProcessor,
    logger,
)

// Start worker in background goroutine
go func() {
    if err := postWorker.Start(ctx); err != nil && err != context.Canceled {
        logger.Error(ctx, "post worker stopped unexpectedly", err)
    }
}()
```

## Rules

- Use JSON for all message serialization
- Always include `event_type` and `timestamp` in event structs
- Use the entity UUID as the message key (ensures ordering per entity)
- Log with context enrichment at every step
- Handle consumer errors gracefully — log and continue, don't crash the worker
- Consider dead-letter queues for messages that fail processing repeatedly
