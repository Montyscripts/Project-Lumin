# LUMIN AI Agent — Troubleshooting & FAQ

This document provides solutions for common runtime, setup, and hardware issues, specifically focusing on cross-platform stability, Python virtual environments, and audio engines.

---

## ❓ Frequently Encountered Issues & Permanent Solutions

### 1. `OverflowError: cannot convert longdouble infinity to integer`
- **Cause**: Python 3.14 (or bleeding-edge prereleases) was used to initialize NumPy. Python 3.14 introduces breaking C-API changes that cause NumPy initialization to throw an `OverflowError` during `import numpy`.
- **Fix**:
  - LUMIN officially supports **Python 3.11, 3.12, and 3.13 only**.
  - Install Python 3.12 or 3.13 from [python.org](https://python.org).
  - Run `install_windows.bat` to automatically build an isolated `venv` with a supported Python version.
  - Verify your virtual environment Python version:
    ```cmd
    venv\Scripts\python.exe --version
    ```

---

### 2. Multiple Python Installations on Windows (Wrong Interpreter Picked)
- **Cause**: Having multiple versions of Python on your machine (e.g. 3.11, 3.14 from Microsoft Store, Anaconda) where `PATH` defaults to an incompatible Python interpreter.
- **Fix**:
  - LUMIN uses an isolated project virtual environment in `%CD%\venv`.
  - The Node server and batch scripts prioritize `%CD%\venv\Scripts\python.exe` over system `PATH`.
  - Run `install_windows.bat` once to bind the project to a supported Python version (3.11–3.13).
  - Always launch the application via `start_app.bat` or `start_app_debug.bat`.

---

### 3. Edge-TTS 403 Forbidden / Sec-MS-GEC Handshake Errors
- **Cause**: Microsoft Edge TTS servers occasionally rate-limit or rotate websocket validation tokens (`Sec-MS-GEC`), causing older `edge-tts` clients to receive HTTP 403 Forbidden.
- **Fix**:
  - Ensure you are on `edge-tts>=7.2.0`:
    ```cmd
    venv\Scripts\pip.exe install --upgrade edge-tts
    ```
  - LUMIN includes automatic multi-tier fallback: if the WebSocket neural stream receives a 403, it logs an actionable warning and automatically falls back to browser-native `SpeechSynthesis` and local TTS mechanisms without crashing the UI or agent.

---

### 4. Agent Exits with Code 1 Immediately After Launch
- **Cause**: Missing dependencies, corrupt virtual environment, or model not found.
- **Fix**:
  - Run `start_app_debug.bat` to see the full Python traceback in the console.
  - Review the 5-point Recovery Checklist:
    1. **Python Version**: Ensure Python 3.11, 3.12, or 3.13 is used (not 3.14+).
    2. **Virtual Environment**: Check that `venv\Scripts\python.exe` exists.
    3. **Dependencies**: Run `venv\Scripts\pip.exe install -r requirements.txt`.
    4. **NumPy / TTS**: Verify `numpy>=1.26.0,<2.3.0` and `edge-tts>=7.2.0`.
    5. **Ollama**: Verify Ollama is running (`ollama serve`) and model is downloaded (`ollama pull llama3.2:3b`).

---

### 5. `Ollama executable was not found` or Connection Error on `127.0.0.1:11434`
- **Cause**: Ollama is either not installed or the service is not active in the background.
- **Fix**:
  - Windows: Run `install_windows.bat` or open Command Prompt as Administrator and run `ollama serve`.
  - Linux/macOS: Run `ollama serve &` in a separate terminal.
  - Test connection: Open `http://localhost:11434` in your browser. It should say `"Ollama is running"`.

---

### 6. Microphone or Voice Input (STT) Not Working
- **Cause**: Missing `sounddevice` / `SpeechRecognition` libraries or missing OS microphone permissions.
- **Fix**:
  - Reinstall dependencies inside your venv:
    ```cmd
    venv\Scripts\pip.exe install sounddevice SpeechRecognition numpy
    ```
  - Windows: Go to **Settings > Privacy & Security > Microphone** and verify **Allow apps to access your microphone** is turned ON.
  - macOS: Check **System Settings > Privacy & Security > Microphone** and grant terminal/IDE access.

---

### 7. Port 3000 Conflicts
- **Cause**: Another background process is occupying port 3000.
- **Fix**:
  - Windows: Run `stop_app.bat` to automatically terminate lingering processes, or manually run:
    ```cmd
    netstat -ano | findstr :3000
    taskkill /PID <PID> /F
    ```
  - Linux/macOS:
    ```bash
    lsof -i :3000
    kill -9 <PID>
    ```

---

### 8. Selenium Web Driver / YouTube Play Errors
- **Cause**: Chrome/Firefox browser is not installed or `webdriver-manager` failed to fetch browser driver.
- **Fix**:
  - Ensure Google Chrome or Firefox is installed on your machine.
  - Update selenium tools inside venv:
    ```cmd
    venv\Scripts\pip.exe install --upgrade selenium webdriver-manager
    ```
