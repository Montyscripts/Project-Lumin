@echo off
setlocal EnableDelayedExpansion
title LUMIN AI Agent

cd /d "%~dp0"
set "PROJ_DIR=%CD%"

echo.
echo ============================================================
echo   LUMIN AI Agent
echo ============================================================
echo.

REM Resolve Node.js (full path, no PATH pollution)
set "NODE_EXE="
if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"
if not defined NODE_EXE (
    where node >nul 2>&1
    if not errorlevel 1 set "NODE_EXE=node"
)

if not defined NODE_EXE (
    echo [ERROR] Node.js not found. Run install_windows.bat first.
    pause
    exit /b 1
)

if not exist "%PROJ_DIR%\venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment missing. Run install_windows.bat first.
    pause
    exit /b 1
)

if not exist "%PROJ_DIR%\node_modules" (
    echo [STATUS] Installing frontend packages...
    call npm install
)

REM Stop any previous LUMIN node process
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*server.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo [STATUS] Starting LUMIN on http://localhost:3000 ...

REM Critical: put the venv Scripts folder FIRST so edge-tts, python, etc.
REM always come from the virtual environment (fixes the 403 global edge-tts issue)
set "PATH=%PROJ_DIR%\venv\Scripts;%PATH%"

set LUMIN_DESKTOP=1
set LUMIN_KEEP_SERVER_ALIVE=1

start "LUMIN Server" /MIN /D "%PROJ_DIR%" cmd /k "set PATH=%PROJ_DIR%\venv\Scripts;%PATH% && set LUMIN_DESKTOP=1 && set LUMIN_KEEP_SERVER_ALIVE=1 && "%NODE_EXE%" server.js"

echo [STATUS] Waiting for server...
set /a COUNT=0
:wait
powershell -NoProfile -Command "try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1',3000); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto :ready
set /a COUNT+=1
if %COUNT% geq 40 goto :fail
timeout /t 1 /nobreak >nul
goto :wait

:ready
echo.
echo [SUCCESS] LUMIN is running at http://localhost:3000
echo Opening browser...
start "" "http://localhost:3000"
echo.
echo The server is running in a minimized window titled "LUMIN Server".
echo Close that window when you want to stop the app.
timeout /t 3 /nobreak >nul
exit /b 0

:fail
echo [ERROR] Server did not start in time.
echo Try running manually:
echo   set PATH=%PROJ_DIR%\venv\Scripts;%%PATH%%
echo   set LUMIN_KEEP_SERVER_ALIVE=1
echo   node server.js
pause
exit /b 1
