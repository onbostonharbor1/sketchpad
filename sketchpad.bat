@echo off
cd /d "%~dp0"
echo Starting Sketchpad Maintenance...
node ./node/maintain_manifests.mjs
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo !!! CRITICAL ERROR DETECTED IN MANIFEST SCRIPT !!!
    pause
    exit /b %ERRORLEVEL%
)
npm run start:sketchpad
pause
