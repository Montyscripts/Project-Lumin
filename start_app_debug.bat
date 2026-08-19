@echo off
setlocal EnableDelayedExpansion
set "PROJ_DIR=%~dp0"
if "%PROJ_DIR:~-1%"=="\" set "PROJ_DIR=%PROJ_DIR:~0,-1%"
cd /d "%PROJ_DIR%"

echo ====================================================================
echo               LUMIN AI Agent - Foreground Debug Mode
echo ====================================================================

:: 1. Check Node.js runtime (with fallback paths)
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
    if !errorlevel! equ 0 (
        set "NODE_EXE=node"
        set "NPM_CMD=npm"
    )
)
if not defined NODE_EXE goto :no_node
if not defined NPM_CMD set "NPM_CMD=npm"

:: 2. Check/Setup Python Virtual Environment (Python 3.11-3.13)
set "VENV_PY=%PROJ_DIR%\venv\Scripts\python.exe"
if not exist "%VENV_PY%" (
    echo [STATUS] Virtual environment missing. Locating supported Python runtime...
    set "BASE_PY="
    py -3.13 -c "import sys; sys.exit(0 if (3, 11) <= sys.version_info[:2] <= (3, 13) else 1)" >nul 2>&1 && set "BASE_PY=py -3.13"
    if not defined BASE_PY py -3.12 -c "import sys; sys.exit(0 if (3, 11) <= sys.version_info[:2] <= (3, 13) else 1)" >nul 2>&1 && set "BASE_PY=py -3.12"
    if not defined BASE_PY py -3.11 -c "import sys; sys.exit(0 if (3, 11) <= sys.version_info[:2] <= (3, 13) else 1)" >nul 2>&1 && set "BASE_PY=py -3.11"
    if not defined BASE_PY python -c "import sys; sys.exit(0 if (3, 11) <= sys.version_info[:2] <= (3, 13) else 1)" >nul 2>&1 && set "BASE_PY=python"
    if not defined BASE_PY python3 -c "import sys; sys.exit(0 if (3, 11) <= sys.version_info[:2] <= (3, 13) else 1)" >nul 2>&1 && set "BASE_PY=python3"
    if not defined BASE_PY if exist "%LocalAppData%\Programs\Python\Python312\python.exe" set "BASE_PY=%LocalAppData%\Programs\Python\Python312\python.exe"
    if not defined BASE_PY if exist "%LocalAppData%\Programs\Python\Python313\python.exe" set "BASE_PY=%LocalAppData%\Programs\Python\Python313\python.exe"
    if not defined BASE_PY if exist "%ProgramFiles%\Python312\python.exe" set "BASE_PY=%ProgramFiles%\Python312\python.exe"

    if not defined BASE_PY (
        echo [ERROR] No supported Python runtime (3.11, 3.12, 3.13) detected.
        echo Please run 'install_windows.bat' once to automatically configure your environment.
        pause
        exit /b 1
    )

    echo [STATUS] Creating project virtual environment with !BASE_PY!...
    if "!BASE_PY:~0,3!"=="py " (
        !BASE_PY! -m venv "%PROJ_DIR%\venv"
    ) else (
        "!BASE_PY!" -m venv "%PROJ_DIR%\venv"
    )
    if %errorlevel% neq 0 goto :venv_failed

    echo [STATUS] Installing Python dependencies into virtual environment...
    "%VENV_PY%" -m pip install --upgrade pip
    "%VENV_PY%" -m pip install -r "%PROJ_DIR%\requirements.txt"
)

:: 3. Check frontend packages
if not exist "%PROJ_DIR%\node_modules" (
    echo [STATUS] node_modules missing. Running npm install...
    call "!NPM_CMD!" install
    if %errorlevel% neq 0 goto :npm_failed
)

:: 4. Safe Port 3000 & Process Management (only terminate prior LUMIN instances)
if not "%LUMIN_REUSE_SERVER%"=="1" (
    echo [CLEANUP] Freeing prior LUMIN processes if running...
    powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*server.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*agent.py*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1
)

echo Starting LUMIN server directly in foreground debug window...
echo Server will listen on http://localhost:3000
echo.

:: Launch background poll that opens browser only when port 3000 is listening
start "" cmd /c "powershell -NoProfile -Command \"for ($i=0; $i -lt 45; $i++) { $c = New-Object System.Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1', 3000); $c.Close(); Start-Process 'http://localhost:3000'; exit 0 } catch { Start-Sleep -Seconds 1 } }\""

set "PATH=%PROJ_DIR%\venv\Scripts;%PATH%"
call "%PROJ_DIR%\venv\Scripts\activate.bat"
set "LUMIN_DESKTOP=1"
set "LUMIN_KEEP_SERVER_ALIVE=1"
"!NODE_EXE!" server.js
pause
exit /b 0

:no_node
echo.
echo ====================================================================
echo  [ERROR] Node.js is not found in system PATH!
echo ====================================================================
echo  RECOVERY STEPS:
echo  1. Run 'install_windows.bat' to auto-install all required components.
echo  2. Or download Node.js LTS manually from https://nodejs.org/
echo ====================================================================
echo.
pause
exit /b 1

:venv_failed
echo.
echo ====================================================================
echo  [ERROR] Failed to set up Python virtual environment!
echo ====================================================================
echo  RECOVERY STEPS:
echo  1. Run 'install_windows.bat' to configure prerequisites.
echo  2. Ensure Python 3.11, 3.12, or 3.13 is installed from https://python.org
echo ====================================================================
pause
exit /b 1

:npm_failed
echo.
echo ====================================================================
echo  [ERROR] npm package installation failed!
echo ====================================================================
echo  RECOVERY STEPS:
echo  1. Check your internet connection.
echo  2. Run 'npm install' in Command Prompt.
echo ====================================================================
pause
exit /b 1

