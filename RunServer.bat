:: RunServer.bat - SVG Icon Viewer Server Runner
@echo off
:: Set code page for Unicode compatibility
chcp 65001 > nul

TITLE SVG Icon Viewer - Node.js Server

echo ╔═══════════════════════════════════════════╗
echo ║         🚀 SVG Icon Viewer Server         ║
echo ╚═══════════════════════════════════════════╝
echo.
echo    ⏳ Starting Node.js server...
echo    (Browser will open automatically on an available port.)
echo.
echo ---------------------------------------------

:: 1. Execute the Node.js server
node server.js

:: Pause to prevent the console from closing immediately
pause