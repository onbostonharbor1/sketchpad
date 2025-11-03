@echo off
setlocal enabledelayedexpansion

:: Initialize registry
echo [ > "directoryRegistry.json"
set "firstEntry=true"

:: Loop through subdirectories
for /d %%D in (*) do (
    set "dirName=%%~nxD"

    if "!firstEntry!"=="true" (
        echo   "!dirName!" >> "directoryRegistry.json"
        set "firstEntry=false"
    ) else (
        echo , "!dirName!" >> "directoryRegistry.json"
    )

    :: Create manifest.json for each subdirectory
    set "manifestFile=%%D\manifest.json"
    echo [ > "!manifestFile!"
    set "firstFile=true"

    for %%F in ("%%D\*.jpg" "%%D\*.png" "%%D\*.gif" "%%D\*.webp") do (
        set "fileName=%%~nF"
        set "filePath=%%D/%%~nxF"  :: Use forward slashes for web paths

        if "!firstFile!"=="true" (
            echo   { "filename": "!fileName!", "path": "!filePath!" } >> "!manifestFile!"
            set "firstFile=false"
        ) else (
            echo , { "filename": "!fileName!", "path": "!filePath!" } >> "!manifestFile!"
        )
    )
    echo ] >> "!manifestFile!"
)

:: Finalize registry
echo ] >> "directoryRegistry.json"
echo.
echo Gallery manifests processed (supports .jpg, .png, .gif, .webp).
pause
