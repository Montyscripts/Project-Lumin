::[Bat To Exe Converter]
::
::YAwzoRdxOk+EWAjk
::fBw5plQjdCyDJGyX8VAjFDZbQhCbAE+/Fb4I5/jH3/iIqEgeQK8TbYLS1PmYca5DpBXYRYQi3H9ZjIYgGRZRcC67ew04oG1+sGWTPsSTvUHoSUfp
::YAwzuBVtJxjWCl3EqQJgSA==
::ZR4luwNxJguZRRnk
::Yhs/ulQjdF+5
::cxAkpRVqdFKZSzk=
::cBs/ulQjdFy5
::ZR41oxFsdFKZSDk=
::eBoioBt6dFKZSDk=
::cRo6pxp7LAbNWATEpCI=
::egkzugNsPRvcWATEpCI=
::dAsiuh18IRvcCxnZtBJQ
::cRYluBh/LU+EWAnk
::YxY4rhs+aU+JeA==
::cxY6rQJ7JhzQF1fEqQJQ
::ZQ05rAF9IBncCkqN+0xwdVs0
::ZQ05rAF9IAHYFVzEqQJQ
::eg0/rx1wNQPfEVWB+kM9LVsJDGQ=
::fBEirQZwNQPfEVWB+kM9LVsJDGQ=
::cRolqwZ3JBvQF1fEqQJQ
::dhA7uBVwLU+EWDk=
::YQ03rBFzNR3SWATElA==
::dhAmsQZ3MwfNWATElA==
::ZQ0/vhVqMQ3MEVWAtB9wSA==
::Zg8zqx1/OA3MEVWAtB9wSA==
::dhA7pRFwIByZRRnk
::Zh4grVQjdCyDJGyX8VAjFDZbQhCbAE+/Fb4I5/jH3/iIqEgeQK8TbYLS1PmYca5DpBXYRYQi3H9ZjIYgGRZRcC6HWyIdhyBHrmHl
::YB416Ek+ZG8=
::
::
::978f952a14a936cc963da21a135fa983
@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
set "PROJ_DIR=%CD%"

REM ============================================================
REM LUMIN AI AGENT - SILENT PRODUCTION LAUNCHER
REM ============================================================

REM 1. Workspace directories & config setup
if not exist "%PROJ_DIR%\lumin_context" mkdir "%PROJ_DIR%\lumin_context" >nul 2>&1
if not exist "%PROJ_DIR%\tts_cache" mkdir "%PROJ_DIR%\tts_cache" >nul 2>&1
if not exist "%PROJ_DIR%\uploads" mkdir "%PROJ_DIR%\uploads" >nul 2>&1
if not exist "%PROJ_DIR%\memory" mkdir "%PROJ_DIR%\memory" >nul 2>&1
if not exist "%PROJ_DIR%\bin\ffmpeg" mkdir "%PROJ_DIR%\bin\ffmpeg" >nul 2>&1
if not exist "%PROJ_DIR%\agent_config.json" (
    if exist "%PROJ_DIR%\agent_config.example.json" (
        copy "%PROJ_DIR%\agent_config.example.json" "%PROJ_DIR%\agent_config.json" >nul 2>&1
    )
)

REM Prepend project-local nodejs and ffmpeg to PATH if present
if exist "%PROJ_DIR%\nodejs" set "PATH=%PROJ_DIR%\nodejs;%PATH%"
if exist "%PROJ_DIR%\bin\ffmpeg" set "PATH=%PROJ_DIR%\bin\ffmpeg;%PATH%"

REM 2. Find Node.js (project-local portable first, then system paths)
set "NODE_EXE="
if exist "%PROJ_DIR%\nodejs\node.exe" set "NODE_EXE=%PROJ_DIR%\nodejs\node.exe"
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"
if not defined NODE_EXE if exist "%USERPROFILE%\AppData\Local\Programs\nodejs\node.exe" set "NODE_EXE=%USERPROFILE%\AppData\Local\Programs\nodejs\node.exe"
if not defined NODE_EXE (
    where node >nul 2>&1
    if not errorlevel 1 set "NODE_EXE=node"
)

if not defined NODE_EXE (
    mshta "javascript:alert('LUMIN could not find Node.js.\n\nPlease run install_windows.bat to automatically install prerequisites,\nor download Node.js LTS from https://nodejs.org/');close()"
    exit /b 1
)

