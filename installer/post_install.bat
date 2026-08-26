@echo off
setlocal EnableDelayedExpansion
title LUMIN AI Agent - Post-Install Setup

cd /d "%~dp0\.."
set "PROJ_DIR=%CD%"

set "LOG_FILE=%PROJ_DIR%\install_log.txt"
echo LUMIN Post-Install Log - %DATE% %TIME% > "%LOG_FILE%"

REM 1. Initialize folders & default config
if not exist "%PROJ_DIR%\lumin_context" mkdir "%PROJ_DIR%\lumin_context" >nul 2>&1
if not exist "%PROJ_DIR%\tts_cache" mkdir "%PROJ_DIR%\tts_cache" >nul 2>&1
if not exist "%PROJ_DIR%\uploads" mkdir "%PROJ_DIR%\uploads" >nul 2>&1
if not exist "%PROJ_DIR%\memory" mkdir "%PROJ_DIR%\memory" >nul 2>&1
if not exist "%PROJ_DIR%\agent_config.json" (
    if exist "%PROJ_DIR%\agent_config.example.json" (
        copy "%PROJ_DIR%\agent_config.example.json" "%PROJ_DIR%\agent_config.json" >nul 2>&1
    )
)

REM 2. Detect and initialize Python 3.11-3.13 virtual environment
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
        where winget >nul 2>&1
        if not errorlevel 1 (
            winget install --id Python.Python.3.12 --scope user --override "/passive PrependPath=1" --accept-package-agreements --accept-source-agreements >>"%LOG_FILE%" 2>&1
            if exist "%LocalAppData%\Programs\Python\Python312\python.exe" set "BASE_PY=%LocalAppData%\Programs\Python\Python312\python.exe"
        )
    )

    if defined BASE_PY (
        echo !BASE_PY! | findstr /b /c:"py " >nul
        if not errorlevel 1 (
            !BASE_PY! -m venv "%PROJ_DIR%\venv" >>"%LOG_FILE%" 2>&1
        ) else (
            "!BASE_PY!" -m venv "%PROJ_DIR%\venv" >>"%LOG_FILE%" 2>&1
        )
    )
)

if exist "%VENV_PY%" (
    "%VENV_PY%" -m pip install --upgrade pip >>"%LOG_FILE%" 2>&1
    "%VENV_PY%" -m pip install -r "%PROJ_DIR%\requirements.txt" >>"%LOG_FILE%" 2>&1
)

REM 3. Check and install frontend packages
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
    where winget >nul 2>&1
    if not errorlevel 1 (
        winget install --id OpenJS.NodeJS.LTS --scope user --accept-package-agreements --accept-source-agreements >>"%LOG_FILE%" 2>&1
        if exist "%ProgramFiles%\nodejs\node.exe" set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
        if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NPM_CMD=%LocalAppData%\Programs\nodejs\npm.cmd"
    )
)
if not exist "%PROJ_DIR%\node_modules" (
    if defined NPM_CMD (
        call "!NPM_CMD!" install >>"%LOG_FILE%" 2>&1
    ) else (
        call npm install >>"%LOG_FILE%" 2>&1
    )
)
if exist "%PROJ_DIR%\node_modules" (
    if defined NPM_CMD (
        call "!NPM_CMD!" run build >>"%LOG_FILE%" 2>&1
    ) else (
        call npm run build >>"%LOG_FILE%" 2>&1
    )
)

REM 4. Check Ollama
set "OLLAMA_EXE="
if exist "%LocalAppData%\Programs\Ollama\ollama.exe" set "OLLAMA_EXE=%LocalAppData%\Programs\Ollama\ollama.exe"
if not defined OLLAMA_EXE if exist "%ProgramFiles%\Ollama\ollama.exe" set "OLLAMA_EXE=%ProgramFiles%\Ollama\ollama.exe"
if not defined OLLAMA_EXE (
    where ollama >nul 2>&1
    if not errorlevel 1 set "OLLAMA_EXE=ollama"
)
if not defined OLLAMA_EXE (
    where winget >nul 2>&1
    if not errorlevel 1 (
        winget install --id Ollama.Ollama --accept-package-agreements --accept-source-agreements >>"%LOG_FILE%" 2>&1
        if exist "%LocalAppData%\Programs\Ollama\ollama.exe" set "OLLAMA_EXE=%LocalAppData%\Programs\Ollama\ollama.exe"
    )
)
if defined OLLAMA_EXE (
    powershell -NoProfile -Command "try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1',11434); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
    if errorlevel 1 (
        powershell -NoProfile -Command "Start-Process -FilePath '!OLLAMA_EXE!' -ArgumentList 'serve' -WindowStyle Hidden" >nul 2>&1
        timeout /t 5 /nobreak >nul
    )
    "!OLLAMA_EXE!" list 2>nul | findstr /i "llama3.2:3b" >nul 2>&1
    if errorlevel 1 (
        "!OLLAMA_EXE!" pull llama3.2:3b >>"%LOG_FILE%" 2>&1
    )
)

exit /b 0
