@echo off
echo ====================================
echo  QUICK START - NO DOCKER
echo ====================================
echo.
echo Chay truc tiep (khong qua Docker)
echo De DAM BAO thay code moi nhat!
echo.

REM Start Backend
start "Spring Boot Backend" cmd /k "cd doan2 && mvnw.cmd spring-boot:run"

REM Start AI Service  
start "AI Service" cmd /k "cd ai-service && python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt && python main.py"

REM Start Frontend
start "Frontend" cmd /k "cd doan2-frontend && npm install && npm run dev"

echo.
echo Doi 30 giay cho services khoi dong...
timeout /t 30

echo.
echo ====================================
echo  SERVICES DANG CHAY!
echo ====================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8080
echo AI:       http://localhost:8000/docs
echo.
echo Login: admin / admin123
echo.
echo PHAI THAY 5 NUT!
echo.

timeout /t 5
start http://localhost:5173

pause
