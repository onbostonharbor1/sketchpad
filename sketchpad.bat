@echo off
cd /d "%~dp0"
npm run start:sketchpad
echo.
echo Sketchpad script exited with code %ERRORLEVEL%
pause
