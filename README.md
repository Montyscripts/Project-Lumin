<div align="center">

```
 ________  ________  ________        ___  _______   ________ _________   
|\   __  \|\   __  \|\   __  \      |\  \|\  ___ \ |\   ____\\___   ___\ 
\ \  \|\  \ \  \|\  \ \  \|\  \     \ \  \ \   __/|\ \  \___\|___ \  \_| 
 \ \   ____\ \   _  _\ \  \\\  \  __ \ \  \ \  \_|/_\ \  \       \ \  \  
  \ \  \___|\ \  \\  \\ \  \\\  \|\  \\_\  \ \  \_|\ \ \  \____   \ \  \ 
   \ \__\    \ \__\\ _\\ \_______\ \________\ \_______\ \_______\  \ \__\
    \|__|     \|__|\|__|\|_______|\|________|\|_______|\|_______|   \|__|
                                                                         
 ___       ___  ___  _____ ______   ___  ________                        
|\  \     |\  \|\  \|\   _ \  _   \|\  \|\   ___  \                      
\ \  \    \ \  \\\  \ \  \\\__\ \  \ \  \ \  \\ \  \                     
 \ \  \    \ \  \\\  \ \  \\|__| \  \ \  \ \  \\ \  \                    
  \ \  \____\ \  \\\  \ \  \    \ \  \ \  \ \  \\ \  \                   
   \ \_______\ \_______\ \__\    \ \__\ \__\ \__\\ \__\                  
    \|_______|\|_______|\|__|     \|__|\|__|\|__| \|__|                  
```

