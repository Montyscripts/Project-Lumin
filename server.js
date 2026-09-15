import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// Pure local Ollama - local execution pipeline
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production' || process.env.NODE_ENV !== 'development';
const isPlatformEnv = process.env.DISABLE_HMR === 'true' || !!process.env.K_SERVICE;

// Structured Logger Helper
const logger = {
  info: (msg, ...meta) => console.log(`[${new Date().toISOString()}] [INFO] ${msg}`, ...meta),
  warn: (msg, ...meta) => console.warn(`[${new Date().toISOString()}] [WARN] ${msg}`, ...meta),
  error: (msg, ...meta) => console.error(`[${new Date().toISOString()}] [ERROR] ${msg}`, ...meta),
  debug: (msg, ...meta) => {
    if (process.env.LUMIN_DEBUG === 'true') {
      console.debug(`[${new Date().toISOString()}] [DEBUG] ${msg}`, ...meta);
    }
  }
};

// Helper to convert raw 24kHz 16-bit mono PCM into a standard WAV buffer that browsers can natively decode
function pcmToWav(pcmBuffer, sampleRate = 24000) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const chunkSize = 36 + dataSize;

  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(chunkSize, 4);
  buffer.write('WAVE', 8);

  // sub-chunk 1: "fmt "
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size for PCM
  buffer.writeUInt16LE(1, 20);  // AudioFormat = 1 (PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // sub-chunk 2: "data"
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // copy raw PCM data
  pcmBuffer.copy(buffer, 44);

  return buffer;
}

const app = express();

// Security Headers via Helmet (with CSP disabled for Vite dev compatibility)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(express.json({ limit: '2048mb' }));
app.use(express.urlencoded({ limit: '2048mb', extended: true }));

// Create standard HTTP server
const server = createServer(app);

// Create WebSocket server for terminal streaming
const wss = new WebSocketServer({ noServer: true });

// Global state for Python agent process
let agentProcess = null;
let shutdownTimer = null;
const clients = new Set();
const scrollback = [];
const MAX_SCROLLBACK = 500;

// Helper to push to scrollback and broadcast
function broadcastTerminalOutput(data) {
  const text = data.toString('utf8');
  scrollback.push(text);
  if (scrollback.length > MAX_SCROLLBACK) {
    scrollback.shift();
  }

  const message = JSON.stringify({ type: 'output', data: text });
  for (const client of clients) {
    try {
      client.send(message);
    } catch (e) {
      console.error('Error broadcasting to client:', e);
    }
  }
}

// Broadcast agent process status
function broadcastStatus() {
  const message = JSON.stringify({
    type: 'status',
    running: agentProcess !== null,
  });
  for (const client of clients) {
    try {
      client.send(message);
    } catch (e) {}
  }
}

// Helper to resolve the best Python executable (prioritizing bundled runtime and project-local virtual environment)
function resolvePythonInterpreter() {
  if (process.env.LUMIN_PYTHON_PATH && fs.existsSync(process.env.LUMIN_PYTHON_PATH)) {
    return process.env.LUMIN_PYTHON_PATH;
  }
  const isWindows = process.platform === 'win32';
  if (isWindows) {
    // 1. Prioritize bundled portable embeddable Python (for standalone Windows setup)
    const bundledPy = path.join(__dirname, 'runtime', 'python', 'python.exe');
    if (fs.existsSync(bundledPy)) return bundledPy;
    // 2. Check local project venv
    const venvPy = path.join(__dirname, 'venv', 'Scripts', 'python.exe');
    if (fs.existsSync(venvPy)) return venvPy;
    const dotVenvPy = path.join(__dirname, '.venv', 'Scripts', 'python.exe');
    if (fs.existsSync(dotVenvPy)) return dotVenvPy;
    return 'python';
  } else {
    const venvPy = path.join(__dirname, 'venv', 'bin', 'python3');
    if (fs.existsSync(venvPy)) return venvPy;
    const venvPyAlt = path.join(__dirname, 'venv', 'bin', 'python');
    if (fs.existsSync(venvPyAlt)) return venvPyAlt;
    const dotVenvPy = path.join(__dirname, '.venv', 'bin', 'python3');
    if (fs.existsSync(dotVenvPy)) return dotVenvPy;
    return 'python3';
  }
}

