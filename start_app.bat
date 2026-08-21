::[Bat To Exe Converter]
::
::YAwzoRdxOk+EWAjk
::fBw5plQjdCyDJGyX8VAjFDZbQhCbAE+/Fb4I5/jH3/iIqEgeQK8TbYLS1PmYca5DpBXYRYQi3H9ZjIYgGRZRcC67ew04oG1+sGWTPsSTvUHoSUfp
::YAwzuBVtJxjWCl3EqQJgSA==
::ZR4luwNxJguZRRnk
::Yhs/ulQjdF+5
::cxAkpRVqdFKZSzk=
::cBs/ulQjdF+5
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
::Zh4grVQjdCyDJGyX8VAjFDZbQhCbAE+/Fb4I5/jH3/iIqEgeQK8TbYLS1PmYca5DpBXYRYQi3H9ZjIYgGRZRcC6HewI9pyBHrmHl
::YB416Ek+ZG8=
::
::
::978f952a14a936cc963da21a135fa983
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
