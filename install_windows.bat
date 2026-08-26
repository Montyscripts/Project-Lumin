@echo off
setlocal EnableDelayedExpansion
title LUMIN AI Agent - Windows Installer

cd /d "%~dp0"
set "PROJ_DIR=%CD%"

echo.
echo ============================================================
echo   LUMIN AI Agent - Windows One-Click Installer
echo ============================================================
echo.

set "LOG_FILE=%PROJ_DIR%\install_log.txt"
echo LUMIN Install Log - %DATE% %TIME% > "%LOG_FILE%"

REM ===== Step 0: Initialize Workspace Directories & Config =====
echo [0/5] Initializing workspace configuration and runtime directories...
if not exist "%PROJ_DIR%\lumin_context" mkdir "%PROJ_DIR%\lumin_context"
if not exist "%PROJ_DIR%\tts_cache" mkdir "%PROJ_DIR%\tts_cache"
if not exist "%PROJ_DIR%\uploads" mkdir "%PROJ_DIR%\uploads"
if not exist "%PROJ_DIR%\memory" mkdir "%PROJ_DIR%\memory"

if not exist "%PROJ_DIR%\agent_config.json" (
    if exist "%PROJ_DIR%\agent_config.example.json" (
        copy "%PROJ_DIR%\agent_config.example.json" "%PROJ_DIR%\agent_config.json" >nul 2>&1
        echo      Created agent_config.json from template.
    )
) else (
    echo      agent_config.json already present.
)

REM ===== Step 1: Python Detection (Python 3.11-3.13 ONLY) =====
echo [1/5] Detecting supported Python runtime (Python 3.11, 3.12, 3.13)...
set "BASE_PY="

REM Check py launcher for exact supported versions first
py -3.13 -c "import sys; raise SystemExit(0 if (3,11)<=sys.version_info[:2]<=(3,13) else 1)" >nul 2>&1
if not errorlevel 1 set "BASE_PY=py -3.13"

if not defined BASE_PY py -3.12 -c "import sys; raise SystemExit(0 if (3,11)<=sys.version_info[:2]<=(3,13) else 1)" >nul 2>&1
if not defined BASE_PY if not errorlevel 1 set "BASE_PY=py -3.12"

if not defined BASE_PY py -3.11 -c "import sys; raise SystemExit(0 if (3,11)<=sys.version_info[:2]<=(3,13) else 1)" >nul 2>&1
if not defined BASE_PY if not errorlevel 1 set "BASE_PY=py -3.11"

REM Check default python in PATH
if not defined BASE_PY python -c "import sys; raise SystemExit(0 if (3,11)<=sys.version_info[:2]<=(3,13) else 1)" >nul 2>&1
if not defined BASE_PY if not errorlevel 1 set "BASE_PY=python"

REM Check standard Windows install locations
if not defined BASE_PY if exist "%LocalAppData%\Programs\Python\Python313\python.exe" set "BASE_PY=%LocalAppData%\Programs\Python\Python313\python.exe"
if not defined BASE_PY if exist "%LocalAppData%\Programs\Python\Python312\python.exe" set "BASE_PY=%LocalAppData%\Programs\Python\Python312\python.exe"
if not defined BASE_PY if exist "%LocalAppData%\Programs\Python\Python311\python.exe" set "BASE_PY=%LocalAppData%\Programs\Python\Python311\python.exe"
if not defined BASE_PY if exist "%ProgramFiles%\Python313\python.exe" set "BASE_PY=%ProgramFiles%\Python313\python.exe"
if not defined BASE_PY if exist "%ProgramFiles%\Python312\python.exe" set "BASE_PY=%ProgramFiles%\Python312\python.exe"
if not defined BASE_PY if exist "%ProgramFiles%\Python311\python.exe" set "BASE_PY=%ProgramFiles%\Python311\python.exe"

REM If missing, try auto-install via winget
if not defined BASE_PY (
    echo      Supported Python not detected. Attempting auto-installation via winget...
    where winget >nul 2>&1
    if not errorlevel 1 (
        winget install --id Python.Python.3.12 --scope user --override "/passive PrependPath=1" --accept-package-agreements --accept-source-agreements >>"%LOG_FILE%" 2>&1
        if exist "%LocalAppData%\Programs\Python\Python312\python.exe" set "BASE_PY=%LocalAppData%\Programs\Python\Python312\python.exe"
        if not defined BASE_PY where python >nul 2>&1
        if not defined BASE_PY if not errorlevel 1 set "BASE_PY=python"
    )
)

