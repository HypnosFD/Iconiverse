@echo off
REM Setup script for Iconiverse
REM Installs necessary Node.js dependencies

echo ========================================
echo  Iconiverse Setup
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

echo Installing dependencies...
echo.
call npm install express adm-zip open

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo  SUCCESS! Dependencies installed.
    echo ========================================
    echo.
    echo You can now run the server using RunServer.bat
) else (
    echo.
    echo ========================================
    echo  ERROR: Failed to install dependencies
    echo ========================================
)

echo.
pause