REM 3. Check / Auto-Bootstrap Python Virtual Environment (3.11-3.13)
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
    if not defined BASE_PY if exist "%LocalAppData%\Programs\Python\Python312\python.exe" set "BASE_PY=%LocalAppData%\Programs\Python\Python312\python.exe"
    if not defined BASE_PY if exist "%LocalAppData%\Programs\Python\Python313\python.exe" set "BASE_PY=%LocalAppData%\Programs\Python\Python313\python.exe"
    if not defined BASE_PY if exist "%ProgramFiles%\Python312\python.exe" set "BASE_PY=%ProgramFiles%\Python312\python.exe"
    
    if defined BASE_PY (
        echo Bootstrapping virtual environment...
        echo !BASE_PY! | findstr /b /c:"py " >nul
        if not errorlevel 1 (
            !BASE_PY! -m venv "%PROJ_DIR%\venv" >nul 2>&1
        ) else (
            "!BASE_PY!" -m venv "%PROJ_DIR%\venv" >nul 2>&1
        )
        if exist "%VENV_PY%" (
            "%VENV_PY%" -m pip install --upgrade pip >nul 2>&1
            "%VENV_PY%" -m pip install -r "%PROJ_DIR%\requirements.txt" >nul 2>&1
        )
    )
)

if not exist "%VENV_PY%" (
    mshta "javascript:alert('LUMIN Python environment is not initialized.\n\nPlease run install_windows.bat once to configure Python 3.11-3.13 and dependencies.');close()"
    exit /b 1
)

REM 4. Check frontend dependencies and build production bundle
if not exist "%PROJ_DIR%\node_modules" (
    echo Installing web interface packages...
    if exist "%PROJ_DIR%\nodejs\npm.cmd" (
        call "%PROJ_DIR%\nodejs\npm.cmd" install >nul 2>&1
    ) else if exist "%ProgramFiles%\nodejs\npm.cmd" (
        call "%ProgramFiles%\nodejs\npm.cmd" install >nul 2>&1
    ) else if exist "%LocalAppData%\Programs\nodejs\npm.cmd" (
        call "%LocalAppData%\Programs\nodejs\npm.cmd" install >nul 2>&1
    ) else (
        call npm install >nul 2>&1
    )
)
if not exist "%PROJ_DIR%\dist\index.html" (
    echo Compiling high-speed production frontend bundle...
    if exist "%PROJ_DIR%\nodejs\npm.cmd" (
        call "%PROJ_DIR%\nodejs\npm.cmd" run build >nul 2>&1
    ) else if exist "%ProgramFiles%\nodejs\npm.cmd" (
        call "%ProgramFiles%\nodejs\npm.cmd" run build >nul 2>&1
    ) else if exist "%LocalAppData%\Programs\nodejs\npm.cmd" (
        call "%LocalAppData%\Programs\nodejs\npm.cmd" run build >nul 2>&1
    ) else (
        call npm run build >nul 2>&1
    )
)

REM 5. Quietly ensure Ollama service is active if installed
set "OLLAMA_EXE="
if exist "%LocalAppData%\Programs\Ollama\ollama.exe" set "OLLAMA_EXE=%LocalAppData%\Programs\Ollama\ollama.exe"
if not defined OLLAMA_EXE if exist "%ProgramFiles%\Ollama\ollama.exe" set "OLLAMA_EXE=%ProgramFiles%\Ollama\ollama.exe"
if not defined OLLAMA_EXE (
    where ollama >nul 2>&1
    if not errorlevel 1 set "OLLAMA_EXE=ollama"
)
if defined OLLAMA_EXE (
    powershell -NoProfile -WindowStyle Hidden -Command "try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1',11434); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
    if errorlevel 1 (
        powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath '!OLLAMA_EXE!' -ArgumentList 'serve' -WindowStyle Hidden" >nul 2>&1
    )
)

REM 6. Environment setup
set "PATH=%PROJ_DIR%\venv\Scripts;%PATH%"
set "LUMIN_DESKTOP=1"
set "NODE_ENV=production"

REM 7. Cleanly terminate any prior LUMIN server instances
powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*server.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*agent.py*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1

REM 8. Start Node completely hidden in background
powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command "$env:NODE_ENV='production'; $env:LUMIN_DESKTOP='1'; $env:PATH='%PROJ_DIR%\venv\Scripts;' + $env:PATH; Start-Process -FilePath '%NODE_EXE%' -ArgumentList 'server.js' -WorkingDirectory '%PROJ_DIR%' -WindowStyle Hidden -PassThru | Out-Null" >nul 2>&1

REM 9. Wait until port 3000 is ready
set /a COUNT=0
:wait
powershell -NoProfile -WindowStyle Hidden -Command "try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1',3000); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto :ready
set /a COUNT+=1
if %COUNT% geq 45 (
    mshta "javascript:alert('LUMIN server failed to start on http://localhost:3000 within 45 seconds.\n\nTROUBLESHOOTING:\n1. Run start_app_debug.bat to inspect console error logs.\n2. Run stop_app.bat to ensure port 3000 is not blocked by another application.\n3. Check lumin.log for details.');close()"
    exit /b 1
)
timeout /t 1 /nobreak >nul
goto :wait

:ready
start "" "http://localhost:3000"
exit /b 0