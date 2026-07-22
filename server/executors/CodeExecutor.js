const Docker = require('dockerode');
const { v4: uuidv4 } = require('uuid');
const tar = require('tar-stream');

class CodeExecutor {
  constructor() {
    this.docker = new Docker();
    this.executionTimeout = 30000; // 30 seconds
    this.memoryLimit = 128 * 1024 * 1024; // 128MB
    this.cpuLimit = 0.5; // 0.5 CPU cores
  }

  async execute(code, language, input = '') {
    const startTime = Date.now();
    const executionId = uuidv4();
    
    console.log(`🔄 Starting execution ${executionId} for language: ${language}`);
    
    try {
      const config = this.getLanguageConfig(language);
      if (!config) {
        throw new Error(`Unsupported language: ${language}`);
      }

      const result = await this.runInContainer(code, config, input, executionId);
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        output: result.output,
        error: result.error,
        executionTime,
        executionId,
        language,
        stats: result.stats
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

      await this.runInContainerStream(code, config, input, executionId, onOutput, (result) => {
        const executionTime = Date.now() - startTime;
        onComplete({
          success: true,
          output: result.output,
          error: result.error,
          executionTime,
          executionId,
          language,
          stats: result.stats
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
        image: 'python:3.11-slim',
        filename: 'main.py',
        command: ['python', '/app/main.py']
      },
      javascript: {
        image: 'node:18-slim',
        filename: 'main.js',
        command: ['node', '/app/main.js']
      },
      go: {
        image: 'golang:1.21-alpine',
        filename: 'main.go',
        command: ['sh', '-c', 'cd /app && go run main.go']
      },
      java: {
        image: 'openjdk:17-slim',
        filename: 'Main.java',
        command: ['sh', '-c', 'cd /app && javac Main.java && java Main']
      }
    };
    
    return configs[language];
  }

  async createCodeTarball(code, filename) {
    return new Promise((resolve, reject) => {
      const pack = tar.pack();
      const chunks = [];
      
      pack.entry({ name: filename }, code);
      pack.finalize();
      
      pack.on('data', chunk => chunks.push(chunk));
      pack.on('end', () => resolve(Buffer.concat(chunks)));
      pack.on('error', reject);
    });
  }

  async runInContainer(code, config, input, executionId) {
    const container = await this.createContainer(config, executionId);
    
    try {
      // Create tarball with code
      const tarball = await this.createCodeTarball(code, config.filename);
      
      // Copy code to container
      await container.putArchive(tarball, { path: '/app' });
      
      // Start container
      await container.start();
      
      // Execute with timeout
      const execResult = await Promise.race([
        this.executeInContainer(container, config.command, input),
        this.timeoutPromise(this.executionTimeout)
      ]);
      
      // Get container stats
      const stats = await this.getContainerStats(container);
      
      return {
        output: execResult.output,
        error: execResult.error,
        stats
      };
    } finally {
      // Cleanup
      try {
        await container.kill();
        await container.remove();
      } catch (err) {
        console.warn('Container cleanup error:', err.message);
      }
    }
  }

  async runInContainerStream(code, config, input, executionId, onOutput, onComplete) {
    const container = await this.createContainer(config, executionId);
    
    try {
      // Create tarball with code
      const tarball = await this.createCodeTarball(code, config.filename);
      
      // Copy code to container
      await container.putArchive(tarball, { path: '/app' });
      
      // Start container
      await container.start();
      
      // Execute with streaming
      const execResult = await this.executeInContainerStream(container, config.command, input, onOutput);
      
      // Get container stats
      const stats = await this.getContainerStats(container);
      
      onComplete({
        output: execResult.output,
        error: execResult.error,
        stats
      });
    } finally {
      // Cleanup
      try {
        await container.kill();
        await container.remove();
      } catch (err) {
        console.warn('Container cleanup error:', err.message);
      }
    }
  }

  async createContainer(config, executionId) {
    return await this.docker.createContainer({
      Image: config.image,
      WorkingDir: '/app',
      Memory: this.memoryLimit,
      CpuShares: Math.floor(this.cpuLimit * 1024),
      NetworkMode: 'none', // No network access
      AttachStdout: true,
      AttachStderr: true,
      AttachStdin: true,
      OpenStdin: true,
      Tty: false,
      name: `coderunner-${executionId}`,
      Labels: {
        'coderunner.execution-id': executionId,
        'coderunner.created-at': new Date().toISOString()
      },
      HostConfig: {
        Memory: this.memoryLimit,
        CpuShares: Math.floor(this.cpuLimit * 1024),
        NetworkMode: 'none',
        ReadonlyRootfs: false,
        AutoRemove: false,
        PidsLimit: 50,
        Ulimits: [
          { Name: 'nofile', Soft: 1024, Hard: 1024 },
          { Name: 'nproc', Soft: 128, Hard: 128 }
        ]
      }
    });
  }

  async executeInContainer(container, command, input) {
    const exec = await container.exec({
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true,
      AttachStdin: !!input
    });

    const stream = await exec.start({
      stdin: true,
      hijack: true
    });

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      // Send input if provided
      if (input) {
        stream.write(input);
      }
      stream.end();

      // Demux the stream (Docker multiplexes stdout/stderr)
      container.modem.demuxStream(stream, 
        (chunk) => { stdout += chunk.toString(); },
        (chunk) => { stderr += chunk.toString(); }
      );

      stream.on('end', () => {
        resolve({
          output: stdout,
          error: stderr
        });
      });

      stream.on('error', reject);
    });
  }

  async executeInContainerStream(container, command, input, onOutput) {
    const exec = await container.exec({
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true,
      AttachStdin: !!input
    });

    const stream = await exec.start({
      stdin: true,
      hijack: true
    });

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      // Send input if provided
      if (input) {
        stream.write(input);
      }
      stream.end();

      // Stream output in real-time
      container.modem.demuxStream(stream, 
        (chunk) => { 
          const data = chunk.toString();
          stdout += data;
          onOutput({ type: 'stdout', data });
        },
        (chunk) => { 
          const data = chunk.toString();
          stderr += data;
          onOutput({ type: 'stderr', data });
        }
      );

      stream.on('end', () => {
        resolve({
          output: stdout,
          error: stderr
        });
      });

      stream.on('error', reject);
    });
  }

  async getContainerStats(container) {
    try {
      const stats = await container.stats({ stream: false });
      
      const memoryUsage = stats.memory_stats.usage || 0;
      const memoryLimit = stats.memory_stats.limit || this.memoryLimit;
      const cpuUsage = this.calculateCpuPercent(stats);

      return {
        memoryUsed: memoryUsage,
        memoryLimit: memoryLimit,
        memoryPercent: (memoryUsage / memoryLimit) * 100,
        cpuPercent: cpuUsage
      };
    } catch (error) {
      console.warn('Failed to get container stats:', error.message);
      return {
        memoryUsed: 0,
        memoryLimit: this.memoryLimit,
        memoryPercent: 0,
        cpuPercent: 0
      };
    }
  }

  calculateCpuPercent(stats) {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - 
                    (stats.precpu_stats.cpu_usage?.total_usage || 0);
    const systemDelta = stats.cpu_stats.system_cpu_usage - 
                       (stats.precpu_stats.system_cpu_usage || 0);
    
    if (systemDelta > 0 && cpuDelta > 0) {
      const numCpus = stats.cpu_stats.online_cpus || 1;
      return (cpuDelta / systemDelta) * numCpus * 100;
    }
    
    return 0;
  }

  timeoutPromise(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Execution timeout exceeded')), ms);
    });
  }
}

module.exports = CodeExecutor;