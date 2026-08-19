@echo off
setlocal EnableDelayedExpansion
title LUMIN AI Agent - Windows Installer

cd /d "%~dp0"

echo.
echo ============================================================
echo   LUMIN AI Agent - Windows One-Click Installer
echo ============================================================
echo.

set "LOG_FILE=%CD%\install_log.txt"
echo LUMIN Install Log - %DATE% %TIME% > "%LOG_FILE%"

REM ===== Step 1: Python =====
echo [1/5] Detecting Python 3.11-3.13...
set "BASE_PY="

py -3.13 -c "import sys; raise SystemExit(0 if (3,11)<=sys.version_info[:2]<=(3,13) else 1)" >nul 2>&1
if not errorlevel 1 set "BASE_PY=py -3.13"

if not defined BASE_PY py -3.12 -c "import sys; raise SystemExit(0 if (3,11)<=sys.version_info[:2]<=(3,13) else 1)" >nul 2>&1
if not defined BASE_PY if not errorlevel 1 set "BASE_PY=py -3.12"

if not defined BASE_PY py -3.11 -c "import sys; raise SystemExit(0 if (3,11)<=sys.version_info[:2]<=(3,13) else 1)" >nul 2>&1
if not defined BASE_PY if not errorlevel 1 set "BASE_PY=py -3.11"

if not defined BASE_PY python -c "import sys; raise SystemExit(0 if (3,11)<=sys.version_info[:2]<=(3,13) else 1)" >nul 2>&1
if not defined BASE_PY if not errorlevel 1 set "BASE_PY=python"

if not defined BASE_PY if exist "%LocalAppData%\Programs\Python\Python312\python.exe" set "BASE_PY=%LocalAppData%\Programs\Python\Python312\python.exe"
if not defined BASE_PY if exist "%LocalAppData%\Programs\Python\Python313\python.exe" set "BASE_PY=%LocalAppData%\Programs\Python\Python313\python.exe"
if not defined BASE_PY if exist "%ProgramFiles%\Python312\python.exe" set "BASE_PY=%ProgramFiles%\Python312\python.exe"

if not defined BASE_PY (
    echo      Trying winget for Python 3.12...
    where winget >nul 2>&1
    if not errorlevel 1 winget install --id Python.Python.3.12 --scope user --override "/passive PrependPath=1" --accept-package-agreements --accept-source-agreements >>"%LOG_FILE%" 2>&1
    if exist "%LocalAppData%\Programs\Python\Python312\python.exe" set "BASE_PY=%LocalAppData%\Programs\Python\Python312\python.exe"
    if not defined BASE_PY where python >nul 2>&1
    if not defined BASE_PY if not errorlevel 1 set "BASE_PY=python"
)

if not defined BASE_PY (
    echo [FATAL] No supported Python found. Install Python 3.12 from https://python.org
    pause
    exit /b 1
)
echo      Using: !BASE_PY!

REM ===== Step 2: venv =====
echo [2/5] Setting up virtual environment...
set "VENV_PY=%CD%\venv\Scripts\python.exe"

if exist "%VENV_PY%" goto :venv_ok

echo      Creating venv...
echo !BASE_PY! | findstr /b /c:"py " >nul
if not errorlevel 1 (
    !BASE_PY! -m venv "%CD%\venv" >>"%LOG_FILE%" 2>&1
) else (
    "!BASE_PY!" -m venv "%CD%\venv" >>"%LOG_FILE%" 2>&1
)
if errorlevel 1 (
    echo [ERROR] Failed to create venv. See install_log.txt
    pause
    exit /b 1
)

:venv_ok
if not exist "%VENV_PY%" (
    echo [ERROR] venv python.exe missing.
    pause
    exit /b 1
)
echo      venv ready.

