@echo off
echo ====================================
echo   Antrian Labkesprov Kalsel
echo   Kiosk Mode - Electron
echo ====================================
echo.

cd /d "%~dp0"

echo [1/4] Installing dependencies (root + electron)...
call npm install
cd electron
call npm install
cd ..

echo.
echo [2/4] Building client assets...
call npm run build

echo.
echo [3/4] Starting production server (port 3080)...
start "antrian-server" cmd /k "npm start"

echo [4/4] Waiting for server, then launching kiosk window...
call npx wait-on http://localhost:3080
cd electron
start "" "node_modules\.bin\electron.cmd" .
cd ..

echo.
echo Kiosk started. Close this window or press Ctrl+C to stop everything.
echo (Tutup juga window "antrian-server" untuk stop server.)
pause
