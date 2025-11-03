@echo off
cd /d "%~dp0"

echo Starting Sketchpad...
start /min cmd /c "npm run dev"

REM Wait a few seconds for Vite to spin up
timeout /t 3 >nul

REM Open Sketchpad in your default browser
start "" "http://localhost:5173/"

exit
