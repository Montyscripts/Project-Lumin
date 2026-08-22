@echo off
setlocal EnableDelayedExpansion

REM ============================================================
REM LUMIN silent post-install (called by setup.exe)
REM Completely silent – no windows, no pauses.
REM ============================================================

cd /d "%~dp0"
for %%I in ("%~dp0..") do set "PROJ=%%~fI"
cd /d "%PROJ%"

set "LOG=%PROJ%\install_log.txt"
echo ======================================== > "%LOG%"
echo LUMIN post-install started %DATE% %TIME% >> "%LOG%"
echo PROJ=%PROJ% >> "%LOG%"
echo ======================================== >> "%LOG%"
echo Test write >> "%LOG%"

REM ============================================================
REM 1. PYTHON
REM ============================================================
echo. >> "%LOG%"
echo [1] Looking for Python... >> "%LOG%"

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
if not defined BASE_PY if exist "%LocalAppData%\Programs\Python\Python311\python.exe" set "BASE_PY=%LocalAppData%\Programs\Python\Python311\python.exe"
if not defined BASE_PY if exist "%ProgramFiles%\Python312\python.exe" set "BASE_PY=%ProgramFiles%\Python312\python.exe"
if not defined BASE_PY if exist "%ProgramFiles%\Python313\python.exe" set "BASE_PY=%ProgramFiles%\Python313\python.exe"

if not defined BASE_PY (
    echo Trying winget for Python 3.12... >> "%LOG%"
    where winget >nul 2>&1
    if not errorlevel 1 (
        winget install --id Python.Python.3.12 --scope user --override "/passive PrependPath=1" --accept-package-agreements --accept-source-agreements >>"%LOG%" 2>&1
        timeout /t 5 /nobreak >nul
    )
    if exist "%LocalAppData%\Programs\Python\Python312\python.exe" set "BASE_PY=%LocalAppData%\Programs\Python\Python312\python.exe"
    if not defined BASE_PY if exist "%LocalAppData%\Programs\Python\Python313\python.exe" set "BASE_PY=%LocalAppData%\Programs\Python\Python313\python.exe"
    if not defined BASE_PY if exist "%LocalAppData%\Programs\Python\Python311\python.exe" set "BASE_PY=%LocalAppData%\Programs\Python\Python311\python.exe"
)

if not defined BASE_PY (
    echo [FATAL] No supported Python found. >> "%LOG%"
    echo FATAL_PYTHON > "%PROJ%\install_failed.txt"
    exit /b 1
)
echo Found existing Python: !BASE_PY! >> "%LOG%"
echo Using Python: !BASE_PY! >> "%LOG%"

REM ============================================================
REM 2. VENV + PIP
REM ============================================================
echo. >> "%LOG%"
echo [2] Creating virtual environment... >> "%LOG%"

set "VENV_PY=%PROJ%\venv\Scripts\python.exe"

if not exist "%VENV_PY%" (
    echo !BASE_PY! | findstr /b /c:"py " >nul
    if not errorlevel 1 (
        !BASE_PY! -m venv "%PROJ%\venv" >>"%LOG%" 2>&1
    ) else (
        "!BASE_PY!" -m venv "%PROJ%\venv" >>"%LOG%" 2>&1
    )
)

if not exist "%VENV_PY%" (
    echo [ERROR] venv failed. >> "%LOG%"
    echo FATAL_VENV > "%PROJ%\install_failed.txt"
    exit /b 1
)

echo Installing Python packages... >> "%LOG%"
"%VENV_PY%" -m pip install --upgrade pip >>"%LOG%" 2>&1
"%VENV_PY%" -m pip install -r "%PROJ%\requirements.txt" >>"%LOG%" 2>&1
if errorlevel 1 (
    "%VENV_PY%" -m pip install --no-cache-dir -r "%PROJ%\requirements.txt" >>"%LOG%" 2>&1
)
echo Python packages finished. >> "%LOG%"

REM ============================================================
REM 3. NODE.JS  (portable – never needs admin / winget)
REM ============================================================
echo. >> "%LOG%"
echo [3] Looking for Node.js... >> "%LOG%"

set "NODE_EXE="
set "NPM_CMD="
set "NODE_DIR=%PROJ%\nodejs"
set "NODE_ZIP=%TEMP%\node_lumin.zip"
set "NODE_URL=https://nodejs.org/dist/v22.14.0/node-v22.14.0-win-x64.zip"

REM Prefer system Node if it already exists
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
        for /f "delims=" %%i in ('where node') do (
            set "NODE_EXE=%%i"
            goto :node_sys_found
        )
    )
)
:node_sys_found

