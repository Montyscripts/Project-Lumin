#!/bin/bash
clear
echo "======================================================================="
echo "  LUMIN AGENT ROOT BOOTSTRAPPER — PRODUCTION PIPELINE SETUP"
echo "======================================================================="

# Check Python 3
if ! command -v python3 &> /dev/null; then
    echo "======================================================================="
    echo " [FATAL ERROR]: Python 3 was not found in your system PATH."
    echo "======================================================================="
    echo " RECOVERY STEPS:"
    echo " 1. Linux (Debian/Ubuntu): sudo apt update && sudo apt install -y python3 python3-pip"
    echo " 2. macOS (Homebrew):      brew install python3"
    echo " 3. Verify installation:    python3 --version"
    echo "======================================================================="
    exit 1
fi

# Check Ollama Runtime & Service
OLLAMA_READY=false
if ! command -v ollama &> /dev/null; then
    echo "-----------------------------------------------------------------------"
    echo " [NOTICE]: Ollama executable was not found in system PATH."
    echo " ➜ RECOVERY ACTION: Install Ollama by running:"
    echo "    curl -fsSL https://ollama.com/install.sh | sh"
    echo "   or download from https://ollama.com"
    echo "-----------------------------------------------------------------------"
else
    echo "[INFO]: Ollama executable detected."
    # Check if port 11434 is listening
    if ! lsof -i :11434 &> /dev/null && ! netstat -an 2>/dev/null | grep -q 11434 && ! curl -s http://localhost:11434/api/tags &> /dev/null; then
        echo "[INFO]: Ollama daemon is offline. Attempting background start ('ollama serve')..."
        ollama serve > /dev/null 2>&1 &
        sleep 4
    fi

    if curl -s http://localhost:11434/api/tags &> /dev/null; then
        echo "[INFO]: Ollama service is active on port 11434."
        OLLAMA_READY=true
    else
        echo "-----------------------------------------------------------------------"
        echo " [WARNING]: Ollama daemon is installed but not responding on port 11434."
        echo " ➜ RECOVERY ACTION: Run 'ollama serve' in a separate terminal window."
        echo "-----------------------------------------------------------------------"
    fi
fi

# Model Readiness Check
if [ "$OLLAMA_READY" = true ]; then
    MODELS_JSON=$(curl -s http://localhost:11434/api/tags)
    if echo "$MODELS_JSON" | grep -q '"models":\[\]' || [ -z "$MODELS_JSON" ]; then
        echo "[INFO]: No local LLM models detected in Ollama. Attempting auto-pull of 'llama3.2:3b'..."
        ollama pull llama3.2:3b
        if [ $? -ne 0 ]; then
            echo "-----------------------------------------------------------------------"
            echo " [WARNING]: Failed to auto-pull starter model 'llama3.2:3b'."
            echo " ➜ RECOVERY ACTION: Ensure internet connection and run:"
            echo "    ollama pull llama3.2:3b"
            echo "-----------------------------------------------------------------------"
        fi
    fi
fi

# Auto install dependencies
if [ ! -f .deps_installed.flag ]; then
    echo "[INFO]: Performing first-run dependency check..."
    python3 -m pip install --upgrade pip > /dev/null 2>&1
    if [ -f requirements.txt ]; then
        python3 -m pip install -r requirements.txt
    else
        python3 -m pip install requests psutil pyperclip edge-tts sounddevice numpy SpeechRecognition selenium webdriver-manager GPUtil pillow pypdf pytesseract pdf2image pymupdf langchain langchain-core langchain-ollama langchain-community langgraph rich mcp pydantic fastapi uvicorn
    fi
    if [ $? -eq 0 ]; then
        touch .deps_installed.flag
        echo "[INFO]: Core dependency check passed!"
    else
        echo "-----------------------------------------------------------------------"
        echo " [WARNING]: Some Python dependencies failed to install."
        echo " ➜ RECOVERY ACTION: Run 'python3 -m pip install -r requirements.txt' manually."
        echo "-----------------------------------------------------------------------"
    fi
fi

# Pre-flight Diagnostic Check via Python Capability Registry
python3 -c "
try:
    from core.capabilities import CapabilityRegistry
    reg = CapabilityRegistry()
    report = reg.get_actionable_recovery_report()
    if 'RECOVERY ACTION' in report:
        print(report)
except Exception as e:
    pass
" 2>/dev/null

# Launch the agent
echo "[INFO]: Launching LUMIN Agent process..."
python3 agent.py
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
    echo ""
    echo "======================================================================="
    echo " [FATAL SYSTEM ERROR]: LUMIN Agent exited unexpectedly (code $EXIT_CODE)."
    echo "======================================================================="
    echo " RECOVERY CHECKLIST:"
    echo " 1. Check Ollama daemon: Ensure 'ollama serve' is running on port 11434."
    echo " 2. Check starter model: Run 'ollama pull llama3.2:3b' to confirm LLM availability."
    echo " 3. Verify Python environment: Run 'python3 -m pip install -r requirements.txt'."
    echo " 4. Check system memory: Ensure at least 2.0 GB free RAM is available."
    echo "======================================================================="
    exit $EXIT_CODE
fi
