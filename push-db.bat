@echo off
echo ========================================================
echo        Pushing Database Schema via Drizzle Kit
echo ========================================================
cd /d "%~dp0"
call pnpm --filter @workspace/db run push
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Database push failed!
    pause
    exit /b %errorlevel%
)
echo.
echo [SUCCESS] Database schema pushed successfully.
pause
