@echo off
setlocal EnableDelayedExpansion
title LUMIN AI Agent - Windows One-Click Installer

cd /d "%~dp0"
set "PROJ_DIR=%CD%"

echo.
echo ============================================================
echo   LUMIN AI Agent - Windows One-Click Installer
echo ============================================================
echo.

set "LOG_FILE=%PROJ_DIR%\install_log.txt"
echo ============================================================ > "%LOG_FILE%"
echo LUMIN Windows Installer Log >> "%LOG_FILE%"
echo Timestamp: %DATE% %TIME% >> "%LOG_FILE%"
echo Target Directory: %PROJ_DIR% >> "%LOG_FILE%"
echo ============================================================ >> "%LOG_FILE%"

REM Function helper to refresh PATH from Windows Registry (System + User)
for /f "tokens=2*" %%A in ('reg query "HKLM\System\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do set "SYS_PATH=%%B"
for /f "tokens=2*" %%A in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "USR_PATH=%%B"
if defined SYS_PATH if defined USR_PATH set "PATH=%SYS_PATH%;%USR_PATH%;%PATH%"

REM Ensure project-local runtime paths are included in session PATH
if exist "%PROJ_DIR%\nodejs" set "PATH=%PROJ_DIR%\nodejs;%PATH%"
if exist "%PROJ_DIR%\bin\ffmpeg" set "PATH=%PROJ_DIR%\bin\ffmpeg;%PATH%"

REM ===== Step 0: Initialize Workspace Directories & Config =====
echo [0/5] Initializing workspace configuration and runtime directories...
if not exist "%PROJ_DIR%\lumin_context" mkdir "%PROJ_DIR%\lumin_context"
if not exist "%PROJ_DIR%\tts_cache" mkdir "%PROJ_DIR%\tts_cache"
if not exist "%PROJ_DIR%\uploads" mkdir "%PROJ_DIR%\uploads"
if not exist "%PROJ_DIR%\memory" mkdir "%PROJ_DIR%\memory"
if not exist "%PROJ_DIR%\bin" mkdir "%PROJ_DIR%\bin"
if not exist "%PROJ_DIR%\bin\ffmpeg" mkdir "%PROJ_DIR%\bin\ffmpeg"
if not exist "%PROJ_DIR%\nodejs" mkdir "%PROJ_DIR%\nodejs"

if not exist "%PROJ_DIR%\agent_config.json" (
    if exist "%PROJ_DIR%\agent_config.example.json" (
        copy "%PROJ_DIR%\agent_config.example.json" "%PROJ_DIR%\agent_config.json" >nul 2>&1
        echo      Created agent_config.json from template.
    )
) else (
    echo      agent_config.json already present.
)

REM ===== Step 1: Python Detection & Virtual Environment (Python 3.11-3.13 ONLY) =====
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

REM If missing, download and install official Python 3.12 via PowerShell
if not defined BASE_PY (
    echo      Python 3.11-3.13 not detected. Downloading official Python 3.12 installer...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
        "$installer = Join-Path $env:TEMP 'lumin_python_installer.exe'; " ^
        "try { " ^
        "  Write-Output 'Downloading Python 3.12.8 64-bit installer...'; " ^
        "  $wc = New-Object System.Net.WebClient; " ^
        "  $wc.Headers.Add('User-Agent', 'LUMIN-Installer/1.0 (Windows NT; x64)'); " ^
        "  $wc.DownloadFile('https://www.python.org/ftp/python/3.12.8/python-3.12.8-amd64.exe', $installer); " ^
        "  Write-Output 'Running Python 3.12 installation...'; " ^
        "  $p = Start-Process -FilePath $installer -ArgumentList '/passive InstallAllUsers=0 PrependPath=1 Include_pip=1 SimpleInstall=1' -PassThru -Wait; " ^
        "  Remove-Item -Force $installer -ErrorAction SilentlyContinue; " ^
        "  exit $p.ExitCode " ^
        "} catch { Write-Error $_; exit 1 }" >>"%LOG_FILE%" 2>&1

    if exist "%LocalAppData%\Programs\Python\Python312\python.exe" set "BASE_PY=%LocalAppData%\Programs\Python\Python312\python.exe"
    if not defined BASE_PY (
        for /f "tokens=2*" %%A in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "USR_PATH=%%B"
        if defined USR_PATH set "PATH=!USR_PATH!;!PATH!"
        where python >nul 2>&1
        if not errorlevel 1 set "BASE_PY=python"
    )
)

REM Fallback: Winget install
if not defined BASE_PY (
    echo      Attempting auto-installation via winget fallback...
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

REM ===== Step 2: Python Package Dependencies =====
echo [2/5] Installing and updating Python dependencies...
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

REM ===== Step 3: Node.js & Web UI Dependencies =====
echo [3/5] Checking Node.js and Web UI runtime...
set "NODE_EXE="
set "NPM_CMD="

REM Check project-local portable Node.js first
if exist "%PROJ_DIR%\nodejs\node.exe" (
    set "NODE_EXE=%PROJ_DIR%\nodejs\node.exe"
    set "NPM_CMD=%PROJ_DIR%\nodejs\npm.cmd"
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

REM Direct reliable portable Node.js LTS download (No winget / UAC required)
if not defined NODE_EXE (
    echo      Node.js not detected. Downloading portable Node.js LTS runtime...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
        "$zip = Join-Path $env:TEMP 'lumin_node_lts.zip'; " ^
        "$extractDir = Join-Path $env:TEMP 'lumin_node_extract'; " ^
        "$targetDir = '%PROJ_DIR%\nodejs'; " ^
        "$urls = @('https://nodejs.org/dist/v20.18.3/node-v20.18.3-win-x64.zip', 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip'); " ^
        "$downloaded = $false; " ^
        "foreach ($u in $urls) { " ^
        "  try { " ^
        "    Write-Output ('Downloading Node.js LTS from ' + $u + '...'); " ^
        "    $wc = New-Object System.Net.WebClient; " ^
        "    $wc.Headers.Add('User-Agent', 'LUMIN-Installer/1.0 (Windows NT; x64)'); " ^
        "    $wc.DownloadFile($u, $zip); " ^
        "    $downloaded = $true; break " ^
        "  } catch { Write-Output ('Download failed from ' + $u) } " ^
        "}; " ^
        "if (-not $downloaded) { exit 1 }; " ^
        "try { " ^
        "  if (Test-Path $extractDir) { Remove-Item -Recurse -Force $extractDir }; " ^
        "  Write-Output 'Extracting portable Node.js LTS archive...'; " ^
        "  Expand-Archive -Path $zip -DestinationPath $extractDir -Force; " ^
        "  $subDir = Get-ChildItem -Path $extractDir -Directory | Select-Object -First 1; " ^
        "  if ($subDir) { " ^
        "    if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir -Force | Out-Null }; " ^
        "    Copy-Item -Path ($subDir.FullName + '\*') -Destination $targetDir -Recurse -Force; " ^
        "  }; " ^
        "  Remove-Item -Recurse -Force $extractDir -ErrorAction SilentlyContinue; " ^
        "  Remove-Item -Force $zip -ErrorAction SilentlyContinue; " ^
        "  exit 0 " ^
        "} catch { Write-Error $_; exit 1 }" >>"%LOG_FILE%" 2>&1

    if exist "%PROJ_DIR%\nodejs\node.exe" (
        set "NODE_EXE=%PROJ_DIR%\nodejs\node.exe"
        set "NPM_CMD=%PROJ_DIR%\nodejs\npm.cmd"
        echo      Portable Node.js extracted to %PROJ_DIR%\nodejs
    )
)

REM Fallback: Winget install if portable download failed
if not defined NODE_EXE (
    echo      Attempting winget fallback for Node.js LTS...
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

REM ===== Step 4: Ollama Local Model Engine =====
echo [4/5] Checking Ollama local AI runtime...
set "OLLAMA_EXE="
if exist "%LocalAppData%\Programs\Ollama\ollama.exe" set "OLLAMA_EXE=%LocalAppData%\Programs\Ollama\ollama.exe"
if not defined OLLAMA_EXE if exist "%ProgramFiles%\Ollama\ollama.exe" set "OLLAMA_EXE=%ProgramFiles%\Ollama\ollama.exe"
if not defined OLLAMA_EXE if exist "%ProgramFiles(x86)%\Ollama\ollama.exe" set "OLLAMA_EXE=%ProgramFiles(x86)%\Ollama\ollama.exe"
if not defined OLLAMA_EXE if exist "%USERPROFILE%\AppData\Local\Programs\Ollama\ollama.exe" set "OLLAMA_EXE=%USERPROFILE%\AppData\Local\Programs\Ollama\ollama.exe"
if not defined OLLAMA_EXE (
    where ollama >nul 2>&1
    if not errorlevel 1 set "OLLAMA_EXE=ollama"
)

REM Direct reliable Ollama installation via official installer download
if not defined OLLAMA_EXE (
    echo      Ollama not detected. Downloading official Ollama installer...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
        "$setup = Join-Path $env:TEMP 'OllamaSetup.exe'; " ^
        "try { " ^
        "  Write-Output 'Downloading OllamaSetup.exe from https://ollama.com/download/OllamaSetup.exe...'; " ^
        "  $wc = New-Object System.Net.WebClient; " ^
        "  $wc.Headers.Add('User-Agent', 'LUMIN-Installer/1.0 (Windows NT; x64)'); " ^
        "  $wc.DownloadFile('https://ollama.com/download/OllamaSetup.exe', $setup); " ^
        "  Write-Output 'Running OllamaSetup.exe silent installer...'; " ^
        "  $p = Start-Process -FilePath $setup -ArgumentList '/silent' -PassThru -Wait; " ^
        "  Remove-Item -Force $setup -ErrorAction SilentlyContinue; " ^
        "  exit $p.ExitCode " ^
        "} catch { Write-Error $_; exit 1 }" >>"%LOG_FILE%" 2>&1

    if exist "%LocalAppData%\Programs\Ollama\ollama.exe" set "OLLAMA_EXE=%LocalAppData%\Programs\Ollama\ollama.exe"
    if not defined OLLAMA_EXE if exist "%ProgramFiles%\Ollama\ollama.exe" set "OLLAMA_EXE=%ProgramFiles%\Ollama\ollama.exe"
    if not defined OLLAMA_EXE if exist "%USERPROFILE%\AppData\Local\Programs\Ollama\ollama.exe" set "OLLAMA_EXE=%USERPROFILE%\AppData\Local\Programs\Ollama\ollama.exe"
)

REM Fallback 2: Official PowerShell script installer
if not defined OLLAMA_EXE (
    echo      Attempting official PowerShell install script for Ollama...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
        "try { irm https://ollama.com/install.ps1 | iex } catch { Write-Error $_; exit 1 }" >>"%LOG_FILE%" 2>&1

    if exist "%LocalAppData%\Programs\Ollama\ollama.exe" set "OLLAMA_EXE=%LocalAppData%\Programs\Ollama\ollama.exe"
    if not defined OLLAMA_EXE if exist "%ProgramFiles%\Ollama\ollama.exe" set "OLLAMA_EXE=%ProgramFiles%\Ollama\ollama.exe"
    if not defined OLLAMA_EXE if exist "%USERPROFILE%\AppData\Local\Programs\Ollama\ollama.exe" set "OLLAMA_EXE=%USERPROFILE%\AppData\Local\Programs\Ollama\ollama.exe"
)

REM Fallback 3: Winget install
if not defined OLLAMA_EXE (
    echo      Attempting winget fallback for Ollama...
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
        echo      Starting Ollama daemon service in background...
        powershell -NoProfile -Command "Start-Process -FilePath '!OLLAMA_EXE!' -ArgumentList 'serve' -WindowStyle Hidden" >nul 2>&1
    )

    echo      Waiting for Ollama service on 127.0.0.1:11434...
    set /a OLLAMA_READY=0
    set /a OLLAMA_RETRIES=0

    :poll_ollama_iw
    powershell -NoProfile -Command "try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1',11434); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 (
        set /a OLLAMA_READY=1
        goto :ollama_iw_ready
    )
    set /a OLLAMA_RETRIES+=1
    if !OLLAMA_RETRIES! leq 30 (
        timeout /t 1 /nobreak >nul
        goto :poll_ollama_iw
    )

    :ollama_iw_ready
    if !OLLAMA_READY! equ 1 (
        echo      Ollama service is active and listening on port 11434 (verified in !OLLAMA_RETRIES!s).
        "!OLLAMA_EXE!" list 2>nul | findstr /i "llama3.2:3b" >nul 2>&1
        if errorlevel 1 (
            echo      Pulling default local starter model llama3.2:3b (approx 2.0 GB)...
            "!OLLAMA_EXE!" pull llama3.2:3b >>"%LOG_FILE%" 2>&1
            if errorlevel 1 (
                echo      [NOTICE] Model auto-pull deferred. Run 'ollama pull llama3.2:3b' when connected or download in UI.
            ) else (
                echo      Model llama3.2:3b downloaded and ready.
            )
        ) else (
            echo      Model llama3.2:3b already present in Ollama library.
        )
    ) else (
        echo      [NOTICE] Ollama daemon did not respond on port 11434 within timeout. Model download can be completed in the UI.
    )
) else (
    echo      [NOTICE] Ollama not found. LUMIN will operate in deterministic tool / offline mode.
    echo      To enable local neural intelligence, install Ollama from https://ollama.com and run 'ollama pull llama3.2:3b'.
)

REM ===== Step 5: Portable FFmpeg Media Toolkit =====
echo [5/5] Checking FFmpeg portable media toolkit...
set "FFMPEG_EXE="
set "FFPROBE_EXE="

if exist "%PROJ_DIR%\bin\ffmpeg\ffmpeg.exe" (
    set "FFMPEG_EXE=%PROJ_DIR%\bin\ffmpeg\ffmpeg.exe"
)
if exist "%PROJ_DIR%\bin\ffmpeg\ffprobe.exe" (
    set "FFPROBE_EXE=%PROJ_DIR%\bin\ffmpeg\ffprobe.exe"
)

if not defined FFMPEG_EXE (
    echo      Portable FFmpeg not detected. Downloading portable FFmpeg essentials...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
        "$zip = Join-Path $env:TEMP 'lumin_ffmpeg.zip'; " ^
        "$extractDir = Join-Path $env:TEMP 'lumin_ffmpeg_extract'; " ^
        "$targetDir = '%PROJ_DIR%\bin\ffmpeg'; " ^
        "$urls = @('https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip', 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip'); " ^
        "$downloaded = $false; " ^
        "foreach ($u in $urls) { " ^
        "  try { " ^
        "    Write-Output ('Downloading portable FFmpeg from ' + $u + '...'); " ^
        "    $wc = New-Object System.Net.WebClient; " ^
        "    $wc.Headers.Add('User-Agent', 'LUMIN-Installer/1.0 (Windows NT; x64)'); " ^
        "    $wc.DownloadFile($u, $zip); " ^
        "    $downloaded = $true; break " ^
        "  } catch { Write-Output ('Download failed from ' + $u) } " ^
        "}; " ^
        "if (-not $downloaded) { exit 1 }; " ^
        "try { " ^
        "  if (Test-Path $extractDir) { Remove-Item -Recurse -Force $extractDir }; " ^
        "  Write-Output 'Extracting FFmpeg binaries...'; " ^
        "  Expand-Archive -Path $zip -DestinationPath $extractDir -Force; " ^
        "  if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir -Force | Out-Null }; " ^
        "  $ffExe = Get-ChildItem -Path $extractDir -Recurse -Filter 'ffmpeg.exe' | Select-Object -First 1; " ^
        "  $fpExe = Get-ChildItem -Path $extractDir -Recurse -Filter 'ffprobe.exe' | Select-Object -First 1; " ^
        "  if ($ffExe) { Copy-Item -Path $ffExe.FullName -Destination (Join-Path $targetDir 'ffmpeg.exe') -Force }; " ^
        "  if ($fpExe) { Copy-Item -Path $fpExe.FullName -Destination (Join-Path $targetDir 'ffprobe.exe') -Force }; " ^
        "  Remove-Item -Recurse -Force $extractDir -ErrorAction SilentlyContinue; " ^
        "  Remove-Item -Force $zip -ErrorAction SilentlyContinue; " ^
        "  exit 0 " ^
        "} catch { Write-Error $_; exit 1 }" >>"%LOG_FILE%" 2>&1

    if exist "%PROJ_DIR%\bin\ffmpeg\ffmpeg.exe" (
        set "FFMPEG_EXE=%PROJ_DIR%\bin\ffmpeg\ffmpeg.exe"
    )
    if exist "%PROJ_DIR%\bin\ffmpeg\ffprobe.exe" (
        set "FFPROBE_EXE=%PROJ_DIR%\bin\ffmpeg\ffprobe.exe"
    )
)

if defined FFMPEG_EXE (
    "%FFMPEG_EXE%" -version >nul 2>&1
    if not errorlevel 1 (
        echo      FFmpeg media tools verified at !FFMPEG_EXE!.
    )
) else (
    echo      [NOTICE] FFmpeg could not be downloaded. Video ingestion will use fallbacks.
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