if defined NODE_EXE (
    echo Found existing system Node: !NODE_EXE! >> "%LOG%"
) else (
    echo No system Node found – installing portable Node into LUMIN folder... >> "%LOG%"

    if not exist "%NODE_DIR%\node.exe" (
        echo Downloading portable Node.js with curl... >> "%LOG%"

        REM Use delayed expansion and explicit quotes so -o never gets a blank argument
        curl.exe -L --retry 3 --retry-delay 2 -o "!NODE_ZIP!" "!NODE_URL!" >>"%LOG%" 2>&1
        echo curl exit code: !errorlevel! >> "%LOG%"

        if exist "!NODE_ZIP!" (
            echo Extracting Node.js... >> "%LOG%"
            powershell -NoProfile -ExecutionPolicy Bypass -Command ^
                "Expand-Archive -Path '!NODE_ZIP!' -DestinationPath '%TEMP%\node_extract' -Force; $src = Get-ChildItem '%TEMP%\node_extract' -Directory | Select-Object -First 1; if(Test-Path '!NODE_DIR!'){Remove-Item '!NODE_DIR!' -Recurse -Force}; Move-Item $src.FullName '!NODE_DIR!'; Remove-Item '%TEMP%\node_extract' -Recurse -Force -ErrorAction SilentlyContinue; Remove-Item '!NODE_ZIP!' -Force -ErrorAction SilentlyContinue" >>"%LOG%" 2>&1
        ) else (
            echo Download failed – zip file not found. >> "%LOG%"
        )
    )

    if exist "%NODE_DIR%\node.exe" (
        set "NODE_EXE=%NODE_DIR%\node.exe"
        set "NPM_CMD=%NODE_DIR%\npm.cmd"
        echo Portable Node installed at: !NODE_EXE! >> "%LOG%"
    )
)

if not defined NODE_EXE (
    echo [FATAL] Node.js installation failed. >> "%LOG%"
    echo FATAL_NODE > "%PROJ%\install_failed.txt"
    exit /b 1
)
echo Using Node: !NODE_EXE! >> "%LOG%"

REM Make sure the portable Node is first in PATH for npm
if exist "%NODE_DIR%\node.exe" set "PATH=%NODE_DIR%;%PATH%"

REM npm install
if not exist "%PROJ%\node_modules" (
    echo Running npm install... >> "%LOG%"
    if defined NPM_CMD (
        call "!NPM_CMD!" install --prefix "%PROJ%" >>"%LOG%" 2>&1
    ) else (
        call "%NODE_EXE%" "%NODE_DIR%\node_modules\npm\bin\npm-cli.js" install --prefix "%PROJ%" >>"%LOG%" 2>&1
    )
)
if exist "%PROJ%\node_modules" (
    echo node_modules OK. >> "%LOG%"
) else (
    echo [WARNING] node_modules missing after npm install. >> "%LOG%"
)

REM ============================================================
REM 4. OLLAMA
REM ============================================================
echo. >> "%LOG%"
echo [4] Looking for Ollama... >> "%LOG%"

set "OLLAMA_EXE="
if exist "%LocalAppData%\Programs\Ollama\ollama.exe" set "OLLAMA_EXE=%LocalAppData%\Programs\Ollama\ollama.exe"
if not defined OLLAMA_EXE (
    where ollama >nul 2>&1
    if not errorlevel 1 set "OLLAMA_EXE=ollama"
)

if not defined OLLAMA_EXE (
    echo Installing Ollama silently... >> "%LOG%"
    set "OLLAMA_SETUP=%TEMP%\OllamaSetup_lumin.exe"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -Uri 'https://ollama.com/download/OllamaSetup.exe' -OutFile '%OLLAMA_SETUP%' -UseBasicParsing; exit 0 } catch { exit 1 }" >>"%LOG%" 2>&1
    if exist "%OLLAMA_SETUP%" (
        start /wait "" "%OLLAMA_SETUP%" /VERYSILENT /NORESTART >>"%LOG%" 2>&1
        timeout /t 8 /nobreak >nul
        del /q "%OLLAMA_SETUP%" >nul 2>&1
    )
    if exist "%LocalAppData%\Programs\Ollama\ollama.exe" set "OLLAMA_EXE=%LocalAppData%\Programs\Ollama\ollama.exe"
)

if defined OLLAMA_EXE (
    echo Found Ollama: !OLLAMA_EXE! >> "%LOG%"
    start "" /B "!OLLAMA_EXE!" serve >nul 2>&1
    timeout /t 6 /nobreak >nul
    "!OLLAMA_EXE!" list 2>nul | findstr /i "llama3.2:3b" >nul 2>&1
    if errorlevel 1 (
        echo Pulling llama3.2:3b... >> "%LOG%"
        "!OLLAMA_EXE!" pull llama3.2:3b >>"%LOG%" 2>&1
    )
) else (
    echo [NOTICE] Ollama not installed (user can install later). >> "%LOG%"
)

echo. >> "%LOG%"
echo ======================================== >> "%LOG%"
echo LUMIN post-install FINISHED %DATE% %TIME% >> "%LOG%"
echo ======================================== >> "%LOG%"
echo SUCCESS > "%PROJ%\install_success.txt"
exit /b 0