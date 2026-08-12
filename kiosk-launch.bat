@echo off
echo ====================================
echo   Antrian Labkesprov Kalsel
echo   Kiosk Mode - Electron
echo ====================================
echo.

cd /d "%~dp0"

echo [1/2] Installing Electron dependencies...
cd electron
call npm install
cd ..

echo [2/2] Starting Kiosk...
cd electron
start "" "node_modules\.bin\electron.cmd" .
cd ..

echo.
echo Kiosk started. Press Ctrl+C to exit.
pause
