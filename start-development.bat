@echo off
echo 🛠️ PillarPayout Development Environment
echo ======================================

echo.
echo 📦 Installing Frontend Dependencies...
cd Step3_Frontend_Development
call npm install
if %errorlevel% neq 0 (
    echo ❌ Frontend dependency installation failed!
    pause
    exit /b 1
)
echo ✅ Frontend dependencies installed

echo.
echo 🔧 Installing Backend Dependencies...
cd ..\Step2_Backend_Development
call npm install
if %errorlevel% neq 0 (
    echo ❌ Backend dependency installation failed!
    pause
    exit /b 1
)
echo ✅ Backend dependencies installed

echo.
echo 🗄️ Setting up Database...
call node setup-database.js
if %errorlevel% neq 0 (
    echo ❌ Database setup failed!
    pause
    exit /b 1
)
echo ✅ Database setup completed

echo.
echo 🚀 Starting Development Servers...
echo.
echo 📡 Backend Server (Port 3001)...
start "Backend Server" cmd /k "cd Step2_Backend_Development && npm start"

echo.
echo ⏳ Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo 🌐 Frontend Server (Port 3000)...
start "Frontend Server" cmd /k "cd Step3_Frontend_Development && npm start"

echo.
echo 🎉 Development Environment Started!
echo.
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend: http://localhost:3001
echo 📊 Admin: http://localhost:3001/admin
echo.
echo 📝 Backend Logs: Check the "Backend Server" window
echo 📝 Frontend Logs: Check the "Frontend Server" window
echo.
echo 🧪 Run Integration Tests: node test-integration.js
echo.
pause 