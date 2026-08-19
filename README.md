<div align="center">
  <img
    src="assets/lumin_logo.png"
    alt="Lumin icon"
    width="256"
  />
  <h1 align="center">Lumin</h1>
  <h4 align="center">The Local-First Voice AI Assistant, 3D Audio Visualizer & Coding Agent</h4>
</div>

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: 3.11–3.13](https://img.shields.io/badge/Python-3.11--3.13-3776AB.svg?logo=python&logoColor=white)](https://python.org)
[![Node.js: 22+](https://img.shields.io/badge/Node.js-22+-339933.svg?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Ollama: Local Inference](https://img.shields.io/badge/Ollama-Local--First-black.svg?logo=ollama&logoColor=white)](https://ollama.com)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Dual--Engine-7057ff.svg)](#-model-context-protocol-dual-mcp-engine)
[![Platform: Windows | Linux | macOS | Docker](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS%20%7C%20Docker-blueviolet.svg)](#-quick-start)

**LUMIN is a high-performance, privacy-first AI desktop companion that pairs a real-time 3D audio-reactive sphere with continuous voice interaction, local LLM orchestration, intelligent coding tools, and dual Model Context Protocol (MCP) support.**

[Quick Start](#-quick-start) • [Working Capabilities](#-what-lumin-delivers-today) • [Interface & Modes](#-workspace-modes) • [Dual MCP Engine](#-model-context-protocol-dual-mcp-engine) • [System Architecture](#-system-architecture) • [Roadmap](#-roadmap--current-limitations) • [Contributing](CONTRIBUTING.md)

---
</div>

<div align="center">
  <img src="assets/lumin-demo.gif" alt="LUMIN Demo" width="900">
</div>

## 💡 Why LUMIN?

Most voice assistants rely on continuous cloud telemetry, high-latency API roundtrips, and disconnected command shells. **LUMIN is built from the ground up for developers and teams who value speed, privacy, and full desktop control:**

1. **100% Private, Local-First Engine** — Runs locally via Ollama with dynamic model routing (`qwen2.5-coder`, `llama3.2`, `phi4-mini`, `gemma3`, `minicpm-v`). Zero subscription fees and no data leaving your machine.
2. **Audio-Reactive 3D Visualizer** — A Three.js GLSL vertex-deformed sphere with custom fragment shaders and bloom post-processing that responds in real time to microphone input and TTS audio streams.
3. **Continuous Voice Pipeline** — Natural, low-latency conversational voice with wake word / sleep word detection, acoustic feedback cancellation during TTS speech playback, and neural Edge-TTS voice generation.
4. **First-Class Context Workspace** — Live, file-backed markdown store (`lumin_context/USER.md`, `IDENTITY.md`, `RULES.md`, `MEMORY.md`) automatically injected into reasoning cycles.
5. **Reusable Skills Registry** — Structured capability packs ("Give him jobs") with natural-language and 1-click execution (Morning Brief, Daily Status, Diagnostics, Research, Ambient Architect, plus custom user packs).
6. **Developer & Coding Agent Harness** — Autonomous file editing, AST codebase structural extraction, syntax validation, desktop shell execution, unrestricted/sandboxed access controls, and live terminal streaming.
7. **Dual MCP Engine** — Full JSON-RPC 2.0 implementation: acts as both an MCP server (exposing your desktop tools to Claude Desktop, Cursor, and AI Studio) and an MCP client (connecting to external services).

---

## ⚡ What LUMIN Delivers Today

| Capability                        | Current Status | Description                                                                 |
|-----------------------------------|----------------|-----------------------------------------------------------------------------|
| **Local-First Voice Agent**       | ✅ **Live**    | Hands-free duplex speech mode with microphone STT, customizable wake words, acoustic lock protection during playback, and Edge-TTS neural speech with local LRU audio caching. |
| **3D Audio-Reactive Visualizer**  | ✅ **Live**    | Three.js WebGL canvas featuring interactive GLSL audio-reactive sphere, particle systems, dynamic lighting, bloom effects, and full-screen presentation mode. |
| **Ollama Auto-Router + Model Pull**| ✅ **Live**   | Task-based prompt analyzer that automatically directs requests to optimal local models for coding, vision, document analysis, and general chat with in-app model installation. |
| **First-Class Context Layer**     | ✅ **Live**    | Persistent markdown workspace (`lumin_context/USER.md`, `IDENTITY.md`, `RULES.md`, `MEMORY.md`) injected into system prompts and editable with bidirectional disk sync. |
| **Skills System ("Give Him Jobs")**| ✅ **Live**   | Reusable capability packs with natural-language and 1-click execution (Morning Brief, Daily Status, System Diagnostics, Deep Research, Ambient Architect, and custom packs). |
| **Tool Registry & Governance**    | ✅ **Live**    | Multi-file reader/writer, AST structural mapper for large codebases (>12KB in seconds), terminal command executor, and sandboxed vs. unrestricted execution policies. |
| **Live Terminal & Dev Console**   | ✅ **Live**    | Real-time WebSocket terminal streaming, live subtask progress tracking, and subprocess management. |
| **Dual MCP Engine (v1.0)**        | ✅ **Live**    | Full JSON-RPC 2.0 implementation: exposes local tools to Claude Desktop & Cursor as a Server, while simultaneously invoking external tools as a Client. |
| **Universal File & Doc Parser**   | ✅ **Live**    | Deep extraction and inspection for PDF, DOCX, XLSX, PPTX, text files, and recursive ZIP archives. |

---

## 🖥️ Workspace Modes

LUMIN provides three primary workspace modes with zero UI crosstalk, plus an ambient presentation mode:

```
+-----------------------------------------------------------------------------------------------+
|  [VOICE MODE]          |  [AGENT MODE]         |  [SETTINGS PANEL]                            |
|  - 3D sphere center    |  - Split workspace    |  - Context & Skills Workspace                |
|  - Real-time audio FFT |  - Chat & task stream |  - Voice catalog & Edge-TTS                  |
|  - Live STT transcript |  - Live Terminal logs |  - Ollama models & routing                   |
|  - Neural voice output |  - AST Code & Files   |  - 3D shader params & MCP server config      |
+-----------------------------------------------------------------------------------------------+
```

* **Voice Mode**: Minimalist, distraction-free stage centered on the 3D reactive sphere with live conversational transcripts and hands-free microphone voice interaction.
* **Agent Mode**: Full engineering workspace with side-by-side chat history, active subtask tracking, file previews, AST codebase extraction, and live terminal command execution.
* **Settings**: Comprehensive configuration for Context Workspace (`lumin_context/`), Reusable Skills Registry, voice selection, Ollama model overrides, wake words, 3D graphics quality, bloom intensity, and MCP servers.
* **Cinema Mode (`Esc` / `H`)**: Ambient presentation mode that maximizes the 3D reactive visualization to full-screen and hides all UI chrome.

---

## 🚀 Quick Start

> **Python Requirement**: LUMIN officially supports **Python 3.11, 3.12, and 3.13**. Do not use Python 3.14+ (bleeding-edge versions break C-extensions and NumPy longdouble initialization).

### 1. Windows (Recommended)

1. **First-Time Installation**  
   Run `install_windows.bat` once:

   ```cmd
   install_windows.bat
   ```

   This single automated installer configures a supported Python runtime (3.11–3.13), creates an isolated virtual environment (`venv`), installs all Python dependencies, installs Node packages (`npm install`), and prepares Ollama.

2. **Daily Launch**  
   Double-click `start_app.bat`:

   ```cmd
   start_app.bat
   ```

   The application will automatically start and open the **3D Visualizer & Voice Web UI** in your browser at **`http://localhost:3000`**.

   *Helper scripts:*

   * `start_app_debug.bat` — Launches in foreground console mode to display live debug logs.
   * `start_agent.bat` — Dedicated CLI runner with direct terminal routing.
   * `stop_app.bat` — Cleanly stops all LUMIN processes and frees port 3000.

---

### 2. Linux & macOS

Ensure **Python 3.11–3.13**, **Node.js 20+**, and **Ollama** are installed on your system.

```bash
# 1. Clone the repository
git clone https://github.com/Montyscripts/Project-Lumin.git
cd Project-Lumin

# 2. Run automated setup and launch the agent
chmod +x start_agent.sh
./start_agent.sh

# 3. In a separate terminal, launch the web application
npm install
npm run dev
```

Open `http://localhost:3000` in any modern Chromium, Firefox, or Safari browser.

---

### 3. Docker & Docker Compose (Zero Configuration)

Spin up LUMIN alongside a containerized Ollama instance:

```bash
# Start full stack (Web app + Python backend + Ollama)
docker-compose up -d

# View live agent logs
docker-compose logs -f lumin-agent
```

Access the web interface at `http://localhost:3000`.

> **GPU Passthrough**: For NVIDIA CUDA acceleration in Docker, uncomment the `deploy.resources.reservations` block in `docker-compose.yml`.

---

## 🔌 Model Context Protocol (Dual MCP Engine)

LUMIN includes complete, native support for Anthropic's **Model Context Protocol (MCP)** specification (JSON-RPC 2.0):

```
                       ┌─────────────────────────┐
                       │   External MCP Hosts    │
                       │ Claude Desktop / Cursor │
                       └────────────┬────────────┘
                                    │ (JSON-RPC 2.0 stdio/SSE)
                                    ▼
                         ╔═════════════════════╗
                         ║   LUMIN MCP SERVER  ║
                         ║  Exposes Desktop    ║
                         ║  Tools & Ollama LLM ║
                         ╠═════════════════════╣
                         ║   LUMIN MCP CLIENT  ║
                         ║  Consumes Remote    ║
                         ║  APIs & Toolsets    ║
                         ╚══════════╤══════════╝
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │  External MCP Services  │
                       │  GitHub, SQLite, APIs   │
                       └─────────────────────────┘
```

* **Run LUMIN as an MCP Server** for Claude Desktop or Cursor:

  ```json
  {
    "mcpServers": {
      "lumin": {
        "command": "python",
        "args": ["-m", "tools.mcp_server"],
        "cwd": "/path/to/Project-Lumin"
      }
    }
  }
  ```

* **Connect LUMIN to External MCP Servers**: Configure your connections in `external_mcp_servers.json` or through the Web UI Settings panel.

---

## 🏗️ System Architecture (The 4 Pillars)

```
Project-Lumin/
├── lumin_context/            # Pillar 2: First-Class Context Workspace
│   ├── USER.md               # User identity, technical background & goals
│   ├── IDENTITY.md           # LUMIN tone, persona & behavioral directives
│   ├── RULES.md              # Operational boundaries, safety & output rules
│   ├── MEMORY.md             # Durable facts & persistent knowledge
│   └── SKILLS/
│       └── registry.json     # Pillar 3: Registered reusable capability packs
├── core/                     # Pillar 4: Runtime Harness & Execution Loop
│   ├── agent.py              # Orchestration loop, state machine & routing
│   ├── router.py             # Task-based intent router & model selector
│   ├── runtime_context.py    # Dynamic prompt context injection & placeholder resolution
│   ├── resource_governor.py  # Sandboxing policy & resource monitor
│   ├── capabilities.py       # Capability registry & diagnostics
│   └── writing.py            # Longform text & structured documentation generator
├── llm/                      # Pillar 1: Model Brain & Inference
│   └── client.py             # Ollama local inference client with retry & fallback
├── audio/
│   ├── tts_cache.py          # Edge-TTS voice synthesizer with SHA-256 LRU cache
│   └── local_tts.py          # Local fallback speech synthesis engine
├── memory/
│   └── manager.py            # Ephemeral session context & semantic memory
├── tools/
│   ├── registry.py           # Core tools: File I/O, Selenium, Shell & AST Mapper
│   ├── mcp_server.py         # Standard JSON-RPC 2.0 MCP Server implementation
│   └── mcp_client.py         # MCP Client Manager for remote tool integration
├── src/
│   ├── main.tsx              # Lit reactive single-page application & state store
│   ├── visual-3d.tsx         # Three.js 3D sphere canvas with GLSL shaders & bloom
│   ├── backdrop-shader.ts    # Raymarched ambient backdrop shader program
│   ├── services/
│   │   ├── context-manager.ts # Context workspace state & API synchronization
│   │   ├── skills-manager.ts  # Skills registry, trigger matcher & runner
│   │   ├── settings-manager.ts# User preferences & theme store
│   │   └── agent-websocket.ts # Real-time terminal streaming bridge
│   └── components/
│       ├── chat-message-list.ts
│       ├── terminal-panel.ts
│       ├── visualizer-controls.ts
│       ├── model-selector.ts
│       ├── status-bar.ts
│       └── settings/         # Modular settings (Context/Skills, Voice, Models, Interface)
├── server.js                 # High-speed Node.js API server & WebSocket bridge
├── docs/                     # Detailed guides (Architecture, Commands, Troubleshooting)
├── docker-compose.yml        # Production Docker composition
└── package.json              # Web client dependencies & build configurations
```

---

## 💻 Hardware & Local Inference Matrix

| Hardware Tier         | Memory   | GPU / VRAM          | Recommended Models & Workflows              | Agent Capabilities                                      |
|-----------------------|----------|---------------------|---------------------------------------------|---------------------------------------------------------|
| **Laptop / Entry**    | 8–16 GB  | CPU Only / Integrated | `llama3.2:3b`, `phi4-mini:3.8b`            | Instant voice conversation, daily routines, rapid shell tasks |
| **Mid-Range Desktop** | 16–32 GB | 6–10 GB VRAM        | `qwen2.5-coder:7b`, `llama3.2:3b`          | AST code extraction, deep research, multi-file refactoring |
| **Enthusiast Creator**| 32–64 GB | 12–16 GB VRAM       | `qwen2.5-coder:14b`, `minicpm-v:8b`        | Multimodal visual OCR, complex architectural planning   |
| **Workstation**       | 64+ GB   | 24+ GB VRAM         | `qwen2.5-coder:32b`, `qwen2.5vl:7b`        | Full autonomous agent pipelines & large-scale codebase synthesis |

---

## 🗺️ Roadmap & Current Status

To ensure full transparency:

* [x] **Model (Brain)**: Task-driven dynamic Ollama model routing with automated fallback
* [x] **Context (Memory)**: Live markdown workspace (`lumin_context/`) with bidirectional sync
* [x] **Skills (Jobs)**: Built-in and custom capability packs with 1-click & chat triggers
* [x] **Harness (Runtime)**: Real-time terminal streaming, sandbox governance, AST code parser
* [x] **3D Visualizer**: Real-time audio-reactive GLSL shader sphere with WebGL 2.0 bloom
* [x] **Duplex Voice**: Hands-free continuous voice conversation with STT/TTS loop
* [x] **Dual MCP Engine**: Server & Client JSON-RPC 2.0 implementation
* [ ] **Local Multimodal Speech-to-Speech**: Direct local neural audio-to-audio weights (e.g., Moshi/Whisper-streaming) to supplement browser STT.
* [ ] **Native Mobile Companion**: PWA optimization and remote pairing for local network access.

---

## 🤝 Contributing & Community

Contributions, issues, and feature suggestions are welcome!

1. Fork the project repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'feat: add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

Please read our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before submitting code.

---

## 📄 License

This project is open-source software licensed under the [**MIT License**](LICENSE).
```
