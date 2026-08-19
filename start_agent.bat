@echo off
setlocal EnableDelayedExpansion
title LUMIN Local AI Router Agent - Dedicated CLI Runner

cd /d "%~dp0"

:: Timestamp for log file
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>nul') do set "TS=%%I"
if not defined TS set "TS=session"
set "TIMESTAMP=%TS:~0,8%_%TS:~8,6%"
set "LOG_FILE=%CD%\setup_log_%TIMESTAMP%.txt"

echo ==================================================================== >  "%LOG_FILE%"
echo   LUMIN AI Router Agent - Setup ^& Run Log - %DATE% %TIME%             >> "%LOG_FILE%"
echo ==================================================================== >> "%LOG_FILE%"
echo.
echo   Starting LUMIN CLI Agent launcher...
echo   Log written to: %LOG_FILE%

:: ── 1. Virtual Environment / Python Detection ────────────────────
echo   [1/4] Checking Python environment (Python 3.11, 3.12, 3.13)...
>>"%LOG_FILE%" echo   [1/4] Checking Python...

set "VENV_PY=%CD%\venv\Scripts\python.exe"

if not exist "%VENV_PY%" (
    echo   Project venv not found. Detecting supported base Python runtime...
    set "BASE_PY="
    py -3.13 -c "import sys; sys.exit(0 if (3, 11) <= sys.version_info[:2] <= (3, 13) else 1)" >nul 2>&1
    if %errorlevel% equ 0 set "BASE_PY=py -3.13"

    if not defined BASE_PY (
        py -3.12 -c "import sys; sys.exit(0 if (3, 11) <= sys.version_info[:2] <= (3, 13) else 1)" >nul 2>&1
        if %errorlevel% equ 0 set "BASE_PY=py -3.12"
    )

    if not defined BASE_PY (
        py -3.11 -c "import sys; sys.exit(0 if (3, 11) <= sys.version_info[:2] <= (3, 13) else 1)" >nul 2>&1
        if %errorlevel% equ 0 set "BASE_PY=py -3.11"
    )

    if not defined BASE_PY (
        python -c "import sys; sys.exit(0 if (3, 11) <= sys.version_info[:2] <= (3, 13) else 1)" >nul 2>&1
        if %errorlevel% equ 0 set "BASE_PY=python"
    )

    if not defined BASE_PY (
        python3 -c "import sys; sys.exit(0 if (3, 11) <= sys.version_info[:2] <= (3, 13) else 1)" >nul 2>&1
        if %errorlevel% equ 0 set "BASE_PY=python3"
    )

    if not defined BASE_PY (
        call :Fatal "No supported Python version (3.11, 3.12, 3.13) found on this machine." "Run 'install_windows.bat' or download Python 3.12 from https://python.org."
        exit /b 1
    )

    echo   Creating project virtual environment (%CD%\venv)...
    if "!BASE_PY:~0,3!"=="py " (
        !BASE_PY! -m venv "%CD%\venv" >>"%LOG_FILE%" 2>&1
    ) else (
        "!BASE_PY!" -m venv "%CD%\venv" >>"%LOG_FILE%" 2>&1
    )
    if %errorlevel% neq 0 (
        call :Fatal "Failed to create virtual environment." "Ensure !BASE_PY! has venv module installed."
        exit /b 1
    )
)

echo   [OK] Using Python in venv: %VENV_PY%
>>"%LOG_FILE%" echo   [OK] Using Python: %VENV_PY%

:: ── 2. Python packages ───────────────────────────────────────────
echo   [2/4] Verifying Python package dependencies...
>>"%LOG_FILE%" echo   [2/4] Verifying dependencies...

"%VENV_PY%" -c "import numpy, rich, edge_tts, requests" >nul 2>&1
if %errorlevel% neq 0 (
    echo   Installing requirements into venv...
    "%VENV_PY%" -m pip install --upgrade pip >>"%LOG_FILE%" 2>&1
    "%VENV_PY%" -m pip install -r "%CD%\requirements.txt" >>"%LOG_FILE%" 2>&1
    if %errorlevel% neq 0 (
        "%VENV_PY%" -m pip install --no-cache-dir -r "%CD%\requirements.txt" >>"%LOG_FILE%" 2>&1
        if %errorlevel% neq 0 (
            call :Fatal "Failed to install Python packages." "Check internet connection and requirements.txt."
            exit /b 1
        )
    )
)
echo   [OK] Python dependencies verified.
>>"%LOG_FILE%" echo   [OK] Dependencies verified.

