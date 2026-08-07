# Contributing to LUMIN AI Agent

Thank you for your interest in contributing to **LUMIN AI Agent**! LUMIN is an open-source project dedicated to building a privacy-focused, local-first multimodal voice AI experience with real-time 3D audio-reactive graphics.

Whether you're fixing a bug, enhancing GLSL shaders, expanding local tool integrations, or writing documentation, your contributions are welcomed and appreciated!

---

## 📜 Code of Conduct

We are committed to providing a welcoming and inclusive environment for everyone. Please review and adhere to our [Code of Conduct](CODE_OF_CONDUCT.md) in all community interactions.

---

## 🚀 How to Get Started

### 1. Fork & Clone the Repository
```bash
git clone https://github.com/Montyscripts/Project-Lumin.git
cd lumin-ai-agent
```

### 2. Set Up Development Environment

#### Python Backend:
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

#### Node.js Frontend (Vite + Lit + Three.js):
```bash
npm install
npm run dev
```

---

## 🛠️ Verification & Quality Assurance

Before submitting a Pull Request, please verify that both Python and TypeScript type checking pass cleanly:

```bash
# 1. Frontend TypeScript Compilation Check
npm run lint

# 2. Python Backend Syntax Compilation Check
python -m py_compile agent.py core/agent.py llm/client.py tools/mcp_server.py
```

---

## 🌿 Git Branching & Pull Request Guidelines

### Branch Naming
- `feature/short-description` — New features or tool integrations (e.g. `feature/whisper-offline-stt`)
- `fix/short-description` — Bug fixes (e.g. `fix/mic-feedback-guard`)
- `docs/short-description` — Documentation improvements (e.g. `docs/mcp-setup-guide`)

### Pull Request Checklist
1. [ ] **Scope**: PR is focused and clearly describes what was added or changed.
2. [ ] **Verification**: Verified functionality locally on Windows, Linux, or macOS.
3. [ ] **Cleanliness**: No leftover debug print statements or orphan log files.
4. [ ] **Privacy**: Zero hardcoded secrets, API keys, or personal machine paths.
5. [ ] **Build Check**: `npm run lint` and `npm run build` execute cleanly with no errors.

---

## 🎨 High-Value Contribution Areas

- **3D Graphics & GLSL Shaders**: New geometry shaders, audio frequency visualizers, and canvas filters (`src/backdrop-shader.ts`, `src/visual-3d.tsx`).
- **Local Tool Automation**: System automations, desktop app integration, and web tools (`tools/registry.py`).
- **Document Parsers**: Support for specialized formats (e.g., Jupyter notebooks, ePub, CAD files).
- **Dual MCP Protocol**: Enhancing MCP client/server handlers and custom prompt templates (`tools/mcp_server.py`, `tools/mcp_client.py`).

---

## 💬 Community & Support

- Open a **GitHub Issue** for bug reports or specific feature proposals.
- Participate in **GitHub Discussions** for general Q&A, showcase, and feedback.

Thank you for helping build the future of local-first voice AI!
