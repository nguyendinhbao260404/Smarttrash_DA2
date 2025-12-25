@echo off
echo ====================================
echo  Quick Test - No Docker
echo ====================================
echo.
echo Chay frontend truc tiep de test
echo (Không can backend/database)
echo.

cd doan2-frontend

echo [INFO] Cai dependencies...
call npm install

echo.
echo [INFO] Chay dev server...
echo.
start cmd /k "npm run dev"

timeout /t 5

echo.
echo ====================================
echo Frontend dang chay tai:
echo http://localhost:5173
echo.
echo Luu y: Backend chua chay nen:
echo - Login se loi
echo - NHỌ XEM MENU có MapView/AI chưa!
echo ====================================
echo.

timeout /t 3
start http://localhost:5173

pause
