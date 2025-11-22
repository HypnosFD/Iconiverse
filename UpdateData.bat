@echo off
REM Update data.json for GitHub Pages deployment
REM This script scans the icons folder and generates data.json in the github folder

echo ========================================
echo  Updating data.json for GitHub Pages
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Run the build script
echo Running build script...
node scripts\build-static.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo  SUCCESS! data.json has been updated
    echo ========================================
    echo.
    echo The github folder is now ready for deployment
) else (
    echo.
    echo ========================================
    echo  ERROR: Build failed
    echo ========================================
)

echo.
pause