if not defined BASE_PY (
    echo.
    echo ============================================================
    echo   [ERROR] Python 3.11, 3.12, or 3.13 was not found!
    echo ============================================================
    echo   REASON:
    echo   LUMIN requires Python 3.11-3.13. Python 3.14+ is unsupported
    echo   due to breaking C-API changes in NumPy.
    echo.
    echo   RECOVERY STEPS:
    echo   1. Download Python 3.12 installer from https://www.python.org/downloads/release/python-3128/
    echo   2. Check the box: "Add python.exe to PATH" during installation.
    echo   3. Re-run install_windows.bat
    echo ============================================================
    echo.
    pause
    exit /b 1
)
echo      Using Python interpreter: !BASE_PY!

REM ===== Step 2: Virtual Environment Setup =====
echo [2/5] Setting up isolated Python virtual environment...
set "VENV_PY=%PROJ_DIR%\venv\Scripts\python.exe"

if exist "%VENV_PY%" (
    echo      Existing venv found. Checking version compatibility...
    "%VENV_PY%" -c "import sys; raise SystemExit(0 if (3,11)<=sys.version_info[:2]<=(3,13) else 1)" >nul 2>&1
    if errorlevel 1 (
        echo      [WARNING] Existing venv is incompatible. Recreating venv...
        rmdir /s /q "%PROJ_DIR%\venv" >>"%LOG_FILE%" 2>&1
    ) else (
        goto :venv_ready
    )
)

echo      Creating project venv in %PROJ_DIR%\venv...
echo !BASE_PY! | findstr /b /c:"py " >nul
if not errorlevel 1 (
    !BASE_PY! -m venv "%PROJ_DIR%\venv" >>"%LOG_FILE%" 2>&1
) else (
    "!BASE_PY!" -m venv "%PROJ_DIR%\venv" >>"%LOG_FILE%" 2>&1
)

if errorlevel 1 (
    echo.
    echo ============================================================
    echo   [ERROR] Failed to create virtual environment.
    echo ============================================================
    echo   Check install_log.txt for detailed diagnostic output.
    echo ============================================================
    pause
    exit /b 1
)

:venv_ready
if not exist "%VENV_PY%" (
    echo [ERROR] Virtual environment python.exe is missing.
    pause
    exit /b 1
)
echo      Virtual environment ready at %PROJ_DIR%\venv.

REM ===== Step 3: Python Package Dependencies =====
echo [3/5] Installing and updating Python dependencies...
"%VENV_PY%" -m pip install --upgrade pip >>"%LOG_FILE%" 2>&1
"%VENV_PY%" -m pip install -r "%PROJ_DIR%\requirements.txt" >>"%LOG_FILE%" 2>&1
if errorlevel 1 (
    echo      Retrying package installation with --no-cache-dir...
    "%VENV_PY%" -m pip install --no-cache-dir -r "%PROJ_DIR%\requirements.txt" >>"%LOG_FILE%" 2>&1
)

"%VENV_PY%" -c "import rich, requests, edge_tts, numpy" >nul 2>&1
if errorlevel 1 (
    echo      [WARNING] Some optional Python packages failed to install. Core functions will use fallback modes.
) else (
    echo      Python dependencies verified successfully.
)

REM ===== Step 4: Node.js & Web UI Dependencies =====
echo [4/5] Checking Node.js and Web UI runtime...
set "NODE_EXE="
set "NPM_CMD="

if exist "%ProgramFiles%\nodejs\node.exe" (
    set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
    set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
)
if not defined NODE_EXE if exist "%LocalAppData%\Programs\nodejs\node.exe" (
    set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"
    set "NPM_CMD=%LocalAppData%\Programs\nodejs\npm.cmd"
)
if not defined NODE_EXE (
    where node >nul 2>&1
    if not errorlevel 1 (
        set "NODE_EXE=node"
        set "NPM_CMD=npm"
    )
)

if not defined NODE_EXE (
    echo      Node.js not detected. Attempting auto-installation via winget...
    where winget >nul 2>&1
    if not errorlevel 1 (
        winget install --id OpenJS.NodeJS.LTS --scope user --accept-package-agreements --accept-source-agreements >>"%LOG_FILE%" 2>&1
        if exist "%ProgramFiles%\nodejs\node.exe" (
            set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
            set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
        )
        if not defined NODE_EXE if exist "%LocalAppData%\Programs\nodejs\node.exe" (
            set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"
            set "NPM_CMD=%LocalAppData%\Programs\nodejs\npm.cmd"
        )
    )
)

