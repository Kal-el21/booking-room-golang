# Stage 1: Build
FROM golang:1.25.6-alpine3.22 AS builder

# Install build dependencies
RUN apk add --no-cache git gcc musl-dev

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/api

# Build seed_admin command
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o seed_admin ./cmd/seed_admin

# Stage 2: Runtime
FROM alpine:latest

# Install ca-certificates and wget for healthcheck
RUN apk --no-cache add ca-certificates tzdata wget

# Set timezone
ENV TZ=Asia/Jakarta

WORKDIR /root/

# Copy binaries from builder
COPY --from=builder /app/main .
COPY --from=builder /app/seed_admin .

# Copy .env file (optional, better use docker-compose env)
# COPY .env .

# Expose port
EXPOSE 8080

# Run the application
CMD ["./main"]
