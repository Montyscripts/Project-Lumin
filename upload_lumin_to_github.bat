@echo off
title Upload LUMIN To GitHub
color 0A

echo ==========================================
echo       LUMIN GitHub Upload Tool
echo ==========================================
echo.

cd /d "%~dp0"

echo Working folder:
echo %CD%
echo.

set REPO=https://github.com/Montyscripts/Project-Lumin.git

echo Checking Git...
git --version >nul 2>&1

if errorlevel 1 (
    echo Git is not installed.
    pause
    exit /b
)

echo.

if not exist ".git" (
    echo No Git repository found.
    echo Creating repository connection...
    
    git init
    git branch -M main
    git remote add origin %REPO%
)

echo.
echo Adding all application files...

git add -A

echo.
echo Creating commit...

git commit -m "Update LUMIN application"

echo.
echo Uploading to GitHub...

git push -u origin main --force

echo.
echo ==========================================
echo Upload complete.
echo ==========================================

pause