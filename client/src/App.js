import React, { useState, useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { go } from '@codemirror/lang-go';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import io from 'socket.io-client';
import axios from 'axios';
import { 
  Play, 
  Square, 
  Settings, 
  Clock, 
  MemoryStick, 
  Cpu, 
  Terminal,
  Code,
  Zap,
  Shield
} from 'lucide-react';

import './App.css';

const languages = [
  { id: 'python', name: 'Python 3.11', extension: 'py', example: `# Welcome to CodeRunner!\n# Write your Python code here\n\nprint("Hello, CodeRunner!")\n\n# Example: Calculate factorial\ndef factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\n\nprint(f"Factorial of 5: {factorial(5)}")` },
  { id: 'javascript', name: 'Node.js 18', extension: 'js', example: `// Welcome to CodeRunner!\n// Write your JavaScript code here\n\nconsole.log("Hello, CodeRunner!");\n\n// Example: Calculate factorial\nfunction factorial(n) {\n    if (n <= 1) return 1;\n    return n * factorial(n - 1);\n}\n\nconsole.log(\`Factorial of 5: \${factorial(5)}\`);` },
  { id: 'cpp', name: 'C++ (g++)', extension: 'cpp', example: `#include <iostream>\nusing namespace std;\n\n// Welcome to CodeRunner!\n// Write your C++ code here\n\nint factorial(int n) {\n    if (n <= 1) return 1;\n    return n * factorial(n - 1);\n}\n\nint main() {\n    cout << "Hello, CodeRunner!" << endl;\n    \n    // Example: Calculate factorial\n    cout << "Factorial of 5: " << factorial(5) << endl;\n    return 0;\n}` },
  { id: 'go', name: 'Go 1.21', extension: 'go', example: `package main\n\nimport "fmt"\n\n// Welcome to CodeRunner!\n// Write your Go code here\n\nfunc main() {\n    fmt.Println("Hello, CodeRunner!")\n    \n    // Example: Calculate factorial\n    fmt.Printf("Factorial of 5: %d\\n", factorial(5))\n}\n\nfunc factorial(n int) int {\n    if n <= 1 {\n        return 1\n    }\n    return n * factorial(n-1)\n}` },
  { id: 'java', name: 'Java 17', extension: 'java', example: `public class Main {\n    // Welcome to CodeRunner!\n    // Write your Java code here\n    \n    public static void main(String[] args) {\n        System.out.println("Hello, CodeRunner!");\n        \n        // Example: Calculate factorial\n        System.out.println("Factorial of 5: " + factorial(5));\n    }\n    \n    public static long factorial(int n) {\n        if (n <= 1) return 1;\n        return n * factorial(n - 1);\n    }\n}` }
];

const getLanguageMode = (languageId) => {
  switch (languageId) {
    case 'python': return [python()];
    case 'javascript': return [javascript()];
    case 'cpp': return [cpp()];
    case 'go': return [go()];
    case 'java': return [java()];
    default: return [];
  }
};

function App() {
  const [code, setCode] = useState(languages[0].example);
  const [language, setLanguage] = useState('python');
  const [output, setOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  const socketRef = useRef(null);
  const outputRef = useRef(null);

  useEffect(() => {
    // Initialize WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = process.env.NODE_ENV === 'production' 
      ? `${protocol}//${window.location.host}`
      : 'ws://localhost:5001';
    
    console.log('Connecting to WebSocket:', wsUrl);
    socketRef.current = io(wsUrl);
    
    socketRef.current.on('connect', () => {
      setConnectionStatus('connected');
      console.log('🔗 Connected to CodeRunner server');
    });

    socketRef.current.on('disconnect', () => {
      setConnectionStatus('disconnected');
      console.log('❌ Disconnected from CodeRunner server');
    });

    socketRef.current.on('execution-output', (data) => {
      console.log('Received execution-output:', data);
      setOutput(prev => {
        const newOutput = prev + data.data;
        console.log('Updated output to:', newOutput);
        return newOutput;
      });
      scrollToBottom();
    });

    socketRef.current.on('execution-input-request', (data) => {
      console.log('Input requested:', data);
      if (!waitingForInput) {  // Only show input prompt if not already waiting
        setWaitingForInput(true);
        // Show a clear message about what input is needed
        const promptMessage = data.prompt || 'Program is waiting for input. Please enter your input below:';
        setOutput(prev => prev + `\n${promptMessage}\n`);
        scrollToBottom();
      }
    });

    socketRef.current.on('execution-complete', (result) => {
      console.log('Received execution-complete:', result);
      setIsExecuting(false);
      setWaitingForInput(false);
      setExecutionResult(result);
      console.log('✅ Execution completed:', result);
    });

    socketRef.current.on('execution-error', (error) => {
      setIsExecuting(false);
      setWaitingForInput(false);
      setOutput(prev => prev + `\n❌ Error: ${error.error || error.message}\n`);
      setExecutionResult({ success: false, error: error.error || error.message });
      scrollToBottom();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const scrollToBottom = () => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  };

  const executeCode = () => {
    if (!code.trim()) {
      alert('Please enter some code to execute');
      return;
    }

    if (connectionStatus !== 'connected') {
      alert('Not connected to server. Please refresh and try again.');
      return;
    }

    setIsExecuting(true);
    setWaitingForInput(false);
    setOutput('🚀 Executing code...\n\n');
    setExecutionResult(null);

    socketRef.current.emit('execute-code', {
      code: code.trim(),
      language
    });
  };

  const stopExecution = () => {
    setIsExecuting(false);
    setWaitingForInput(false);
    setOutput(prev => prev + '\n⏹️ Execution stopped by user\n');
    socketRef.current.emit('stop-execution');
  };

  const sendInput = () => {
    if (!waitingForInput || !inputValue.trim()) return;
    
    const userInput = inputValue + '\n';
    setOutput(prev => prev + userInput); // Echo the input in the terminal
    setInputValue('');
    setWaitingForInput(false);
    
    socketRef.current.emit('execution-input', { input: userInput });
    scrollToBottom();
  };

  const handleInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendInput();
    }
  };

  const handleLanguageChange = (newLanguage) => {
    const selectedLanguage = languages.find(lang => lang.id === newLanguage);
    if (selectedLanguage) {
      setLanguage(newLanguage);
      setCode(selectedLanguage.example);
      setOutput('');
      setExecutionResult(null);
    }
  };

  const clearOutput = () => {
    setOutput('');
    setExecutionResult(null);
  };

  const formatExecutionTime = (time) => {
    if (time < 1000) return `${time}ms`;
    return `${(time / 1000).toFixed(2)}s`;
  };

  const formatMemory = (bytes) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <Code size={24} />
            <span>CodeRunner</span>
          </div>
          <div className="connection-status">
            <div className={`status-dot ${connectionStatus === 'connected' ? 'status-success' : 'status-error'}`}></div>
            <span>{connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
        
        <div className="header-center">
          <select 
            className="select language-select" 
            value={language} 
            onChange={(e) => handleLanguageChange(e.target.value)}
            disabled={isExecuting}
          >
            {languages.map(lang => (
              <option key={lang.id} value={lang.id}>{lang.name}</option>
            ))}
          </select>
        </div>
        
        <div className="header-right">
          {isExecuting ? (
            <button className="btn btn-danger" onClick={stopExecution}>
              <Square size={16} />
              Stop
            </button>
          ) : (
            <button className="btn btn-primary" onClick={executeCode}>
              <Play size={16} />
              Run
            </button>
          )}
        </div>
      </header>

      <div className="main-content">
        <div className="editor-panel">
          <div className="panel-header">
            <h3>Code Editor</h3>
            <div className="panel-actions">
              <span className="text-xs">
                {language} • {code.length} chars
              </span>
            </div>
          </div>
          <div className="editor-container">
            <CodeMirror
              value={code}
              onChange={(val) => setCode(val)}
              extensions={[
                ...getLanguageMode(language),
                EditorView.theme({
                  '&': {
                    fontSize: '14px',
                  },
                  '.cm-content': {
                    padding: '16px',
                    fontFamily: 'JetBrains Mono, Fira Code, Monaco, monospace',
                  },
                  '.cm-focused': {
                    outline: 'none',
                  },
                }),
              ]}
              theme={oneDark}
              readOnly={isExecuting}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                dropCursor: false,
                allowMultipleSelections: false,
                indentOnInput: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: true,
                highlightSelectionMatches: false,
              }}
            />
          </div>
        </div>

        <div className="output-panel">
          <div className="panel-header">
            <h3>Output</h3>
            <div className="panel-actions">
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={clearOutput}
                disabled={isExecuting}
              >
                Clear
              </button>
            </div>
          </div>
          
          <div className="output-container" ref={outputRef}>
            {output ? (
              <pre className="output-text">{output}</pre>
            ) : (
              <div className="output-placeholder">
                <Zap size={48} />
                <p>Click "Run" to execute your code</p>
                <p className="text-sm">Output will appear here in real-time</p>
              </div>
            )}
          </div>

          {waitingForInput && (
            <div className="input-prompt">
              <div className="input-prompt-container">
                <Terminal size={16} />
                <textarea
                  className="input-field"
                  placeholder="Enter all inputs (one per line if multiple inputs needed)..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      sendInput();
                    }
                  }}
                  rows={3}
                  autoFocus
                />
                <button className="btn btn-primary btn-sm" onClick={sendInput}>
                  Send (Ctrl+Enter)
                </button>
              </div>
            </div>
          )}
          
          {executionResult && (
            <div className="execution-stats">
              <div className="stats-grid">
                <div className="stat-item">
                  <Clock size={16} />
                  <span>Time: {formatExecutionTime(executionResult.executionTime)}</span>
                </div>
                {executionResult.stats && (
                  <>
                    <div className="stat-item">
                      <MemoryStick size={16} />
                      <span>Memory: {formatMemory(executionResult.stats.memoryUsed)}</span>
                    </div>
                    <div className="stat-item">
                      <Cpu size={16} />
                      <span>CPU: {executionResult.stats.cpuPercent.toFixed(1)}%</span>
                    </div>
                  </>
                )}
                <div className="stat-item">
                  <Shield size={16} />
                  <span>Status: {executionResult.success ? 'Success' : 'Error'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isExecuting && (
        <div className="execution-indicator">
          <div className="pulse">🔄</div>
          <span>Executing code...</span>
        </div>
      )}
    </div>
  );
}

export default App;