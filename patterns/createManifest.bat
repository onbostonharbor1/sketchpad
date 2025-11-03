@echo off
setlocal enabledelayedexpansion

:: Initialize registry
echo [ > "directoryRegistry.json"
set "firstEntry=true"

:: Loop through subdirectories
for /d %%D in (*) do (
    set "dirName=%%~nxD"
    if /I not "!dirName!"=="images" (
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

        for %%F in ("%%D\*.js") do (
            set "fileName=%%~nF"
            set "filePath=%%D\%%~nxF"
            set "filePath=!filePath:\=/!"  :: Convert backslashes to slashes

            if "!firstFile!"=="true" (
                echo   { "filename": "!fileName!", "path": "!filePath!" } >> "!manifestFile!"
                set "firstFile=false"
            ) else (
                echo , { "filename": "!fileName!", "path": "!filePath!" } >> "!manifestFile!"
            )

            :: Ensure images directory exists
            if not exist "%%D\images" (
                mkdir "%%D\images"
            )

            :: Check if thumbnail exists
            set "thumbPath=%%D\images\thumb_!fileName!.png"
            if not exist "!thumbPath!" (
                copy "thumb.png" "!thumbPath!" >nul
                echo Created fallback thumbnail for !fileName!
            ) else (
                echo Thumbnail already exists for !fileName!
            )
        )
        echo ] >> "!manifestFile!"
    )
)

:: Finalize registry
echo ] >> "directoryRegistry.json"
echo.
echo Manifests and thumbnails processed. Press any key to exit.
pause
