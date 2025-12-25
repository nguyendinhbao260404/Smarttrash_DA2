@echo off
echo ====================================
echo  Docker Start with Google Maps
echo ====================================
echo.

REM Check Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker chua duoc cai dat!
    pause
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Desktop chua chay!
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo [WARNING] File .env chua ton tai!
    echo Tao file .env tu template...
    copy .env.example .env
    echo.
    echo QUAN TRONG: Sua file .env va them Google Maps API key!
    echo Sau do chay lai script nay.
    pause
    exit /b 1
)

cd /d "%~dp0"

echo [1/3] Building images...
docker compose build --no-cache

echo.
echo [2/3] Starting containers...
docker compose up -d

echo.
echo [3/3] Waiting for services...
timeout /t 15 /nobreak >nul

echo.
echo ====================================
echo  HE THONG DANG CHAY!
echo ====================================
echo.
echo Web App:     http://localhost
echo Backend API: http://localhost:8080
echo AI Service:  http://localhost:8000/docs
echo.
echo Login: admin / admin123
echo.
echo Features:
echo - Tong quan
echo - Quan ly MQTT
echo - Du lieu Cam bien
echo - Ban do Thung rac (Google Maps)
echo - AI Dashboard
echo.

timeout /t 5
start http://localhost

pause
