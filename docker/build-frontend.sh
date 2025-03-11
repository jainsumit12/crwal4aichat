#!/bin/bash

# Stop on first error
set -e

echo "Building frontend Docker image..."

# Remove any existing frontend container
docker rm -f supa-chat-frontend 2>/dev/null || true

# Build the frontend image with a unique name to avoid conflicts
docker build -t supa-chat-frontend:latest -f docker/frontend.Dockerfile .

echo "Frontend image built successfully!"
echo "To run the container: docker-compose -f docker/docker-compose.yml up -d" 