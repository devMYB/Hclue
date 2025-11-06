@echo off
SETLOCAL ENABLEDELAYEDEXPANSION

echo ========================================
echo    IdeaFlow Application with ngrok
echo ========================================
echo.

REM Check if ngrok is available
ngrok version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: ngrok is not installed or not in PATH
    echo Please install ngrok from https://ngrok.com/
    pause
    exit /b 1
)

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://python.org/
    pause
    exit /b 1
)

echo Starting IdeaFlow Application...
echo.

REM Start Backend Server
echo [1/3] Starting Backend Server...
start "IdeaFlow Backend" cmd /c "python api_server.py"
echo    Backend starting on http://localhost:8000
timeout /t 3 >nul

REM Start Frontend Server
echo [2/3] Starting Frontend Server...
cd ideaflow-react
start "IdeaFlow Frontend" cmd /c "npm run dev"
cd ..
echo    Frontend starting on http://localhost:5173
timeout /t 5 >nul

REM Start ngrok Tunnel
echo [3/3] Starting ngrok Tunnel...
start "IdeaFlow ngrok" cmd /c "ngrok http 5173"
echo    ngrok tunnel starting...
timeout /t 3 >nul

echo.
echo ========================================
echo    Application Started Successfully!
echo ========================================
echo.
echo Local Access:
echo    Frontend: http://localhost:5173
echo    Backend:  http://localhost:8000
echo.
echo Public Access:
echo    Check the ngrok window for your public URL
echo    (e.g., https://abc123.ngrok-free.dev)
echo.
echo Demo Accounts:
echo    Facilitator: username=facilitator, password=password123
echo    Participant:  username=participant, password=password123
echo.
echo Press any key to close this window...
pause >nul
