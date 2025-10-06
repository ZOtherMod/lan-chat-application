@echo off
echo ====================================
echo    LAN Chat Frontend Setup  
echo ====================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo Installing Node.js dependencies...
npm install

if %errorlevel% neq 0 (
    echo ERROR: Failed to install Node.js dependencies
    pause
    exit /b 1
)

echo.
echo Setup complete! Starting development server...
echo.
echo ====================================
echo    Frontend will start now...
echo    Your browser should open automatically
echo ====================================
echo.

npm start

pause