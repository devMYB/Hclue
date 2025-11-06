@echo off
echo Starting IdeaFlow Server...
echo.

echo Starting Backend Server (Port 8000)...
start "IdeaFlow Backend" cmd /k "python api_server.py"

echo Waiting 3 seconds...
timeout /t 3 /nobreak > nul

echo Starting Frontend Server (Port 5000)...
start "IdeaFlow Frontend" cmd /k "cd ideaflow-react && npm run dev"

echo.
echo ✅ IdeaFlow Server Started!
echo.
echo 🌐 Access your application:
echo    Local: http://localhost:5000
echo    Network: http://90.0.0.3:5002
echo    Internet: http://173.64.31.20:5002
echo.
echo 📱 Share this URL with others:
echo    http://173.64.31.20:5002
echo.
echo Press any key to close this window...
pause > nul
