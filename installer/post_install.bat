@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
set "PROJ=%~dp0.."
cd /d "%PROJ%"

set "LOG=%PROJ%\install_log.txt"
echo LUMIN post-install %DATE% %TIME% > "%LOG%"

REM --- Python ---
set "BASE_PY="
py -3.12 -c "import sys" >nul 2>&1 && set "BASE_PY=py -3.12"
if not defined BASE_PY py -3.11 -c "import sys" >nul 2>&1 && set "BASE_PY=py -3.11"
if not defined BASE_PY where python >nul 2>&1 && set "BASE_PY=python"

if not defined BASE_PY (
  where winget >nul 2>&1
  if not errorlevel 1 (
    winget install --id Python.Python.3.12 --scope user --override "/passive PrependPath=1" --accept-package-agreements --accept-source-agreements >>"%LOG%" 2>&1
  )
  if exist "%LocalAppData%\Programs\Python\Python312\python.exe" set "BASE_PY=%LocalAppData%\Programs\Python\Python312\python.exe"
)

if not defined BASE_PY (
  echo [ERROR] Python not found >>"%LOG%"
  exit /b 1
)

REM --- venv + pip ---
if not exist "%PROJ%\venv\Scripts\python.exe" (
  %BASE_PY% -m venv "%PROJ%\venv" >>"%LOG%" 2>&1
)
"%PROJ%\venv\Scripts\python.exe" -m pip install --upgrade pip >>"%LOG%" 2>&1
"%PROJ%\venv\Scripts\python.exe" -m pip install -r "%PROJ%\requirements.txt" >>"%LOG%" 2>&1

REM --- Node ---
set "NODE_EXE="
if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"
if not defined NODE_EXE where node >nul 2>&1 && set "NODE_EXE=node"

if not defined NODE_EXE (
  where winget >nul 2>&1
  if not errorlevel 1 winget install --id OpenJS.NodeJS.LTS --scope user --accept-package-agreements --accept-source-agreements >>"%LOG%" 2>&1
)

if not exist "%PROJ%\node_modules" (
  call npm install --prefix "%PROJ%" >>"%LOG%" 2>&1
)

REM --- Ollama ---
set "OLLAMA="
if exist "%LocalAppData%\Programs\Ollama\ollama.exe" set "OLLAMA=%LocalAppData%\Programs\Ollama\ollama.exe"
if not defined OLLAMA where ollama >nul 2>&1 && set "OLLAMA=ollama"

if not defined OLLAMA (
  where winget >nul 2>&1
  if not errorlevel 1 (
    winget install --id Ollama.Ollama --accept-package-agreements --accept-source-agreements >>"%LOG%" 2>&1
  )
  REM fallback: download official installer silently
  if not exist "%LocalAppData%\Programs\Ollama\ollama.exe" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "$u='https://ollama.com/download/OllamaSetup.exe'; $d=$env:TEMP+'\OllamaSetup.exe'; Invoke-WebRequest $u -OutFile $d; Start-Process $d -ArgumentList '/VERYSILENT /NORESTART' -Wait" >>"%LOG%" 2>&1
  )
)

if exist "%LocalAppData%\Programs\Ollama\ollama.exe" (
  start "" /B "%LocalAppData%\Programs\Ollama\ollama.exe" serve
  timeout /t 4 /nobreak >nul
  "%LocalAppData%\Programs\Ollama\ollama.exe" pull llama3.2:3b >>"%LOG%" 2>&1
)

REM --- FFmpeg (download only if missing) ---
if not exist "%PROJ%\bin\ffmpeg\ffmpeg.exe" (
    echo.
    echo [FFmpeg] Not found. Starting download...
    echo [FFmpeg] This can take 1-3 minutes depending on your internet.
    echo.
    mkdir "%PROJ%\bin\ffmpeg" 2>nul

    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "$ProgressPreference='Continue'; Write-Host '[FFmpeg] Downloading...'; $url='https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip'; $zip=$env:TEMP+'\ffmpeg_lumin.zip'; $out=$env:TEMP+'\ffmpeg_lumin'; try { Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing; Write-Host '[FFmpeg] Download finished. Extracting...'; if(Test-Path $out){Remove-Item $out -Recurse -Force}; Expand-Archive $zip -DestinationPath $out -Force; $bin=Get-ChildItem $out -Recurse -Filter ffmpeg.exe | Select-Object -First 1; if($bin){Copy-Item $bin.FullName '%PROJ%\bin\ffmpeg\ffmpeg.exe' -Force; $probe=Join-Path $bin.DirectoryName 'ffprobe.exe'; if(Test-Path $probe){Copy-Item $probe '%PROJ%\bin\ffmpeg\ffprobe.exe' -Force}; Write-Host '[FFmpeg] Installed successfully.' } else { Write-Host '[FFmpeg] ERROR: ffmpeg.exe not found in archive.' }; Remove-Item $zip -Force -ErrorAction SilentlyContinue } catch { Write-Host '[FFmpeg] ERROR:' $_.Exception.Message }"

    echo.
)

echo DONE >>"%LOG%"
exit /b 0