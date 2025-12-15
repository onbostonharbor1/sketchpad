@echo off
cd /d "%~dp0"

echo Starting Sketchpad (Draw Only)...
start /min cmd /c "npm run dev"

REM Wait a few seconds for Vite to spin up
timeout /t 3 >nul

REM Open draw-only page
start "" "http://localhost:5173/draw.html"

exit
