# Changelog

All notable changes to the **LUMIN AI Agent** project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-07-24

### 🚀 Production Release Candidate

#### Core AI Orchestrator & Local Routing (`core/agent.py`)
- **Dynamic Hybrid LLM Router**: Automatically routes queries to local Ollama models based on task domain:
  - Coding & Technical: `qwen2.5-coder:7b`, `codegemma:7b`
  - Vision & Image Reasoning: `minicpm-v:8b`, `qwen2.5vl:7b`, `llava:7b`
  - Document Analysis: `phi4-mini`, `qwen2.5:7b`
  - Writing & General: `gemma3:4b`, `llama3.2:3b`
- **Large File Structural Mapping**: Extracts class signatures, function definitions, imports, and code previews for files >12KB in under 20 seconds.
- **Multimodal Document Intelligence**: Native magic-header detection and extraction for PDF, DOCX, XLSX, PPTX, ZIP, and binary files.
- **Text Editor Scratchpad Trigger**: `fileinput` / `paste` / `longinput` commands open system native text editor for structured 8-section analysis.

#### 🎨 3D Web UI & Voice Experience (`src/`)
- **Real-Time GLSL Shaders**: Audio-reactive 3D sphere and animated background shaders built with Three.js and Lit Web Components.
- **Continuous Voice Conversation Mode**: Double-tap microphone activation with continuous turn handling and automated speech feedback guards.
- **Microphone Lock Manager**: Automatically pauses voice listening during speech synthesis output to prevent audio feedback loops.

#### 🔊 Speech Synthesis & Memory Engine
- **Microsoft Edge Neural Speech**: High-fidelity TTS voices (`en-US-JennyNeural`, `en-AU-NatashaNeural`, etc.).
- **LRU Audio Caching**: Hashes speech outputs to `tts_cache/` for instant playback of repeated phrases.
- **Semantic Memory Storage**: Multi-turn context tracking and long-term recall stored in `agent_memory.json`.

#### 🔌 Model Context Protocol (MCP) Dual-Role Engine (`tools/mcp_server.py`, `tools/mcp_client.py`)
- **Dual MCP Architecture**:
  - MCP Server mode exposes local desktop tools, file I/O, browser automation, and long-term memory to external hosts (Claude Desktop, Cursor, AI Studio).
  - MCP Client mode connects LUMIN to external tools (Runway Gen-3 video, ElevenLabs voice, Google Workspace, SQLite, GitHub).
- **JSON-RPC 2.0 Compliance**: Full handshake (`initialize`), tool discovery (`tools/list`), execution (`tools/call`), resource inspection (`resources/read`), and prompt template loading (`prompts/get`).
- **Resource Limits & Security**: 5 MB input payload cap, 2 MB output truncation, and path sandboxing.

#### 🛠️ Automated Setup & Developer Tools
- **One-Click Windows Installer**: Automated `install_windows.bat` with admin privilege elevation, dependency verification, and Ollama service bootstrapping.
- **Cross-Platform Launcher**: Shell scripts for Linux and macOS (`start_agent.sh`).
- **Production Multi-Stage Dockerfile**: Two-stage Docker build separating frontend node compilation from Python runtime with health checks.
- **Docker Compose**: Orchestrates `lumin-agent` and `ollama` with persistent volume management for models, memory, and audio cache.
