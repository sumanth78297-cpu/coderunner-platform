#!/bin/bash

# CodeRunner Deployment Script
# Deploys CodeRunner to production environment

set -e

echo "🚀 Deploying CodeRunner to production..."

# Configuration
IMAGE_NAME="coderunner-platform"
CONTAINER_NAME="coderunner-app"
PORT=${PORT:-3000}
ENV=${ENV:-production}

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

# Stop existing container if running
echo "🛑 Stopping existing containers..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

# Build new image
echo "🔨 Building production image..."
docker build -t "$IMAGE_NAME:latest" .

# Pre-pull execution environment images
echo "🐳 Ensuring execution images are available..."
docker pull python:3.11-slim
docker pull node:18-slim
docker pull golang:1.21-alpine
docker pull openjdk:17-slim

# Create necessary directories
mkdir -p logs

# Run the new container
echo "🚀 Starting CodeRunner container..."
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p "$PORT:5000" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$(pwd)/logs:/app/logs" \
  -e NODE_ENV="$ENV" \
  -e PORT=5000 \
  "$IMAGE_NAME:latest"

# Wait for container to be ready
echo "⏳ Waiting for CodeRunner to be ready..."
sleep 5

# Health check
for i in {1..30}; do
    if curl -f http://localhost:"$PORT"/api/health >/dev/null 2>&1; then
        echo "✅ CodeRunner is healthy and ready!"
        break
    fi
    
    if [ $i -eq 30 ]; then
        echo "❌ Health check failed after 30 attempts"
        docker logs "$CONTAINER_NAME"
        exit 1
    fi
    
    echo "⏳ Waiting for health check... ($i/30)"
    sleep 2
done

# Show deployment info
echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 Container Status:"
docker ps --filter name="$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "🌐 CodeRunner is available at: http://localhost:$PORT"
echo ""
echo "📝 Useful commands:"
echo "   View logs:      docker logs -f $CONTAINER_NAME"
echo "   Stop service:   docker stop $CONTAINER_NAME"
echo "   Restart:        docker restart $CONTAINER_NAME"
echo "   Remove:         docker rm -f $CONTAINER_NAME"
echo ""