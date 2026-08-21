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
REM LUMIN - SILENT PRODUCTION LAUNCHER
REM ============================================================

REM Find Node.js
set "NODE_EXE="
if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"
if not defined NODE_EXE (
    where node >nul 2>&1
    if not errorlevel 1 set "NODE_EXE=node"
)

if not defined NODE_EXE (
    mshta "javascript:alert('LUMIN could not find Node.js. Please reinstall LUMIN.');close()"
    exit /b 1
)

if not exist "%PROJ_DIR%\venv\Scripts\python.exe" (
    mshta "javascript:alert('LUMIN Python environment is missing. Please reinstall LUMIN.');close()"
    exit /b 1
)

REM Environment
set "PATH=%PROJ_DIR%\venv\Scripts;%PATH%"
set "LUMIN_DESKTOP=1"
set "LUMIN_KEEP_SERVER_ALIVE=1"
set "NODE_ENV=production"

REM Kill any old LUMIN server (completely silent)
powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*server.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1

REM Start Node completely hidden in Production mode
powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command "$env:NODE_ENV='production'; $env:LUMIN_DESKTOP='1'; $env:LUMIN_KEEP_SERVER_ALIVE='1'; $env:PATH='%PROJ_DIR%\venv\Scripts;' + $env:PATH; Start-Process -FilePath '%NODE_EXE%' -ArgumentList 'server.js' -WorkingDirectory '%PROJ_DIR%' -WindowStyle Hidden -PassThru | Out-Null" >nul 2>&1

REM Wait until port 3000 is ready
set /a COUNT=0
:wait
powershell -NoProfile -WindowStyle Hidden -Command "try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1',3000); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto :ready
set /a COUNT+=1
if %COUNT% geq 45 (
    mshta "javascript:alert('LUMIN server failed to start.');close()"
    exit /b 1
)
timeout /t 1 /nobreak >nul
goto :wait

:ready
start "" "http://localhost:3000"
exit /b 0