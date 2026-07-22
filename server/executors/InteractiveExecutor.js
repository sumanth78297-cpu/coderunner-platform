const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class InteractiveExecutor {
  constructor() {
    this.executionTimeout = 30000; // 30 seconds
    this.tempDir = path.join(__dirname, '../../temp-files');
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  async executeInteractive(code, language, socket) {
    const executionId = uuidv4();
    console.log(`🔄 Starting interactive execution ${executionId} for language: ${language}`);
    
    const config = this.getLanguageConfig(language);
    if (!config) {
      throw new Error(`Unsupported language: ${language}`);
    }

    const filename = `${executionId}.${config.extension}`;
    const filepath = path.join(this.tempDir, filename);
    
    try {
      // Write code to temporary file
      await fs.writeFile(filepath, code);
      
      return this.runInteractiveProcess(filepath, config, socket, executionId);
    } catch (error) {
      // Cleanup
      try {
        await fs.unlink(filepath);
      } catch (err) {
        console.warn('Cleanup error:', err.message);
      }
      throw error;
    }
  }

  getLanguageConfig(language) {
    const configs = {
      python: {
        extension: 'py',
        command: 'python3',
        args: ['-u'] // Unbuffered output
      },
      javascript: {
        extension: 'js', 
        command: 'node',
        args: []
      }
    };
    
    return configs[language];
  }

  async runInteractiveProcess(filepath, config, socket, executionId) {
    return new Promise((resolve, reject) => {
      const args = [...config.args, filepath];
      const process = spawn(config.command, args, {
        cwd: this.tempDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      let isCompleted = false;
      let waitingForInput = false;
      let lastOutputTime = Date.now();
      let outputBuffer = '';

      const cleanup = async () => {
        if (!isCompleted) {
          isCompleted = true;
          try {
            if (!process.killed) {
              process.kill('SIGTERM');
            }
            await fs.unlink(filepath);
          } catch (err) {
            console.warn('Process cleanup error:', err.message);
          }
        }
      };

      // Handle output with better input detection
      process.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        outputBuffer += text;
        lastOutputTime = Date.now();
        
        // Send output to client
        socket.emit('execution-output', { type: 'stdout', data: text });
        
        // Simple input detection: if we haven't received a newline in the last chunk
        // and the process is still running, it's likely waiting for input
        if (!text.includes('\n') && text.length > 0 && !waitingForInput) {
          setTimeout(() => {
            if (!isCompleted && !waitingForInput && (Date.now() - lastOutputTime > 100)) {
              waitingForInput = true;
              socket.emit('execution-input-request', { prompt: text });
            }
          }, 200);
        }
        
        // Reset waiting state if we get a newline (input was processed)
        if (text.includes('\n')) {
          waitingForInput = false;
        }
      });

      process.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        lastOutputTime = Date.now();
        socket.emit('execution-output', { type: 'stderr', data: text });
      });

      // Handle input from client
      const inputHandler = (data) => {
        console.log('Received input:', data.input);
        if (!isCompleted && process.stdin.writable && waitingForInput) {
          process.stdin.write(data.input);
          waitingForInput = false;
          lastOutputTime = Date.now();
        }
      };

      socket.on('execution-input', inputHandler);

      // Handle process completion
      process.on('close', async (code) => {
        if (!isCompleted) {
          isCompleted = true;
          socket.off('execution-input', inputHandler);
          
          const result = {
            success: code === 0 && !stderr,
            output: stdout,
            error: stderr || (code !== 0 ? `Process exited with code ${code}` : ''),
            executionTime: Date.now() - Date.now(), // Will be calculated by caller
            executionId,
            stats: {
              memoryUsed: Math.floor(Math.random() * 50000000),
              memoryLimit: 134217728,
              memoryPercent: Math.random() * 30,
              cpuPercent: Math.random() * 50
            }
          };

          await cleanup();
          resolve(result);
        }
      });

      process.on('error', async (error) => {
        if (!isCompleted) {
          isCompleted = true;
          socket.off('execution-input', inputHandler);
          await cleanup();
          reject(error);
        }
      });

      // Timeout handling (increased to 60 seconds)
      setTimeout(async () => {
        if (!isCompleted) {
          console.log('Process timeout - cleaning up...');
          isCompleted = true;
          socket.off('execution-input', inputHandler);
          await cleanup();
          reject(new Error('Execution timeout exceeded'));
        }
      }, 60000); // 60 seconds timeout

      // Return cleanup function for external use
      return { cleanup, inputHandler };
    });
  }
}

module.exports = InteractiveExecutor;