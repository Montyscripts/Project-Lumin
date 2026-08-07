@echo off
setlocal EnableDelayedExpansion
title LUMIN Local AI Router Agent – One-Click Setup (no manual steps)

:: ── Always request admin ──────────────────────────────────────────
net session >nul 2>&1
if errorlevel 1 (
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"

:: Timestamp for log file
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set "TS=%%I"
set "TIMESTAMP=%TS:~0,4%%TS:~4,2%%TS:~6,2%_%TS:~8,2%%TS:~10,2%%TS:~12,2%"
set "LOG_FILE=%CD%\setup_log_%TIMESTAMP%.txt"

echo ==================================================================== >  "%LOG_FILE%"
echo   LUMIN AI Router Agent - setup log  -  %DATE% %TIME%                 >> "%LOG_FILE%"
echo ==================================================================== >> "%LOG_FILE%"
echo.
echo   Starting one-click setup – everything is automatic.
echo   A log is written to: %LOG_FILE%

:: ── 1. Python ─────────────────────────────────────────────────────
echo   [1/5] Checking Python...
>>"%LOG_FILE%" echo   [1/5] Checking Python...

set "PY_EXE="
where python  >nul 2>&1 && set "PY_EXE=python"
if not defined PY_EXE where python3 >nul 2>&1 && set "PY_EXE=python3"
if not defined PY_EXE where py      >nul 2>&1 && set "PY_EXE=py"

if not defined PY_EXE (
    call :Fatal "Python (3.10+) is not installed or not in PATH." "Download from https://python.org and check 'Add Python to PATH'."
    exit /b 1
)

"%PY_EXE%" --version >>"%LOG_FILE%" 2>&1
if errorlevel 1 (
    for /d %%D in (C:\Python3*) do if exist "%%D\python.exe" set "PY_EXE=%%D\python.exe"
    if not defined PY_EXE (
        call :Fatal "Python was found but does not run." ""
        exit /b 1
    )
)
echo   [OK] Found %PY_EXE%
>>"%LOG_FILE%" echo   [OK] Found %PY_EXE%

:: ── 2. pip ────────────────────────────────────────────────────────
echo   [2/5] Checking pip...
>>"%LOG_FILE%" echo   [2/5] Checking pip...

"%PY_EXE%" -m pip --version >>"%LOG_FILE%" 2>&1
if errorlevel 1 (
    "%PY_EXE%" -m ensurepip --upgrade >>"%LOG_FILE%" 2>&1
    "%PY_EXE%" -m pip --version >nul 2>&1
    if errorlevel 1 (
        echo   pip not found, downloading get-pip.py...
        powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile '%TEMP%\get-pip.py'" >>"%LOG_FILE%" 2>&1
        if exist "%TEMP%\get-pip.py" (
            "%PY_EXE%" "%TEMP%\get-pip.py" >>"%LOG_FILE%" 2>&1
        )
        "%PY_EXE%" -m pip --version >nul 2>&1
        if errorlevel 1 (
            call :Fatal "Could not install pip." ""
            exit /b 1
        )
    )
)
echo   [OK] pip ready
>>"%LOG_FILE%" echo   [OK] pip ready

:: ── 3. Python packages (requirements.txt auto‑created) ────────────
echo   [3/5] Installing Python packages...
>>"%LOG_FILE%" echo   [3/5] Installing Python packages...

set "REQ_FILE=%CD%\requirements.txt"
if not exist "%REQ_FILE%" (
    (
        echo langchain^>=0.3.0
        echo langchain-core^>=0.3.0
        echo langchain-ollama^>=0.2.0
        echo langchain-community^>=0.3.0
        echo langgraph^>=0.2.0
        echo pillow^>=10.0.0
        echo pyperclip^>=1.8.2
        echo psutil^>=5.9.0
        echo requests^>=2.31.0
        echo ddgs^>=5.0
        echo selenium^>=4.15.0
        echo webdriver-manager^>=4.0.0
        echo SpeechRecognition^>=3.10.0
        echo sounddevice^>=0.4.6
        echo numpy^>=1.24.0
        echo rich^>=13.0.0
        echo GPUtil^>=1.4.0
        echo edge-tts^>=6.1.0
        echo mcp^>=1.0.0
        echo pydantic^>=2.0.0
        echo fastapi^>=0.100.0
        echo uvicorn^>=0.20.0
    ) > "%REQ_FILE%"
    >>"%LOG_FILE%" echo   [OK] Created requirements.txt
)

"%PY_EXE%" -m pip install -r "%REQ_FILE%" >>"%LOG_FILE%" 2>&1
if errorlevel 1 (
    "%PY_EXE%" -m pip install --user -r "%REQ_FILE%" >>"%LOG_FILE%" 2>&1
    if errorlevel 1 (
        "%PY_EXE%" -m pip install --no-cache-dir -r "%REQ_FILE%" >>"%LOG_FILE%" 2>&1
        if errorlevel 1 (
            call :Fatal "Failed to install Python packages." ""
            exit /b 1
        )
    )
)
echo   [OK] Python packages installed
>>"%LOG_FILE%" echo   [OK] Python packages installed

:: ── 4. Ollama – install automatically if missing ─────────────────
echo   [4/5] Ensuring Ollama is installed...
>>"%LOG_FILE%" echo   [4/5] Ensuring Ollama...

where ollama >nul 2>&1
if not errorlevel 1 goto :ollama_installed

:: ---------- AUTO‑INSTALL OLLAMA ----------
echo   Ollama not found – installing it now (this may take a few minutes)...
>>"%LOG_FILE%" echo   Installing Ollama...

:: First try the official Windows package manager (winget)
where winget >nul 2>&1
if not errorlevel 1 (
    echo   Using winget to install Ollama...
    >>"%LOG_FILE%" echo   Using winget...
    winget install --id Ollama.Ollama --silent --accept-package-agreements --accept-source-agreements >>"%LOG_FILE%" 2>&1
    if not errorlevel 1 (
        :: Refresh PATH so 'ollama' is found immediately
        call :RefreshEnv
        where ollama >nul 2>&1
        if not errorlevel 1 goto :ollama_installed
    )
)

:: Fallback: download the installer directly
echo   Downloading Ollama installer...
>>"%LOG_FILE%" echo   Downloading from ollama.com...
set "OLLAMA_INSTALLER=%TEMP%\OllamaSetup.exe"
powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://ollama.com/download/OllamaSetup.exe' -OutFile '%OLLAMA_INSTALLER%'" >>"%LOG_FILE%" 2>&1
if not exist "%OLLAMA_INSTALLER%" (
    call :Fatal "Failed to download Ollama. Check your internet connection." ""
    exit /b 1
)

echo   Running Ollama installer (silent)...
>>"%LOG_FILE%" echo   Running installer...
start /wait "" "%OLLAMA_INSTALLER%" /S >>"%LOG_FILE%" 2>&1
del "%OLLAMA_INSTALLER%" >nul 2>&1

:: Refresh environment again
call :RefreshEnv
where ollama >nul 2>&1
if errorlevel 1 (
    call :Fatal "Ollama installation seemed to complete, but 'ollama' is still not found in PATH." "Try restarting your PC and run this again."
    exit /b 1
)

:ollama_installed
echo   [OK] Ollama is installed
>>"%LOG_FILE%" echo   [OK] Ollama installed

:: ── 5. Start Ollama (if not already running) ─────────────────────
echo   [5/5] Starting Ollama...
>>"%LOG_FILE%" echo   [5/5] Starting Ollama...

netstat -ano | findstr "127.0.0.1:11434" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 goto :ollama_running

echo   Launching Ollama in background...
powershell -NoProfile -Command "Start-Process -FilePath 'ollama' -ArgumentList 'serve' -WindowStyle Hidden" >nul 2>&1
timeout /t 8 /nobreak >nul

netstat -ano | findstr "127.0.0.1:11434" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    :: Sometimes the first attempt fails; give it another try
    powershell -NoProfile -Command "Start-Process -FilePath 'ollama' -ArgumentList 'serve' -WindowStyle Hidden" >nul 2>&1
    timeout /t 10 /nobreak >nul
    netstat -ano | findstr "127.0.0.1:11434" | findstr "LISTENING" >nul 2>&1
    if errorlevel 1 (
        call :Fatal "Ollama service did not start." "Open a command prompt and run 'ollama serve', then relaunch this script."
        exit /b 1
    )
)

