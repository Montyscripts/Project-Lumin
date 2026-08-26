@echo off
setlocal EnableDelayedExpansion
title LUMIN AI Agent - Post-Install Setup

cd /d "%~dp0\.."
set "PROJ_DIR=%CD%"

set "LOG_FILE=%PROJ_DIR%\install_log.txt"
echo ============================================================ > "%LOG_FILE%"
echo LUMIN AI Agent - Post-Install Setup Log - %DATE% %TIME% >> "%LOG_FILE%"
echo Project Directory: %PROJ_DIR% >> "%LOG_FILE%"
echo ============================================================ >> "%LOG_FILE%"

echo [1/4] Initializing runtime directories and configuration...
if not exist "%PROJ_DIR%\lumin_context" mkdir "%PROJ_DIR%\lumin_context" >nul 2>&1
if not exist "%PROJ_DIR%\tts_cache" mkdir "%PROJ_DIR%\tts_cache" >nul 2>&1
if not exist "%PROJ_DIR%\uploads" mkdir "%PROJ_DIR%\uploads" >nul 2>&1
if not exist "%PROJ_DIR%\memory" mkdir "%PROJ_DIR%\memory" >nul 2>&1
if not exist "%PROJ_DIR%\agent_config.json" (
    if exist "%PROJ_DIR%\agent_config.example.json" (
        copy "%PROJ_DIR%\agent_config.example.json" "%PROJ_DIR%\agent_config.json" >nul 2>&1
        echo [INFO] Created agent_config.json from example template. >> "%LOG_FILE%"
    )
)
echo [OK] Workspace folders initialized. >> "%LOG_FILE%"

echo [2/4] Detecting Python 3.11-3.13 and configuring virtual environment...
set "VENV_PY=%PROJ_DIR%\venv\Scripts\python.exe"
if not exist "%VENV_PY%" (
    set "BASE_PY="
    py -3.13 -c "import sys; raise SystemExit(0 if (3,11)<=sys.version_info[:2]<=(3,13) else 1)" >nul 2>&1
    if not errorlevel 1 set "BASE_PY=py -3.13"
    if not defined BASE_PY py -3.12 -c "import sys; raise SystemExit(0 if (3,11)<=sys.version_info[:2]<=(3,13) else 1)" >nul 2>&1
    if not defined BASE_PY if not errorlevel 1 set "BASE_PY=py -3.12"
    if not defined BASE_PY py -3.11 -c "import sys; raise SystemExit(0 if (3,11)<=sys.version_info[:2]<=(3,13) else 1)" >nul 2>&1
    if not defined BASE_PY if not errorlevel 1 set "BASE_PY=py -3.11"
    if not defined BASE_PY python -c "import sys; raise SystemExit(0 if (3,11)<=sys.version_info[:2]<=(3,13) else 1)" >nul 2>&1
    if not defined BASE_PY if not errorlevel 1 set "BASE_PY=python"
    if not defined BASE_PY if exist "%LocalAppData%\Programs\Python\Python313\python.exe" set "BASE_PY=%LocalAppData%\Programs\Python\Python313\python.exe"
    if not defined BASE_PY if exist "%LocalAppData%\Programs\Python\Python312\python.exe" set "BASE_PY=%LocalAppData%\Programs\Python\Python312\python.exe"
    if not defined BASE_PY if exist "%LocalAppData%\Programs\Python\Python311\python.exe" set "BASE_PY=%LocalAppData%\Programs\Python\Python311\python.exe"
    if not defined BASE_PY if exist "%ProgramFiles%\Python313\python.exe" set "BASE_PY=%ProgramFiles%\Python313\python.exe"
    if not defined BASE_PY if exist "%ProgramFiles%\Python312\python.exe" set "BASE_PY=%ProgramFiles%\Python312\python.exe"
    if not defined BASE_PY if exist "%ProgramFiles%\Python311\python.exe" set "BASE_PY=%ProgramFiles%\Python311\python.exe"

    if not defined BASE_PY (
        echo [INFO] Python 3.11-3.13 not found on system. Attempting winget auto-install... >> "%LOG_FILE%"
        where winget >nul 2>&1
        if not errorlevel 1 (
            winget install --id Python.Python.3.12 --scope user --override "/passive PrependPath=1" --accept-package-agreements --accept-source-agreements >>"%LOG_FILE%" 2>&1
            if exist "%LocalAppData%\Programs\Python\Python312\python.exe" set "BASE_PY=%LocalAppData%\Programs\Python\Python312\python.exe"
        )
    )

    if defined BASE_PY (
        echo [INFO] Creating Python virtual environment using: !BASE_PY! >> "%LOG_FILE%"
        echo !BASE_PY! | findstr /b /c:"py " >nul
        if not errorlevel 1 (
            !BASE_PY! -m venv "%PROJ_DIR%\venv" >>"%LOG_FILE%" 2>&1
        ) else (
            "!BASE_PY!" -m venv "%PROJ_DIR%\venv" >>"%LOG_FILE%" 2>&1
        )
    ) else (
        echo [WARN] Could not locate or install Python 3.11-3.13. >> "%LOG_FILE%"
    )
)