REM ===== Step 3: pip =====
echo [3/5] Installing Python dependencies...
"%VENV_PY%" -m pip install --upgrade pip >>"%LOG_FILE%" 2>&1
"%VENV_PY%" -m pip install -r "%CD%\requirements.txt" >>"%LOG_FILE%" 2>&1
if errorlevel 1 "%VENV_PY%" -m pip install --no-cache-dir -r "%CD%\requirements.txt" >>"%LOG_FILE%" 2>&1
"%VENV_PY%" -c "import rich, requests" >nul 2>&1
if errorlevel 1 (echo      [WARNING] Some packages may have failed.) else (echo      Python packages OK.)

REM ===== Step 4: Node.js - ZERO multi-line parentheses =====
echo [4/5] Checking Node.js...
set "NODE_EXE="
set "NPM_CMD="

if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if exist "%ProgramFiles%\nodejs\node.exe" set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"

if not defined NODE_EXE if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"
if not defined NODE_EXE if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NPM_CMD=%LocalAppData%\Programs\nodejs\npm.cmd"

if not defined NODE_EXE where node >nul 2>&1
if not defined NODE_EXE if not errorlevel 1 set "NODE_EXE=node"
if not defined NODE_EXE if not errorlevel 1 set "NPM_CMD=npm"

if defined NODE_EXE goto :node_found

echo      Node.js not found. Trying winget...
where winget >nul 2>&1
if not errorlevel 1 winget install --id OpenJS.NodeJS.LTS --scope user --accept-package-agreements --accept-source-agreements >>"%LOG_FILE%" 2>&1

if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if exist "%ProgramFiles%\nodejs\node.exe" set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
if not defined NODE_EXE if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"
if not defined NODE_EXE if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NPM_CMD=%LocalAppData%\Programs\nodejs\npm.cmd"

:node_found
if defined NODE_EXE (
    echo      Found Node: !NODE_EXE!
    if not exist "%CD%\node_modules" (
        echo      Running npm install...
        if defined NPM_CMD call "!NPM_CMD!" install >>"%LOG_FILE%" 2>&1
        if not defined NPM_CMD call npm install >>"%LOG_FILE%" 2>&1
    )
    if exist "%CD%\node_modules" echo      node_modules OK.
    if not exist "%CD%\node_modules" echo      [WARNING] node_modules missing.
) else (
    echo      [NOTICE] Node.js not found. Install from https://nodejs.org
)

REM ===== Step 5: Ollama =====
echo [5/5] Checking Ollama...
set "OLLAMA_EXE="
if exist "%LocalAppData%\Programs\Ollama\ollama.exe" set "OLLAMA_EXE=%LocalAppData%\Programs\Ollama\ollama.exe"
if not defined OLLAMA_EXE where ollama >nul 2>&1
if not defined OLLAMA_EXE if not errorlevel 1 set "OLLAMA_EXE=ollama"

if not defined OLLAMA_EXE (
    echo      Ollama not found. Trying winget...
    where winget >nul 2>&1
    if not errorlevel 1 winget install --id Ollama.Ollama --accept-package-agreements --accept-source-agreements >>"%LOG_FILE%" 2>&1
    if exist "%LocalAppData%\Programs\Ollama\ollama.exe" set "OLLAMA_EXE=%LocalAppData%\Programs\Ollama\ollama.exe"
)

if defined OLLAMA_EXE (
    echo      Found Ollama: !OLLAMA_EXE!
    powershell -NoProfile -Command "try { $c=New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1',11434); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
    if errorlevel 1 (
        echo      Starting Ollama...
        start "" /B "!OLLAMA_EXE!" serve
        timeout /t 5 /nobreak >nul
    )
    "!OLLAMA_EXE!" list 2>nul | findstr /i "llama3.2:3b" >nul 2>&1
    if errorlevel 1 (
        echo      Pulling llama3.2:3b...
        "!OLLAMA_EXE!" pull llama3.2:3b >>"%LOG_FILE%" 2>&1
    ) else (
        echo      Model already present.
    )
) else (
    echo      [NOTICE] Ollama not found. Install later from https://ollama.com
)

echo.
echo ============================================================
echo   INSTALLATION COMPLETE
echo ============================================================
echo   Next: run start_app.bat
echo   App will open at http://localhost:3000
echo ============================================================
echo.
pause
exit /b 0
