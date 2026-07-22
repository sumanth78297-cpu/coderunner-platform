const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5001",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: "http://localhost:5001"
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../client/build')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    docker: false,
    message: 'Running in test mode without Docker'
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

// Mock code execution endpoint for testing
app.post('/api/execute', (req, res) => {
  const { code, language, input = '' } = req.body;
  
  if (!code || !language) {
    return res.status(400).json({ error: 'Code and language are required' });
  }

  // Mock execution result
  const mockResults = {
    python: {
      output: 'Hello, CodeRunner!\nThis is a mock Python execution result.\n',
      success: true
    },
    javascript: {
      output: 'Hello, CodeRunner!\nThis is a mock JavaScript execution result.\n',
      success: true
    },
    go: {
      output: 'Hello, CodeRunner!\nThis is a mock Go execution result.\n',
      success: true
    },
    java: {
      output: 'Hello, CodeRunner!\nThis is a mock Java execution result.\n',
      success: true
    }
  };

  const result = mockResults[language] || {
    output: 'Mock execution completed successfully!\n',
    success: true
  };

  setTimeout(() => {
    res.json({
      success: result.success,
      output: result.output + `\nCode length: ${code.length} characters\nLanguage: ${language}\n`,
      error: result.success ? '' : 'Mock error occurred',
      executionTime: Math.random() * 1000 + 500,
      executionId: Math.random().toString(36).substring(7),
      language,
      stats: {
        memoryUsed: Math.floor(Math.random() * 50000000),
        memoryLimit: 134217728,
        memoryPercent: Math.random() * 30,
        cpuPercent: Math.random() * 50
      }
    });
  }, 1000 + Math.random() * 2000); // Simulate 1-3 second execution time
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

    // Mock streaming execution
    addOutput('🚀 Starting execution...\n');
    socket.emit('execution-output', { type: 'stdout', data: '🚀 Starting execution...\n' });
    
    setTimeout(() => {
      const msg = `📝 Executing ${language} code...\n`;
      addOutput(msg);
      socket.emit('execution-output', { type: 'stdout', data: msg });
    }, 500);
    
    setTimeout(() => {
      const msg = `💻 Running your ${code.length} character program...\n`;
      addOutput(msg);
      socket.emit('execution-output', { type: 'stdout', data: msg });
    }, 1000);
    
    setTimeout(() => {
      const msg = 'Hello, CodeRunner!\n';
      addOutput(msg);
      socket.emit('execution-output', { type: 'stdout', data: msg });
    }, 1500);
    
    setTimeout(() => {
      const msg = '✅ Mock execution completed successfully!\n';
      addOutput(msg);
      socket.emit('execution-output', { type: 'stdout', data: msg });
    }, 2000);
    
    setTimeout(() => {
      const finalOutput = 'Hello, CodeRunner!\n✅ Mock execution completed successfully!\n';
      socket.emit('execution-complete', {
        success: true,
        output: finalOutput,
        error: '',
        executionTime: 2500,
        executionId: Math.random().toString(36).substring(7),
        language,
        stats: {
          memoryUsed: Math.floor(Math.random() * 50000000),
          memoryLimit: 134217728,
          memoryPercent: Math.random() * 30,
          cpuPercent: Math.random() * 50
        }
      });
    }, 2500);

  function addOutput(message) {
    console.log('Server sending:', message);
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

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`🚀 CodeRunner test server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`⚠️  Running in TEST MODE - Docker execution disabled`);
});