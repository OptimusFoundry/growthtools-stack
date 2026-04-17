# syntax=docker/dockerfile:1.7
# Start from the official Golang base image
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download deps. Layer is cache-keyed on go.mod/go.sum; the cache mount
# persists the module cache across builds so partial bumps only download the
# delta.
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

# Copy the source
COPY . .

# Build the Go app. Cache mounts on the Go build cache + module cache so
# unchanged packages are not recompiled. No `-a`/`-installsuffix cgo`:
# `-a` forces rebuild of every package incl. stdlib, defeating the cache;
# `-installsuffix cgo` is a pre-modules relic.
RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/go/pkg/mod \
    CGO_ENABLED=0 GOOS=linux go build -o main .

# Start a new stage from scratch
FROM alpine:latest

RUN apk --no-cache add curl

WORKDIR /root/

COPY --from=builder /app/main .

CMD ["./main"]
