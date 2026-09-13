@echo off
title Launch MEVShield Full Application
cd /d "%~dp0"

echo ===================================================
echo     Starting MEVShield Backend & Frontend Demo
echo ===================================================

echo [1/2] Launching FastAPI Backend on http://localhost:8000 ...
start "MEVShield Backend" cmd /k "cd /d "%~dp0backend" && python main.py"

echo [2/2] Launching React Vite Frontend on http://localhost:5173 ...
start "MEVShield Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 3 /nobreak >nul
echo Opening Dashboard in your browser...
start http://localhost:5173

echo.
echo ===================================================
echo   MEVShield is LIVE!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000
echo ===================================================
echo.
pause