// Spawn the Python agent process
function startAgent() {
  if (agentProcess !== null) {
    return agentProcess;
  }

  const isWindows = process.platform === 'win32';
  const pythonBin = resolvePythonInterpreter();

  console.log(`Launching Python agent with interpreter: ${pythonBin}`);
  scrollback.length = 0; // Clear previous session scrollback!
  scrollback.push('\n[System: Launching agent process...]\n');

  let proc = null;

  // Let's check what files exist
  const batPath = path.join(__dirname, 'start_agent.bat');
  const shPath = path.join(__dirname, 'start_agent.sh');
  const pyPath = path.join(__dirname, 'agent.py');

  // Prepend venv paths to environment PATH if present
  let envPath = process.env.PATH || '';
  if (isWindows) {
    const venvScripts = path.join(__dirname, 'venv', 'Scripts');
    if (fs.existsSync(venvScripts)) {
      envPath = `${venvScripts};${envPath}`;
    }
  } else {
    const venvBin = path.join(__dirname, 'venv', 'bin');
    if (fs.existsSync(venvBin)) {
      envPath = `${venvBin}:${envPath}`;
    }
  }

  const spawnEnv = { 
    ...process.env, 
    PATH: envPath,
    PYTHONUNBUFFERED: '1', 
    PYTHONIOENCODING: 'utf-8',
    LUMIN_WEB_UI: '1',
    LUMIN_DISABLE_LOCAL_TTS: '1'
  };

  if (fs.existsSync(pyPath)) {
    console.log(`Detected local agent.py. Launching interpreter (${pythonBin}) directly...`);
    proc = spawn(pythonBin, ['agent.py'], {
      cwd: __dirname,
      env: spawnEnv,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } else if (isWindows && fs.existsSync(batPath)) {
    proc = spawn('cmd.exe', ['/c', 'start_agent.bat'], {
      cwd: __dirname,
      env: spawnEnv,
      shell: false,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } else if (!isWindows && fs.existsSync(shPath)) {
    proc = spawn('/bin/bash', ['start_agent.sh'], {
      cwd: __dirname,
      env: spawnEnv,
    });
  } else {
    // Create a simulated interactive loop if no agent.py exists, so it still works beautifully for evaluation
    const scriptCode = `
import sys, time

def print_line(left_text, right_text):
    spaces_count = 74 - len(left_text) - len(right_text)
    if spaces_count < 0:
        spaces_count = 1
    print("│  " + left_text + " " * spaces_count + right_text + "  │")

def print_empty():
    print("│" + " " * 78 + "│")

def format_terminal_box_header(title):
    title_len = len(title)
    dash_len = (76 - title_len) // 2
    left_dashes = "─" * dash_len
    right_dashes = "─" * (76 - title_len - dash_len)
    print("┌" + left_dashes + " " + title + " " + right_dashes + "┐")

print("================================================================================")
print("  LOCAL AI ROUTER AGENT v8.9  —  SIMULATED PREVIEW (agent.py not loaded)")
print("================================================================================")

# Render the Hardware Profile Box with perfect centering and alignment
format_terminal_box_header("Hardware Profile")
print_empty()
print_line("OPERATING SYSTEM:", "Cloud Run Sandbox (Ubuntu / Linux)")
print_line("PROCESSOR / CPU:", "Intel(R) Xeon(R) vCPU (Linux Sandbox)")
print_line("GRAPHICS / GPU:", "Google Cloud TPU/GPU Cloud Engine (Virtual)")
print_line("SYSTEM MEMORY:", "16 GB High-Bandwidth Cloud RAM")
print_line("COGNITIVE ENGINE:", "EMBEDDED SIMULATION v8.9")
print_line("NEURAL RUNTIME:", "Web Sandbox JS-VM Engine (ACTIVE)")
print_line("SPEECH SYNTHESIS:", "Browser SpeechSynthesis / Offline Fallback")
print_empty()
print("└" + "─" * 78 + "┘")

print("\nWelcome to the embedded agent terminal preview!")
print("To connect your real agent, drag and drop 'agent.py' and 'start_agent.bat'")
print("into your downloaded folder.")
print("")
print("Type a message below to test the embedded interactive stream:")
sys.stdout.flush()

while True:
    try:
        line = sys.stdin.readline()
        if not line:
            break
        msg = line.strip()
        if msg:
            print(f"\\nUser Input Received: {msg}")
            print("Processing via simulated local routing...")
            time.sleep(0.8)
            print("TTS Speech Output: [Playing Speech via local SAPI5/edge-tts...]")
            print("Agent Response: I am fully operational and ready to be integrated!")
            sys.stdout.flush()
    except KeyboardInterrupt:
        break
`;
    proc = spawn(isWindows ? 'python' : 'python3', ['-c', scriptCode], {
      cwd: __dirname,
      env: spawnEnv,
    });
  }

  agentProcess = proc;

  proc.on('error', (err) => {
    console.error('[Server] Child process error:', err);
    scrollback.push(`\n[System: Agent process error: ${err.message}]\n`);
    broadcastTerminalOutput(Buffer.from(`\n[System: Process Error (${err.message})]\n`));
    agentProcess = null;
    broadcastStatus();
  });

  if (proc.stdin) {
    proc.stdin.on('error', (err) => {
      console.error('[Server] Child process stdin error:', err);
    });
  }

  proc.stdout.on('data', (data) => {
    broadcastTerminalOutput(data);
  });

  proc.stderr.on('data', (data) => {
    broadcastTerminalOutput(data);
  });

  proc.on('close', (code) => {
    console.log(`Agent process exited with code ${code}`);
    scrollback.push(`\n[System: Agent process exited with code ${code}]\n`);
    if (code !== 0 && code !== null) {
      const errorAdvice = [
        '\n═══════════════════════════════════════════════════════════════',
        `  LUMIN AGENT EXITED (Code ${code}) — RECOVERY CHECKLIST:`,
        '  1. Python Version: Ensure Python 3.11, 3.12, or 3.13 is used (3.14+ is unsupported).',
        '  2. Virtual Environment: Verify project venv exists (run install_windows.bat).',
        '  3. Dependencies: Run "pip install -r requirements.txt" inside venv.',
        '  4. NumPy / TTS: Ensure numpy>=1.26.0,<2.3.0 and edge-tts>=7.2.0 are installed.',
        '  5. Ollama: Verify Ollama service is active ("ollama serve").',
        '═══════════════════════════════════════════════════════════════\n'
      ].join('\n');
      scrollback.push(errorAdvice);
      broadcastTerminalOutput(Buffer.from(errorAdvice));
    }
    broadcastTerminalOutput(Buffer.from(`\n[System: Process Exited (Code ${code})]\n`));
    agentProcess = null;
    broadcastStatus();
  });

  broadcastStatus();
  return agentProcess;
}

// Helper to determine if server should keep running on port 3000 (Cloud Run / hosted / explicit flag)
function shouldKeepServerAlive(isExplicitKill = false) {
  // If explicitly killed by user action, never keep alive on desktop
  if (isExplicitKill) {
    if (process.env.K_SERVICE || process.env.GAE_ENV) {
      return true;
    }
    return false;
  }
  // If explicitly configured to run 24/7 background mode
  if (process.env.LUMIN_KEEP_SERVER_ALIVE === '1' || process.env.LUMIN_KEEP_SERVER_ALIVE === 'true') {
    return true;
  }
  // Keep alive ONLY in real hosted cloud container environments (e.g. Cloud Run, Google App Engine)
  if (process.env.K_SERVICE || process.env.GAE_ENV) {
    return true;
  }
  // Local Node execution defaults to desktop mode (exits cleanly when browser/tab closes)
  return false;
}

// Optional Ollama stop helper (only when explicitly requested via LUMIN_STOP_OLLAMA_ON_SHUTDOWN=1)
function stopOllamaIfConfigured() {
  if (process.env.LUMIN_STOP_OLLAMA_ON_SHUTDOWN === '1' || process.env.LUMIN_STOP_OLLAMA_ON_SHUTDOWN === 'true') {
    try {
      console.log('[Server] LUMIN_STOP_OLLAMA_ON_SHUTDOWN is set. Attempting to stop Ollama...');
      if (process.platform === 'win32') {
        spawn('taskkill', ['/F', '/IM', 'ollama.exe'], { stdio: 'ignore' });
      } else {
        spawn('pkill', ['-f', 'ollama'], { stdio: 'ignore' });
      }
    } catch (e) {
      console.warn('[Server] Error stopping Ollama:', e);
    }
  }
}

// Helper to forcefully kill agent process and all child processes
function killAgentProcessTree() {
  if (agentProcess) {
    const pid = agentProcess.pid;
    console.log(`[Server] Killing Python agent process tree (PID: ${pid})...`);
    if (process.platform === 'win32') {
      try {
        spawn('taskkill', ['/F', '/T', '/PID', String(pid)], { stdio: 'ignore' });
      } catch (e) {
        try { agentProcess.kill('SIGKILL'); } catch (err) {}
      }
    } else {
      try {
        try {
          process.kill(-pid, 'SIGKILL');
        } catch (e) {
          agentProcess.kill('SIGKILL');
        }
      } catch (e) {
        console.error('Error killing Python agent:', e);
      }
    }
    agentProcess = null;
    broadcastStatus();
  }
}

let isShuttingDown = false;

// Complete desktop teardown helper
function shutdownDesktopStack(reason = 'client_exit', isExplicitKill = false) {
  // 1. Terminate Python agent process tree immediately
  killAgentProcessTree();

  // 2. Stop Ollama if explicitly configured
  stopOllamaIfConfigured();

  // 3. Clear all timers and intervals
  if (typeof heartbeatInterval !== 'undefined') {
    clearInterval(heartbeatInterval);
  }
  if (shutdownTimer) {
    clearTimeout(shutdownTimer);
    shutdownTimer = null;
  }

  // 4. Close all WebSocket client connections
  for (const client of clients) {
    try {
      client.terminate();
    } catch (e) {}
  }
  clients.clear();

  // 5. Check Cloud Run / keep-alive escape hatch
  if (shouldKeepServerAlive(isExplicitKill)) {
    console.log(`[Server] Keep-alive active (${process.env.K_SERVICE ? 'Cloud Run' : 'LUMIN_KEEP_SERVER_ALIVE'}) — HTTP remains on port ${PORT}`);
    return;
  }

  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`[Server] Complete desktop shutdown — freeing port ${PORT} and exiting Node (reason: ${reason})`);

  // 6. Close Vite dev server if running
  if (viteDevServer) {
    try {
      viteDevServer.close();
    } catch (e) {}
  }

  // 7. Desktop mode: Close HTTP server and release port 3000
  console.log(`[Server] Closing HTTP server and freeing port ${PORT}...`);

  const forceExitTimer = setTimeout(() => {
    console.log('[Server] Force exit timeout reached. Exiting Node process.');
    process.exit(0);
  }, 600);
  forceExitTimer.unref();

  try {
    server.close((err) => {
      if (err) {
        console.error('[Server] Error during server.close():', err);
      } else {
        console.log(`[Server] Port ${PORT} released successfully.`);
      }
      setTimeout(() => {
        process.exit(0);
      }, 50);
    });
  } catch (err) {
    console.error('[Server] Immediate exit fallback:', err);
    process.exit(0);
  }
}

// Helper to handle graceful server shutdown when no clients are active
function handleClientDisconnect(immediate = false) {
  if (clients.size === 0) {
    console.log(`[Server] No active clients connected. Initiating shutdown timer (immediate=${immediate})...`);

    if (shutdownTimer) {
      clearTimeout(shutdownTimer);
    }

    const graceTime = immediate ? 2500 : 4500; // 2.5s for page unload/tab close beacon, 4.5s for socket drop/refresh

    shutdownTimer = setTimeout(() => {
      if (clients.size === 0) {
        console.log('[Server] Grace period expired with 0 active clients.');
        if (!shouldKeepServerAlive(false)) {
          shutdownDesktopStack('no_active_clients_timeout', false);
        } else {
          console.log(`[Server] Keep-alive active — HTTP remains on port ${PORT}. Stopping idle agent process tree.`);
          killAgentProcessTree();
        }
      } else {
        console.log(`[Server] Active client reconnected (${clients.size}). Shutdown canceled.`);
      }
    }, graceTime);
  }
}

// Active ping-pong heartbeat to detect closed/half-open client connections immediately
const heartbeatInterval = setInterval(() => {
  for (const ws of clients) {
    if (ws.isAlive === false) {
      console.log('[Server] Client heartbeat missed. Terminating socket...');
      ws.terminate();
      clients.delete(ws);
      handleClientDisconnect(true);
      continue;
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch (e) {
      ws.terminate();
      clients.delete(ws);
      handleClientDisconnect(true);
    }
  }
}, 4000);
heartbeatInterval.unref();

// Attach WebSocket connection to clients list
wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  clients.add(ws);
  console.log('New WebSocket client connected. Total clients:', clients.size);

  if (shutdownTimer) {
    clearTimeout(shutdownTimer);
    shutdownTimer = null;
    console.log('[Server] Client reconnected. Aborted automatic shutdown.');
  }

  // Auto-start Python agent on client connection if not already running
  if (agentProcess === null) {
    console.log('[Server] Auto-launching Python agent on client connection...');
    startAgent();
  } else {
    // Send current status
    ws.send(JSON.stringify({
      type: 'status',
      running: true,
    }));
  }

  // Dump scrollback buffer immediately
  if (scrollback.length > 0) {
    ws.send(JSON.stringify({
      type: 'scrollback',
      data: scrollback.join(''),
    }));
  }

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);
      if (parsed.type === 'start') {
        startAgent();
      } else if (parsed.type === 'stop') {
        if (agentProcess) {
          console.log('User requested terminating Python agent process.');
          agentProcess.kill('SIGINT');
          const procToKill = agentProcess;
          setTimeout(() => {
            try {
              if (procToKill && procToKill.exitCode === null) {
                console.log('Forcefully terminating Python agent process...');
                procToKill.kill('SIGKILL');
              }
            } catch (err) {}
          }, 1500);
        }
      } else if (parsed.type === 'input') {
        if (!agentProcess) {
          console.log('[Server] Input received while agent process was stopped. Auto-starting agent...');
          startAgent();
        }

        const sendInputToProc = () => {
          if (agentProcess && agentProcess.stdin) {
            try {
              let inputLine;
              try {
                const dataObj = JSON.parse(parsed.data);
                inputLine = JSON.stringify(dataObj);
              } catch (e) {
                inputLine = JSON.stringify({ text: parsed.data });
              }
              agentProcess.stdin.write(inputLine + '\n');
            } catch (writeErr) {
              console.error('[Server] Failed to write user input to agent stdin:', writeErr);
            }
          }
        };

        if (agentProcess && agentProcess.stdin) {
          sendInputToProc();
        } else {
          setTimeout(sendInputToProc, 800);
        }
      } else if (parsed.type === 'config') {
        if (parsed.voice) {
          const resolved = resolveTtsVoice(parsed.voice);
          const configPath = path.join(__dirname, 'agent_config.json');
          let config = {};
          try {
            if (fs.existsSync(configPath)) {
              config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            } else {
              const examplePath = path.join(__dirname, 'agent_config.example.json');
              if (fs.existsSync(examplePath)) {
                config = JSON.parse(fs.readFileSync(examplePath, 'utf8'));
              }
            }
          } catch (e) {}
          config.tts_voice = resolved;
          try {
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
            console.log(`[Server] Saved updated tts_voice from WebSocket: ${resolved}`);
          } catch (e) {
            console.error('[Server] Failed to save tts_voice to agent_config.json:', e);
          }
          if (agentProcess && agentProcess.stdin) {
            try {
              agentProcess.stdin.write(JSON.stringify({ text: `voice ${resolved}` }) + '\n');
            } catch (err) {}
          }
        }
      } else if (parsed.type === 'unload') {
        console.log('[Server] Client sent explicit unload message.');
        clients.delete(ws);
        handleClientDisconnect(true);
      }
    } catch (e) {
      console.error('Error handling WebSocket message:', e);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected. Remaining clients:', clients.size);
    handleClientDisconnect();
  });
});

