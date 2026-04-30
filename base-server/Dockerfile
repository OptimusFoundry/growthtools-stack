# syntax=docker/dockerfile:1.7
# Builder pinned to the runner's native arch ($BUILDPLATFORM) so multi-arch
# builds cross-compile via Go's toolchain instead of running the whole stage
# under QEMU emulation. TARGETOS/TARGETARCH come from buildx --platform.
FROM --platform=$BUILDPLATFORM golang:1.25-alpine AS builder

ARG TARGETOS
ARG TARGETARCH

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
    CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o main .

# Final image is per-target-arch; buildx assembles the multi-arch manifest.
FROM alpine:latest

RUN apk --no-cache add curl

WORKDIR /root/

COPY --from=builder /app/main .

CMD ["./main"]
