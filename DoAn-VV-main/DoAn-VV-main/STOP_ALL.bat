@echo off
echo Dang dung he thong...

taskkill /FI "WindowTitle eq Spring Boot Backend*" /F >nul 2>&1
taskkill /FI "WindowTitle eq AI Service*" /F >nul 2>&1
taskkill /FI "WindowTitle eq Frontend*" /F >nul 2>&1

echo He thong da dung!
timeout /t 2 /nobreak >nul