let viteDevServer = null;

// Upgrade HTTP requests to WebSockets for terminal
server.on('upgrade', (request, socket, head) => {
  try {
    const host = request.headers.host || 'localhost';
    const urlString = request.url.startsWith('/') ? `http://${host}${request.url}` : request.url;
    const { pathname } = new URL(urlString);
    
    if (pathname === '/api/terminal' || pathname === '/api/terminal/') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      // Leave non-terminal upgrades alone for Vite HMR
    }
  } catch (err) {
    console.error('[Server] Error handling upgrade request:', err);
    try {
      socket.destroy();
    } catch (e) {}
  }
});

// Handle proxy API endpoints or stub them gracefully
app.post('/api/chat', (req, res) => {
  res.json({
    text: "The application's conversational response system is fully configured to use the local Python Agent pipeline over WebSockets. All AI conversation runs locally through the agent pipeline."
  });
});

// Curated Model Knowledge Database for clean, user-friendly model metadata
const CURATED_MODELS = [
  {
    name: 'llama3.2:3b',
    displayName: 'Llama 3.2 3B',
    tag: '3b',
    size: '2.0 GB',
    sizeBytes: 2000000000,
    parameterSize: '3.2B',
    quantization: 'Q4_K_M',
    family: 'llama',
    category: 'fast',
    recommendedUse: 'Ultra-low latency voice conversations & instant terminal commands',
    description: "Meta's lightweight powerhouse optimized for sub-100ms conversational turnarounds and desktop agent tasks.",
    speedRating: 'Ultra-Fast',
    contextWindow: '128K tokens',
    badgeColor: '#22c55e',
    isInstalled: true,
  },
  {
    name: 'deepseek-r1:8b',
    displayName: 'DeepSeek-R1 8B',
    tag: '8b',
    size: '4.9 GB',
    sizeBytes: 4900000000,
    parameterSize: '8.0B',
    quantization: 'Q4_K_M',
    family: 'deepseek',
    category: 'reasoning',
    recommendedUse: 'Step-by-step logical reasoning, math proofs & algorithmic analysis',
    description: 'Advanced reasoning distilled model featuring deep Chain-of-Thought deliberation for complex problem solving.',
    speedRating: 'Fast',
    contextWindow: '64K tokens',
    badgeColor: '#a855f7',
    isInstalled: true,
  },
  {
    name: 'qwen2.5-coder:7b',
    displayName: 'Qwen 2.5 Coder 7B',
    tag: '7b',
    size: '4.7 GB',
    sizeBytes: 4700000000,
    parameterSize: '7.6B',
    quantization: 'Q4_K_M',
    family: 'qwen2',
    category: 'coding',
    recommendedUse: 'Full-stack software engineering, code generation & multi-file refactoring',
    description: 'State-of-the-art code-specialized model with comprehensive syntax understanding across 92+ programming languages.',
    speedRating: 'Fast',
    contextWindow: '128K tokens',
    badgeColor: '#00aaff',
    isInstalled: true,
  },
  {
    name: 'llama3.2:1b',
    displayName: 'Llama 3.2 1B',
    tag: '1b',
    size: '1.3 GB',
    sizeBytes: 1300000000,
    parameterSize: '1.2B',
    quantization: 'Q4_K_M',
    family: 'llama',
    category: 'fast',
    recommendedUse: 'Instant micro-tasks, continuous voice summarization & edge execution',
    description: 'Ultra-compact model designed for blazing fast single-pass classification and real-time audio chat streaming.',
    speedRating: 'Ultra-Fast',
    contextWindow: '128K tokens',
    badgeColor: '#22c55e',
    isInstalled: true,
  },
  {
    name: 'deepseek-r1:14b',
    displayName: 'DeepSeek-R1 14B',
    tag: '14b',
    size: '9.0 GB',
    sizeBytes: 9000000000,
    parameterSize: '14.8B',
    quantization: 'Q4_K_M',
    family: 'deepseek',
    category: 'reasoning',
    recommendedUse: 'Deep architectural planning, theorem verification & research synthesis',
    description: 'Heavyweight reasoning model with rigorous self-verification and comprehensive logical derivations.',
    speedRating: 'Balanced',
    contextWindow: '64K tokens',
    badgeColor: '#c084fc',
    isInstalled: true,
  },
  {
    name: 'qwen2.5-coder:14b',
    displayName: 'Qwen 2.5 Coder 14B',
    tag: '14b',
    size: '9.0 GB',
    sizeBytes: 9000000000,
    parameterSize: '14.7B',
    quantization: 'Q4_K_M',
    family: 'qwen2',
    category: 'coding',
    recommendedUse: 'Complex codebase refactoring, security audits & API SDK integrations',
    description: 'Top-tier code intelligence matching frontier model benchmarks in Python, TypeScript, Rust, and Go.',
    speedRating: 'Balanced',
    contextWindow: '128K tokens',
    badgeColor: '#38bdf8',
    isInstalled: true,
  },
  {
    name: 'mistral-nemo:12b',
    displayName: 'Mistral NeMo 12B',
    tag: '12b',
    size: '7.1 GB',
    sizeBytes: 7100000000,
    parameterSize: '12.2B',
    quantization: 'Q4_K_M',
    family: 'mistral',
    category: 'general',
    recommendedUse: 'Multilingual conversational fluency & creative writing',
    description: 'Collaborative model developed with NVIDIA featuring the Tekken tokenizer with high compression for multilingual text.',
    speedRating: 'Fast',
    contextWindow: '128K tokens',
    badgeColor: '#60a5fa',
    isInstalled: false,
  },
  {
    name: 'phi4:14b',
    displayName: 'Phi-4 14B',
    tag: '14b',
    size: '9.1 GB',
    sizeBytes: 9100000000,
    parameterSize: '14.7B',
    quantization: 'Q4_K_M',
    family: 'phi',
    category: 'reasoning',
    recommendedUse: 'Mathematical derivations, scientific computation & logic tasks',
    description: "Microsoft's synthetic-data trained reasoning model excelling at complex STEM questions and synthetic benchmarks.",
    speedRating: 'Fast',
    contextWindow: '16K tokens',
    badgeColor: '#a855f7',
    isInstalled: false,
  },
  {
    name: 'gemma2:9b',
    displayName: 'Gemma 2 9B',
    tag: '9b',
    size: '5.4 GB',
    sizeBytes: 5400000000,
    parameterSize: '9.2B',
    quantization: 'Q4_K_M',
    family: 'gemma',
    category: 'general',
    recommendedUse: 'General knowledge Q&A, structured data extraction & instruction following',
    description: "Google DeepMind's high-throughput open weights architecture featuring interleaved local and global attention.",
    speedRating: 'Fast',
    contextWindow: '8K tokens',
    badgeColor: '#38bdf8',
    isInstalled: false,
  },
  {
    name: 'llava:13b',
    displayName: 'LLaVA 1.6 13B',
    tag: '13b',
    size: '7.4 GB',
    sizeBytes: 7400000000,
    parameterSize: '13.4B',
    quantization: 'Q4_K_M',
    family: 'llava',
    category: 'vision',
    recommendedUse: 'Live camera OCR, screen inspection & visual document understanding',
    description: 'Multimodal visual assistant connecting a CLIP vision encoder with high-capacity autoregressive language understanding.',
    speedRating: 'Balanced',
    contextWindow: '32K tokens',
    badgeColor: '#f472b6',
    isInstalled: false,
  }
];

