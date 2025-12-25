@echo off
echo ====================================
echo  Docker Debug Build
echo ====================================
echo.
echo Script nay se build va xem logs
echo de tim ra van de
echo.

cd /d "%~dp0"

echo [1/3] Dung containers...
docker compose down

echo.
echo [2/3] Build frontend voi logs...
docker compose build --no-cache frontend 2>&1 | findstr /C:"Checking" /C:"Error" /C:"WARNING"

echo.
echo [3/3] Kiem tra image...
docker run --rm smart-trash-wifi-frontend ls -la /usr/share/nginx/html

echo.
pause
