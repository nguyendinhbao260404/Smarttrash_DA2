@echo off
echo ====================================
echo  AI Features Test (No Login)
echo ====================================
echo.
echo Luu y: Script nay chi test AI features
echo Khong can login, dung MOCK data
echo.

cd ai-service
if not exist "venv" (
    echo Tao virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat
pip install -q -r requirements.txt
cd ..

echo [1/2] Khoi dong AI Service...
start "AI Service" cmd /k "cd ai-service && venv\Scripts\activate.bat && python main.py"

timeout /t 3 /nobreak >nul

echo [2/2] Mo AI API Docs...
timeout /t 2 /nobreak >nul

start http://localhost:8000/docs

echo.
echo ====================================
echo  AI Service dang chay!
echo ====================================
echo.
echo Test API tai: http://localhost:8000/docs
echo.
echo Nhan Ctrl+C trong terminal "AI Service" de dung
pause