if exist "%VENV_PY%" (
    echo [OK] Python venv active at: %VENV_PY% >> "%LOG_FILE%"
    "%VENV_PY%" -m pip install --upgrade pip >>"%LOG_FILE%" 2>&1
    if exist "%PROJ_DIR%\requirements.txt" (
        echo [INFO] Installing Python dependencies from requirements.txt... >> "%LOG_FILE%"
        "%VENV_PY%" -m pip install -r "%PROJ_DIR%\requirements.txt" >>"%LOG_FILE%" 2>&1
    )
) else (
    echo [ERROR] Python venv binary %VENV_PY% not found. >> "%LOG_FILE%"
)

echo [3/4] Checking Node.js LTS and web packages...
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
    echo [INFO] Node.js not detected. Attempting winget auto-install of OpenJS.NodeJS.LTS... >> "%LOG_FILE%"
    where winget >nul 2>&1
    if not errorlevel 1 (
        winget install --id OpenJS.NodeJS.LTS --scope user --accept-package-agreements --accept-source-agreements >>"%LOG_FILE%" 2>&1
        if exist "%ProgramFiles%\nodejs\node.exe" (
            set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
            set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
        )
        if exist "%LocalAppData%\Programs\nodejs\node.exe" (
            set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"
            set "NPM_CMD=%LocalAppData%\Programs\nodejs\npm.cmd"
        )
    )
)

if not exist "%PROJ_DIR%\node_modules" (
    echo [INFO] Installing frontend node_modules... >> "%LOG_FILE%"
    if defined NPM_CMD (
        call "!NPM_CMD!" install >>"%LOG_FILE%" 2>&1
    ) else (
        call npm install >>"%LOG_FILE%" 2>&1
    )
)
if exist "%PROJ_DIR%\node_modules" (
    echo [INFO] Building frontend production bundle... >> "%LOG_FILE%"
    if defined NPM_CMD (
        call "!NPM_CMD!" run build >>"%LOG_FILE%" 2>&1
    ) else (
        call npm run build >>"%LOG_FILE%" 2>&1
    )
)

echo [4/4] Checking Ollama local AI runtime & starter model...
set "OLLAMA_EXE="
if exist "%LocalAppData%\Programs\Ollama\ollama.exe" set "OLLAMA_EXE=%LocalAppData%\Programs\Ollama\ollama.exe"
if not defined OLLAMA_EXE if exist "%ProgramFiles%\Ollama\ollama.exe" set "OLLAMA_EXE=%ProgramFiles%\Ollama\ollama.exe"
if not defined OLLAMA_EXE (
    where ollama >nul 2>&1
    if not errorlevel 1 set "OLLAMA_EXE=ollama"
)
if not defined OLLAMA_EXE (
    echo [INFO] Ollama not found. Attempting winget auto-install... >> "%LOG_FILE%"
    where winget >nul 2>&1
    if not errorlevel 1 (
        winget install --id Ollama.Ollama --accept-package-agreements --accept-source-agreements >>"%LOG_FILE%" 2>&1
        if exist "%LocalAppData%\Programs\Ollama\ollama.exe" set "OLLAMA_EXE=%LocalAppData%\Programs\Ollama\ollama.exe"
        if exist "%ProgramFiles%\Ollama\ollama.exe" set "OLLAMA_EXE=%ProgramFiles%\Ollama\ollama.exe"
    )
)

if defined OLLAMA_EXE (
    echo [OK] Found Ollama binary at: !OLLAMA_EXE! >> "%LOG_FILE%"
    powershell -NoProfile -Command "try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1',11434); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
    if errorlevel 1 (
        echo [INFO] Starting Ollama daemon in background... >> "%LOG_FILE%"
        powershell -NoProfile -Command "Start-Process -FilePath '!OLLAMA_EXE!' -ArgumentList 'serve' -WindowStyle Hidden" >nul 2>&1
        timeout /t 4 /nobreak >nul
    )
    "!OLLAMA_EXE!" list 2>nul | findstr /i "llama3.2:3b" >nul 2>&1
    if errorlevel 1 (
        echo [INFO] Pulling starter model llama3.2:3b... >> "%LOG_FILE%"
        "!OLLAMA_EXE!" pull llama3.2:3b >>"%LOG_FILE%" 2>&1
        if not errorlevel 1 (
            echo [OK] Successfully pulled starter model llama3.2:3b. >> "%LOG_FILE%"
        ) else (
            echo [WARN] Could not pull llama3.2:3b immediately (offline or connection timeout). Application will offer UI download prompt on launch. >> "%LOG_FILE%"
        )
    ) else (
        echo [OK] Starter model llama3.2:3b already present in Ollama catalog. >> "%LOG_FILE%"
    )
) else (
    echo [WARN] Ollama is not installed. LUMIN will operate in deterministic tool mode and offer model download when Ollama is available. >> "%LOG_FILE%"
)

echo ============================================================ >> "%LOG_FILE%"
echo LUMIN Post-Install Completed at %DATE% %TIME% >> "%LOG_FILE%"
echo ============================================================ >> "%LOG_FILE%"

exit /b 0
