#!/bin/bash

# CodeRunner Setup Script
# This script sets up the development environment for CodeRunner

set -e

echo "🚀 Setting up CodeRunner development environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is installed and running"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js $(node --version) is installed"

# Install dependencies
echo "📦 Installing dependencies..."

# Install root dependencies
if [ -f "package.json" ]; then
    npm install
fi

# Install server dependencies
if [ -d "server" ]; then
    echo "📦 Installing server dependencies..."
    cd server
    npm install
    cd ..
fi

# Install client dependencies
if [ -d "client" ]; then
    echo "📦 Installing client dependencies..."
    cd client
    npm install
    cd ..
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p temp-files

# Pull Docker images for code execution
echo "🐳 Pulling execution environment images..."
docker pull python:3.11-slim &
docker pull node:18-slim &
docker pull golang:1.21-alpine &
docker pull openjdk:17-slim &

# Wait for all pulls to complete
wait

echo "✅ All execution images are ready!"

# Create environment file template
if [ ! -f ".env" ]; then
    echo "📄 Creating environment file..."
    cat > .env << EOL
# CodeRunner Environment Configuration

# Server Configuration
NODE_ENV=development
PORT=5000

# Security
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
EXECUTION_RATE_LIMIT_WINDOW=60000
EXECUTION_RATE_LIMIT_MAX=10

# Execution Limits
EXECUTION_TIMEOUT=30000
MEMORY_LIMIT=134217728
CPU_LIMIT=0.5

# Docker Configuration
DOCKER_HOST=unix:///var/run/docker.sock

# CORS Configuration (development only)
CORS_ORIGIN=http://localhost:3000
EOL
fi

# Make scripts executable
chmod +x scripts/*.sh

echo ""
echo "🎉 CodeRunner setup completed successfully!"
echo ""
echo "🚀 To start development:"
echo "   npm run dev"
echo ""
echo "🐳 To run with Docker:"
echo "   docker-compose up --build"
echo ""
echo "🌐 The application will be available at:"
echo "   Development: http://localhost:3000"
echo "   Production:  http://localhost:3000"
echo ""