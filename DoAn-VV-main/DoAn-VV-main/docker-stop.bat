@echo off
echo Dang dung Docker containers...
echo.

cd /d "%~dp0"

docker compose down

echo.
echo Da dung tat ca containers!
timeout /t 2 /nobreak >nul