:: ── 3. Ollama – verify and launch service ─────────────────────────
echo   [3/4] Ensuring Ollama is running...
>>"%LOG_FILE%" echo   [3/4] Ensuring Ollama...

set "OLLAMA_EXE="
if exist "%LocalAppData%\Programs\Ollama\ollama.exe" set "OLLAMA_EXE=%LocalAppData%\Programs\Ollama\ollama.exe"
if not defined OLLAMA_EXE (
    where ollama >nul 2>&1
    if !errorlevel! equ 0 set "OLLAMA_EXE=ollama"
)
if not defined OLLAMA_EXE (
    where winget >nul 2>&1
    if !errorlevel! equ 0 (
        echo   Auto-installing Ollama via winget...
        winget install --id Ollama.Ollama --silent --accept-package-agreements --accept-source-agreements >>"%LOG_FILE%" 2>&1
        if exist "%LocalAppData%\Programs\Ollama\ollama.exe" set "OLLAMA_EXE=%LocalAppData%\Programs\Ollama\ollama.exe"
    )
)

if defined OLLAMA_EXE (
    netstat -ano | findstr "127.0.0.1:11434" | findstr "LISTENING" >nul 2>&1
    if !errorlevel! neq 0 (
        echo   Launching Ollama in background...
        powershell -NoProfile -Command "Start-Process -FilePath '!OLLAMA_EXE!' -ArgumentList 'serve' -WindowStyle Hidden" >nul 2>&1
        timeout /t 5 /nobreak >nul
    )
    echo   [OK] Ollama ready
    >>"%LOG_FILE%" echo   [OK] Ollama ready
)
if not defined OLLAMA_EXE (
    echo   [NOTICE] Ollama CLI not detected. Running in offline/fallback mode.
)

:: ── 4. Launch Agent ───────────────────────────────────────────────
echo   [4/4] Running pre-flight diagnostics and starting Agent...
>>"%LOG_FILE%" echo   [4/4] Starting agent...

"%VENV_PY%" -c "from core.capabilities import CapabilityRegistry; reg = CapabilityRegistry(); rep = reg.get_actionable_recovery_report(); print(rep) if 'RECOVERY ACTION' in rep else None" 2>nul

echo ==================================================================== >> "%LOG_FILE%"
echo   Launching agent.py                                                >> "%LOG_FILE%"
echo ==================================================================== >> "%LOG_FILE%"

title LUMIN Local AI Router Agent
set "PATH=%CD%\venv\Scripts;%PATH%"
"%VENV_PY%" agent.py
if %errorlevel% neq 0 (
    echo.
    echo   ═══════════════════════════════════════════════════════════════
    echo     LUMIN AGENT EXITED WITH AN ERROR
    echo   ═══════════════════════════════════════════════════════════════
    echo   RECOVERY CHECKLIST:
    echo   1. Python Version: Ensure Python 3.11, 3.12, or 3.13 is used (3.14+ is unsupported).
    echo   2. Dependencies: Run '%VENV_PY% -m pip install -r requirements.txt'.
    echo   3. Ollama: Verify Ollama service is active ('ollama serve') with model 'llama3.2:3b'.
    echo   4. NumPy / Edge-TTS: Ensure numpy>=1.26.0,<2.3.0 and edge-tts>=7.2.0 are installed.
    echo   ═══════════════════════════════════════════════════════════════
    echo   See log file for details: %LOG_FILE%
    echo.
    pause
)
exit /b 0

:Fatal
echo.
echo   ═══════════════════════════════════════════════════════════════
echo     SETUP FAILED
echo   ═══════════════════════════════════════════════════════════════
echo   %~1
if not "%~2"=="" echo   %~2
echo.
echo   See the log file: %LOG_FILE%
echo.
>>"%LOG_FILE%" echo   [FATAL] %~1
pause
exit /b 1
