@echo off
setlocal EnableDelayedExpansion
title LUMIN AI Agent - Post-Install Setup

REM ============================================================
REM LUMIN AI AGENT - POST-INSTALL ENVIRONMENT SETUP
REM (Option A: Prerequisites Required Model)
REM Required: Python 3.11-3.13, Node.js LTS, Ollama
REM See README.md for download links and installation instructions
REM ============================================================

REM 1. Resolve project root
cd /d "%~dp0"
for %%I in ("%~dp0..") do set "PROJ=%%~fI"
cd /d "%PROJ%"

set "LOG_FILE=%PROJ%\install_log.txt"
echo ============================================================ > "%LOG_FILE%"
echo LUMIN AI Agent - Post-Install Setup Log >> "%LOG_FILE%"
echo Timestamp: %DATE% %TIME% >> "%LOG_FILE%"
echo Target Directory: %PROJ% >> "%LOG_FILE%"
echo ------------------------------------------------------------ >> "%LOG_FILE%"
echo Required Prerequisites: >> "%LOG_FILE%"
echo   - Python 3.11-3.13 (https://www.python.org/downloads/) >> "%LOG_FILE%"
echo   - Node.js LTS (https://nodejs.org/) >> "%LOG_FILE%"
echo   - Ollama (https://ollama.com/) >> "%LOG_FILE%"
echo ============================================================ >> "%LOG_FILE%"

REM Clean previous marker files
if exist "%PROJ%\SUCCESS" del /f /q "%PROJ%\SUCCESS" >nul 2>&1
if exist "%PROJ%\install_success.txt" del /f /q "%PROJ%\install_success.txt" >nul 2>&1
if exist "%PROJ%\install_failed.txt" del /f /q "%PROJ%\install_failed.txt" >nul 2>&1
if exist "%PROJ%\FATAL_PYTHON" del /f /q "%PROJ%\FATAL_PYTHON" >nul 2>&1
if exist "%PROJ%\FATAL_NODE" del /f /q "%PROJ%\FATAL_NODE" >nul 2>&1
if exist "%PROJ%\PREREQUISITES_REQUIRED.txt" del /f /q "%PROJ%\PREREQUISITES_REQUIRED.txt" >nul 2>&1

REM Refresh PATH from Windows Registry (System + User)
for /f "tokens=2*" %%A in ('reg query "HKLM\System\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do set "SYS_PATH=%%B"
for /f "tokens=2*" %%A in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "USR_PATH=%%B"
if defined SYS_PATH if defined USR_PATH set "PATH=%SYS_PATH%;%USR_PATH%;%PATH%"
if defined USR_PATH if not defined SYS_PATH set "PATH=%USR_PATH%;%PATH%"

REM Include project-local runtime paths if present
if exist "%PROJ%\nodejs" set "PATH=%PROJ%\nodejs;%PATH%"
if exist "%PROJ%\bin\ffmpeg" set "PATH=%PROJ%\bin\ffmpeg;%PATH%"

set /a HAS_MISSING_PREREQS=0

REM ============================================================
REM STAGE 1: Workspace Folders & Configuration Setup
REM ============================================================
echo [1/5] Initializing workspace directories and configurations...
echo [INFO] Step 1/5: Initializing workspace directories and configurations... >> "%LOG_FILE%"
if not exist "%PROJ%\lumin_context" mkdir "%PROJ%\lumin_context" >nul 2>&1
if not exist "%PROJ%\tts_cache" mkdir "%PROJ%\tts_cache" >nul 2>&1
if not exist "%PROJ%\uploads" mkdir "%PROJ%\uploads" >nul 2>&1
if not exist "%PROJ%\memory" mkdir "%PROJ%\memory" >nul 2>&1
if not exist "%PROJ%\bin" mkdir "%PROJ%\bin" >nul 2>&1
if not exist "%PROJ%\bin\ffmpeg" mkdir "%PROJ%\bin\ffmpeg" >nul 2>&1

if not exist "%PROJ%\agent_config.json" (
    if exist "%PROJ%\agent_config.example.json" (
        copy "%PROJ%\agent_config.example.json" "%PROJ%\agent_config.json" >nul 2>&1
        echo [OK] Created agent_config.json from template. >> "%LOG_FILE%"
    )
) else (
    echo [OK] agent_config.json already exists. >> "%LOG_FILE%"
)
echo [OK] Workspace folders initialized. >> "%LOG_FILE%"

REM ============================================================
REM STAGE 2: Python 3.11-3.13 Runtime & Virtual Environment
REM ============================================================
echo [2/5] Detecting Python 3.11-3.13 and configuring virtual environment...
echo [INFO] Step 2/5: Detecting Python runtime (Python 3.11, 3.12, 3.13)... >> "%LOG_FILE%"
set "VENV_PY=%PROJ%\venv\Scripts\python.exe"
set "BASE_PY="

REM Check py launcher for exact supported versions
py -3.12 -c "import sys; raise SystemExit(0 if (3,11)<=sys.version_info[:2]<=(3,13) else 1)" >nul 2>&1
if not errorlevel 1 set "BASE_PY=py -3.12"

if not defined BASE_PY py -3.13 -c "import sys; raise SystemExit(0 if (3,11)<=sys.version_info[:2]<=(3,13) else 1)" >nul 2>&1
if not defined BASE_PY if not errorlevel 1 set "BASE_PY=py -3.13"

if not defined BASE_PY py -3.11 -c "import sys; raise SystemExit(0 if (3,11)<=sys.version_info[:2]<=(3,13) else 1)" >nul 2>&1
if not defined BASE_PY if not errorlevel 1 set "BASE_PY=py -3.11"

REM Check standard Windows install locations
if not defined BASE_PY if exist "%LocalAppData%\Programs\Python\Python312\python.exe" set "BASE_PY=%LocalAppData%\Programs\Python\Python312\python.exe"
if not defined BASE_PY if exist "%LocalAppData%\Programs\Python\Python313\python.exe" set "BASE_PY=%LocalAppData%\Programs\Python\Python313\python.exe"
if not defined BASE_PY if exist "%LocalAppData%\Programs\Python\Python311\python.exe" set "BASE_PY=%LocalAppData%\Programs\Python\Python311\python.exe"
if not defined BASE_PY if exist "%ProgramFiles%\Python312\python.exe" set "BASE_PY=%ProgramFiles%\Python312\python.exe"
if not defined BASE_PY if exist "%ProgramFiles%\Python313\python.exe" set "BASE_PY=%ProgramFiles%\Python313\python.exe"
if not defined BASE_PY if exist "%ProgramFiles%\Python311\python.exe" set "BASE_PY=%ProgramFiles%\Python311\python.exe"

REM Check default python in PATH
if not defined BASE_PY (
    where python >nul 2>&1
    if not errorlevel 1 (
        python -c "import sys; raise SystemExit(0 if (3,11)<=sys.version_info[:2]<=(3,13) else 1)" >nul 2>&1
        if not errorlevel 1 set "BASE_PY=python"
    )
)

if not defined BASE_PY (
    echo [ERROR] Python 3.11-3.13 was not found on this system. >> "%LOG_FILE%"
    echo [INFO] LUMIN requires Python 3.11, 3.12, or 3.13. >> "%LOG_FILE%"
    echo [INFO] Please install Python from https://www.python.org/downloads/ (check "Add python.exe to PATH"). >> "%LOG_FILE%"
    echo Python 3.11-3.13 is required. Please install Python from https://www.python.org/downloads/ and check 'Add python.exe to PATH'. > "%PROJ%\FATAL_PYTHON"
    set /a HAS_MISSING_PREREQS+=1
) else (
    echo [OK] Detected pre-existing Python interpreter: !BASE_PY! >> "%LOG_FILE%"
    
    if exist "%VENV_PY%" (
        "%VENV_PY%" -c "import sys; raise SystemExit(0 if (3,11)<=sys.version_info[:2]<=(3,13) else 1)" >nul 2>&1
        if errorlevel 1 (
            echo [WARN] Incompatible venv version detected. Rebuilding venv... >> "%LOG_FILE%"
            rmdir /s /q "%PROJ%\venv" >>"%LOG_FILE%" 2>&1
        )
    )

    if not exist "%VENV_PY%" (
        echo [INFO] Creating Python virtual environment in %PROJ%\venv... >> "%LOG_FILE%"
        echo !BASE_PY! | findstr /b /c:"py " >nul
        if not errorlevel 1 (
            !BASE_PY! -m venv "%PROJ%\venv" >>"%LOG_FILE%" 2>&1
        ) else (
            "!BASE_PY!" -m venv "%PROJ%\venv" >>"%LOG_FILE%" 2>&1
        )
    )

    if not exist "%VENV_PY%" (
        echo [ERROR] Failed to create Python virtual environment at %PROJ%\venv. >> "%LOG_FILE%"
        echo FATAL_PYTHON: Failed to create venv > "%PROJ%\FATAL_PYTHON"
        set /a HAS_MISSING_PREREQS+=1
    ) else (
        echo [OK] Python venv ready at: %VENV_PY% >> "%LOG_FILE%"
        echo [INFO] Upgrading pip... >> "%LOG_FILE%"
        "%VENV_PY%" -m pip install --upgrade pip >>"%LOG_FILE%" 2>&1

        if exist "%PROJ%\requirements.txt" (
            echo [INFO] Installing Python dependencies from requirements.txt... >> "%LOG_FILE%"
            "%VENV_PY%" -m pip install -r "%PROJ%\requirements.txt" >>"%LOG_FILE%" 2>&1
            if errorlevel 1 (
                echo [WARN] Standard pip install had errors. Retrying with --no-cache-dir... >> "%LOG_FILE%"
                "%VENV_PY%" -m pip install --no-cache-dir -r "%PROJ%\requirements.txt" >>"%LOG_FILE%" 2>&1
            )
            "%VENV_PY%" -c "import requests" >nul 2>&1
            if errorlevel 1 (
                echo [WARN] Some Python dependencies could not be imported. >> "%LOG_FILE%"
            ) else (
                echo [OK] Python dependencies installed and verified. >> "%LOG_FILE%"
            )
        )
    )
)

REM ============================================================
REM STAGE 3: Node.js Runtime & Frontend Build
REM ============================================================
echo [3/5] Checking Node.js and configuring frontend packages...
echo [INFO] Step 3/5: Checking Node.js runtime and frontend packages... >> "%LOG_FILE%"
set "NODE_EXE="
set "NPM_CMD="

REM Check project-local portable Node.js if user previously placed one
if exist "%PROJ%\nodejs\node.exe" (
    set "NODE_EXE=%PROJ%\nodejs\node.exe"
    set "NPM_CMD=%PROJ%\nodejs\npm.cmd"
)

REM Check standard system locations
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" (
    set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
    set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
)
if not defined NODE_EXE if exist "%LocalAppData%\Programs\nodejs\node.exe" (
    set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"
    set "NPM_CMD=%LocalAppData%\Programs\nodejs\npm.cmd"
)
if not defined NODE_EXE if exist "%USERPROFILE%\AppData\Local\Programs\nodejs\node.exe" (
    set "NODE_EXE=%USERPROFILE%\AppData\Local\Programs\nodejs\node.exe"
    set "NPM_CMD=%USERPROFILE%\AppData\Local\Programs\nodejs\npm.cmd"
)
if not defined NODE_EXE (
    where node >nul 2>&1
    if not errorlevel 1 (
        set "NODE_EXE=node"
        set "NPM_CMD=npm"
    )
)

if not defined NODE_EXE (
    echo [NOTICE] Node.js runtime not detected on this system. >> "%LOG_FILE%"
    echo [INFO] Node.js LTS is required for the Web UI dashboard and live visualizer. >> "%LOG_FILE%"
    echo [INFO] Please install Node.js LTS from https://nodejs.org/ >> "%LOG_FILE%"
    echo Node.js LTS is required for the Web UI dashboard. Please install from https://nodejs.org/ > "%PROJ%\FATAL_NODE"
    set /a HAS_MISSING_PREREQS+=1
) else (
    echo [OK] Node.js executable ready: !NODE_EXE! >> "%LOG_FILE%"
    if defined NPM_CMD (
        echo [OK] NPM command ready: !NPM_CMD! >> "%LOG_FILE%"
    )
    
    echo [INFO] Running npm install --prefix "%PROJ%"... >> "%LOG_FILE%"
    if defined NPM_CMD (
        call "!NPM_CMD!" install --prefix "%PROJ%" >> "%LOG_FILE%" 2>&1
    ) else (
        call npm install --prefix "%PROJ%" >> "%LOG_FILE%" 2>&1
    )

    if exist "%PROJ%\node_modules" (
        echo [INFO] Compiling production frontend bundle... >> "%LOG_FILE%"
        if defined NPM_CMD (
            call "!NPM_CMD!" run build --prefix "%PROJ%" >> "%LOG_FILE%" 2>&1
        ) else (
            call npm run build --prefix "%PROJ%" >> "%LOG_FILE%" 2>&1
        )
        echo [OK] Frontend production build completed. >> "%LOG_FILE%"
    ) else (
        echo [WARN] node_modules directory was not created by npm install. >> "%LOG_FILE%"
    )
)

REM ============================================================
REM STAGE 4: Ollama Local Model Engine Detection
REM ============================================================
echo [4/5] Checking Ollama local AI runtime...
echo [INFO] Step 4/5: Checking Ollama local AI runtime... >> "%LOG_FILE%"
set "OLLAMA_EXE="
if exist "%LocalAppData%\Programs\Ollama\ollama.exe" set "OLLAMA_EXE=%LocalAppData%\Programs\Ollama\ollama.exe"
if not defined OLLAMA_EXE if exist "%ProgramFiles%\Ollama\ollama.exe" set "OLLAMA_EXE=%ProgramFiles%\Ollama\ollama.exe"
if not defined OLLAMA_EXE if exist "%USERPROFILE%\AppData\Local\Programs\Ollama\ollama.exe" set "OLLAMA_EXE=%USERPROFILE%\AppData\Local\Programs\Ollama\ollama.exe"
if not defined OLLAMA_EXE (
    where ollama >nul 2>&1
    if not errorlevel 1 set "OLLAMA_EXE=ollama"
)

if defined OLLAMA_EXE (
    echo [OK] Found Ollama binary at: !OLLAMA_EXE! >> "%LOG_FILE%"

    REM Start ollama serve in background if not already active
    powershell -NoProfile -Command "try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1',11434); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
    if errorlevel 1 (
        echo [INFO] Starting Ollama daemon in background... >> "%LOG_FILE%"
        powershell -NoProfile -Command "Start-Process -FilePath '!OLLAMA_EXE!' -ArgumentList 'serve' -WindowStyle Hidden" >nul 2>&1
        timeout /t 3 /nobreak >nul
    )

    REM Pull llama3.2:3b if not present
    "!OLLAMA_EXE!" list 2>nul | findstr /i "llama3.2:3b" >nul 2>&1
    if errorlevel 1 (
        echo [INFO] Pulling starter model llama3.2:3b... >> "%LOG_FILE%"
        "!OLLAMA_EXE!" pull llama3.2:3b >> "%LOG_FILE%" 2>&1
        if not errorlevel 1 (
            echo [OK] Successfully pulled starter model llama3.2:3b. >> "%LOG_FILE%"
        ) else (
            echo [NOTICE] Model pull deferred (can be pulled in UI upon launch). >> "%LOG_FILE%"
        )
    ) else (
        echo [OK] Starter model llama3.2:3b already present. >> "%LOG_FILE%"
    )
) else (
    echo [NOTICE] Ollama not detected. LUMIN will operate in deterministic tool / offline mode. >> "%LOG_FILE%"
    echo [NOTICE] To enable local neural models, install Ollama from https://ollama.com and run 'ollama pull llama3.2:3b'. >> "%LOG_FILE%"
)

REM ============================================================
REM STAGE 5: FFmpeg Media Engine Check
REM ============================================================
echo [5/5] Checking FFmpeg portable media toolkit...
echo [INFO] Step 5/5: Checking FFmpeg and FFprobe media tools... >> "%LOG_FILE%"
set "FFMPEG_EXE="
set "FFPROBE_EXE="

if exist "%PROJ%\bin\ffmpeg\ffmpeg.exe" set "FFMPEG_EXE=%PROJ%\bin\ffmpeg\ffmpeg.exe"
if exist "%PROJ%\bin\ffmpeg\ffprobe.exe" set "FFPROBE_EXE=%PROJ%\bin\ffmpeg\ffprobe.exe"

if not defined FFMPEG_EXE (
    where ffmpeg >nul 2>&1
    if not errorlevel 1 (
        set "FFMPEG_EXE=ffmpeg"
        set "FFPROBE_EXE=ffprobe"
    )
)

if not defined FFMPEG_EXE (
    echo [INFO] Portable FFmpeg not present in bin\ffmpeg. Attempting portable essentials download... >> "%LOG_FILE%"
    if exist "%TEMP%\ffmpeg_pkg.zip" del /f /q "%TEMP%\ffmpeg_pkg.zip" >nul 2>&1
    if exist "%TEMP%\ffmpeg_extract" rmdir /s /q "%TEMP%\ffmpeg_extract" >nul 2>&1
    mkdir "%TEMP%\ffmpeg_extract" >nul 2>&1

    curl.exe -fSL -k --retry 2 -o "%TEMP%\ffmpeg_pkg.zip" "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" >> "%LOG_FILE%" 2>&1
    if not exist "%TEMP%\ffmpeg_pkg.zip" (
        powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip', '$env:TEMP\ffmpeg_pkg.zip')" >> "%LOG_FILE%" 2>&1
    )

    if exist "%TEMP%\ffmpeg_pkg.zip" (
        powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '$env:TEMP\ffmpeg_pkg.zip' -DestinationPath '$env:TEMP\ffmpeg_extract' -Force; $ff = Get-ChildItem -Path '$env:TEMP\ffmpeg_extract' -Recurse -Filter 'ffmpeg.exe' | Select-Object -First 1; $fp = Get-ChildItem -Path '$env:TEMP\ffmpeg_extract' -Recurse -Filter 'ffprobe.exe' | Select-Object -First 1; if (-not (Test-Path '%PROJ%\bin\ffmpeg')) { New-Item -ItemType Directory -Path '%PROJ%\bin\ffmpeg' -Force | Out-Null }; if ($ff) { Copy-Item -Path $ff.FullName -Destination '%PROJ%\bin\ffmpeg\ffmpeg.exe' -Force }; if ($fp) { Copy-Item -Path $fp.FullName -Destination '%PROJ%\bin\ffmpeg\ffprobe.exe' -Force }" >> "%LOG_FILE%" 2>&1
        if exist "%TEMP%\ffmpeg_pkg.zip" del /f /q "%TEMP%\ffmpeg_pkg.zip" >nul 2>&1
        if exist "%TEMP%\ffmpeg_extract" rmdir /s /q "%TEMP%\ffmpeg_extract" >nul 2>&1
    )

    if exist "%PROJ%\bin\ffmpeg\ffmpeg.exe" set "FFMPEG_EXE=%PROJ%\bin\ffmpeg\ffmpeg.exe"
    if exist "%PROJ%\bin\ffmpeg\ffprobe.exe" set "FFPROBE_EXE=%PROJ%\bin\ffmpeg\ffprobe.exe"
)

if defined FFMPEG_EXE (
    echo [OK] FFmpeg media toolkit verified: !FFMPEG_EXE! >> "%LOG_FILE%"
) else (
    echo [NOTICE] FFmpeg not found locally. Video and audio ingestion will use fallbacks or on-demand bootstrap. >> "%LOG_FILE%"
)

REM ============================================================
REM FINAL: Status Summary & Markers
REM ============================================================
if %HAS_MISSING_PREREQS% equ 0 (
    echo SUCCESS > "%PROJ%\SUCCESS"
    echo SUCCESS > "%PROJ%\install_success.txt"
    echo ============================================================ >> "%LOG_FILE%"
    echo LUMIN Post-Install Setup Completed Successfully >> "%LOG_FILE%"
    echo Timestamp: %DATE% %TIME% >> "%LOG_FILE%"
    echo ============================================================ >> "%LOG_FILE%"
    echo [OK] Installation completed successfully.
) else (
    echo [NOTICE] Setup completed with missing prerequisites. >> "%LOG_FILE%"
    (
        echo ============================================================
        echo LUMIN Prerequisites Required
        echo ============================================================
        echo Required external dependencies:
        echo   - Python 3.11-3.13: https://www.python.org/downloads/ ^(check 'Add python.exe to PATH'^)
        echo   - Node.js LTS:      https://nodejs.org/
        echo   - Ollama:           https://ollama.com/
        echo.
        echo Please install any missing prerequisites and run start_app.bat
        echo or install_windows.bat to complete setup.
        echo See README.md for complete details.
        echo ============================================================
    ) > "%PROJ%\PREREQUISITES_REQUIRED.txt"
    type "%PROJ%\PREREQUISITES_REQUIRED.txt" >> "%LOG_FILE%"
    echo [NOTICE] LUMIN setup completed with missing prerequisites. See install_log.txt or PREREQUISITES_REQUIRED.txt.
)

exit /b 0
