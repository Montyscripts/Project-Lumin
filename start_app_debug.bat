@echo off
set "PROJ_DIR=%~dp0"
if "%PROJ_DIR:~-1%"=="\" set "PROJ_DIR=%PROJ_DIR:~0,-1%"
cd /d "%PROJ_DIR%"

echo ====================================================================
echo               LUMIN AI Agent - Debug Mode Startup
echo ====================================================================

where node >nul 2>&1
if %errorlevel% neq 0 goto :no_node

if exist "%PROJ_DIR%\node_modules" goto :modules_ok
echo [NOTICE] node_modules missing. Running npm install...
call npm install
if %errorlevel% neq 0 goto :npm_failed

:modules_ok
echo Starting LUMIN server directly in foreground debug window...
echo Server listening on http://localhost:5173
echo.

start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:5173"

node server.js
pause
exit /b 0

:no_node
echo [ERROR] Node.js is not found on your system PATH!
echo Please install Node.js (v18 or higher) from https://nodejs.org/
echo.
pause
exit /b 1

:npm_failed
echo [ERROR] npm install failed!
pause
exit /b 1
