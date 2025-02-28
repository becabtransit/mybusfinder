@echo off
echo starting local server...

cd /d "%~dp0"

where python >nul 2>nul
if %errorlevel% equ 0 (
    start "" http://localhost:8000
    python -m http.server 8000
) else (
    where php >nul 2>nul
    if %errorlevel% equ 0 (
        start "" http://localhost:8000
        php -S localhost:8000
    ) else (
        echo Python or php not fuond...
pause
    )
)