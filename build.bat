@echo off
setlocal

title Family Tree Builder - Build Windows Installer

echo ===================================================
echo Building Family Tree Builder Windows Installer...
echo ===================================================

echo [1/3] Installing dependencies...
call npm install --legacy-peer-deps
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)

echo [2/3] Bundling Vite frontend...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Vite build failed.
    pause
    exit /b 1
)

echo [3/3] Packaging Windows installer (.exe)...
call npx electron-builder --win --x64
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Electron packaging failed.
    pause
    exit /b 1
)

echo.
echo ===================================================
echo SUCCESS! Setup installer is ready in:
echo   %CD%\dist_electron\
echo ===================================================
echo.
pause
