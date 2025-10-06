@echo off
echo ====================================
echo    LAN Chat Server Setup
echo ====================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.7+ from https://python.org
    pause
    exit /b 1
)

echo Installing Python dependencies...
pip install -r requirements.txt

if %errorlevel% neq 0 (
    echo ERROR: Failed to install Python dependencies
    pause
    exit /b 1
)

echo.
echo Setup complete! Starting server...
echo.
echo ====================================
echo    Server will start now...
echo    Press Ctrl+C to stop the server
echo ====================================
echo.

python server.py

pause