# Multi-stage build with Python support for code execution  
FROM python:3.11-bullseye AS base

# Install Node.js 18.x
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Verify installations
RUN python3 --version && node --version && npm --version

# Client build stage
FROM base AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --legacy-peer-deps
COPY client/ ./
RUN npm run build

# Production stage
FROM base AS production
WORKDIR /app

# Copy server files and install dependencies
COPY server/package*.json ./server/
RUN cd server && npm install

COPY server/ ./server/

# Copy built client
COPY --from=client-builder /app/client/build ./client/build

# Create required directories
RUN mkdir -p logs temp-files

# Verify Python and Node.js are available
RUN echo "=== Environment Check ===" && \
    python3 --version && \
    node --version && \
    npm --version && \
    echo "=== Ready for Code Execution ==="

# Expose port
EXPOSE 10000

# Start server
CMD ["node", "server/real-server.js"]