# Multi-stage build for optimal production image
FROM node:18-slim AS client-builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm install && npm cache clean --force

COPY client/ ./
RUN npm run build

# Production stage
FROM node:18-slim

# Create app directory and user
RUN groupadd -r coderunner && useradd -r -g coderunner coderunner
WORKDIR /app

# Copy server dependencies and install
COPY server/package*.json ./server/
RUN cd server && npm install && npm cache clean --force

# Copy server source
COPY server/ ./server/

# Copy built client
COPY --from=client-builder /app/client/build ./client/build

# Create logs directory
RUN mkdir -p logs temp-files && chown -R coderunner:coderunner /app

# Security: Run as non-root user (except Docker socket access)
USER coderunner

# Expose port
EXPOSE 10000

# Startup command
CMD ["node", "server/real-server.js"]

# Labels for better maintainability
LABEL maintainer="CodeRunner Team"
LABEL version="1.0.0"
LABEL description="CodeRunner - Real-time code execution platform"