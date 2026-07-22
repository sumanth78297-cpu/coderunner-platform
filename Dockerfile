# Multi-stage build for optimal production image
FROM node:18-slim AS client-builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY client/ ./
RUN npm run build

# Production stage
FROM node:18-slim

# Install Docker CLI for container management
RUN apt-get update && \
    apt-get install -y docker.io && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Create app directory and user
RUN groupadd -r coderunner && useradd -r -g coderunner coderunner
WORKDIR /app

# Copy server dependencies and install
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production && npm cache clean --force

# Copy server source
COPY server/ ./server/

# Copy built client
COPY --from=client-builder /app/client/build ./client/build

# Create logs directory
RUN mkdir -p logs && chown -R coderunner:coderunner /app

# Security: Run as non-root user (except Docker socket access)
USER coderunner

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Expose port
EXPOSE 5000

# Startup command
CMD ["node", "server/index.js"]

# Labels for better maintainability
LABEL maintainer="CodeRunner Team"
LABEL version="1.0.0"
LABEL description="CodeRunner - Real-time code execution platform"
LABEL org.opencontainers.image.source="https://github.com/yourusername/coderunner"