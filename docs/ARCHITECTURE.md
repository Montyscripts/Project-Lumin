# LUMIN AI Agent — System Architecture & Cognitive Engine

This document provides an overview of LUMIN's multi-layered system design, hybrid routing engine, memory architecture, and tool execution layer.

---

## 🏗️ High-Level System Architecture

```
                                  +---------------------------------------+
                                  |     3D Web UI & Audio Visualizer      |
                                  |  (Lit / Web Components + GLSL Shaders)|
                                  +-------------------+-------------------+
                                                      |
                                                      | WebSockets / HTTP
                                                      v
                                  +-------------------+-------------------+
                                  |     Node.js App / Server Gateway      |
                                  |     (Port 3000 / Proxy / Audio)       |
                                  +-------------------+-------------------+
                                                      |
                                                      | Stdin / Stdout Bridge
                                                      v
                                  +-------------------+-------------------+
                                  |     LUMIN Python Orchestrator         |
                                  |           (core/agent.py)             |
                                  +---------+-------------------+---------+
                                            |                   |
                     +----------------------+                   +-----------------------+
                     |                                                                  |
                     v                                                                  v
    +----------------------------------+                              +----------------------------------+
    |  Dynamic Model Router & Hybrid   |                              |  Autonomous Tool & Memory Engine |
    |      Ollama Local Engine         |                              |  (ToolRegistry + MemoryManager)  |
    +----------------+-----------------+                              +----------------+-----------------+
                     |                                                                 |
     +---------------+---------------+                                 +---------------+---------------+
     |                               |                                 |               |               |
     v                               v                                 v               v               v
 [Coding Models]             [Vision Models]                     [File Parsers]  [Selenium Browser] [Edge-TTS / Speech]
 (qwen2.5-coder:7b)          (minicpm-v:8b)                      (PDF, Word,     (YouTube, Google,  (TTS Cache &
 (codegemma:7b)              (qwen2.5vl:7b)                       Excel, ZIP)     Web Search)        Local Speakers)
```

---

## 🧠 Dynamic Hybrid Model Routing Matrix

LUMIN inspects each query, task classification, and file context to dynamically route prompts to the optimal locally installed model:

| Task Domain | Primary Target Model | Secondary / Fallback Model | Purpose |
| :--- | :--- | :--- | :--- |
| **Coding & Debugging** | `qwen2.5-coder:7b` | `codegemma:7b` | Code generation, syntax analysis, refactoring |
| **Vision & Image Reasoning** | `minicpm-v:8b` | `qwen2.5vl:7b` / `llava:7b` | Image description, object identification, visual OCR |
| **Document & Data Analysis** | `phi4-mini` | `qwen2.5:7b` | Structured PDF, spreadsheet, document reasoning |
| **Creative Writing & Roleplay**| `gemma3:4b` | `dolphin-mistral:7b` | Narrative, email drafting, unfiltered writing |
| **Quick Chat & Fallback** | `llama3.2:3b` | `phi4-mini` | Low-latency response generation |

---

## 💾 Memory Engine & Context Workspace (`lumin_context/`)

LUMIN pairs runtime semantic memory with a first-class, file-backed context workspace:

1. **Context Workspace (`lumin_context/`)**:
   - `USER.md`: User persona, goals, technical level, and project preferences.
   - `IDENTITY.md`: LUMIN's tone, directives, personality, and behavioral rules.
   - `RULES.md`: Operational boundaries, sandboxing constraints, and output formats.
   - `MEMORY.md`: Durable facts and persistent long-term knowledge.
   - Files are automatically injected into the LLM system prompt on every cycle via `core/runtime_context.py` and synced bidirectionally between disk and the Web UI.

2. **Skills Registry (`lumin_context/SKILLS/registry.json`)**:
   - Registered capability packs ("Give him jobs") with natural-language triggers and 1-click execution.
   - Built-in skills for morning briefing, daily status, system diagnostics, deep research, and ambient visualizer controls.
   - Fully extensible with custom user-defined skill packs.

3. **Short-Term & Semantic Memory**:
   - Stores user preferences, facts, and file analysis summaries in `agent_memory.json`.
   - Uses text overlap heuristics and keyword matching for fast retrieval.
   - Automatically injects recalled facts into system prompts.

---

## 📁 Multimodal Document Parsing Engine

When a file path or attachment is received:
1. **Magic Signature Auto-Detection**: Inspects header bytes (`%PDF`, `PK\x03\x04`, `\x89PNG`, etc.) if extensions are missing or ambiguous.
2. **Structural Extraction**:
   - **Text/Code**: Builds a structural map (imports, classes, methods, line indexes, code previews) for large files (>12KB) to guarantee speed under 20 seconds.
   - **PDF**: Page-by-page text extraction (`pypdf`).
   - **Office (DOCX, XLSX, PPTX)**: Paragraph, table, cell, and slide extraction.
   - **Archives (ZIP, TAR, GZ)**: Recursive extraction and nested file analysis up to 10 files deep.
   - **Multimedia/Executables**: `ffprobe` metadata extraction for frame rate, codecs, resolution, bitrates, and ID3 markers.

---

## 🔊 Audio & Speech Synthesis Engine (`audio/tts_cache.py`)

- **Edge-TTS Integration**: Uses Microsoft Edge neural voices (`en-US-JennyNeural`, `en-US-GuyNeural`, etc.).
- **LRU Audio Cache**: Hashes generated speech text to `tts_cache/` to eliminate latency on repeated phrases.
- **Microphone Lock Manager**: Prevents microphone feedback during speech playback by pausing speech recognition while TTS audio is active.
