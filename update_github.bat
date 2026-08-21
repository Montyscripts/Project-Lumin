@echo off
setlocal EnableExtensions EnableDelayedExpansion

title LUMIN - Safe GitHub Update

REM ============================================================
REM  Use the folder where this .bat file is located
REM ============================================================
cd /d "%~dp0"

echo ============================================================
echo           LUMIN - Safe GitHub Update
echo ============================================================
echo.
echo Project folder: %CD%
echo.

REM Make sure we are inside a real Git repository
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo ERROR: This is not a valid Git repository.
    echo Make sure you are running this from the Project-Lumin folder
    echo that was cloned with "git clone".
    echo.
    pause
    exit /b 1
)

REM ------------------------------------------------------------
REM Only ignore the real helper scripts (never ignore start_*.bat etc.)
REM ------------------------------------------------------------
findstr /i /c:"update_github.bat" .gitignore >nul 2>&1
if errorlevel 1 (
    echo.>> .gitignore
    echo # Local helper scripts - never push these>> .gitignore
    echo update_github.bat>> .gitignore
    echo LUMIN_Git_Recovery_SAFE_v2.bat>> .gitignore
    echo LUMIN_Update_GitHub.bat>> .gitignore
    echo LUMIN_Fresh_GitHub_Uploader.bat>> .gitignore
    echo LUMIN_Fix_Everything_And_Prepare_Upload.bat>> .gitignore
    echo Added helper scripts to .gitignore
    echo.
)

echo Current status:
echo ------------------------------------------------------------
git status --short
echo ------------------------------------------------------------
echo.

REM Check if there is anything to commit
git diff --quiet && git diff --cached --quiet
if not errorlevel 1 (
    echo Nothing to commit. Working tree is clean.
    echo.
    pause
    exit /b 0
)

set /p MSG="Commit message (or press Enter for default): "
if "!MSG!"=="" set "MSG=chore: update project files"

echo.
echo Staging all changes...
git add -A
if errorlevel 1 (
    echo ERROR: git add failed.
    pause
    exit /b 1
)

echo Creating commit...
git commit -m "!MSG!"
if errorlevel 1 (
    echo ERROR: Commit failed.
    pause
    exit /b 1
)

echo.
echo Pushing to GitHub (no force)...
git push origin main
if errorlevel 1 (
    echo.
    echo ============================================================
    echo PUSH FAILED
    echo ============================================================
    echo Your commit is still safe locally.
    echo.
    echo Try these commands:
    echo   git pull --rebase origin main
    echo   git push origin main
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo SUCCESS - Changes pushed to GitHub
echo ============================================================
echo.
pause
exit /b 0