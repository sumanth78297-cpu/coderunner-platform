const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const CodeExecutor = require('./executors/CodeExecutor');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:3000"
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Execution rate limiting (more strict)
const executionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 executions per minute
  message: 'Execution rate limit exceeded. Please wait before running more code.'
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../client/build')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Supported languages endpoint
app.get('/api/languages', (req, res) => {
  res.json({
    languages: [
      { id: 'python', name: 'Python 3.11', extension: 'py' },
      { id: 'javascript', name: 'Node.js 18', extension: 'js' },
      { id: 'go', name: 'Go 1.21', extension: 'go' },
      { id: 'java', name: 'Java 17', extension: 'java' }
    ]
  });
});

// Code execution endpoint
app.post('/api/execute', executionLimiter, async (req, res) => {
  const { code, language, input = '' } = req.body;
  
  if (!code || !language) {
    return res.status(400).json({ error: 'Code and language are required' });
  }

  if (code.length > 50000) {
    return res.status(400).json({ error: 'Code too long. Maximum 50KB allowed.' });
  }

  try {
    const executor = new CodeExecutor();
    const result = await executor.execute(code, language, input);
    res.json(result);
  } catch (error) {
    console.error('Execution error:', error);
    res.status(500).json({ 
      error: 'Internal server error during code execution',
      message: error.message 
    });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('execute-code', async (data) => {
    const { code, language, input = '' } = data;
    
    if (!code || !language) {
      socket.emit('execution-error', { error: 'Code and language are required' });
      return;
    }

    if (code.length > 50000) {
      socket.emit('execution-error', { error: 'Code too long. Maximum 50KB allowed.' });
      return;
    }

    try {
      const executor = new CodeExecutor();
      
      // Stream execution results
      executor.executeStream(code, language, input, (data) => {
        socket.emit('execution-output', data);
      }, (result) => {
        socket.emit('execution-complete', result);
      }, (error) => {
        socket.emit('execution-error', error);
      });
      
    } catch (error) {
      console.error('WebSocket execution error:', error);
      socket.emit('execution-error', { 
        error: 'Internal server error during code execution',
        message: error.message 
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 CodeRunner server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT}`);
});