if defined NODE_EXE (
    echo      Found Node.js: !NODE_EXE!
    if not exist "%PROJ_DIR%\node_modules" (
        echo      Installing frontend npm packages...
        if defined NPM_CMD (
            call "!NPM_CMD!" install >>"%LOG_FILE%" 2>&1
        ) else (
            call npm install >>"%LOG_FILE%" 2>&1
        )
    )
    if exist "%PROJ_DIR%\node_modules" (
        echo      node_modules ready.
        echo      Building optimized production frontend bundle for instant loading...
        if defined NPM_CMD (
            call "!NPM_CMD!" run build >>"%LOG_FILE%" 2>&1
        ) else (
            call npm run build >>"%LOG_FILE%" 2>&1
        )
    ) else (
        echo      [WARNING] npm install did not complete. Run 'npm install' manually if Web UI fails to load.
    )
) else (
    echo.
    echo      [NOTICE] Node.js is not installed.
    echo      Download Node.js LTS from https://nodejs.org/ to use the Web UI dashboard.
    echo      The CLI agent can still be run via 'start_agent.bat'.
    echo.
)

REM ===== Step 5: Ollama Local Model Engine =====
echo [5/5] Checking Ollama local AI runtime...
set "OLLAMA_EXE="
if exist "%LocalAppData%\Programs\Ollama\ollama.exe" set "OLLAMA_EXE=%LocalAppData%\Programs\Ollama\ollama.exe"
if not defined OLLAMA_EXE if exist "%ProgramFiles%\Ollama\ollama.exe" set "OLLAMA_EXE=%ProgramFiles%\Ollama\ollama.exe"
if not defined OLLAMA_EXE (
    where ollama >nul 2>&1
    if not errorlevel 1 set "OLLAMA_EXE=ollama"
)

if not defined OLLAMA_EXE (
    echo      Ollama not detected. Attempting auto-installation via winget...
    where winget >nul 2>&1
    if not errorlevel 1 (
        winget install --id Ollama.Ollama --accept-package-agreements --accept-source-agreements >>"%LOG_FILE%" 2>&1
        if exist "%LocalAppData%\Programs\Ollama\ollama.exe" set "OLLAMA_EXE=%LocalAppData%\Programs\Ollama\ollama.exe"
    )
)

if defined OLLAMA_EXE (
    echo      Found Ollama: !OLLAMA_EXE!
    powershell -NoProfile -Command "try { $c=New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1',11434); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
    if errorlevel 1 (
        echo      Starting Ollama daemon service...
        start "" /B "!OLLAMA_EXE!" serve
        timeout /t 5 /nobreak >nul
    )
    "!OLLAMA_EXE!" list 2>nul | findstr /i "llama3.2:3b" >nul 2>&1
    if errorlevel 1 (
        echo      Pulling default local model llama3.2:3b (approx 2.0 GB)...
        "!OLLAMA_EXE!" pull llama3.2:3b >>"%LOG_FILE%" 2>&1
        if errorlevel 1 (
            echo      [NOTICE] Model auto-pull deferred. Run 'ollama pull llama3.2:3b' when connected.
        ) else (
            echo      Model llama3.2:3b downloaded and ready.
        )
    ) else (
        echo      Model llama3.2:3b already present in Ollama library.
    )
) else (
    echo      [NOTICE] Ollama not found. LUMIN will operate in deterministic tool / offline mode.
    echo      To enable local neural intelligence, install Ollama from https://ollama.com and run 'ollama pull llama3.2:3b'.
)

echo.
echo ============================================================
echo   INSTALLATION ^& READINESS CHECK COMPLETE
echo ============================================================
echo   - Workspace Configuration: Initialized
echo   - Python Virtual Env:     %PROJ_DIR%\venv
echo   - Launch Normal Mode:     start_app.bat  (Opens http://localhost:3000)
echo   - Launch Debug Mode:      start_app_debug.bat (Foreground console)
echo   - Launch CLI Mode:        start_agent.bat (Interactive terminal)
echo   - Stop Background Server: stop_app.bat
echo ============================================================
echo.
pause
exit /b 0

