.PHONY: dev-up dev-down dev-run test-up test-down test \
       catalog-dry-run catalog-apply catalog-apply-prod

# =============================================================================
# LOCAL DEV STACK — run the local server against an isolated DB + Kafka.
# DB on host port 5432, Kafka on 9092. Compose lives at repo root since it
# also defines capture-worker.
# =============================================================================

dev-up:
	docker compose -f ../docker-compose.yml up -d --wait db kafka
	docker compose -f ../docker-compose.yml up flyway

dev-down:
	docker compose -f ../docker-compose.yml down -v

# Start base-server + Stripe webhook forwarder together via hivemind (Procfile).
# Install once: brew install hivemind.
dev-run:
	hivemind

# =============================================================================
# TEST STACK — run all tests against a separate isolated stack.
# DB on host port 5433, Kafka on 9192. Independent of the dev stack, so both
# can run simultaneously.
# =============================================================================

test-up:
	docker compose -f docker-compose.test.yml up -d --wait db kafka
	docker compose -f docker-compose.test.yml up flyway

test-down:
	docker compose -f docker-compose.test.yml down -v

# Run unit + store + integration tests against the isolated test stack.
# Brings the stack up, runs everything, tears it down. On failure the stack
# is left running so you can inspect it — clean up with `make test-down`.
test: test-up
	go test -race -short ./...
	TEST_DB_PORT=5433 go test -race ./internal/infra/store/...
	TEST_DB_PORT=5433 go test -v -race -tags=integration ./tests/...
	$(MAKE) test-down

# =============================================================================
# STRIPE CATALOG (operational — not part of local dev flow)
# =============================================================================

catalog-dry-run:
	go run ./cmd/catalog-sync --env=test --dry-run

catalog-apply:
	go run ./cmd/catalog-sync --env=test

# Requires caller to export prod DB_* and STRIPE_SECRET_KEY.
catalog-apply-prod:
	CONFIRM=prod go run ./cmd/catalog-sync --env=prod
