@echo off
setlocal EnableDelayedExpansion
title LUMIN AI Agent — Windows One-Click Installer & Setup Wizard

:: ── Request Administrator privileges automatically ────────────────
net session >nul 2>&1
if errorlevel 1 (
    echo [LUMIN Setup] Requesting Administrative privileges for automated setup...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"

cls
color 0A
echo =================================================================================
powershell -NoProfile -Command ^
  "Write-Host '  ________  ________  ________        ___  _______   ________ _________   ' -ForegroundColor Green; " ^
  "Write-Host ' |\   __  \|\   __  \|\   __  \      |\  \|\  ___ \ |\   ____\\___   ___\ ' -ForegroundColor Green; " ^
  "Write-Host ' \ \  \|\  \ \  \|\  \ \  \|\  \     \ \  \ \   __/|\ \  \___\|___ \  \_| ' -ForegroundColor Green; " ^
  "Write-Host '  \ \   ____\ \   _  _\ \  \\\  \  __ \ \  \ \  \_|/_\ \  \       \ \  \  ' -ForegroundColor Green; " ^
  "Write-Host '   \ \  \___|\ \  \\  \\ \  \\\  \|\  \\_\  \ \  \_|\ \ \  \____   \ \  \ ' -ForegroundColor Green; " ^
  "Write-Host '    \ \__\    \ \__\\ _\\ \_______\ \________\ \_______\ \_______\  \ \__\' -ForegroundColor Green; " ^
  "Write-Host '     \|__|     \|__|\|__|\|_______|\|________|\|_______|\|_______|   \|__|' -ForegroundColor Green; " ^
  "Write-Host '                                                                          ' -ForegroundColor Green; " ^
  "Write-Host '  ___       ___  ___  _____ ______   ___  ________                        ' -ForegroundColor Green; " ^
  "Write-Host ' |\  \     |\  \|\  \|\   _ \  _   \|\  \|\   ___  \                      ' -ForegroundColor Green; " ^
  "Write-Host ' \ \  \    \ \  \\\  \ \  \\\__\ \  \ \  \ \  \\ \  \                     ' -ForegroundColor Green; " ^
  "Write-Host '  \ \  \    \ \  \\\  \ \  \\|__| \  \ \  \ \  \\ \  \                    ' -ForegroundColor Green; " ^
  "Write-Host '   \ \  \____\ \  \\\  \ \  \    \ \  \ \  \ \  \\ \  \                   ' -ForegroundColor Green; " ^
  "Write-Host '    \ \_______\ \_______\ \__\    \ \__\ \__\ \__\\ \__\                  ' -ForegroundColor Green; " ^
  "Write-Host '     \|_______|\|_______|\|__|     \|__|\|__|\|__| \|__|                  ' -ForegroundColor Green"
echo =================================================================================
echo           AUTOMATED ONE-CLICK PRODUCTION INSTALLER FOR WINDOWS (10 / 11)
echo =================================================================================
echo.

set "LOG_FILE=%CD%\install_log.txt"
echo LUMIN Windows Installer Log - %DATE% %TIME% > "%LOG_FILE%"

echo [1/6] [STATUS] Checking Python Environment...
set "PY_EXE="
where python >nul 2>&1 && set "PY_EXE=python"
if not defined PY_EXE where python3 >nul 2>&1 && set "PY_EXE=python3"
if not defined PY_EXE where py >nul 2>&1 && set "PY_EXE=py"

if not defined PY_EXE (
    echo [1/6] Python not found. Auto-installing Python 3.11 via winget...
    where winget >nul 2>&1
    if not errorlevel 1 (
        winget install --id Python.Python.3.11 --silent --accept-package-agreements --accept-source-agreements >>"%LOG_FILE%" 2>&1
        call :RefreshPath
        where python >nul 2>&1 && set "PY_EXE=python"
    )
)

if not defined PY_EXE (
    echo.
    echo [ERROR]: Python 3.10+ is required but could not be installed automatically.
    echo Please install Python 3 from https://python.org and check "Add Python to PATH".
    pause
    exit /b 1
)
echo      Found Python executable: %PY_EXE%
>>"%LOG_FILE%" echo Found Python: %PY_EXE%

echo [2/6] [STATUS] Checking Node.js Environment (for 3D Visualizer Web UI)...
where node >nul 2>&1
if errorlevel 1 (
    echo [2/6] Node.js not found. Auto-installing Node.js LTS via winget...
    where winget >nul 2>&1
    if not errorlevel 1 (
        winget install --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements >>"%LOG_FILE%" 2>&1
        call :RefreshPath
    )
)
where node >nul 2>&1
if not errorlevel 1 (
    echo      Found Node.js runtime environment.
) else (
    echo      [WARNING]: Node.js is missing. You can run CLI agent, but 3D Web UI requires Node.js from https://nodejs.org.
)

echo [3/6] [STATUS] Installing & Upgrading Python Core Requirements...
"%PY_EXE%" -m pip install --upgrade pip >>"%LOG_FILE%" 2>&1
"%PY_EXE%" -m pip install -r requirements.txt >>"%LOG_FILE%" 2>&1
if errorlevel 1 (
    echo      Attempting fallback user-level package installation...
    "%PY_EXE%" -m pip install --user -r requirements.txt >>"%LOG_FILE%" 2>&1
)
echo      Python dependencies successfully configured.

echo [4/6] [STATUS] Verifying Ollama Engine Installation...
where ollama >nul 2>&1
if errorlevel 1 (
    echo      Ollama not detected. Installing Ollama runtime...
    where winget >nul 2>&1
    if not errorlevel 1 (
        winget install --id Ollama.Ollama --silent --accept-package-agreements --accept-source-agreements >>"%LOG_FILE%" 2>&1
        call :RefreshPath
    )
    where ollama >nul 2>&1
    if errorlevel 1 (
        echo      Downloading official Ollama setup...
        powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://ollama.com/download/OllamaSetup.exe' -OutFile '%TEMP%\OllamaSetup.exe'" >>"%LOG_FILE%" 2>&1
        if exist "%TEMP%\OllamaSetup.exe" (
            start /wait "" "%TEMP%\OllamaSetup.exe" /S
            del "%TEMP%\OllamaSetup.exe" >nul 2>&1
            call :RefreshPath
        )
    )
)

where ollama >nul 2>&1
if not errorlevel 1 (
    echo      Ollama runtime verified.
) else (
    echo      [WARNING]: Ollama installation pending system reboot or manual start.
)

echo [5/6] [STATUS] Bootstrapping Local Ollama Service & Pulling Model (llama3.2:3b)...
netstat -ano | findstr "127.0.0.1:11434" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    powershell -NoProfile -Command "Start-Process -FilePath 'ollama' -ArgumentList 'serve' -WindowStyle Hidden" >nul 2>&1
    timeout /t 5 /nobreak >nul
)

where ollama >nul 2>&1
if not errorlevel 1 (
    echo      Pulling default model llama3.2:3b (this may take a minute on first run)...
    ollama pull llama3.2:3b >>"%LOG_FILE%" 2>&1
)

echo [6/6] [STATUS] Finalizing Frontend Web UI Packages...
if exist "node_modules" (
    echo      node_modules already present.
) else (
    where npm >nul 2>&1
    if not errorlevel 1 (
        echo      Installing frontend npm packages...
        call npm install >>"%LOG_FILE%" 2>&1
    )
)

echo.
echo =================================================================================
echo   SUCCESS: LUMIN AI AGENT INSTALLATION COMPLETE!
echo =================================================================================
echo   • Launch CLI Voice Agent:         Double-click 'start_agent.bat'
echo   • Launch 3D Voice Web UI:         Double-click 'start_app.bat'
echo =================================================================================
echo.
pause
exit /b 0

:RefreshPath
for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do set "SYS_PATH=%%b"
for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "USER_PATH=%%b"
set "PATH=%SYS_PATH%;%USER_PATH%"
goto :eof
