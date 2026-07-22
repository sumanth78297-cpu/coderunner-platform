# CodeRunner - Real-time Code Execution Platform

A secure, containerized platform for executing code in multiple programming languages with real-time output streaming.

## Features

- 🚀 **Multi-language support**: Python, JavaScript, Go, Java
- ⚡ **Real-time execution**: Live output streaming via WebSockets
- 🔒 **Secure isolation**: Docker containers with resource limits
- 🎨 **Modern UI**: Web-based IDE with syntax highlighting
- 🛡️ **Rate limiting**: Prevents abuse and resource exhaustion
- 📊 **Execution metrics**: Runtime stats and resource usage
- 🐳 **Easy deployment**: Docker Compose setup

## Architecture

```
┌─────────────┐    WebSocket    ┌─────────────┐    Docker API    ┌─────────────┐
│   Frontend  │ ◄──────────────► │   Backend   │ ◄───────────────► │  Execution  │
│   (React)   │                 │  (Node.js)  │                  │ Containers  │
└─────────────┘                 └─────────────┘                  └─────────────┘
```

## Quick Start

```bash
# Clone and start
git clone <repo-url>
cd coderunner
docker-compose up --build

# Access at http://localhost:3000
```

## Tech Stack

- **Frontend**: React, CodeMirror, Socket.io-client
- **Backend**: Node.js, Express, Socket.io, Docker API
- **Containerization**: Docker, Docker Compose
- **Languages**: Python 3.11, Node.js 18, Go 1.21, OpenJDK 17

## Security Features

- Containerized execution with resource limits
- Network isolation
- Execution timeout enforcement
- Rate limiting per IP
- Input sanitization
- No persistent file system access

## Performance

- Average execution time: <2s for simple programs
- Container startup: <500ms
- Concurrent users supported: 100+
- Memory limit per execution: 128MB
- CPU limit per execution: 0.5 cores