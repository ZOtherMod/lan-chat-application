@echo off
echo ====================================
echo    LAN Chat Server Discovery
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

echo Installing required dependencies...
pip install requests >nul 2>&1

echo.
echo Starting server discovery tool...
echo.

python discover_servers.py

pause