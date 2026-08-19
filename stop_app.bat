@echo off
set "PROJ_DIR=%~dp0"
if "%PROJ_DIR:~-1%"=="\" set "PROJ_DIR=%PROJ_DIR:~0,-1%"
cd /d "%PROJ_DIR%"

echo ====================================================================
echo                 LUMIN AI Agent - Termination Script
echo ====================================================================

echo Stopping LUMIN AI Agent services and freeing port 3000...

:: 1. Terminate any Python process running agent.py
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*agent.py*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1

:: 2. Terminate any Node.js process running server.js from this project directory
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*server.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1

:: 4. Optionally stop Ollama if requested via environment variable
if "%LUMIN_STOP_OLLAMA_ON_SHUTDOWN%"=="1" (
  echo Stopping Ollama daemon (LUMIN_STOP_OLLAMA_ON_SHUTDOWN=1)...
  powershell -NoProfile -Command "Get-Process -Name 'ollama*' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue" >nul 2>&1
)

:: 5. Verify port 3000 is released
powershell -NoProfile -Command "$c = New-Object System.Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1', 3000); $c.Close(); exit 1 } catch { exit 0 }" >nul 2>&1
if %errorlevel% equ 0 (
  echo [SUCCESS] Port 3000 released. All LUMIN services and processes terminated.
) else (
  echo [WARNING] Port 3000 is still bound by an external process.
)
timeout /t 2 /nobreak >nul
