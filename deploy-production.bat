@echo off
echo 🚀 PillarPayout Production Deployment Script
echo ============================================

echo.
echo 📦 Building Frontend...
cd Step3_Frontend_Development
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Frontend build failed!
    pause
    exit /b 1
)
echo ✅ Frontend built successfully

echo.
echo 🔧 Installing Backend Dependencies...
cd ..\Step2_Backend_Development
call npm install --production
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
echo 🧪 Running Integration Tests...
cd ..
call node test-integration.js
if %errorlevel% neq 0 (
    echo ❌ Integration tests failed!
    echo Please fix the issues before deploying to production.
    pause
    exit /b 1
)
echo ✅ All tests passed

echo.
echo 🐳 Building Docker Images...
docker-compose build
if %errorlevel% neq 0 (
    echo ❌ Docker build failed!
    pause
    exit /b 1
)
echo ✅ Docker images built

echo.
echo 🚀 Starting Production Services...
docker-compose up -d
if %errorlevel% neq 0 (
    echo ❌ Production deployment failed!
    pause
    exit /b 1
)
echo ✅ Production services started

echo.
echo 📊 Checking Service Status...
timeout /t 10 /nobreak >nul
docker-compose ps

echo.
echo 🎉 PillarPayout Production Deployment Complete!
echo.
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend: http://localhost:3001
echo 📊 Admin: http://localhost:3001/admin
echo.
echo 📝 Logs: docker-compose logs -f
echo 🛑 Stop: docker-compose down
echo.
pause 