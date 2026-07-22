const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const LocalExecutor = require('./executors/LocalExecutor');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.CORS_ORIGIN || false 
      : "http://localhost:5001",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CORS_ORIGIN || false 
    : "http://localhost:5001"
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
  max: 20, // limit each IP to 20 executions per minute (increased for local testing)
  message: 'Execution rate limit exceeded. Please wait before running more code.'
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../client/build')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    docker: false,
    mode: 'local-execution',
    message: 'Running with local code execution'
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
    const executor = new LocalExecutor();
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
  let currentExecution = null;
  
  socket.on('execute-code', async (data) => {
    const { code, language } = data;
    
    if (!code || !language) {
      socket.emit('execution-error', { error: 'Code and language are required' });
      return;
    }

    if (code.length > 50000) {
      socket.emit('execution-error', { error: 'Code too long. Maximum 50KB allowed.' });
      return;
    }

    console.log(`🚀 Executing ${language} code (${code.length} chars) for socket ${socket.id}`);

    try {
      const startTime = Date.now();
      const executor = new LocalExecutor();
      
      // Send initial message
      socket.emit('execution-output', { type: 'stdout', data: `🚀 Starting ${language} execution...\n` });
      
      // Check if code contains input() calls
      const hasInput = code.includes('input(') || code.includes('readline');
      
      if (hasInput) {
        // For code with input, ask user to provide all inputs upfront
        socket.emit('execution-input-request', { 
          prompt: 'This program requires input. Please provide all inputs separated by newlines:' 
        });
        
        // Wait for user input
        socket.once('execution-input', async (inputData) => {
          try {
            const result = await executor.execute(code, language, inputData.input);
            result.executionTime = Date.now() - startTime;
            socket.emit('execution-complete', result);
          } catch (error) {
            socket.emit('execution-error', { 
              error: 'Execution failed',
              message: error.message 
            });
          }
        });
      } else {
        // For code without input, execute normally with streaming
        executor.executeStream(code, language, '', (data) => {
          socket.emit('execution-output', data);
        }, (result) => {
          result.executionTime = Date.now() - startTime;
          console.log(`✅ Execution completed for socket ${socket.id}:`, result.success ? 'SUCCESS' : 'ERROR');
          socket.emit('execution-complete', result);
        }, (error) => {
          console.error(`❌ Execution error for socket ${socket.id}:`, error);
          socket.emit('execution-error', error);
        });
      }
      
    } catch (error) {
      console.error(`❌ Execution error for socket ${socket.id}:`, error);
      socket.emit('execution-error', { 
        error: 'Internal server error during code execution',
        message: error.message 
      });
    }
  });

  socket.on('stop-execution', () => {
    // Handle execution stop
    console.log(`⏹️ Execution stopped by user: ${socket.id}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

const PORT = process.env.PORT || 5001;

// Check for required tools
async function checkEnvironment() {
  const { spawn } = require('child_process');
  
  const checkCommand = (command, args = ['--version']) => {
    return new Promise((resolve) => {
      const process = spawn(command, args, { stdio: 'pipe' });
      process.on('close', (code) => {
        resolve(code === 0);
      });
      process.on('error', () => {
        resolve(false);
      });
    });
  };

  console.log('🔍 Checking execution environment...');
  
  const checks = [
    { name: 'Python', command: 'python3', available: false },
    { name: 'Node.js', command: 'node', available: false },
    { name: 'Go', command: 'go', available: false },
    { name: 'Java', command: 'javac', available: false }
  ];

  for (const check of checks) {
    check.available = await checkCommand(check.command);
    console.log(`${check.available ? '✅' : '❌'} ${check.name}: ${check.available ? 'Available' : 'Not available'}`);
  }

  const availableLanguages = checks.filter(c => c.available).map(c => c.name);
  
  if (availableLanguages.length === 0) {
    console.warn('⚠️  No execution environments detected. Code execution will fail.');
    console.warn('   Install: python3, node, go, and/or javac to enable code execution.');
  } else {
    console.log(`🎉 Ready to execute: ${availableLanguages.join(', ')}`);
  }
}

server.listen(PORT, async () => {
  console.log(`🚀 CodeRunner real execution server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`⚡ Running with LOCAL CODE EXECUTION`);
  
  await checkEnvironment();
});