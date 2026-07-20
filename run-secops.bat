@echo off
setlocal enabledelayedexpansion
title Tracly-Tag DevOps ^& SecOps Command Utility

:: Ensure the script runs in the directory where it is located
cd /d "%~dp0"

:MENU
cls
echo =========================================================
echo         TRACLY-TAG DEVOPS ^& SECOPS MANAGEMENT CLI
echo =========================================================
echo [1] Start Application (Docker Compose Up)
echo [2] Stop Application (Docker Compose Down)
echo [3] Check Container Status (Docker Compose PS)
echo [4] View Container Logs (Docker Compose Logs)
echo.
echo [5] Run SecOps: Audit Package Vulnerabilities (pnpm audit)
echo [6] Run SecOps: Scan for Exposed Secrets ^& Git Checks
echo [7] Run SecOps: Validate Codebase (Typecheck ^& Build)
echo.
echo [8] Database Management (Push/Seed/Studio)
echo [9] Deep Clean Environment (Purge Volumes ^& Reinstall)
echo [0] Exit
echo =========================================================
set /p choice="Select an option (0-9): "

if "%choice%"=="1" goto START_APP
if "%choice%"=="2" goto STOP_APP
if "%choice%"=="3" goto STATUS_APP
if "%choice%"=="4" goto LOGS_APP
if "%choice%"=="5" goto SEC_AUDIT
if "%choice%"=="6" goto SEC_CHECK
if "%choice%"=="7" goto SEC_STATIC
if "%choice%"=="8" goto DB_MENU
if "%choice%"=="9" goto DEEP_CLEAN
if "%choice%"=="0" goto EXIT
echo Invalid choice. Please try again.
pause
goto MENU

:START_APP
echo.
echo --- STARTING SERVICES ---
set /p build="Do you want to force rebuild container images? (y/n) [n]: "
if /i "%build%"=="y" (
    echo Building and starting services...
    docker compose up -d --build
) else (
    echo Starting services...
    docker compose up -d
)
if %errorlevel% equ 0 (
    echo.
    echo Services launched successfully!
    echo Backend API is available at: http://localhost:3000
    echo Frontend Client is available at: http://localhost:5173
) else (
    echo Error starting services. Please check Docker logs.
)
pause
goto MENU

:STOP_APP
echo.
echo --- STOPPING SERVICES ---
docker compose down --remove-orphans
pause
goto MENU

:STATUS_APP
echo.
echo --- SERVICE STATUS ---
docker compose ps
pause
goto MENU

:LOGS_APP
echo.
echo --- LOGS VIEWER ---
set /p follow="Do you want to follow (tail -f) the logs? (y/n) [n]: "
if /i "%follow%"=="y" (
    docker compose logs -f --tail=100
) else (
    docker compose logs --tail=100
)
pause
goto MENU

:SEC_AUDIT
echo.
echo --- AUDITING DEPENDENCIES ---
call pnpm audit
pause
goto MENU

:SEC_CHECK
echo.
echo --- SECURITY SCANNING ^& GIT CHECKS ---
set sec_fail=0

:: Check 1: Verify .env exists
if not exist .env (
    echo [WARNING] No local .env file found. Please create one from .env.example.
    set sec_fail=1
) else (
    echo [OK] Local .env file exists.
)

:: Check 2: Verify .env is NOT tracked in Git repository
git ls-files --error-unmatch .env >nul 2>&1
if %errorlevel% equ 0 (
    echo [CRITICAL ERROR] The .env file is actively tracked by Git!
    echo Remove it from tracking: "git rm --cached .env" to prevent leaking secrets.
    set sec_fail=1
) else (
    echo [OK] .env file is not tracked in Git history.
)

:: Check 3: Verify .env is listed in .gitignore
git check-ignore .env >nul 2>&1
if %errorlevel% equ 1 (
    echo [WARNING] .env is not currently ignored by .gitignore!
    echo Add ".env" to your .gitignore file to prevent accidental commits.
    set sec_fail=1
) else (
    echo [OK] .env file is properly ignored by gitignore rules.
)

:: Check 4: Scan .env for placeholder values
if exist .env (
    findstr /C:"your-luphonix" .env >nul 2>&1
    if !errorlevel! equ 0 (
        echo [WARNING] Default placeholder emails/tokens detected in .env! Please update credentials.
        set sec_fail=1
    ) else (
        echo [OK] No default placeholders detected in .env configuration.
    )
)

if "%sec_fail%"=="0" (
    echo.
    echo SECURE: All basic SecOps workspace checks passed successfully!
) else (
    echo.
    echo ATTENTION REQUIRED: One or more security vulnerabilities/warnings were identified.
)
pause
goto MENU

:SEC_STATIC
echo.
echo --- VALIDATING CODEBASE ---
echo Running typechecks...
call pnpm run typecheck
if %errorlevel% neq 0 (
    echo Typechecking failed! Please fix compiler errors.
    pause
    goto MENU
)
echo.
echo Running production build test...
call pnpm run build
if %errorlevel% neq 0 (
    echo Production build failed!
) else (
    echo Codebase built successfully with zero compiling errors!
)
pause
goto MENU

:DB_MENU
cls
echo =========================================================
echo                     DATABASE MANAGEMENT
echo =========================================================
echo [1] Push Schema Changes (drizzle-kit push)
echo [2] Seed Database (check_db.ts)
echo [3] Open Drizzle Studio (Inspect Database)
echo [4] Return to Main Menu
echo =========================================================
set /p db_choice="Select an option (1-4): "

if "%db_choice%"=="1" (
    echo.
    echo Pushing database schema changes...
    call pnpm --filter @workspace/db run push
    pause
    goto DB_MENU
)
if "%db_choice%"=="2" (
    echo.
    echo Seeding database...
    call pnpm run db:seed
    pause
    goto DB_MENU
)
if "%db_choice%"=="3" (
    echo.
    echo Starting Drizzle Studio...
    call pnpm run db:studio
    pause
    goto DB_MENU
)
if "%db_choice%"=="4" goto MENU
echo Invalid choice. Please try again.
pause
goto DB_MENU

:DEEP_CLEAN
echo.
echo !!! WARNING !!!
echo This will stop and remove all Docker containers/volumes, recursively delete all 
echo node_modules and build dist directories, and run a fresh package installation.
echo.
set /p confirm="Are you sure you want to perform a deep clean? (y/n) [n]: "
if /i not "%confirm%"=="y" (
    echo Deep clean aborted.
    pause
    goto MENU
)

echo.
echo Stopping services and clearing volumes...
docker compose down -v --remove-orphans

echo.
echo Deleting recursively all node_modules folder structures...
for /d /r . %%d in (node_modules) do @if exist "%%d" (
    echo Deleting %%d
    rmdir /s /q "%%d"
)

echo.
echo Deleting recursively all dist folders...
for /d /r . %%d in (dist) do @if exist "%%d" (
    echo Deleting %%d
    rmdir /s /q "%%d"
)

echo.
echo Deleting typecheck build logs...
del /s /q *.tsbuildinfo >nul 2>&1

echo.
echo Running clean pnpm install...
call pnpm install --no-frozen-lockfile

echo.
echo Deep clean completed successfully!
pause
goto MENU

:EXIT
echo Exiting CLI...
exit /b 0
