# LUMIN AI Agent — Troubleshooting & FAQ

This document provides solutions for common runtime, setup, and hardware issues.

---

## ❓ Frequently Asked Questions & Solutions

### 1. `Ollama executable was not found` or connection error on `127.0.0.1:11434`
- **Cause**: Ollama is either not installed or the service is not active in the background.
- **Fix**:
  - Windows: Run `install_windows.bat` or open Command Prompt as Administrator and run `ollama serve`.
  - Linux/macOS: Run `ollama serve &` in a separate terminal.
  - Test connection: Open `http://localhost:11434` in your browser. It should say `"Ollama is running"`.

---

### 2. Microphone or Voice Input (STT) not working
- **Cause**: Missing `sounddevice` / `SpeechRecognition` libraries or missing OS microphone permissions.
- **Fix**:
  - Reinstall dependencies: `pip install sounddevice SpeechRecognition numpy`
  - Windows: Go to **Settings > Privacy & Security > Microphone** and verify **Allow apps to access your microphone** is turned ON.
  - macOS: Check **System Settings > Privacy & Security > Microphone** and grant terminal/IDE access.

---

### 3. Edge-TTS Speech Synthesis is Silent
- **Cause**: Missing `edge-tts` package or network access blocked to Microsoft Edge TTS servers.
- **Fix**:
  - Test installation: `pip install edge-tts`
  - Verify internet connectivity. Edge-TTS requires outbound connection to generate neural audio.
  - If Edge-TTS fails, LUMIN falls back to standard Windows PowerShell audio player or Linux `mpv`/`aplay`/`ffplay`.

---

### 4. Large file analysis is slow or timing out
- **Cause**: Analyzing massive text/code files without structure optimization.
- **Fix**:
  - LUMIN automatically switches files over 12KB to **Structural Map Extraction** mode to maintain speeds under 20 seconds.
  - Ensure you have `qwen2.5-coder:7b` or `phi4-mini` installed for optimal code analysis speed:
    ```bash
    ollama pull qwen2.5-coder:7b
    ```

---

### 5. Port 5173 Conflicts
- **Cause**: Another service is using port 5173.
- **Fix**:
  - Windows:
    ```cmd
    netstat -ano | findstr :5173
    taskkill /PID <PID> /F
    ```
  - Linux/macOS:
    ```bash
    lsof -i :5173
    kill -9 <PID>
    ```

---

### 6. Selenium Web Driver / YouTube play errors
- **Cause**: Chrome/Firefox browser is not installed or `webdriver-manager` failed to fetch browser driver.
- **Fix**:
  - Ensure Google Chrome or Firefox is installed on your machine.
  - Update selenium tools: `pip install --upgrade selenium webdriver-manager`
