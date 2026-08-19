# LUMIN AI Agent — Detailed Installation & Setup Guide

Welcome to the **LUMIN AI Agent** installation manual. This document covers setup steps across Windows, Linux, and macOS, hardware acceleration (NVIDIA CUDA, Apple Metal, ROCm), and manually installing optional dependencies.

---

## 📋 System Requirements

### Python Version Support
> ⚠️ **CRITICAL**: LUMIN officially supports **Python 3.11, 3.12, and 3.13 only**.
> - **Python 3.14+ is NOT supported**: Bleeding-edge Python 3.14 introduces breaking C-API changes that cause `OverflowError: cannot convert longdouble infinity to integer` inside NumPy and C-extensions.
> - **Python < 3.11 is NOT supported**: Older versions lack modern typing and async constructs used across LUMIN's orchestration pipeline.

### Hardware Profiles
| Resource Profile | RAM | VRAM | Ideal Models |
| :--- | :--- | :--- | :--- |
| **Laptop / Low Resource** | 8 - 16 GB | N/A (CPU) | `llama3.2:3b`, `phi4-mini` |
| **Mid-End Desktop** | 16 GB | 4 - 8 GB | `llama3.2:3b`, `gemma3:4b`, `qwen2.5-coder:7b` |
| **High-End Desktop** | 32 GB | 8 - 12 GB | `qwen2.5:7b`, `minicpm-v:8b`, `codegemma:7b` |
| **Workstation Class** | 64+ GB | 16+ GB | `dolphin-mistral:7b`, `qwen2.5vl:7b`, `llava:7b` |

---

## 🪟 Windows Setup

### 1. First-Time Setup
Run the automated installation script once:
```cmd
install_windows.bat
```
This single script automatically:
- Checks for and configures a supported Python runtime (Python 3.11, 3.12, or 3.13).
- Provisions an isolated project virtual environment (`venv`).
- Installs and upgrades all required Python audio, document, and AI dependencies.
- Verifies Node.js and runs `npm install` for the Web UI.
- Verifies Ollama availability and pulls the lightweight default local model (`llama3.2:3b`).
- Runs pre-flight verification checks.

---

### 2. Running LUMIN
Once installation is complete, launch the application anytime using:
```cmd
start_app.bat
```
- Automatically starts the backend services and opens the **3D Visualizer & Voice Web UI** at **`http://localhost:3000`**.
- Additional helper scripts:
  - `start_app_debug.bat` — Launches in foreground console mode to display real-time debug logs.
  - `start_agent.bat` — Dedicated CLI runner with direct terminal routing.
  - `stop_app.bat` — Cleanly stops all LUMIN processes and frees port 3000.

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

## 📄 Document & OCR Processing Setup (Scanned PDF Support)

LUMIN automatically detects installed file parsers and OCR packages at runtime. For standard text PDFs, `pypdf` handles fast extraction out of the box. For image-heavy / scanned PDFs:

### 1. Python Packages (Installed automatically via requirements.txt)
```bash
pip install pypdf pymupdf pytesseract pdf2image python-docx openpyxl python-pptx
```

### 2. Optional Tesseract OCR Binary (For Local Text-Based OCR)
If Tesseract is not installed, LUMIN gracefully falls back to rendering page images and routing directly to local vision models (`minicpm-v:8b` or `qwen2.5vl:7b`). To enable local text OCR:

- **Windows**:
  ```cmd
  winget install UB-Mannheim.TesseractOCR
  ```
  *(Or download from GitHub: `https://github.com/UB-Mannheim/tesseract/wiki` and add to PATH)*

- **Linux (Debian/Ubuntu)**:
  ```bash
  sudo apt-get update && sudo apt-get install -y tesseract-ocr poppler-utils
  ```

- **macOS (Homebrew)**:
  ```bash
  brew install tesseract poppler
  ```

---

## 🎬 Multimedia & Audio Dependencies

```bash
# Windows (winget / Chocolatey):
winget install Gyan.FFmpeg

# Linux (Debian/Ubuntu):
sudo apt-get install -y ffmpeg

# macOS (Homebrew):
brew install ffmpeg
```