### **PRODUCTION-READY LOCAL-FIRST VOICE AI AGENT & 3D AUDIO VISUALIZER**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python: 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://python.org)
[![Node.js: 20+](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org)
[![LLM: Ollama Engine](https://img.shields.io/badge/Ollama-Local--First-black.svg)](https://ollama.com)
[![MCP: JSON--RPC 2.0](https://img.shields.io/badge/MCP-Dual--Engine-purple.svg)](#-model-context-protocol-mcp-dual-engine)
[![Platform: Windows / Linux / macOS / Docker](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS%20%7C%20Docker-blueviolet.svg)](#-quick-start)
[![LUMIN CI Pipeline](https://github.com/Montyscripts/Project-Lumin/actions/workflows/ci.yml/badge.svg)](https://github.com/Montyscripts/Project-Lumin/actions/workflows/ci.yml)

[Quick Start](#-quick-start) • [Key Features](#-key-features) • [Architecture](docs/ARCHITECTURE.md) • [Dual MCP Engine](#-model-context-protocol-mcp-dual-engine) • [Commands](docs/COMMANDS.md) • [Troubleshooting](docs/TROUBLESHOOTING.md) • [Contributing](CONTRIBUTING.md)

---
---

</div>

## 🌟 Overview

**LUMIN** is a high-quality, local-first software engineering agent and voice interface. It is deliberately optimized for the tasks where small/medium local models + strong tooling shine: project code understanding & rewriting, document analysis, desktop automation, and private continuous voice interaction.

> **Honest Scope & Positioning**:  
> LUMIN is designed as your **daily driver local engineering companion**. For extremely deep multi-step research, novel architecture design, or problems requiring frontier-scale reasoning, use a frontier model (Grok, Claude, DeepSeek, etc.). LUMIN dominates local workflows with zero latency, complete privacy, structured tool calling, and large-file AST structural mapping; frontier models serve as specialist consultants.

---

## 🎯 What LUMIN is Great At vs. When to Use a Frontier Model

| Task Domain | LUMIN Local Agent (Daily Driver) | Frontier Models (Specialist Consultant) |
| :--- | :--- | :--- |
| **Code Refactoring & Rewrites** | ✅ Excellent (AST mapping, local file updates, multi-file inspection) | 🟡 Overkill for local edits |
| **Document & Log Analysis** | ✅ Fast, private, local chunking + retrieval for PDFs, logs & docs | 🟡 Requires cloud uploads |
| **Desktop & MCP Automation** | ✅ Native window, browser, terminal, and MCP tool execution | ❌ No direct local OS/MCP execution |
| **Private Voice & 3D UI** | ✅ Zero-key local TTS, continuous voice loops, 3D visualizer | ❌ Cloud audio subscription required |
| **Multi-Hour Autonomous Research** | 🟡 Better handled with deep research loops | ✅ Ideal for frontier reasoning engines |
| **Novel System Architecture** | 🟡 Great for initial code drafts & structural maps | ✅ Ideal for high-parameter synthesis |

---
---

## ✨ Key Features Summary

| Feature Category | Capability Overview |
| :--- | :--- |
| **🧠 Dynamic LLM Router** | Automatically detects task domain (coding, vision, document analysis, writing) and routes prompts to optimal local Ollama models (`qwen2.5-coder`, `minicpm-v`, `phi4-mini`, `gemma3`, `llama3.2`). |
| **🎨 Audio 3D Visualizer** | Interactive Three.js canvas featuring custom GLSL sphere geometry and reactive background shaders responding to live microphone/TTS audio frequency streams. |
| **🎙️ Voice UI & Feedback Guard** | Double-tap microphone continuous conversation mode with automatic microphone lock synchronization during TTS playback to eliminate feedback loops. |
| **📄 Universal Document Parser** | Magic-header signature analysis with deep extraction for PDF, DOCX, XLSX, PPTX, image OCR, and recursive ZIP archive inspection. |
| **⚡ High-Speed Structural Mapper** | Rapidly analyzes large codebases (>12KB) in under 20 seconds, extracting class hierarchies, function signatures, and imports. |
| **🤖 System & Web Automation** | Desktop window/process manager, Selenium browser search/navigation, clipboard sync, and automated screen capture. |
| **🔊 Edge-TTS & Audio Cache** | Microsoft Edge Neural Speech synthesis with SHA-256 LRU audio caching in `tts_cache/` for zero-latency phrase playback. |
| **🔌 Dual MCP Engine** | Full-duplex Model Context Protocol (JSON-RPC 2.0) server & client connecting local desktop tools to Claude Desktop, Cursor, AI Studio, Runway Gen-3, ElevenLabs, and Google Workspace. |

---

## ⚡ Quick Start

### 🪟 1. Windows (One-Click Automated Setup — Recommended)

Simply run the automated installer wizard:
```cmd
:: Right-click and Run as Administrator:
install_windows.bat
```
The installer automatically verifies Python 3.11, Node.js, and Ollama, installs dependencies, and pulls the default model (`llama3.2:3b`).

#### Launching LUMIN on Windows:
- **CLI Agent & Speech Terminal**: Double-click `start_agent.bat`
- **3D Voice Web UI**: Double-click `start_app.bat`

---

### 🐧 2. Linux & macOS

```bash
# 1. Clone repository
git clone https://github.com/Montyscripts/Project-Lumin.git
cd lumin-ai-agent

# 2. Run automated setup & agent launcher
chmod +x start_agent.sh
./start_agent.sh

# 3. Launch 3D Web UI (in a separate terminal)
npm install
npm run dev
```

---

### 🐳 3. Docker & Docker Compose (Zero Configuration)

Launch LUMIN and a local Ollama service in isolated containers with full volume persistence:

```bash
# Start full stack (LUMIN + Ollama)
docker-compose up -d

# View logs
docker-compose logs -f lumin-agent
```
Access the web UI at `http://localhost:3000`.

> **GPU Acceleration**: To enable NVIDIA GPU passthrough in Docker, uncomment the `deploy` section in `docker-compose.yml`.

---

## 💻 Hardware Requirements & Performance Matrix

| Resource Class | System RAM | GPU VRAM | Recommended Local Models | Performance Tier |
| :--- | :--- | :--- | :--- | :--- |
| **Entry-Level / Laptop** | 8 – 16 GB | CPU Only | `llama3.2:3b`, `phi4-mini` | Responsive & lightweight |
| **Mid-End Desktop** | 16 GB | 4 – 8 GB | `llama3.2:3b`, `gemma3:4b`, `qwen2.5-coder:7b` | High speed & accuracy |
| **High-End Desktop** | 32 GB | 8 – 12 GB | `qwen2.5:7b`, `minicpm-v:8b`, `codegemma:7b` | Ultra high fidelity |
| **Workstation Class** | 64+ GB | 16+ GB | `dolphin-mistral:7b`, `qwen2.5vl:7b`, `llava:7b` | Maximum capability |

---

## 🛠️ CLI Meta Commands & Shortcuts

You can type these administrative commands directly into the terminal while running the agent:

| Command | Purpose |
| :--- | :--- |
| `help` / `?` | Displays the meta-command interface menu. |
| `status` | Shows system hardware diagnostics, active model locks, and security modes. |
| `forget` | Clears conversation memory buffers and long-term memory records. |
| `mode` | Toggles input source between **Type** (Keyboard) and **Speak** (Microphone STT). |
| `models` | Lists all locally installed Ollama models. |
| `model <name>` | Locks routing to a specific model (e.g. `model qwen2.5-coder:7b`). |
| `model auto` | Unlocks manual target and restores dynamic task routing. |
| `tts on` / `tts off` | Enables or disables voice response speech playback. |
| `voice list` | Lists all supported global Edge-TTS neural voices. |
| `voice <name>` | Sets preferred speech speaker voice (e.g. `voice en-AU-NatashaNeural`). |
| `fileinput` / `paste` | Opens your default text editor scratchpad for pasting large codebases/documents. |

---

## 🔌 Model Context Protocol (MCP) Dual Engine

LUMIN includes native, non-breaking support for the **Model Context Protocol (MCP)**—an open JSON-RPC 2.0 specification that standardizes how AI models and external applications discover tools, inspect workspace resources, and execute remote prompts.

```
+-------------------------------------------------------------------------------+
|                       LUMIN DUAL MCP ENGINE (v1.0.0)                          |
|                                                                               |
|  [External MCP Hosts]                              [External MCP Services]    |
|   - Claude Desktop                                  - Runway Gen-3 Video      |
|   - Cursor IDE             <---> [LUMIN] <--->      - ElevenLabs Voice        |
|   - AI Studio                                       - Google Workspace        |
|   - Custom Agent Frameworks                         - GitHub / SQLite         |
+-------------------------------------------------------------------------------+
```

### Protocol Capabilities:
- **LUMIN as MCP Server**: Exposes local desktop tools (file I/O, browser automation, screenshots, process control, Ollama routing) to external hosts like **Claude Desktop** and **Cursor**.
- **LUMIN as MCP Client**: Connects LUMIN directly to external third-party MCP servers (Runway Gen-3, ElevenLabs, Google Workspace, GitHub) for dynamic external tool invocation.

### Enabling MCP:
Set `"enable_mcp": true` in `agent_config.json` or toggle **Dual MCP Engine** in the Web UI Settings panel (⚙️).

To run LUMIN's MCP server directly over standard input/output (`stdio`):
```bash
python -m tools.mcp_server
```

---

## 📁 Repository Structure

```
.
├── core/
│   └── agent.py              # Python AI Agent Orchestrator & Multi-model Router
├── llm/
│   └── client.py             # Ollama LLM Client & System Prompt Handler
├── memory/
│   └── manager.py            # Short-term and Semantic Long-term Memory Engine
├── audio/
│   └── tts_cache.py          # Edge-TTS Audio Generation & LRU Cache Manager
├── tools/
│   ├── registry.py           # Selenium, System Shell, File Ops & Browser Tools
│   ├── mcp_server.py         # MCP JSON-RPC Server
│   └── mcp_client.py         # MCP Client Manager
├── src/
│   ├── main.tsx              # Lit Web Component Application & Voice Chat UI
│   ├── visual-3d.tsx         # Three.js 3D Sphere & Audio Visualizer
│   └── backdrop-shader.ts    # GLSL Background Fragment Shaders
├── docs/                     # Comprehensive Guides
│   ├── INSTALLATION.md
│   ├── ARCHITECTURE.md
│   ├── COMMANDS.md
│   └── TROUBLESHOOTING.md
├── Dockerfile                # Multi-stage Container Definition
├── docker-compose.yml        # Compose Stack with Ollama & Volume Persistence
├── install_windows.bat       # One-Click Automated Windows Installer Wizard
├── start_agent.bat           # One-Click CLI Agent Launcher (Windows)
├── start_app.bat             # One-Click 3D Web UI Launcher (Windows)
├── start_agent.sh            # Automated Bash Setup & Launcher (Linux/macOS)
├── requirements.txt          # Python Dependency Manifest
├── package.json              # Frontend Node.js Dependencies & Scripts
├── CHANGELOG.md              # Project Release Notes
├── CONTRIBUTING.md           # Guidelines for Contributors
├── SECURITY.md               # Security Policy & Vulnerability Reporting
└── LICENSE                   # MIT License
```

---

## 📖 Documentation Index

- [Installation Guide](docs/INSTALLATION.md) — Comprehensive setup for Windows, Linux, macOS, GPU CUDA/Metal, and document parsers.
- [Architecture Deep Dive](docs/ARCHITECTURE.md) — Architectural overview of the 3D visualizer pipeline, Python orchestrator, and hybrid model router.
- [Command Reference](docs/COMMANDS.md) — Full list of meta commands, task routing rules, and CLI utility flags.
- [Troubleshooting & FAQ](docs/TROUBLESHOOTING.md) — Solutions for microphone permissions, CUDA, Ollama connections, ports, and audio playback.

---

## 🌟 Community & Support

If you find LUMIN AI Agent useful, please give it a **⭐ Star** on GitHub!  
Issues and Pull Requests are welcome.

[![Donate via PayPal](https://img.shields.io/badge/Donate-PayPal-blue.svg)](https://paypal.me/calebbroussard181)

If you found my application useful and want to support further development, consider buying me a coffee!

[**Donate via PayPal**](https://paypal.me/calebbroussard181)

*Every bit helps keep the project growing. Thank you!*

---

## 📄 License

This project is open-source software licensed under the [MIT License](LICENSE).