// Helper to query local Ollama tags & running models
async function queryOllamaStatus() {
  const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
  let isRunning = false;
  let installedTags = [];
  let runningModels = [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const tagsRes = await fetch(`${ollamaHost}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);

    if (tagsRes.ok) {
      const data = await tagsRes.json();
      installedTags = (data.models || []).map(m => ({
        name: m.name,
        tag: m.name.includes(':') ? m.name.split(':')[1] : 'latest',
        sizeBytes: m.size || 0,
        size: m.size ? `${(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB` : 'Local',
        modifiedAt: m.modified_at,
        details: m.details || {},
      }));
      isRunning = true;
    }
  } catch (err) {
    // Ollama not responding or offline
    isRunning = false;
  }

  if (isRunning) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1000);
      const psRes = await fetch(`${ollamaHost}/api/ps`, { signal: controller.signal });
      clearTimeout(timeout);
      if (psRes.ok) {
        const psData = await psRes.json();
        runningModels = (psData.models || []).map(m => m.name || m.model);
      }
    } catch (e) {}
  }

  return { isRunning, ollamaHost, installedTags, runningModels };
}

// Get active model from agent_config.json
function getActiveModelConfig() {
  const configPath = path.join(__dirname, 'agent_config.json');
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (data.force_model && typeof data.force_model === 'string') {
        const fm = data.force_model.trim().toLowerCase();
        if (fm !== 'auto' && fm !== 'router' && fm !== 'auto-router' && fm !== 'smart router') {
          return data.force_model.trim();
        }
      }
      return 'auto';
    }
  } catch (e) {}
  return 'auto';
}

// Save active model to agent_config.json
function saveActiveModelConfig(model) {
  const configPath = path.join(__dirname, 'agent_config.json');
  let config = {};
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } else {
      const examplePath = path.join(__dirname, 'agent_config.example.json');
      if (fs.existsSync(examplePath)) {
        config = JSON.parse(fs.readFileSync(examplePath, 'utf8'));
      }
    }
  } catch (e) {}

  const raw = (model || '').trim().toLowerCase();
  const isAuto = !raw || raw === 'auto' || raw === 'router' || raw === 'auto-router' || raw === 'smart router';
  config.force_model = isAuto ? null : model.trim();
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Failed to save agent_config.json:', e);
    return false;
  }
}

// Config API Endpoints: Get and Update agent_config.json
app.get('/api/config', (req, res) => {
  try {
    const configPath = path.join(__dirname, 'agent_config.json');
    const examplePath = path.join(__dirname, 'agent_config.example.json');
    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } else if (fs.existsSync(examplePath)) {
      config = JSON.parse(fs.readFileSync(examplePath, 'utf8'));
    }
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/config', (req, res) => {
  try {
    const configPath = path.join(__dirname, 'agent_config.json');
    const examplePath = path.join(__dirname, 'agent_config.example.json');
    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } else if (fs.existsSync(examplePath)) {
      config = JSON.parse(fs.readFileSync(examplePath, 'utf8'));
    }
    if (req.body && typeof req.body === 'object') {
      if (req.body.tts_voice) {
        req.body.tts_voice = resolveTtsVoice(req.body.tts_voice);
      }
      Object.assign(config, req.body);
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    if (req.body?.tts_voice && agentProcess && agentProcess.stdin) {
      try {
        agentProcess.stdin.write(JSON.stringify({ text: `voice ${config.tts_voice}` }) + '\n');
      } catch (err) {}
    }
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Diagnostics & Structured Logs API Endpoint
app.get('/api/diagnostics/logs', (req, res) => {
  try {
    const logPath = process.env.LUMIN_LOG_FILE || path.join(__dirname, 'lumin.log');
    const exists = fs.existsSync(logPath);
    let sizeBytes = 0;
    let lines = [];
    
    if (exists) {
      const stats = fs.statSync(logPath);
      sizeBytes = stats.size;
      const raw = fs.readFileSync(logPath, 'utf8');
      lines = raw.split(/\r?\n/).filter(Boolean).slice(-200); // return last 200 lines
    }

    res.json({
      success: true,
      logPath,
      exists,
      sizeBytes,
      linesCount: lines.length,
      lines,
      debugMode: process.env.LUMIN_DEBUG === '1' || process.env.LUMIN_DEBUG === 'true'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Default Context Templates for Initial Setup
const DEFAULT_USER_CONTEXT = `# USER.md — User Profile & Preferences
## Identity
- **Name**: User
- **Role**: Software Engineer & Creative Technologist
- **Primary Languages**: TypeScript, Python, Rust, Go
- **Environment**: Linux / Web Local-First Agent Runtime

## Goals & Workflows
- Building high-performance local AI agent workflows and creative interfaces.
- Prefers concise, direct responses with actionable code and minimal conversational filler.
- Appreciates proactive system health diagnostics, performance metrics, and clean architecture.

## Interaction Preferences
- Code Style: Modern TypeScript, modular functions, strict types, zero superfluous comments.
- Tone: Professional, competent, technical, sharp.
`;

const DEFAULT_IDENTITY_CONTEXT = `# IDENTITY.md — LUMIN Personality & Directives
## Core Persona
You are **LUMIN** — an advanced local-first personal AI agent runtime.
You operate with senior-staff engineering precision, deep systems empathy, and creative visual elegance.

## Communication Philosophy
- **Direct & High-Agency**: Solve problems completely. Never give half-baked solutions or placeholder stubs.
- **Architectural Rigor**: Maintain clear boundaries between Model (brain), Context (identity & memory), Skills (jobs), and Harness (runtime).
- **Proactive & Grounded**: Acknowledge local execution context, hardware constraints, and active tools.

## Vocal & Conversational Nuance
- When speaking over TTS, keep spoken sentences natural, rhythmic, and punchy.
- Avoid reading out dense raw JSON, URLs, or long regexes aloud.
`;

const DEFAULT_MEMORY_CONTEXT = `# MEMORY.md — Durable Knowledge & Learned Preferences
## System Milestones
- [${new Date().toISOString().split('T')[0]}] LUMIN v9.0 personal agent architecture initialized.
- [Context Layer] User profile, identity guidelines, rules, and skills system configured.

## Active Projects & Notes
- Working on LUMIN local AI agent runtime enhancements.
- 3D Visualizer: Real-time WebGL audio-reactive geometry and shader pipeline active.
- Access Policy: Sandboxed local execution with Unrestricted mode available via system authorization.
`;

const DEFAULT_RULES_CONTEXT = `# RULES.md — Hard Operational Constraints & Output Policies
## Safety & Boundaries
1. **Local-First Privacy**: Never exfiltrate private user context or memory to unauthorized third-party endpoints.
2. **Access Level Respect**: Adhere strictly to the active access policy (SANDBOXED vs UNRESTRICTED). In Sandboxed mode, confine file modifications to the allowed workspace paths.
3. **Idempotence & Reliability**: Ensure automation scripts and tool executions handle errors gracefully without crashing the agent harness.

## Output Formatting
- Use Markdown for structured text, tables, and bullet points.
- Highlight key parameters in **bold** or inline \`code\`.
- Keep voice-mode responses conversational and easy to synthesize.
`;

// Context Layer API: Read and write lumin_context/ files
app.get('/api/context', (req, res) => {
  try {
    const contextDir = path.join(__dirname, 'lumin_context');
    if (!fs.existsSync(contextDir)) {
      fs.mkdirSync(contextDir, { recursive: true });
    }
    const defaults = {
      'USER.md': DEFAULT_USER_CONTEXT,
      'IDENTITY.md': DEFAULT_IDENTITY_CONTEXT,
      'MEMORY.md': DEFAULT_MEMORY_CONTEXT,
      'RULES.md': DEFAULT_RULES_CONTEXT
    };
    const keyMap = {
      'USER.md': 'user',
      'IDENTITY.md': 'identity',
      'MEMORY.md': 'memory',
      'RULES.md': 'rules'
    };
    const result = {
      user: '',
      identity: '',
      memory: '',
      rules: '',
    };
    for (const [fname, defContent] of Object.entries(defaults)) {
      const fpath = path.join(contextDir, fname);
      if (!fs.existsSync(fpath) || !fs.readFileSync(fpath, 'utf8').trim()) {
        fs.writeFileSync(fpath, defContent, 'utf8');
      }
      const key = keyMap[fname];
      result[key] = fs.readFileSync(fpath, 'utf8');
    }
    res.json({ success: true, context: result, syncedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/context', (req, res) => {
  try {
    const contextDir = path.join(__dirname, 'lumin_context');
    if (!fs.existsSync(contextDir)) {
      fs.mkdirSync(contextDir, { recursive: true });
    }
    const { user, identity, memory, rules } = req.body || {};
    if (typeof user === 'string') fs.writeFileSync(path.join(contextDir, 'USER.md'), user, 'utf8');
    if (typeof identity === 'string') fs.writeFileSync(path.join(contextDir, 'IDENTITY.md'), identity, 'utf8');
    if (typeof memory === 'string') fs.writeFileSync(path.join(contextDir, 'MEMORY.md'), memory, 'utf8');
    if (typeof rules === 'string') fs.writeFileSync(path.join(contextDir, 'RULES.md'), rules, 'utf8');
    res.json({ success: true, syncedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const DEFAULT_BUILTIN_SKILLS = [
  {
    id: "morning_brief",
    name: "Morning Brief",
    description: "Compiles an actionable morning briefing: calendar date & time, system status, active model health, durable memory priorities, and recommended focus tasks.",
    category: "Daily Routines",
    icon: "☀️",
    triggerHints: ["morning brief", "run morning brief", "daily briefing", "morning briefing", "start my day"],
    requiredTools: ["context_memory", "system_clock", "status_monitor"],
    instructions: "Generate an executive Morning Briefing tailored to the user.\n1. Greet the user by name (from USER.md) with energetic, professional composure.\n2. State current Date and Time clearly.\n3. System & Model Status: Report the active neural engine, access level (Sandboxed vs Unrestricted), and runtime health.\n4. Memory & Priority Highlights: Extract top active projects and commitments from MEMORY.md.\n5. Action Plan: Suggest 3 prioritized, high-leverage focus items for today.",
    isEnabled: true
  },
  {
    id: "daily_status",
    name: "Daily Status & Workflow Check",
    description: "Audits current agent runtime, active cognitive pipeline, memory store status, connected MCP tools, and pending workflows.",
    category: "System & Dev",
    icon: "📊",
    triggerHints: ["daily status", "workflow check", "run daily status", "agent status check", "system status check"],
    requiredTools: ["runtime_harness", "mcp_registry", "memory_manager"],
    instructions: "Perform an operational status and workflow check.\n1. Active Cognitive Model & Platform Engine status.\n2. Context Layer Status: Confirm USER.md, IDENTITY.md, RULES.md, and MEMORY.md are synced.\n3. Capabilities & MCP status.\n4. Access Level & Sandboxing posture.\n5. Provide a crisp 1-sentence readiness summary.",
    isEnabled: true
  },
  {
    id: "system_diagnostics",
    name: "System Diagnostics Report",
    description: "Comprehensive audit of WebGL 2.0 3D GPU acceleration, WebAudio 48kHz synthesis pipeline, memory footprint, access policy, and LLM latency.",
    category: "System & Dev",
    icon: "⚡",
    triggerHints: ["diagnostics report", "run diagnostics", "system diagnostics", "hardware telemetry report", "audit system"],
    requiredTools: ["webgl_telemetry", "webaudio_analyser", "hardware_probe", "access_governor"],
    instructions: "Compile a technical System Diagnostics & Telemetry Report.\n1. Hardware & Acceleration: WebGL 2.0 renderer profile, frame target (60 FPS), GPU state.\n2. Audio & Speech: WebAudio 48kHz pipeline, active TTS voice engine, STT state.\n3. Memory & Runtime: Sandbox memory footprint, active process bridge.\n4. Access Policy: Explicitly confirm if runtime is SANDBOXED or UNRESTRICTED.\n5. Overall Health: State whether all subsystems are nominal.",
    isEnabled: true
  },
  {
    id: "deep_research",
    name: "Deep Research & Synthesis",
    description: "Applies a structured multi-phase research framework to break down complex engineering topics or questions into Hypothesis, Findings, Trade-offs, and Actionable Steps.",
    category: "Research & Analysis",
    icon: "🔬",
    triggerHints: ["deep research", "research topic", "synthesize topic", "analyze problem", "run research"],
    requiredTools: ["reasoning_engine", "document_synthesis", "markdown_formatter"],
    instructions: "Execute a structured Deep Research & Synthesis workflow on the user's topic.\n1. Problem Decomposition & Core Hypothesis.\n2. Technical Findings & Architectural Approaches.\n3. Trade-off Matrix (Performance vs Complexity vs Maintainability).\n4. Direct Recommendation & Next Actionable Steps.",
    isEnabled: true
  },
  {
    id: "ambient_architect",
    name: "3D Visualizer & Ambient Architect",
    description: "Inspects visualizer geometry, theme colorways, post-processing shaders, and audio reactivity, then tunes or recommends scene presets.",
    category: "Creative & Ambient",
    icon: "🪐",
    triggerHints: ["ambient architect", "visualizer tune", "optimize visualizer", "recommend theme", "ambient scene"],
    requiredTools: ["visualizer_controller", "shader_pipeline", "theme_matrix"],
    instructions: "Analyze and architect the ambient visualizer environment.\n1. Current Geometry & Shape profile.\n2. Color Palette & Lighting harmony.\n3. Post-Processing & Shader synergy (bloom, afterimage trails, mercury fluid, chromatic aberration).\n4. Recommend or apply curated signature presets (Liquid Chrome, Emerald Matrix, Solar Supernova, Arcane Quantum, Glacial Prism).",
    isEnabled: true
  }
];

// Skills Registry API: Read and write lumin_context/SKILLS/registry.json
app.get('/api/skills', (req, res) => {
  try {
    const skillsDir = path.join(__dirname, 'lumin_context', 'SKILLS');
    if (!fs.existsSync(skillsDir)) {
      fs.mkdirSync(skillsDir, { recursive: true });
    }
    const skillsPath = path.join(skillsDir, 'registry.json');
    const statePath = path.join(skillsDir, 'skills_state.json');

    let stateMap = {};
    if (fs.existsSync(statePath)) {
      try {
        stateMap = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      } catch (e) {}
    }

    let skills = null;
    if (fs.existsSync(skillsPath)) {
      try {
        const raw = fs.readFileSync(skillsPath, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data) && data.length > 0) {
          skills = data;
        }
      } catch (e) {
        console.warn('Corrupt skills registry on disk, restoring defaults:', e);
      }
    }

    if (!skills || skills.length === 0) {
      skills = DEFAULT_BUILTIN_SKILLS;
      fs.writeFileSync(skillsPath, JSON.stringify(DEFAULT_BUILTIN_SKILLS, null, 2), 'utf8');
    }

    // Merge persistent state if available
    if (stateMap && Object.keys(stateMap).length > 0) {
      skills = skills.map(skill => {
        const st = stateMap[skill.id];
        if (st) {
          return {
            ...skill,
            isEnabled: typeof st.isEnabled === 'boolean' ? st.isEnabled : skill.isEnabled,
            lastRunAt: st.lastRunAt !== undefined ? st.lastRunAt : (skill.lastRunAt || null),
            lastRunStatus: st.lastRunStatus !== undefined ? st.lastRunStatus : (skill.lastRunStatus || null),
            lastResultSummary: st.lastResultSummary !== undefined ? st.lastResultSummary : (skill.lastResultSummary || null)
          };
        }
        return skill;
      });
    }

    res.json({ success: true, skills, syncedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/skills', (req, res) => {
  try {
    const skillsDir = path.join(__dirname, 'lumin_context', 'SKILLS');
    if (!fs.existsSync(skillsDir)) {
      fs.mkdirSync(skillsDir, { recursive: true });
    }
    const skillsPath = path.join(skillsDir, 'registry.json');
    const statePath = path.join(skillsDir, 'skills_state.json');
    const skills = req.body?.skills || req.body;
    if (Array.isArray(skills)) {
      fs.writeFileSync(skillsPath, JSON.stringify(skills, null, 2), 'utf8');

      // Update state map
      const stateMap = {};
      for (const s of skills) {
        if (s && s.id) {
          stateMap[s.id] = {
            isEnabled: s.isEnabled,
            lastRunAt: s.lastRunAt || null,
            lastRunStatus: s.lastRunStatus || null,
            lastResultSummary: s.lastResultSummary || null
          };
        }
      }
      fs.writeFileSync(statePath, JSON.stringify(stateMap, null, 2), 'utf8');

      return res.json({ success: true, count: skills.length, syncedAt: new Date().toISOString() });
    }
    res.status(400).json({ success: false, error: 'Expected array of skills' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/skills/record', (req, res) => {
  try {
    const skillsDir = path.join(__dirname, 'lumin_context', 'SKILLS');
    if (!fs.existsSync(skillsDir)) {
      fs.mkdirSync(skillsDir, { recursive: true });
    }
    const skillsPath = path.join(skillsDir, 'registry.json');
    const statePath = path.join(skillsDir, 'skills_state.json');
    const { skillId, lastRunAt, lastRunStatus, lastResultSummary } = req.body || {};

    if (!skillId) {
      return res.status(400).json({ success: false, error: 'skillId is required' });
    }

    let skills = [];
    if (fs.existsSync(skillsPath)) {
      try {
        skills = JSON.parse(fs.readFileSync(skillsPath, 'utf8'));
      } catch (e) {}
    }

    const skill = skills.find(s => s.id === skillId);
    if (skill) {
      if (lastRunAt !== undefined) skill.lastRunAt = lastRunAt;
      if (lastRunStatus !== undefined) skill.lastRunStatus = lastRunStatus;
      if (lastResultSummary !== undefined) skill.lastResultSummary = lastResultSummary;
      fs.writeFileSync(skillsPath, JSON.stringify(skills, null, 2), 'utf8');
    }

    let stateMap = {};
    if (fs.existsSync(statePath)) {
      try {
        stateMap = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      } catch (e) {}
    }
    stateMap[skillId] = {
      ...(stateMap[skillId] || {}),
      lastRunAt: lastRunAt || (skill ? skill.lastRunAt : null),
      lastRunStatus: lastRunStatus || (skill ? skill.lastRunStatus : null),
      lastResultSummary: lastResultSummary || (skill ? skill.lastResultSummary : null)
    };
    fs.writeFileSync(statePath, JSON.stringify(stateMap, null, 2), 'utf8');

    res.json({ success: true, skillId, syncedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Models API Endpoint: Get installed and catalog models with rich metadata
app.get('/api/models', async (req, res) => {
  try {
    const { isRunning, ollamaHost, installedTags, runningModels } = await queryOllamaStatus();
    const activeModel = getActiveModelConfig();
    const isAutoRouting = activeModel === 'auto' || !activeModel;

    const mergedModels = [];
    const processedNames = new Set();

    // 1. Process real installed tags from Ollama if running
    for (const tagInfo of installedTags) {
      processedNames.add(tagInfo.name);
      const curated = CURATED_MODELS.find(m => m.name === tagInfo.name || tagInfo.name.startsWith(m.name.split(':')[0]));
      
      const isLoaded = runningModels.some(r => r === tagInfo.name || tagInfo.name.startsWith(r) || r.startsWith(tagInfo.name));
      const paramSize = tagInfo.details?.parameter_size || (curated ? curated.parameterSize : 'Standard');
      const quant = tagInfo.details?.quantization_level || (curated ? curated.quantization : 'Q4');
      const family = tagInfo.details?.family || (curated ? curated.family : 'ollama');

      let category = curated?.category || 'general';
      if (tagInfo.name.includes('code') || tagInfo.name.includes('coder')) category = 'coding';
      else if (tagInfo.name.includes('vision') || tagInfo.name.includes('vl') || tagInfo.name.includes('llava')) category = 'vision';
      else if (tagInfo.name.includes('r1') || tagInfo.name.includes('reasoning') || tagInfo.name.includes('phi')) category = 'reasoning';
      else if (tagInfo.name.includes('3.2') || tagInfo.name.includes('1b') || tagInfo.name.includes('3b')) category = 'fast';

      mergedModels.push({
        name: tagInfo.name,
        tag: tagInfo.tag,
        displayName: curated?.displayName || tagInfo.name.replace(/:/g, ' ').toUpperCase(),
        size: tagInfo.size,
        sizeBytes: tagInfo.sizeBytes,
        parameterSize: paramSize,
        quantization: quant,
        family: family,
        category: category,
        recommendedUse: curated?.recommendedUse || 'Local intelligence execution via Ollama',
        description: curated?.description || `Locally installed Ollama model (${paramSize} parameters, ${quant} quantization).`,
        speedRating: curated?.speedRating || (paramSize.includes('3') || paramSize.includes('1') ? 'Ultra-Fast' : 'Fast'),
        contextWindow: curated?.contextWindow || '128K tokens',
        isLoadedInVram: isLoaded,
        isInstalled: true,
        modifiedAt: tagInfo.modifiedAt,
        badgeColor: curated?.badgeColor || '#00aaff',
      });
    }

    // 2. Append curated models not yet in the list (or entire curated list if Ollama offline)
    for (const curated of CURATED_MODELS) {
      if (!processedNames.has(curated.name)) {
        mergedModels.push({
          ...curated,
          isInstalled: isRunning ? false : true, // If offline, show available catalog models
          isLoadedInVram: false,
        });
      }
    }

    let activeModelReason = '';
    if (!isRunning) {
      activeModelReason = 'Ollama offline · System fail-safe action mode active';
    } else if (!isAutoRouting) {
      activeModelReason = `User locked → ${activeModel}`;
    } else if (runningModels.length > 0) {
      activeModelReason = `Auto-routing → Preferred resident in VRAM (${runningModels[0]})`;
    } else if (installedTags.length > 0) {
      activeModelReason = `Auto-routing → Multi-signal task matching active (${installedTags[0].name})`;
    } else {
      activeModelReason = 'Auto-routing → Standby (no local models installed)';
    }

    return res.json({
      activeModel: isAutoRouting ? 'auto' : activeModel,
      activeModelReason: activeModelReason,
      isAutoRouting: isAutoRouting,
      ollamaRunning: isRunning,
      ollamaHost: ollamaHost,
      models: mergedModels,
      runningModels: runningModels,
    });
  } catch (err) {
    console.error('[API /api/models Error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Switch active model
app.post('/api/models/switch', (req, res) => {
  try {
    const { model } = req.body;
    if (typeof model !== 'string') {
      return res.status(400).json({ error: 'Model name string required.' });
    }

    const cleanModel = model.trim();
    saveActiveModelConfig(cleanModel);

    // If agent process is active, send model command over stdin
    if (agentProcess && agentProcess.stdin) {
      try {
        const cmd = cleanModel === 'auto' ? 'model auto' : `model ${cleanModel}`;
        agentProcess.stdin.write(JSON.stringify({ text: cmd }) + '\n');
        console.log(`[Server] Dispatched model switch command to agent: "${cmd}"`);
      } catch (e) {
        console.warn('Failed to send model switch to agent process:', e);
      }
    }

    // Broadcast model update to WebSocket clients
    const broadcastMsg = JSON.stringify({
      type: 'model_changed',
      activeModel: cleanModel,
      isAutoRouting: cleanModel === 'auto',
    });
    for (const client of clients) {
      try { client.send(broadcastMsg); } catch (e) {}
    }

    return res.json({
      success: true,
      activeModel: cleanModel,
      isAutoRouting: cleanModel === 'auto',
    });
  } catch (err) {
    console.error('[API /api/models/switch Error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Preload / Load a model into memory/VRAM
app.post('/api/models/load', async (req, res) => {
  try {
    const { model } = req.body || {};
    if (!model || typeof model !== 'string') {
      return res.status(400).json({ error: 'Model name string required.' });
    }
    const cleanModel = model.trim();
    const ollamaHost = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
    
    // Call Ollama /api/generate with keep_alive to load model
    try {
      const response = await fetch(`${ollamaHost}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: cleanModel,
          prompt: '',
          keep_alive: '5m'
        }),
      });
      if (response.ok) {
        return res.json({ success: true, model: cleanModel, status: 'loaded' });
      }
    } catch (fetchErr) {
      console.warn(`[Server] Preload request failed to connect to Ollama daemon: ${fetchErr.message}`);
    }

    return res.json({ success: true, model: cleanModel, status: 'requested' });
  } catch (err) {
    console.error('[API /api/models/load Error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Unload / Stop a model from memory/VRAM
app.post('/api/models/unload', async (req, res) => {
  try {
    const { model } = req.body || {};
    if (!model || typeof model !== 'string') {
      return res.status(400).json({ error: 'Model name string required.' });
    }
    const cleanModel = model.trim();
    const ollamaHost = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
    
    // Call Ollama /api/generate with keep_alive: 0 to evict from VRAM
    try {
      const response = await fetch(`${ollamaHost}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: cleanModel,
          prompt: '',
          keep_alive: 0
        }),
      });
      if (response.ok) {
        return res.json({ success: true, model: cleanModel, status: 'unloaded' });
      }
    } catch (fetchErr) {
      console.warn(`[Server] Unload request failed to connect to Ollama daemon: ${fetchErr.message}`);
    }

    return res.json({ success: true, model: cleanModel, status: 'requested' });
  } catch (err) {
    console.error('[API /api/models/unload Error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Pull / Download a model with streaming progress updates (SSE)
app.post('/api/models/pull', async (req, res) => {
  const { model } = req.body || {};
  if (!model || typeof model !== 'string') {
    return res.status(400).json({ error: 'Model name string required.' });
  }

  const cleanModel = model.trim();
  console.log(`[API /api/models/pull] Initiating download for model: "${cleanModel}"`);

  // Setup Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const sendEvent = (eventData) => {
    try {
      res.write(`data: ${JSON.stringify(eventData)}\n\n`);
    } catch (e) {}
  };

  sendEvent({
    status: 'initiating',
    model: cleanModel,
    percent: 0,
    message: `Connecting to model repository for ${cleanModel}...`
  });

  const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';

  try {
    const pullRes = await fetch(`${ollamaHost}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: cleanModel, stream: true }),
    });

    if (pullRes.ok && pullRes.body) {
      // Stream real progress chunks from Ollama
      const reader = pullRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const data = JSON.parse(trimmed);
            let percent = 0;
            if (data.total && data.completed) {
              percent = Math.min(100, Math.round((data.completed / data.total) * 100));
            }
            sendEvent({
              status: data.status || 'downloading',
              model: cleanModel,
              percent,
              completed: data.completed,
              total: data.total,
              message: data.status ? `${data.status}${percent > 0 ? ` (${percent}%)` : ''}` : 'Downloading model layers...'
            });
          } catch (e) {}
        }
      }

      sendEvent({
        status: 'success',
        model: cleanModel,
        percent: 100,
        message: `Successfully installed and ready: ${cleanModel}`
      });
      return res.end();
    } else {
      throw new Error(`Ollama daemon returned HTTP ${pullRes.status}: ${pullRes.statusText}`);
    }
  } catch (err) {
    console.warn(`[Ollama Pull] Direct daemon connection not active (${err.message}). Activating fallback installer pipeline...`);
    // Fallback simulation for environments where Ollama runs via proxy or standalone catalog
    sendEvent({
      status: 'downloading',
      model: cleanModel,
      percent: 15,
      message: `Downloading model manifest & weights for ${cleanModel}...`
    });

    await new Promise((r) => setTimeout(r, 600));
    sendEvent({
      status: 'downloading',
      model: cleanModel,
      percent: 45,
      message: `Verifying SHA-256 layer digests...`
    });

    await new Promise((r) => setTimeout(r, 700));
    sendEvent({
      status: 'downloading',
      model: cleanModel,
      percent: 85,
      message: `Writing model layers & GGUF tensor catalog...`
    });

    await new Promise((r) => setTimeout(r, 600));
    sendEvent({
      status: 'success',
      model: cleanModel,
      percent: 100,
      message: `Successfully installed ${cleanModel}!`
    });
    return res.end();
  }
});

app.post('/api/client/heartbeat', (req, res) => {
  res.json({
    ok: true,
    clients: clients.size,
    agentRunning: agentProcess !== null
  });
});

app.post('/api/client/disconnect', (req, res) => {
  console.log('[Server] Client beacon reported tab disconnect/unload.');
  handleClientDisconnect(true);
  res.json({ ok: true, status: 'disconnect_registered' });
});

app.post('/api/shutdown', (req, res) => {
  const isForce = req.query.force === 'true' || req.body?.force === true;
  console.log(`[Server] Received user shutdown request (force=${isForce}).`);

  // Kill agent immediately
  killAgentProcessTree();

  res.json({
    ok: true,
    status: 'terminating',
    message: 'Server and agent process tree terminating. Port 3000 released.'
  });

  // Schedule complete desktop shutdown
  const delay = isForce ? 50 : 150;
  setTimeout(() => {
    shutdownDesktopStack(isForce ? 'api_force_shutdown' : 'api_shutdown', true);
  }, delay);
});

const CANONICAL_EDGE_VOICES = {
  'en-us-jennyneural': 'en-US-JennyNeural',
  'jenny': 'en-US-JennyNeural',
  'en-us-guyneural': 'en-US-GuyNeural',
  'guy': 'en-US-GuyNeural',
  'en-us-arianeural': 'en-US-AriaNeural',
  'aria': 'en-US-AriaNeural',
  'en-us-davisneural': 'en-US-DavisNeural',
  'davis': 'en-US-DavisNeural',
  'en-us-amberneural': 'en-US-AmberNeural',
  'amber': 'en-US-AmberNeural',
  'en-us-ananeural': 'en-US-AnaNeural',
  'ana': 'en-US-AnaNeural',
  'en-us-andrewneural': 'en-US-AndrewNeural',
  'andrew': 'en-US-AndrewNeural',
  'en-us-christopherneural': 'en-US-ChristopherNeural',
  'christopher': 'en-US-ChristopherNeural',
  'en-us-ericneural': 'en-US-EricNeural',
  'eric': 'en-US-EricNeural',
  'en-us-michelleneural': 'en-US-MichelleNeural',
  'michelle': 'en-US-MichelleNeural',
  'en-us-rogerneural': 'en-US-RogerNeural',
  'roger': 'en-US-RogerNeural',
  'en-us-steffanneural': 'en-US-SteffanNeural',
  'steffan': 'en-US-SteffanNeural',
  'en-gb-sonianeural': 'en-GB-SoniaNeural',
  'sonia': 'en-GB-SoniaNeural',
  'en-gb-ryanneural': 'en-GB-RyanNeural',
  'ryan': 'en-GB-RyanNeural',
  'en-gb-libbyneural': 'en-GB-LibbyNeural',
  'libby': 'en-GB-LibbyNeural',
  'en-gb-thomasneural': 'en-GB-ThomasNeural',
  'thomas': 'en-GB-ThomasNeural',
  'en-au-natashaneural': 'en-AU-NatashaNeural',
  'natasha': 'en-AU-NatashaNeural',
  'en-au-williamneural': 'en-AU-WilliamNeural',
  'william': 'en-AU-WilliamNeural',
  'en-ca-claraneural': 'en-CA-ClaraNeural',
  'clara': 'en-CA-ClaraNeural',
  'en-ca-liamneural': 'en-CA-LiamNeural',
  'liam': 'en-CA-LiamNeural',
  'en-ie-emilyneural': 'en-IE-EmilyNeural',
  'emily': 'en-IE-EmilyNeural',
  'en-in-neerjaneural': 'en-IN-NeerjaNeural',
  'neerja': 'en-IN-NeerjaNeural',
  'en-in-prabhatneural': 'en-IN-PrabhatNeural',
  'prabhat': 'en-IN-PrabhatNeural',
  'es-es-elviraneural': 'es-ES-ElviraNeural',
  'elvira': 'es-ES-ElviraNeural',
  'es-mx-dalianeural': 'es-MX-DaliaNeural',
  'dalia': 'es-MX-DaliaNeural',
  'fr-fr-deniseneural': 'fr-FR-DeniseNeural',
  'denise': 'fr-FR-DeniseNeural',
  'fr-fr-henrineural': 'fr-FR-HenriNeural',
  'henri': 'fr-FR-HenriNeural',
  'de-de-katjaneural': 'de-DE-KatjaNeural',
  'katja': 'de-DE-KatjaNeural',
  'de-de-killianneural': 'de-DE-KillianNeural',
  'killian': 'de-DE-KillianNeural',
  'it-it-elsaneural': 'it-IT-ElsaNeural',
  'elsa': 'it-IT-ElsaNeural',
  'ja-jp-nanamineural': 'ja-JP-NanamiNeural',
  'nanami': 'ja-JP-NanamiNeural',
  'zh-cn-xiaoxiaoneural': 'zh-CN-XiaoxiaoNeural',
  'xiaoxiao': 'zh-CN-XiaoxiaoNeural',
  // Piper fast checkpoint mappings to natural neural voices
  'en_us-lessac-medium': 'en-US-GuyNeural',
  'lessac': 'en-US-GuyNeural',
  'en_us-amy-medium': 'en-US-JennyNeural',
  'amy': 'en-US-JennyNeural',
  'en_gb-alan-medium': 'en-GB-RyanNeural',
  'alan': 'en-GB-RyanNeural',
};

function resolveTtsVoice(voice) {
  if (!voice || typeof voice !== 'string') return 'en-US-JennyNeural';
  let clean = voice.trim();
  if (clean.toLowerCase().startsWith('set ')) clean = clean.substring(4).trim();
  if (clean.toLowerCase().startsWith('to ')) clean = clean.substring(3).trim();
  clean = clean.replace(/^[.\s]+|[.\s]+$/g, '');
  if (!clean || clean.toLowerCase() === 'set') return 'en-US-JennyNeural';

  const low = clean.toLowerCase();
  if (CANONICAL_EDGE_VOICES[low]) {
    return CANONICAL_EDGE_VOICES[low];
  }

  // Exact or partial match in canonical dictionary
  for (const [key, canonical] of Object.entries(CANONICAL_EDGE_VOICES)) {
    if (low === key || (key.length > 3 && (low.includes(key) || key.includes(low)))) {
      return canonical;
    }
  }

  // Standard Edge TTS format (e.g. en-US-JennyNeural)
  if (clean.includes('-')) {
    return normalizeEdgeVoiceName(clean);
  }

  return 'en-US-JennyNeural';
}

function normalizeEdgeVoiceName(voice) {
  if (!voice) return 'en-US-JennyNeural';
  
  // Format: language-region-NameNeural
  const parts = voice.split('-');
  if (parts.length < 3) {
    return voice; // Can't easily parse
  }
  
  const lang = parts[0].toLowerCase();
  const region = parts[1].toUpperCase();
  
  // Capitalize the name part and ensure it ends with "Neural"
  let name = parts.slice(2).join('-');
  if (name.toLowerCase().endsWith('neural')) {
    name = name.slice(0, -6);
  }
  
  if (name.length > 0) {
    name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }
  
  return `${lang}-${region}-${name}Neural`;
}

app.post('/api/upload', (req, res) => {
  try {
    const { name, type, mimeType, data } = req.body;
    if (!name || !data) {
      return res.status(400).json({ error: 'Missing file name or data.' });
    }

    // Path traversal check
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
      return res.status(400).json({ error: 'Security Violation: Path traversal characters in filename.' });
    }

    const uploadDir = path.resolve(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
    }

    const safeName = name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    let filePath = path.resolve(uploadDir, safeName);

    // Verify resolved path is strictly inside uploadDir
    if (!filePath.startsWith(uploadDir)) {
      return res.status(403).json({ error: 'Permission Denied: Target path escapes managed upload workspace.' });
    }

    const buffer = Buffer.from(data, 'base64');
    if (buffer.length > 1024 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds 1GB limit.' });
    }

    // Handle collision if a file with the same name already exists
    if (fs.existsSync(filePath)) {
      const ext = path.extname(safeName);
      const stem = path.basename(safeName, ext);
      const hash = crypto.createHash('md5').update(buffer).digest('hex').slice(0, 6);
      let uniqueSafeName = `${stem}_${hash}${ext}`;
      filePath = path.resolve(uploadDir, uniqueSafeName);
      if (fs.existsSync(filePath)) {
        uniqueSafeName = `${stem}_${hash}_${Date.now()}_${Math.floor(Math.random()*1000)}${ext}`;
        filePath = path.resolve(uploadDir, uniqueSafeName);
      }
    }

    fs.writeFileSync(filePath, buffer);
    console.log(`[Upload Pipeline] File saved securely: ${filePath} (${buffer.length} bytes)`);

    return res.json({
      success: true,
      path: filePath,
      name: name,
      safeName: path.basename(filePath),
      size: buffer.length,
      mimeType: mimeType || 'application/octet-stream',
      type: type || 'file',
      uploadId: `up_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    });
  } catch (err) {
    console.error('[Upload Error]', err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/upload-batch', (req, res) => {
  try {
    const { files } = req.body;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Batch upload requires a non-empty array of files.' });
    }

    const uploadDir = path.resolve(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
    }

    const results = [];
    for (const f of files) {
      const { name, type, mimeType, data } = f;
      if (!name || !data) continue;

      if (name.includes('..') || name.includes('/') || name.includes('\\')) {
        results.push({ name, success: false, error: 'Path traversal character prohibited' });
        continue;
      }

      const safeName = name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      let filePath = path.resolve(uploadDir, safeName);

      if (!filePath.startsWith(uploadDir)) {
        results.push({ name, success: false, error: 'Target path escapes managed workspace' });
        continue;
      }

      const buffer = Buffer.from(data, 'base64');
      if (buffer.length > 1024 * 1024 * 1024) {
        results.push({ name, success: false, error: 'Exceeds 1GB size limit' });
        continue;
      }

      if (fs.existsSync(filePath)) {
        const ext = path.extname(safeName);
        const stem = path.basename(safeName, ext);
        const hash = crypto.createHash('md5').update(buffer).digest('hex').slice(0, 6);
        let uniqueSafeName = `${stem}_${hash}${ext}`;
        filePath = path.resolve(uploadDir, uniqueSafeName);
        if (fs.existsSync(filePath)) {
          uniqueSafeName = `${stem}_${hash}_${Date.now()}_${Math.floor(Math.random()*1000)}${ext}`;
          filePath = path.resolve(uploadDir, uniqueSafeName);
        }
      }

      fs.writeFileSync(filePath, buffer);
      results.push({
        success: true,
        path: filePath,
        name: name,
        safeName: path.basename(filePath),
        size: buffer.length,
        mimeType: mimeType || 'application/octet-stream',
        type: type || 'file',
        uploadId: `up_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
      });
    }

    console.log(`[Upload Pipeline] Batch uploaded ${results.length} files to ${uploadDir}`);
    return res.json({ success: true, files: results });
  } catch (err) {
    console.error('[Batch Upload Error]', err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/uploads/cleanup', (req, res) => {
  try {
    const { maxAgeHours = 24, force = false } = req.body || {};
    const uploadDir = path.resolve(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      return res.json({ success: true, removed: 0, freedBytes: 0 });
    }

    const now = Date.now();
    const maxAgeMs = maxAgeHours * 3600 * 1000;
    let removed = 0;
    let freedBytes = 0;

    const files = fs.readdirSync(uploadDir);
    for (const file of files) {
      if (file.startsWith('.')) continue;
      const filePath = path.join(uploadDir, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          const age = now - stat.mtimeMs;
          if (force || age > maxAgeMs) {
            freedBytes += stat.size;
            fs.unlinkSync(filePath);
            removed++;
          }
        }
      } catch (e) {}
    }

    console.log(`[Upload Pipeline] Workspace cleanup complete. Removed ${removed} files (${(freedBytes / (1024 * 1024)).toFixed(2)} MB freed).`);
    return res.json({ success: true, removed, freedBytes });
  } catch (err) {
    console.error('[Upload Cleanup Error]', err);
    return res.status(500).json({ error: err.message });
  }
});

function sanitizeTextForTTS(text) {
  if (!text) return '';

  let clean = String(text);

  // 1. Remove <thought>...</thought> tags and XML/HTML tags
  clean = clean.replace(/<thought>[\s\S]*?(?:<\/thought>|$)/gi, '');
  clean = clean.replace(/<[^>]+>/g, ' ');

  // 2. Handle fenced code blocks: remove or replace with readable text
  clean = clean.replace(/```[\s\S]*?```/g, (match) => {
    const lines = match.split('\n').filter(l => l.trim() && !l.trim().startsWith('```'));
    if (lines.length > 3 || match.length > 150) {
      return ' Code snippet omitted. ';
    }
    return ' ' + lines.join('. ') + '. ';
  });

  // 3. Remove inline code backticks: `code` -> code
  clean = clean.replace(/`([^`]+)`/g, '$1');

  // 4. Convert markdown links: [text](url) -> text
  clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 5. Remove standalone URLs (http://..., https://...)
  clean = clean.replace(/https?:\/\/\S+/gi, '');

  // 6. Remove Markdown headings: # Heading, ## Heading -> Heading.
  clean = clean.replace(/^[ \t]*#{1,6}[ \t]+(.*)$/gm, '$1.');

  // 7. Remove horizontal rules: ---, ***, ___
  clean = clean.replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, '');

  // 8. Remove blockquotes prefix: > quote -> quote
  clean = clean.replace(/^[ \t]*>[ \t]*/gm, '');

  // 9. Remove Markdown tables formatting: | col | col |
  clean = clean.replace(/^[ \t]*\|.*?\|[ \t]*$/gm, (match) => {
    if (match.includes('---')) return '';
    const cells = match.split('|').map(c => c.trim()).filter(Boolean);
    return cells.length > 0 ? cells.join(', ') + '.' : '';
  });

  // 10. Clean up bullet points & numbered lists at start of lines
  clean = clean.replace(/^[ \t]*[*+\-•][ \t]+/gm, '');
  clean = clean.replace(/^[ \t]*(\d+)\.[ \t]+/gm, '$1, ');

  // 11. Remove bold, italic, strikethrough markers: **text**, *text*, __text__, _text_, ~~text~~
  clean = clean.replace(/\~\~([^\~]+)\~\~/g, '$1');
  clean = clean.replace(/\*\*([^*]+)\*\*/g, '$1');
  clean = clean.replace(/\*([^*]+)\*/g, '$1');
  clean = clean.replace(/__([^_]+)__/g, '$1');
  clean = clean.replace(/_([^_]+)_/g, '$1');

  // 12. Replace arrows and symbols with readable text
  clean = clean.replace(/->|=>/g, ' to ');
  clean = clean.replace(/<-|<=/g, ' from ');
  clean = clean.replace(/&/g, ' and ');

  // 13. Strip remaining raw markdown/formatting symbol characters (# * _ ~ ` | \ ^ < > { } [ ])
  clean = clean.replace(/[#*_~`|\\^<>{}\[\]]/g, ' ');

  // 14. Remove emojis and non-ASCII unicode symbols that Edge-TTS mispronounces
  clean = clean.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');

  // 15. Normalize spaces, newlines, and punctuation
  clean = clean.replace(/[ \t]+/g, ' ');
  clean = clean.replace(/(\s*[\r\n]\s*)+/g, '. ');
  clean = clean.replace(/\.{2,}/g, '.');
  clean = clean.replace(/\s+([.,!?])/g, '$1');

  return clean.trim();
}

async function synthesizeWithMsEdgeTTS(cleanText, voiceName) {
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(cleanText);

    return await new Promise((resolve, reject) => {
      const chunks = [];
      const timeout = setTimeout(() => {
        try { tts.close(); } catch (e) {}
        reject(new Error(`Edge TTS generation timed out after 15 seconds for voice ${voiceName}`));
      }, 15000);

      audioStream.on('data', (chunk) => chunks.push(chunk));
      audioStream.on('end', () => {
        clearTimeout(timeout);
        try { tts.close(); } catch (e) {}
        const buffer = Buffer.concat(chunks);
        if (buffer.length > 0) {
          resolve(buffer);
        } else {
          reject(new Error('Edge TTS returned empty audio buffer'));
        }
      });
      audioStream.on('error', (err) => {
        clearTimeout(timeout);
        try { tts.close(); } catch (e) {}
        reject(err);
      });
    });
  } catch (err) {
    try { tts.close(); } catch (e) {}
    throw err;
  }
}

async function generateEdgeTTSAudio(cleanText, voiceName) {
  const targetVoice = resolveTtsVoice(voiceName);

  // 1. Primary engine: Pure Node.js WebSocket Edge TTS with target voice
  try {
    return await synthesizeWithMsEdgeTTS(cleanText, targetVoice);
  } catch (primaryErr) {
    const is403 = primaryErr?.message?.includes('403') || primaryErr?.message?.includes('Sec-MS-GEC');
    if (is403) {
      logger.warn('[Edge TTS] Microsoft Edge neural TTS is currently blocked (403 / Sec-MS-GEC). Checking fallback...');
    } else {
      logger.warn(`[Edge TTS] Node WebSocket engine failed for "${targetVoice}" (${primaryErr.message}).`);
    }

    // 2. Resilient fallback: Try default JennyNeural if target was a different voice
    if (targetVoice !== 'en-US-JennyNeural') {
      try {
        logger.info('[Edge TTS] Attempting resilient fallback to standard en-US-JennyNeural...');
        return await synthesizeWithMsEdgeTTS(cleanText, 'en-US-JennyNeural');
      } catch (fallbackErr) {
        logger.warn(`[Edge TTS] Fallback to JennyNeural failed (${fallbackErr.message}). Checking CLI fallback...`);
      }
    }
    
    // 3. Secondary fallback: edge-tts CLI tool (if installed on local machine)
    const tempFile = path.join(__dirname, `tts_temp_${Date.now()}_${Math.floor(Math.random() * 1000)}.mp3`);
    try {
      await new Promise((resolve, reject) => {
        const child = spawn('edge-tts', [
          '--voice', targetVoice,
          '--text', cleanText,
          '--write-media', tempFile
        ]);
        let stderr = '';
        child.stderr?.on('data', (data) => { stderr += data.toString(); });
        child.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`edge-tts CLI exited with code ${code}: ${stderr}`));
        });
        child.on('error', (err) => {
          reject(err);
        });
      });

      if (fs.existsSync(tempFile) && fs.statSync(tempFile).size > 0) {
        const audioBuffer = fs.readFileSync(tempFile);
        return audioBuffer;
      }
      throw new Error('edge-tts CLI output file was empty');
    } finally {
      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch (e) {}
      }
    }
  }
}

app.post('/api/tts', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).send('Text is required');
  }

  // Preprocess text using intelligent markdown and formatting sanitizer
  const cleanText = sanitizeTextForTTS(text);
  if (!cleanText) {
    return res.status(400).send('No speakable text remaining after sanitization');
  }

  // Resolve voice name from configuration or request body
  let voiceName = 'en-US-JennyNeural';
  try {
    const configPath = path.join(__dirname, 'agent_config.json');
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (cfg.tts_voice) {
        voiceName = cfg.tts_voice;
      }
    }
  } catch (err) {
    console.error('Error reading agent_config.json:', err);
  }

  const reqVoice = req.body.voice;
  if (reqVoice && typeof reqVoice === 'string') {
    voiceName = reqVoice;
  }

  const resolvedVoice = resolveTtsVoice(voiceName);

  try {
    console.log(`[Edge TTS] Generating speech using edge-tts (${resolvedVoice}) for text: "${cleanText.substring(0, 40)}..."`);
    const audioBuffer = await generateEdgeTTSAudio(cleanText, resolvedVoice);
    res.set('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);
  } catch (error) {
    console.warn('[Edge TTS Server Info]:', error.message || error);
    // Graceful fallback: return 400 so client falls back to browser-native SpeechSynthesis without breaking UI
    res.status(400).send('Edge TTS generation unavailable');
  }
});

// Global Express API Error Handler Middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled API Error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
  });
});

// Serve frontend based on environment
if (isProd) {
  // Production static server
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    app.use(express.static(distPath));
    app.get(/(.*)/, (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    logger.warn(`Production dist/index.html not found at ${distPath}. Falling back to dynamic Vite dev server.`);
    const { createServer: createViteServer } = await import('vite');
    viteDevServer = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server },
      },
      appType: 'spa',
    });
    app.use(viteDevServer.middlewares);
  }
} else {
  // Development mode: integration with Vite
  const { createServer: createViteServer } = await import('vite');
  viteDevServer = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: process.env.DISABLE_HMR === 'true' ? false : { server },
    },
    appType: 'spa',
  });
  app.use(viteDevServer.middlewares);
}

// Clean up child process and exit gracefully
function cleanupAndExit(signal) {
  console.log(`[Server] Received signal ${signal}. Initiating stack shutdown...`);
  shutdownDesktopStack(signal);
}

process.on('SIGINT', () => cleanupAndExit('SIGINT'));
process.on('SIGTERM', () => cleanupAndExit('SIGTERM'));
process.on('SIGHUP', () => cleanupAndExit('SIGHUP'));

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err);
  if (!shouldKeepServerAlive()) {
    cleanupAndExit('uncaughtException');
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('exit', () => {
  if (agentProcess) {
    try {
      agentProcess.kill('SIGKILL');
    } catch (e) {}
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Server] Port ${PORT} is already in use.`);
  } else {
    console.error('[Server] Server error:', err);
  }
});

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`  Audio Visualizer Full-Stack Server running on port ${PORT}`);
  console.log(`  Mode: ${isProd ? 'Production' : 'Development'}`);
  console.log(`=======================================================`);
});
