@echo off
REM Setup script for Iconiverse
REM Creates folder structure and installs dependencies

echo ========================================
echo  Iconiverse Setup
echo ========================================
echo.

REM 1. Create Folder Structure
echo [1/2] Creating folder structure...

if not exist "icons" (
    mkdir "icons"
    echo    - Created 'icons' folder
)

if not exist "icons\outline" (
    mkdir "icons\outline"
    echo    - Created 'icons\outline' folder
)

if not exist "icons\filled" (
    mkdir "icons\filled"
    echo    - Created 'icons\filled' folder
)

echo    - Folder structure ready.
echo.

REM 2. Install Dependencies
echo [2/2] Installing dependencies...

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

call npm install

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo  SUCCESS! Setup complete.
    echo ========================================
    echo.
    echo You can now add your icons to:
    echo  - icons\outline (for stroked icons)
    echo  - icons\filled  (for solid icons)
    echo.
    echo Then run the server using RunServer.bat
) else (
    echo.
    echo ========================================
    echo  ERROR: Failed to install dependencies
    echo ========================================
)

echo.
pause
