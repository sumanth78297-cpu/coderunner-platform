const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class LocalExecutor {
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

  async execute(code, language, input = '') {
    const startTime = Date.now();
    const executionId = uuidv4();
    
    console.log(`🔄 Starting local execution ${executionId} for language: ${language}`);
    
    try {
      const config = this.getLanguageConfig(language);
      if (!config) {
        throw new Error(`Unsupported language: ${language}`);
      }

      const result = await this.runLocally(code, config, input, executionId);
      const executionTime = Date.now() - startTime;
      
      return {
        success: !result.error,
        output: result.output,
        error: result.error,
        executionTime,
        executionId,
        language,
        stats: {
          memoryUsed: Math.floor(Math.random() * 50000000), // Mock stats for now
          memoryLimit: 134217728,
          memoryPercent: Math.random() * 30,
          cpuPercent: Math.random() * 50
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ Execution ${executionId} failed:`, error.message);
      
      return {
        success: false,
        output: '',
        error: error.message,
        executionTime,
        executionId,
        language
      };
    }
  }

  async executeStream(code, language, input, onOutput, onComplete, onError) {
    const startTime = Date.now();
    const executionId = uuidv4();
    
    try {
      const config = this.getLanguageConfig(language);
      if (!config) {
        throw new Error(`Unsupported language: ${language}`);
      }

      await this.runLocallyStream(code, config, input, executionId, onOutput, (result) => {
        const executionTime = Date.now() - startTime;
        onComplete({
          success: !result.error,
          output: result.output,
          error: result.error,
          executionTime,
          executionId,
          language,
          stats: {
            memoryUsed: Math.floor(Math.random() * 50000000),
            memoryLimit: 134217728,
            memoryPercent: Math.random() * 30,
            cpuPercent: Math.random() * 50
          }
        });
      });
    } catch (error) {
      const executionTime = Date.now() - startTime;
      onError({
        success: false,
        output: '',
        error: error.message,
        executionTime,
        executionId,
        language
      });
    }
  }

  getLanguageConfig(language) {
    const configs = {
      python: {
        extension: 'py',
        command: 'python3',
        args: []
      },
      javascript: {
        extension: 'js',
        command: 'node',
        args: []
      },
      go: {
        extension: 'go',
        command: 'go',
        args: ['run']
      },
      java: {
        extension: 'java',
        command: 'javac',
        args: [],
        runCommand: 'java',
        className: 'Main'
      }
    };
    
    return configs[language];
  }

  async runLocally(code, config, input, executionId) {
    const filename = `${executionId}.${config.extension}`;
    const filepath = path.join(this.tempDir, filename);
    
    try {
      // Write code to temporary file
      await fs.writeFile(filepath, code);
      
      let result;
      if (config.language === 'java') {
        result = await this.runJava(filepath, config, input);
      } else {
        result = await this.runProcess(filepath, config, input);
      }
      
      return result;
    } finally {
      // Cleanup with delay to prevent race conditions
      setTimeout(async () => {
        try {
          await fs.unlink(filepath);
          if (config.language === 'java') {
            const classFile = filepath.replace('.java', '.class');
            await fs.unlink(classFile).catch(() => {});
          }
        } catch (err) {
          console.warn('Cleanup error:', err.message);
        }
      }, 500); // 500ms delay for cleanup
    }
  }

  async runLocallyStream(code, config, input, executionId, onOutput, onComplete) {
    const filename = `${executionId}.${config.extension}`;
    const filepath = path.join(this.tempDir, filename);
    
    try {
      // Write code to temporary file
      await fs.writeFile(filepath, code);
      
      let result;
      if (config.language === 'java') {
        result = await this.runJavaStream(filepath, config, input, onOutput, onComplete);
      } else {
        result = await this.runProcessStream(filepath, config, input, onOutput, onComplete);
      }
      
      return result;
    } finally {
      // Cleanup with delay to prevent race conditions
      setTimeout(async () => {
        try {
          await fs.unlink(filepath);
          if (config.language === 'java') {
            const classFile = filepath.replace('.java', '.class');
            await fs.unlink(classFile).catch(() => {});
          }
        } catch (err) {
          console.warn('Cleanup error:', err.message);
        }
      }, 500); // 500ms delay for cleanup
    }
  }

  async runProcess(filepath, config, input) {
    return new Promise((resolve) => {
      const args = [...config.args, filepath];
      const process = spawn(config.command, args, {
        cwd: this.tempDir,
        timeout: this.executionTimeout
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      if (input) {
        process.stdin.write(input);
        process.stdin.end();
      }

      process.on('close', (code) => {
        // Add a small delay before resolving to ensure file operations are complete
        setTimeout(() => {
          resolve({
            output: stdout,
            error: stderr || (code !== 0 ? `Process exited with code ${code}` : ''),
            code
          });
        }, 100);
      });

      process.on('error', (error) => {
        setTimeout(() => {
          resolve({
            output: stdout,
            error: error.message,
            code: -1
          });
        }, 100);
      });
    });
  }

  async runProcessStream(filepath, config, input, onOutput, onComplete) {
    return new Promise((resolve) => {
      const args = [...config.args, filepath];
      const process = spawn(config.command, args, {
        cwd: this.tempDir,
        timeout: this.executionTimeout
      });

      let stdout = '';
      let stderr = '';
      let inputProvided = false;

      process.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        onOutput({ type: 'stdout', data: text });
      });

      process.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        onOutput({ type: 'stderr', data: text });
      });

      // Handle interactive input
      const handleInput = (userInput) => {
        if (process && !process.killed) {
          process.stdin.write(userInput);
          inputProvided = true;
        }
      };

      // Check if program is waiting for input (simple heuristic)
      setTimeout(() => {
        if (!process.killed && stdout.length === 0 && stderr.length === 0) {
          // Program might be waiting for input
          onOutput({ type: 'input-request', prompt: '' });
        }
      }, 100);

      process.on('close', (code) => {
        const result = {
          output: stdout,
          error: stderr || (code !== 0 ? `Process exited with code ${code}` : ''),
          code,
          handleInput
        };
        onComplete(result);
        resolve(result);
      });

      process.on('error', (error) => {
        const result = {
          output: stdout,
          error: error.message,
          code: -1,
          handleInput
        };
        onComplete(result);
        resolve(result);
      });

      // Return the input handler for external use
      resolve({ handleInput });
    });
  }

  async runJava(filepath, config, input) {
    // First compile
    const compileResult = await this.runProcess(filepath, { command: 'javac', args: [] }, '');
    if (compileResult.error) {
      return compileResult;
    }

    // Then run
    const classFile = path.join(this.tempDir, config.className);
    return await this.runProcess(classFile, { command: 'java', args: [] }, input);
  }

  async runJavaStream(filepath, config, input, onOutput, onComplete) {
    // First compile
    onOutput({ type: 'stdout', data: 'Compiling Java code...\n' });
    const compileResult = await this.runProcess(filepath, { command: 'javac', args: [] }, '');
    
    if (compileResult.error) {
      onComplete(compileResult);
      return compileResult;
    }

    onOutput({ type: 'stdout', data: 'Running Java program...\n' });
    
    // Then run
    const classFile = path.join(this.tempDir, config.className);
    return await this.runProcessStream(classFile, { command: 'java', args: [] }, input, onOutput, onComplete);
  }
}

module.exports = LocalExecutor;