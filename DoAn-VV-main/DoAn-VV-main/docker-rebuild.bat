@echo off
echo ====================================
echo  COMPLETE DOCKER CLEANUP + REBUILD
echo ====================================
echo.
echo CANH BAO: Script nay se:
echo - XOA TAT CA Docker containers
echo - XOA TAT CA Docker images
echo - XOA TAT CA Docker cache
echo - Rebuild HOAN TOAN tu dau
echo.
echo Thoi gian: ~10-15 phut
echo.

pause

cd /d "%~dp0"

echo.
echo [1/6] Stopping all containers...
docker compose down -v

echo.
echo [2/6] Removing old images...
docker rmi smart-trash-wifi-frontend smart-trash-wifi-backend smart-trash-wifi-ai-service 2>nul

echo.
echo [3/6] Cleaning Docker system...
docker system prune -af --volumes

echo.
echo [4/6] Building images (NO CACHE)...
docker compose build --no-cache --pull

echo.
echo [5/6] Starting containers...
docker compose up -d

echo.
echo [6/6] Waiting for services...
timeout /t 20 /nobreak >nul

echo.
echo ====================================
echo  REBUILD HOAN TAT!
echo ====================================
echo.
echo Test ngay:
echo 1. Vao: http://localhost
echo 2. Login: admin / admin123
echo 3. Kiem tra menu - PHAI CO 5 nut:
echo    - Tong quan
echo    - Quan ly MQTT
echo    - Du lieu Cam bien
echo    - Ban do Thung rac  (MOI!)
echo    - AI Dashboard       (MOI!)
echo.

timeout /t 5
start http://localhost

echo.
echo Neu van chi co 4 nut:
echo -> Chay quick-test-frontend.bat de confirm code dung
echo -> Bao toi de debug them
echo.
pause
