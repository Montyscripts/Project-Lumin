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

**Lumin is an early-stage experiment in building a fully local AI desktop companion.**  
It combines continuous voice interaction, a real-time 3D audio-reactive visualizer, local LLM routing via Ollama, a simple context/skills system, and basic coding + desktop tools.

> **Current status**: Early prototype.  
> Many features work on the author’s machine. Reliability, cross-platform support, and polish are still limited. This is not a production-ready product.

[Quick Start](#-quick-start) • [Current Capabilities](#-current-capabilities) • [Workspace Modes](#-workspace-modes) • [MCP Support](#-model-context-protocol-dual-mcp-engine) • [Architecture](#-system-architecture) • [Roadmap](#-roadmap--current-status) • [Contributing](CONTRIBUTING.md)

---
</div>

<div align="center">
  <img src="assets/lumin-demo.gif" alt="LUMIN Demo" width="900">
</div>

## Why this project exists

Most voice assistants and coding agents rely on cloud APIs. Lumin explores what is possible when everything runs locally:

- Voice input and output
- A reactive 3D visual interface
- Task-aware routing across local models
- File-backed context and reusable skills
- Basic tool use and MCP interoperability

The project prioritizes privacy and local control over polish and reliability (for now).

---

## Current Capabilities

| Area                              | Status          | Notes |
|-----------------------------------|-----------------|-------|
| Local Ollama model routing        | Working         | Routes coding / vision / general queries to different models |
| 3D audio-reactive visualizer      | Working         | Three.js + GLSL sphere that reacts to mic and TTS |
| Voice pipeline (STT + Edge-TTS)   | Working         | Functional under good conditions; still fragile |
| Markdown context workspace        | Working         | `USER.md`, `IDENTITY.md`, `RULES.md`, `MEMORY.md` |
| Skills registry                   | Working         | Basic reusable capability packs |
| File / document tools             | Working         | PDF, DOCX, XLSX, PPTX, ZIP support exists |
| Terminal / shell tools            | Working         | Basic execution and streaming |
| MCP server (basic tools)          | Experimental    | JSON-RPC 2.0 implementation present |
| Continuous duplex voice           | Fragile         | Works in ideal conditions; echo and turn-taking issues remain |
| Cross-platform reliability        | Limited         | Primarily validated on the author’s Windows setup |
| Large-scale coding agent features | Early           | AST extraction and multi-file editing are still rough |

---

## Workspace Modes

Lumin currently offers three main modes plus a full-screen visualizer mode:

```
+-----------------------------------------------------------------------------------------------+
|  [VOICE MODE]          |  [AGENT MODE]         |  [SETTINGS PANEL]                            |
|  - 3D sphere center    |  - Split workspace    |  - Context & Skills Workspace                |
|  - Real-time audio FFT |  - Chat & task stream |  - Voice catalog & Edge-TTS                  |
|  - Live STT transcript |  - Live Terminal logs |  - Ollama models & routing                   |
|  - Neural voice output |  - File tools         |  - 3D shader params & MCP config             |
+-----------------------------------------------------------------------------------------------+
```

- **Voice Mode** — Focused on the 3D sphere with live transcripts and hands-free interaction.
- **Agent Mode** — Chat + terminal + basic file/code tools.
- **Settings** — Context files, skills, voice, models, and visualizer parameters.
- **Cinema Mode** (`Esc` / `H`) — Full-screen visualizer with UI chrome hidden.

---

## Quick Start

> **Python Requirement**: Use **Python 3.11, 3.12, or 3.13**. Python 3.14+ is not supported.

### Windows

1. Run the installer once:
   ```cmd
   install_windows.bat
   ```

2. Launch the app:
   ```cmd
   start_app.bat
   ```

   This should open the UI at `http://localhost:3000`.

   Helper scripts:
   - `start_app_debug.bat` — foreground mode with logs
   - `start_agent.bat` — CLI-only agent
   - `stop_app.bat` — stop processes

> Note: The Windows scripts are still early. Manual setup may be required if something fails.

### Linux & macOS

```bash
git clone https://github.com/Montyscripts/Project-Lumin.git
cd Project-Lumin

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Start the agent
python agent.py

# In a separate terminal
npm install
npm run dev
```

Open `http://localhost:3000`.

### Docker (early)

```bash
docker-compose up -d
docker-compose logs -f lumin-agent
```

Access at `http://localhost:3000`. GPU passthrough is experimental.

---

## Model Context Protocol (Dual MCP)

Lumin includes an experimental dual MCP implementation (JSON-RPC 2.0):

- **MCP Server** — Exposes local tools so external hosts (Claude Desktop, Cursor, etc.) can call them.
- **MCP Client** — Can connect to external MCP servers.

Example server configuration for Claude Desktop / Cursor:

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

External servers can be configured in `external_mcp_servers.json` or via the Settings UI.  
This part of the system is still early and not fully hardened.

---

## System Architecture

```
Project-Lumin/
├── lumin_context/            # Context workspace (markdown)
│   ├── USER.md
│   ├── IDENTITY.md
│   ├── RULES.md
│   ├── MEMORY.md
│   └── SKILLS/
│       └── registry.json
├── core/                     # Agent runtime
│   ├── agent.py              # Main orchestration
│   ├── router.py             # Intent + model routing
│   ├── runtime_context.py
│   ├── resource_governor.py
│   ├── capabilities.py
│   └── writing.py
├── llm/
│   └── client.py             # Ollama client
├── audio/
│   ├── tts_cache.py          # Edge-TTS + cache
│   └── local_tts.py
├── memory/
│   └── manager.py
├── tools/
│   ├── registry.py           # File, shell, browser tools
│   ├── mcp_server.py
│   └── mcp_client.py
├── src/                      # Frontend (Lit + Three.js)
│   ├── main.tsx
│   ├── visual-3d.tsx
│   └── ...
├── server.js                 # Node API + WebSocket bridge
├── docker-compose.yml
└── package.json
```

---

## Hardware Guidance (approximate)

| Hardware Tier         | Memory   | GPU / VRAM     | Suggested Models                  | Realistic Use Cases                     |
|-----------------------|----------|----------------|-----------------------------------|-----------------------------------------|
| Laptop / Entry        | 8–16 GB  | CPU / iGPU     | `llama3.2:3b`, `phi4-mini`        | Basic voice chat, simple tasks          |
| Mid-range Desktop     | 16–32 GB | 6–10 GB VRAM   | `qwen2.5-coder:7b` + smaller models | Coding help, document work, research   |
| Higher-end            | 32+ GB   | 12+ GB VRAM    | Larger coder + vision models      | Heavier multimodal and agent workloads  |

Results will vary significantly based on model size, quantization, and system load.

---

## Roadmap & Current Status

**Working / mostly working**
- [x] Task-based Ollama model routing
- [x] Markdown context workspace
- [x] Basic skills system
- [x] 3D audio-reactive visualizer
- [x] Core voice pipeline (STT + Edge-TTS)
- [x] File and document tools
- [x] Experimental dual MCP support

**Still early / needs work**
- [ ] Reliable continuous duplex voice (echo cancellation, barge-in, turn-taking)
- [ ] Robust cross-platform installation experience
- [ ] Stronger coding agent capabilities and multi-file editing
- [ ] Better error handling, recovery, and observability
- [ ] Meaningful automated test coverage
- [ ] Performance and resource usage under sustained use

Near-term priority is improving reliability and install experience rather than adding many new features.

---

## Contributing

This is currently a solo experimental project. Feedback, bug reports, and focused pull requests are welcome — especially around:

- Installation and platform issues
- Voice pipeline robustness
- Code structure and maintainability
- Test coverage

Please open an issue before large changes so direction can be discussed.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

---

## License

MIT License — see [LICENSE](LICENSE).

---

**Final note**  
Lumin is an exploration of local voice + agent + visualization design. It is not yet a polished or production-ready system. Expect rough edges. Useful feedback that improves reliability and clarity is more valuable right now than feature requests.
```