---
name: backend-kafka-rules
description: Use when writing, editing, testing, or reviewing event-driven code in base-server — any producer under internal/<feature>/producer/, any worker under internal/<feature>/worker/ or internal/workers/, and the bootstrap wiring that starts a consumer. Covers the five Kafka conventions — partition-key choice, context enrichment before logging, log-and-continue worker errors, context.Canceled on shutdown, and the four-part wiring a new event-driven feature needs.
---

# Kafka Producer & Worker Rules (base-server)

Five rules, one line each. Each carries a depth pointer — follow it when you need the rationale or
the worked example, not before. The code lives in the doc; this file is the checklist.

- **K-1** Partition key: set `EventMessage.PartitionKey` to the entity UUID when one entity's events
  must stay ordered; leave it unset to fall back to `AccountID`. Never both empty.
  → `base-server/docs/KAFKA_SETUP.md#producer--worker-conventions`
- **K-2** Enrich context with `event_type` (plus the relevant IDs) via `observability.WithFields`
  before the first log call — producer and worker alike.
  → `base-server/docs/KAFKA_SETUP.md#producer--worker-conventions`
- **K-3** Worker errors: log and continue. A malformed message logs and returns `nil`; never crash
  the consume loop on one bad event.
  → `base-server/docs/KAFKA_SETUP.md#producer--worker-conventions`
- **K-4** Check `errors.Is(err, context.Canceled)` when the worker stops via `ctx.Done()` — a clean
  shutdown must not log as a failure.
  → `base-server/docs/KAFKA_SETUP.md#producer--worker-conventions`
- **K-5** New feature wiring = `events/events.go` + `producer/producer.go` + `worker/worker.go` (own
  `FeatureProcessor` interface) + bootstrap init + start the consumer goroutine.
  → `base-server/docs/KAFKA_SETUP.md#producer--worker-conventions`

Cite the rule ID when you flag a violation — `K-1: per-job event published with no partition key` is
reviewable; "ordering problem" is not.
