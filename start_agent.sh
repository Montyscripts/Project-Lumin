#!/bin/bash
clear
echo "======================================================================="
echo "  LUMIN AGENT ROOT BOOTSTRAPPER — PRODUCTION PIPELINE SETUP"
echo "======================================================================="

# Check Python 3
if ! command -v python3 &> /dev/null; then
    echo "[FATAL ERROR]: Python 3 was not found in your system PATH."
    echo "Please install Python 3.10+ on your system and try again."
    exit 1
fi

# Check Ollama
if ! command -v ollama &> /dev/null; then
    echo "[WARNING]: Ollama executable was not found in your system PATH."
    echo "LUMIN recommends installing Ollama for local-first execution."
    echo "Download from: https://ollama.com"
else
    echo "[INFO]: Ollama executable detected."
    # Check if port 11434 is listening
    if ! lsof -i :11434 &> /dev/null && ! netstat -an | grep 11434 &> /dev/null; then
        echo "[INFO]: Ollama is installed but not running."
        echo "[INFO]: Attempting to start Ollama background service..."
        ollama serve > /dev/null 2>&1 &
        sleep 5
    else
        echo "[INFO]: Ollama service is active on port 11434."
    fi
fi

# Auto install dependencies
if [ ! -f .deps_installed.flag ]; then
    echo "[INFO]: Performing first-run dependency check..."
    python3 -m pip install --upgrade pip
    if [ -f requirements.txt ]; then
        python3 -m pip install -r requirements.txt
    else
        python3 -m pip install requests psutil pyperclip edge-tts sounddevice numpy SpeechRecognition selenium webdriver-manager GPUtil pillow langchain langchain-core langchain-ollama langchain-community langgraph rich mcp pydantic fastapi uvicorn
    fi
    if [ $? -eq 0 ]; then
        touch .deps_installed.flag
        echo "[INFO]: Dependency check passed!"
    else
        echo "[WARNING]: Some Python dependencies failed to install. Continuing..."
    fi
fi

# Launch the agent
echo "[INFO]: Launching LUMIN Agent process..."
python3 agent.py
if [ $? -ne 0 ]; then
    echo ""
    echo "[FATAL ERROR]: LUMIN Agent exited with error code $?."
    exit 1
fi
