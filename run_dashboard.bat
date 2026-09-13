@echo off
title Launch MEVShield Full Application
cd /d "%~dp0"

echo ===================================================
echo     Starting MEVShield Backend & Frontend Demo
echo ===================================================

:: Check Python availability
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not found in your PATH! Please ensure Python 3.9+ is installed.
    pause
    exit /b 1
)

:: Check Node / npm availability
call npm -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node/npm is not found in your PATH! Please ensure Node.js is installed.
    pause
    exit /b 1
)

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
echo   Servers are running in background cmd windows.
echo   Press any key to close this launcher window...
echo ===================================================
echo.
pause >nul
