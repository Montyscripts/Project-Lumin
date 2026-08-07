@echo off
set "PROJ_DIR=%~dp0"
if "%PROJ_DIR:~-1%"=="\" set "PROJ_DIR=%PROJ_DIR:~0,-1%"
cd /d "%PROJ_DIR%"

echo ====================================================================
echo                   LUMIN AI Agent - Startup Setup
echo ====================================================================

where node >nul 2>&1
if %errorlevel% neq 0 goto :no_node

if exist "%PROJ_DIR%\node_modules" goto :modules_ok
echo [NOTICE] node_modules missing. Running npm install...
call npm install
if %errorlevel% neq 0 goto :npm_failed

:modules_ok
:: Check if port 5173 is listening
powershell -NoProfile -Command "$c = New-Object System.Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1', 5173); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 goto :already_running

echo [1/2] Launching LUMIN Node.js server...
start "LUMIN Server" /MIN /D "%PROJ_DIR%" cmd /k "node server.js"

echo [2/2] Waiting for server to initialize on http://localhost:5173 ...

set "COUNT=0"
:check_loop
powershell -NoProfile -Command "$c = New-Object System.Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1', 5173); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 goto :server_ready

set /a COUNT+=1
if %COUNT% geq 60 goto :timeout
timeout /t 1 /nobreak >nul
goto :check_loop

:already_running
echo [NOTICE] LUMIN Server is already running on http://localhost:5173
start "" "http://localhost:5173"
exit /b 0

:server_ready
echo Server is ready! Opening LUMIN 3D UI in your browser...
start "" "http://localhost:5173"
timeout /t 2 /nobreak >nul
exit /b 0

:timeout
echo.
echo [ERROR] Server failed to start. Run start_app_debug.bat
pause
exit /b 1

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
