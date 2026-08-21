<div align="center">
  <img
    src="assets/lumin_logo.png"
    alt="Lumin icon"
    width="256"
  />
  <h1 align="center">Lumin</h1>
  <h4 align="center">Experimental Local-First Voice AI Assistant, 3D Audio Visualizer & Coding Agent</h4>
</div>

<div align="center">

[![Status](https://img.shields.io/badge/Status-Early%20Prototype-orange)](https://github.com/Montyscripts/Project-Lumin)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: 3.11–3.13](https://img.shields.io/badge/Python-3.11--3.13-3776AB.svg?logo=python&logoColor=white)](https://python.org)
[![Node.js: 20+](https://img.shields.io/badge/Node.js-20+-339933.svg?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Ollama: Local Inference](https://img.shields.io/badge/Ollama-Local--First-black.svg?logo=ollama&logoColor=white)](https://ollama.com)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Experimental-7057ff.svg)](#-model-context-protocol-dual-mcp-engine)
[![Platform: Windows | Linux | macOS | Docker](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS%20%7C%20Docker-blueviolet.svg)](#-quick-start)

**Lumin is an early-stage experiment in building a fully local AI desktop companion.**  
It pairs a real-time 3D audio-reactive sphere with voice interaction, local LLM orchestration via Ollama, coding tools, and dual Model Context Protocol (MCP) support.

> **Current status**: Early prototype. Many features work on the author’s machine. Cross-platform reliability and polish are still limited. This is not a production-ready product. 

[Quick Start](#-quick-start) • [Current Capabilities](#-current-capabilities) • [Interface & Modes](#-workspace-modes) • [Dual MCP Engine](#-model-context-protocol-dual-mcp-engine) • [System Architecture](#-system-architecture) • [Roadmap](#-roadmap--current-status) • [Contributing](CONTRIBUTING.md)

---
</div>

<div align="center">
  <img src="assets/lumin-demo.gif" alt="LUMIN Demo" width="900">
</div>

## 💡 Why Lumin?

Most voice assistants rely on continuous cloud telemetry, high-latency API roundtrips, and disconnected command shells. Lumin explores what is possible when everything runs locally for developers who value privacy and desktop control:

1. **Local-First Engine** — Runs via Ollama with dynamic model routing (`qwen2.5-coder`, `llama3.2`, `phi4-mini`, `gemma3`, `minicpm-v`). No required cloud API keys and no data leaving your machine by default.
2. **Audio-Reactive 3D Visualizer** — A Three.js GLSL vertex-deformed sphere with custom fragment shaders and bloom post-processing that responds to microphone input and TTS audio streams.
3. **Voice Pipeline** — Conversational voice with STT, Edge-TTS neural speech, and basic feedback handling during playback. Continuous duplex mode exists but is still fragile.
4. **First-Class Context Workspace** — File-backed markdown store (`lumin_context/USER.md`, `IDENTITY.md`, `RULES.md`, `MEMORY.md`) injected into reasoning cycles.
5. **Reusable Skills Registry** — Structured capability packs with natural-language and 1-click style triggers (Morning Brief, Daily Status, Diagnostics, Research, and custom packs).
6. **Developer & Coding Tools** — File editing, basic AST structural extraction, shell execution, and live terminal streaming. Advanced autonomous coding features are still early.
7. **Dual MCP Engine** — Experimental JSON-RPC 2.0 implementation that can act as both an MCP server (exposing local tools) and an MCP client.

---

## ⚡ Current Capabilities

| Capability                        | Current Status     | Description                                                                 |
|-----------------------------------|--------------------|-----------------------------------------------------------------------------|
| **Local-First Voice Agent**       | Working            | Microphone STT + Edge-TTS with caching. Continuous duplex mode works under good conditions but remains fragile. |
| **3D Audio-Reactive Visualizer**  | Working            | Three.js WebGL canvas with GLSL audio-reactive sphere, particles, lighting, and bloom. |
| **Ollama Auto-Router**            | Working            | Task-based routing to different local models for coding, vision, documents, and general chat. |
| **First-Class Context Layer**     | Working            | Persistent markdown workspace (`USER.md`, `IDENTITY.md`, `RULES.md`, `MEMORY.md`) with disk sync. |
| **Skills System**                 | Working            | Reusable capability packs with natural-language and simple triggers. |
| **Tool Registry**                 | Working            | File I/O, basic AST mapping, terminal execution, and simple browser tools. |
| **Live Terminal & Dev Console**   | Working            | Real-time WebSocket terminal streaming and subprocess management. |
| **Dual MCP Engine**               | Experimental       | JSON-RPC 2.0 server + client implementation. Functional but not yet hardened. |
| **Universal File & Doc Parser**   | Working            | Extraction support for PDF, DOCX, XLSX, PPTX, text files, and ZIP archives. |
| **Cross-platform reliability**    | Limited            | Primarily validated on the author’s Windows setup. Expect rough edges elsewhere. |

---

## 🖥️ Workspace Modes

Lumin provides three primary workspace modes plus an ambient presentation mode:

```
+-----------------------------------------------------------------------------------------------+
|  [VOICE MODE]          |  [AGENT MODE]         |  [SETTINGS PANEL]                            |
|  - 3D sphere center    |  - Split workspace    |  - Context & Skills Workspace                |
|  - Real-time audio FFT |  - Chat & task stream |  - Voice catalog & Edge-TTS                  |
|  - Live STT transcript |  - Live Terminal logs |  - Ollama models & routing                   |
|  - Neural voice output |  - File & code tools  |  - 3D shader params & MCP server config      |
+-----------------------------------------------------------------------------------------------+
```

* **Voice Mode**: Minimalist stage centered on the 3D reactive sphere with live conversational transcripts and hands-free microphone interaction.
* **Agent Mode**: Engineering-oriented workspace with chat history, subtask tracking, file previews, and live terminal.
* **Settings**: Configuration for Context Workspace (`lumin_context/`), Skills Registry, voice selection, Ollama models, wake words, 3D graphics quality, and MCP servers.
* **Cinema Mode (`Esc` / `H`)**: Ambient presentation mode that maximizes the 3D visualization and hides UI chrome.

---

## 🚀 Quick Start

> **Python Requirement**: Lumin supports **Python 3.11, 3.12, and 3.13**. Python 3.14+ is not supported (C-extension and NumPy issues).

### 1. Windows

1. **First-Time Installation**  
   Run `install_windows.bat` once:

   ```cmd
   install_windows.bat
   ```

   This attempts to configure a supported Python runtime, create a virtual environment, install dependencies, and prepare Ollama.

2. **Daily Launch**  
   Double-click `start_app.bat`:

   ```cmd
   start_app.bat
   ```

   The application should open the UI at **`http://localhost:3000`**.

   *Helper scripts:*
   * `start_app_debug.bat` — Foreground console mode with live logs.
   * `start_agent.bat` — CLI-only agent runner.
   * `stop_app.bat` — Stops Lumin processes and frees port 3000.

> Note: The Windows scripts are still early. Manual intervention may be required if something fails.

---

### 2. Linux & macOS

Ensure **Python 3.11–3.13**, **Node.js 20+**, and **Ollama** are installed.

```bash
# 1. Clone the repository
git clone https://github.com/Montyscripts/Project-Lumin.git
cd Project-Lumin

# 2. Create virtual environment and install dependencies
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. Start the agent
python agent.py

# 4. In a separate terminal, launch the web application
npm install
npm run dev
```

Open `http://localhost:3000` in a modern browser.

---

### 3. Docker & Docker Compose (Early)

```bash
# Start full stack (Web app + Python backend + Ollama)
docker-compose up -d

# View live agent logs
docker-compose logs -f lumin-agent
```

Access the web interface at `http://localhost:3000`.

> **GPU Passthrough**: For NVIDIA CUDA acceleration, uncomment the relevant block in `docker-compose.yml`. This path is still experimental.

---

## 🔌 Model Context Protocol (Dual MCP Engine)

Lumin includes an experimental dual MCP implementation (JSON-RPC 2.0):

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

* **Run Lumin as an MCP Server** for Claude Desktop or Cursor:

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

* **Connect Lumin to External MCP Servers**: Configure connections in `external_mcp_servers.json` or through the Settings panel.

This part of the system is functional but still early and not fully hardened for production use.

---

## 🏗️ System Architecture (The 4 Pillars)

```
Project-Lumin/
├── lumin_context/            # Pillar 2: First-Class Context Workspace
│   ├── USER.md               # User identity, technical background & goals
│   ├── IDENTITY.md           # Lumin tone, persona & behavioral directives
│   ├── RULES.md              # Operational boundaries, safety & output rules
│   ├── MEMORY.md             # Durable facts & persistent knowledge
│   └── SKILLS/
│       └── registry.json     # Pillar 3: Registered reusable capability packs
├── core/                     # Pillar 4: Runtime Harness & Execution Loop
│   ├── agent.py              # Orchestration loop, state machine & routing
│   ├── router.py             # Task-based intent router & model selector
│   ├── runtime_context.py    # Dynamic prompt context injection
│   ├── resource_governor.py  # Sandboxing policy & resource monitor
│   ├── capabilities.py       # Capability registry & diagnostics
│   └── writing.py            # Longform text & structured documentation
├── llm/                      # Pillar 1: Model Brain & Inference
│   └── client.py             # Ollama local inference client
├── audio/
│   ├── tts_cache.py          # Edge-TTS voice synthesizer with LRU cache
│   └── local_tts.py          # Local fallback speech synthesis
├── memory/
│   └── manager.py            # Ephemeral session context & semantic memory
├── tools/
│   ├── registry.py           # Core tools: File I/O, Selenium, Shell & AST
│   ├── mcp_server.py         # JSON-RPC 2.0 MCP Server implementation
│   └── mcp_client.py         # MCP Client for remote tool integration
├── src/
│   ├── main.tsx              # Lit reactive single-page application
│   ├── visual-3d.tsx         # Three.js 3D sphere canvas with GLSL shaders
│   ├── backdrop-shader.ts    # Raymarched ambient backdrop shader
│   ├── services/
│   │   ├── context-manager.ts
│   │   ├── skills-manager.ts
│   │   ├── settings-manager.ts
│   │   └── agent-websocket.ts
│   └── components/
│       ├── chat-message-list.ts
│       ├── terminal-panel.ts
│       ├── visualizer-controls.ts
│       ├── model-selector.ts
│       ├── status-bar.ts
│       └── settings/
├── server.js                 # Node.js API server & WebSocket bridge
├── docs/                     # Architecture, commands, troubleshooting
├── docker-compose.yml
└── package.json
```

---

## 💻 Hardware & Local Inference Guidance

| Hardware Tier         | Memory   | GPU / VRAM          | Recommended Models & Workflows              | Realistic Capabilities                              |
|-----------------------|----------|---------------------|---------------------------------------------|-----------------------------------------------------|
| **Laptop / Entry**    | 8–16 GB  | CPU Only / Integrated | `llama3.2:3b`, `phi4-mini`                  | Basic voice conversation, simple shell tasks        |
| **Mid-Range Desktop** | 16–32 GB | 6–10 GB VRAM        | `qwen2.5-coder:7b`, `llama3.2:3b`           | Coding help, document work, research                |
| **Enthusiast**        | 32–64 GB | 12–16 GB VRAM       | `qwen2.5-coder:14b`, `minicpm-v:8b`         | Heavier multimodal and agent workloads              |
| **Workstation**       | 64+ GB   | 24+ GB VRAM         | Larger coder + vision models                | More ambitious multi-step agent pipelines           |

Results vary significantly with model size, quantization, and system load.

---

## 🗺️ Roadmap & Current Status

**Currently working / mostly working**
* [x] Task-driven dynamic Ollama model routing
* [x] Live markdown context workspace (`lumin_context/`)
* [x] Basic skills system
* [x] 3D audio-reactive GLSL visualizer
* [x] Core voice pipeline (STT + Edge-TTS)
* [x] File, document, and terminal tools
* [x] Experimental dual MCP (server + client)

**Still early / needs significant work**
* [ ] Reliable continuous duplex voice (echo cancellation, barge-in, robust turn-taking)
* [ ] Clean cross-platform installation experience
* [ ] Stronger coding agent capabilities and multi-file editing
* [ ] Better error handling, recovery, and observability
* [ ] Meaningful automated test coverage
* [ ] Performance and resource usage under sustained load
* [ ] Local multimodal speech-to-speech
* [ ] Native mobile / PWA companion

Near-term focus is improving reliability and install experience rather than adding many new features.

---

## 🤝 Contributing & Community

This is currently a solo experimental project. Feedback, bug reports, and focused pull requests are welcome — especially around:

* Installation and platform issues
* Voice pipeline robustness
* Code structure and maintainability
* Test coverage

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'feat: add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before submitting code. Open an issue before large changes so direction can be discussed.

---

## 📬 Contact

Questions, feedback, or issues about Lumin?  

**Email me:** [montyscriptsfeedback@gmail.com](https://mail.google.com/mail/?view=cm&fs=1&to=montyscriptsfeedback@gmail.com)


## 📄 License

This project is open-source software licensed under the [**MIT License**](LICENSE).

---

**Final note**  
Lumin is an exploration of local voice + agent + visualization design. It is not yet a polished or production-ready system. Expect rough edges. Useful feedback that improves reliability and clarity is more valuable right now than feature requests.
```
