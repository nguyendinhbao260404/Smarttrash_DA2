@echo off
echo ====================================
echo  Install Google Maps Package
echo ====================================
echo.

cd doan2-frontend

echo [INFO] Installing @react-google-maps/api...
call npm install @react-google-maps/api

if errorlevel 1 (
    echo.
    echo [ERROR] Installation failed!
    pause
    exit /b 1
)

echo.
echo ====================================
echo  Installation complete!
echo ====================================
echo.
echo Next steps:
echo 1. Edit .env file (paste your API key)
echo 2. Run: npm run dev
echo 3. Go to: http://localhost:5173/map
echo.
pause
