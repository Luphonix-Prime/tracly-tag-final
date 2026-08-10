@echo off
echo ========================================================
echo Killing processes running on port 3000 and port 5173...
echo ========================================================

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 "') do (
    if not "%%a"=="0" (
        echo Killing PID %%a on port 3000...
        taskkill /F /PID %%a >nul 2>&1
    )
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 "') do (
    if not "%%a"=="0" (
        echo Killing PID %%a on port 5173...
        taskkill /F /PID %%a >nul 2>&1
    )
)

echo.
echo Starting both servers...
echo.

start "API Server (Port 3000)" cmd /k "pnpm --filter @workspace/api-server run dev"
start "Frontend App (Port 5173)" cmd /k "pnpm --filter @workspace/traclytag run dev"

echo Done! Both servers are starting in separate windows.
