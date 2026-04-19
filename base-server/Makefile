.PHONY: dev-up dev-down dev-test-unit dev-test-store dev-test-integration \
       docker-up docker-down docker-test-integration docker-test-all help

# =============================================================================
# LOCAL DEVELOPMENT (uses local DB — may pollute your database)
# =============================================================================

# Start local services (database, kafka, migrations). Compose lives at repo
# root since it also defines capture-worker.
dev-up:
	@echo "Starting local dev services..."
	docker compose -f ../docker-compose.yml up -d --wait db kafka
	docker compose -f ../docker-compose.yml up flyway
	@echo "Local services ready!"

# Stop local services
dev-down:
	@echo "Stopping local dev services..."
	docker compose -f ../docker-compose.yml down -v
	@echo "Local services stopped!"

# Run unit tests locally (mocked — no DB needed)
dev-test-unit:
	@echo "Running unit tests locally..."
	go test -short ./internal/.../processor/... ./internal/.../service/...

# Run store tests locally (requires dev-up first)
dev-test-store:
	@echo "Running store tests locally..."
	go test -race ./internal/infra/store/...

# Run integration tests locally (requires dev-up; server is in-process)
dev-test-integration:
	@echo "Running integration tests locally (in-process server)..."
	go test -v -race -tags=integration ./tests/...

# =============================================================================
# ISOLATED DOCKER TESTING (uses separate test DB — won't pollute local)
# =============================================================================

# Start isolated Docker test environment (DB + Kafka + migrations only; no server)
docker-up:
	@echo "Starting test infrastructure (DB, Kafka, migrations)..."
	docker compose -f docker-compose.test.yml up -d --wait db kafka
	docker compose -f docker-compose.test.yml up flyway
	@echo "Test infrastructure ready!"

# Stop isolated Docker test environment
docker-down:
	@echo "Stopping test infrastructure..."
	docker compose -f docker-compose.test.yml down -v
	@echo "Done."

# Run integration tests against the in-process server (requires docker-up first)
docker-test-integration:
	@echo "Running integration tests (in-process server)..."
	go test -v -race -tags=integration ./tests/...

# Run all tests (unit + store + integration) after docker-up
docker-test-all:
	@$(MAKE) docker-up
	@echo ""
	@echo ">>> Running unit tests..."
	@$(MAKE) dev-test-unit
	@echo ""
	@echo ">>> Running store tests..."
	@$(MAKE) dev-test-store
	@echo ""
	@echo ">>> Running integration tests..."
	@$(MAKE) docker-test-integration
	@echo ""
	@$(MAKE) docker-down

# =============================================================================
# HELP
# =============================================================================

help:
	@echo "Available commands:"
	@echo ""
	@echo "LOCAL DEVELOPMENT (uses local DB on port 5432):"
	@echo "  make dev-up               - Start local services (db, kafka, migrations)"
	@echo "  make dev-down             - Stop local services"
	@echo "  make dev-test-unit        - Run unit tests locally (no DB needed)"
	@echo "  make dev-test-store       - Run store tests locally (requires dev-up)"
	@echo "  make dev-test-integration - Run integration tests locally (in-process server)"
	@echo ""
	@echo "ISOLATED DOCKER TESTING (DB + Kafka only; server runs in-process):"
	@echo "  make docker-up            - Start isolated Docker test environment"
	@echo "  make docker-down          - Stop Docker test environment"
	@echo "  make docker-test-integration - Run integration tests (in-process server)"
	@echo "  make docker-test-all      - Run ALL tests in Docker environment"
