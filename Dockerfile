# Multi-stage build with Python, Node.js, and C++ support for code execution  
FROM python:3.11-bullseye AS base

# Install Node.js 18.x and C++ build tools
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get update && \
    apt-get install -y nodejs g++ gcc build-essential && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Verify installations
RUN python3 --version && node --version && npm --version && g++ --version

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

# Verify all runtimes are available
RUN echo "=== Environment Check ===" && \
    python3 --version && \
    node --version && \
    npm --version && \
    g++ --version && \
    echo "=== Ready for Multi-Language Code Execution ==="

# Expose port
EXPOSE 10000

# Start server
CMD ["node", "server/real-server.js"]