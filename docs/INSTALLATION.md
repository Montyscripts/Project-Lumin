# LUMIN AI Agent — Detailed Installation & Setup Guide

Welcome to the **LUMIN AI Agent** installation manual. This document covers setup steps across Windows, Linux, and macOS, hardware acceleration (NVIDIA CUDA, Apple Metal, ROCm), and manually installing optional dependencies.

---

## 📋 System Requirements

### Hardware Profiles
| Resource Profile | RAM | VRAM | Ideal Models |
| :--- | :--- | :--- | :--- |
| **Laptop / Low Resource** | 8 - 16 GB | N/A (CPU) | `llama3.2:3b`, `phi4-mini` |
| **Mid-End Desktop** | 16 GB | 4 - 8 GB | `llama3.2:3b`, `gemma3:4b`, `qwen2.5-coder:7b` |
| **High-End Desktop** | 32 GB | 8 - 12 GB | `qwen2.5:7b`, `minicpm-v:8b`, `codegemma:7b` |
| **Workstation Class** | 64+ GB | 16+ GB | `dolphin-mistral:7b`, `qwen2.5vl:7b`, `llava:7b` |

---

## 🪟 Quick Setup on Windows (Recommended)

### Automated Installer (One-Click)
1. Right-click `install_windows.bat` and select **Run as Administrator**.
2. The wizard automatically detects/installs:
   - Python 3.10+
   - Node.js LTS
   - All Python dependencies from `requirements.txt`
   - Ollama engine & pulls the `llama3.2:3b` starter model
3. Once completed, run:
   - `start_agent.bat` for CLI Agent with terminal routing & speech synthesis.
   - `start_app.bat` for the full 3D Visualizer & Live Audio Web UI.

---

## 🐧 Linux & macOS Setup

### Automated Bash Script
```bash
chmod +x start_agent.sh
./start_agent.sh
```

### Manual Linux / macOS Setup
1. **Clone & Enter Repository**:
   ```bash
   git clone https://github.com/Montyscripts/Project-Lumin.git
   cd lumin-ai-agent
   ```

2. **Set Up Python Virtual Environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. **Install & Start Ollama**:
   ```bash
   # Linux
   curl -fsSL https://ollama.com/install.sh | sh
   ollama serve &
   ollama pull llama3.2:3b

   # macOS
   brew install ollama
   ollama serve &
   ollama pull llama3.2:3b
   ```

4. **Install Node.js & Start Frontend Web UI**:
   ```bash
   npm install
   npm run dev
   ```

---

## ⚡ GPU Acceleration Configuration

### NVIDIA CUDA (Windows & Linux)
- Install the latest NVIDIA GPU Drivers from [nvidia.com/drivers](https://www.nvidia.com/Download/index.aspx).
- Verify CUDA detection inside LUMIN:
  LUMIN automatically executes `nvidia-smi` and queries `GPUtil` or PyTorch to route tasks to VRAM.

### Apple Silicon (Metal / M1/M2/M3/M4)
- Ollama automatically utilizes Metal GPU acceleration on macOS without additional configuration.

### AMD ROCm (Linux)
- Follow official ROCm setup guides for Ollama: [Ollama ROCm Documentation](https://github.com/ollama/ollama/blob/main/docs/gpu.md#rocm).

---

## 📄 Document & Multimedia Processing Libraries

LUMIN automatically detects installed file parsers at runtime. For full document intelligence, install the optional binary parsers:

```bash
# Document parsers
pip install pypdf python-docx openpyxl python-pptx

# Multimedia metadata extraction
# Windows (Chocolatey / Scoop):
choco install ffmpeg

# Linux (Debian/Ubuntu):
sudo apt-get install ffmpeg

# macOS (Homebrew):
brew install ffmpeg
```