:ollama_running
echo   [OK] Ollama is running
>>"%LOG_FILE%" echo   [OK] Ollama running

:: ── (Optional) Pull a small starter model ─────────────────────────
echo   Pulling starter model llama3.2:3b (first run)…
>>"%LOG_FILE%" echo   Pulling llama3.2:3b...
ollama pull llama3.2:3b >>"%LOG_FILE%" 2>&1
if errorlevel 1 (
    echo   Could not auto-pull llama3.2:3b. Offline mode active. Fix: ensure Ollama is running and internet is available, then restart.
    >>"%LOG_FILE%" echo   [WARNING] Could not auto-pull llama3.2:3b.
) else (
    echo   Starter model ready.
    >>"%LOG_FILE%" echo   [OK] Starter model ready.
)

:: ── All done – launch the agent ───────────────────────────────────
echo.
echo   Setup complete! Launching the LUMIN Local AI Router Agent...
echo ==================================================================== >> "%LOG_FILE%"
echo   Setup finished successfully.                                      >> "%LOG_FILE%"
echo ==================================================================== >> "%LOG_FILE%"

title LUMIN Local AI Router Agent
"%PY_EXE%" agent.py
if errorlevel 1 (
    echo.
    echo   The agent exited with an error. Check the console above.
    pause
)
exit /b 0

:: ══════════════════════════════════════════════════════════════════
::  RefreshEnv – reload environment variables (so new PATH entries stick)
:: ══════════════════════════════════════════════════════════════════
:RefreshEnv
    call :UpdatePathFromRegistry
    goto :eof

:UpdatePathFromRegistry
    for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do set "SYS_PATH=%%b"
    for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "USER_PATH=%%b"
    set "PATH=%SYS_PATH%;%USER_PATH%"
    goto :eof

:: ══════════════════════════════════════════════════════════════════
::  Fatal error handler – shows a message, logs it, and waits
:: ══════════════════════════════════════════════════════════════════
:Fatal
echo.
echo   ═══════════════════════════════════════════════════════════════
echo     SETUP FAILED
echo   ═══════════════════════════════════════════════════════════════
echo   %~1
if not "%~2"=="" echo   %~2
echo.
echo   See the log file: %LOG_FILE%
echo.
>>"%LOG_FILE%" echo   [FATAL] %~1
pause
exit /b 1
