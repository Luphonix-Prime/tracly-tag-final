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
echo [1/S] Start Application (Docker Compose Up)
echo [2/D] Stop Application (Docker Compose Down)
echo [3/P] Check Container Status (Docker Compose PS)
echo [4/L] View Container Logs (Docker Compose Logs)
echo.
echo [5/A] Run SecOps: Audit Package Vulnerabilities (pnpm audit)
echo [6/C] Run SecOps: Scan for Exposed Secrets ^& Git Checks
echo [7/V] Run SecOps: Validate Codebase (Typecheck ^& Build)
echo [8/K] Run SecOps: Check Kubernetes Nodes ^& Load Balancing
echo.
echo [9/B] Database Management (Push/Seed/Studio)
echo [10/R] Deep Clean Environment (Purge Volumes ^& Reinstall)
echo [11/H] Docker Hub Management (Login/Build/Push)
echo [12/J] Jenkins ^& Docker Desktop Integration
echo [0/X] Exit
echo =========================================================
set /p choice="Select an option (0-12 or shortcut): "

if "%choice%"=="1" goto START_APP
if /i "%choice%"=="s" goto START_APP
if "%choice%"=="2" goto STOP_APP
if /i "%choice%"=="d" goto STOP_APP
if "%choice%"=="3" goto STATUS_APP
if /i "%choice%"=="p" goto STATUS_APP
if "%choice%"=="4" goto LOGS_APP
if /i "%choice%"=="l" goto LOGS_APP
if "%choice%"=="5" goto SEC_AUDIT
if /i "%choice%"=="a" goto SEC_AUDIT
if "%choice%"=="6" goto SEC_CHECK
if /i "%choice%"=="c" goto SEC_CHECK
if "%choice%"=="7" goto SEC_STATIC
if /i "%choice%"=="v" goto SEC_STATIC
if "%choice%"=="8" goto SEC_K8S
if /i "%choice%"=="k" goto SEC_K8S
if "%choice%"=="9" goto DB_MENU
if /i "%choice%"=="b" goto DB_MENU
if "%choice%"=="10" goto DEEP_CLEAN
if /i "%choice%"=="r" goto DEEP_CLEAN
if "%choice%"=="11" goto DOCKER_HUB_MENU
if /i "%choice%"=="h" goto DOCKER_HUB_MENU
if "%choice%"=="12" goto JENKINS_MENU
if /i "%choice%"=="j" goto JENKINS_MENU
if "%choice%"=="0" goto EXIT
if /i "%choice%"=="x" goto EXIT
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

:SEC_K8S
echo.
echo =========================================================
echo       KUBERNETES NODES ^& LOAD BALANCING AUDIT
echo =========================================================

:: 1. Search for kubectl.exe in system PATH or local tools
where kubectl >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] kubectl was not found on your system PATH.
    echo Please install kubectl or make sure it is in your system PATH.
    goto K8S_FILE_SCAN
)

:: 2. Check cluster connection
echo Checking active Kubernetes cluster context...
for /f "delims=" %%i in ('kubectl config current-context 2^>^&1') do set "k8s_context=%%i"
if "!k8s_context!"=="" (
    echo [ERROR] No active Kubernetes context found or cluster is unreachable.
    goto K8S_FILE_SCAN
)
echo !k8s_context! | findstr /i "error Error refused Unable" >nul 2>&1
if %errorlevel% equ 0 (
    echo [ERROR] Failed to retrieve Kubernetes context: !k8s_context!
    goto K8S_FILE_SCAN
)
echo   Active Context: !k8s_context!

:: 3. List Nodes
echo.
echo --- Kubernetes Nodes ---
kubectl get nodes --request-timeout=5s
if %errorlevel% neq 0 (
    echo [WARNING] Failed to fetch Kubernetes nodes. Cluster might be unreachable.
)

:: 4. List Load Balancing Resources
echo.
echo --- Kubernetes Services ^(LoadBalancer^) ---
kubectl get svc -A --field-selector spec.type=LoadBalancer --request-timeout=5s
if %errorlevel% neq 0 (
    echo Falling back to searching all services for LoadBalancer...
    kubectl get svc -A --request-timeout=5s | findstr /i "LoadBalancer"
    if !errorlevel! neq 0 (
        echo No services of type LoadBalancer found.
    )
)

:K8S_FILE_SCAN
:: 5. Search workspace for local Kubernetes configurations / manifests & Load Balancers configs
echo.
echo --- Local Configuration Discovery ---
if not exist "devsecops-audit\temp" mkdir "devsecops-audit\temp"

powershell -NoProfile -Command ^
    "$k8sFiles = @();" ^
    "Get-ChildItem -Path '%~dp0' -Filter '*.yaml' -Recurse -ErrorAction SilentlyContinue | " ^
    "  Where-Object { $_.FullName -notmatch 'node_modules^|.git^|dist^|temp^|reports' } | " ^
    "  ForEach-Object {" ^
    "    $content = Get-Content $_.FullName -ErrorAction SilentlyContinue;" ^
    "    if ($content -match 'apiVersion:\\s+apps^|apiVersion:\\s+v1^|kind:\\s+Service') {" ^
    "       $k8sFiles += $_.Name;" ^
    "    }" ^
    "  };" ^
    "if ($k8sFiles.Count -gt 0) { Write-Output ($k8sFiles -join ',') } else { Write-Output 'NONE' }" > "devsecops-audit\temp\k8s_files_check.txt"

set /p k8s_found=<"devsecops-audit\temp\k8s_files_check.txt"
del "devsecops-audit\temp\k8s_files_check.txt" >nul 2>&1

if not "%k8s_found%"=="NONE" (
    echo   [OK] Found Kubernetes configurations in workspace: %k8s_found%
) else (
    echo   [INFO] No local Kubernetes manifest files found.
)

powershell -NoProfile -Command ^
    "$proxyFiles = @();" ^
    "Get-ChildItem -Path '%~dp0' -Filter '*traefik*' -Recurse -ErrorAction SilentlyContinue | " ^
    "  Where-Object { $_.FullName -notmatch 'node_modules^|.git^|dist' } | " ^
    "  ForEach-Object { $proxyFiles += $_.Name };" ^
    "Get-ChildItem -Path '%~dp0' -Filter '*nginx*' -Recurse -ErrorAction SilentlyContinue | " ^
    "  Where-Object { $_.FullName -notmatch 'node_modules^|.git^|dist' } | " ^
    "  ForEach-Object { $proxyFiles += $_.Name };" ^
    "if ($proxyFiles.Count -gt 0) { Write-Output ($proxyFiles -join ',') } else { Write-Output 'NONE' }" > "devsecops-audit\temp\proxy_files_check.txt"

set /p proxy_found=<"devsecops-audit\temp\proxy_files_check.txt"
del "devsecops-audit\temp\proxy_files_check.txt" >nul 2>&1

if not "%proxy_found%"=="NONE" (
    echo   [OK] Found reverse proxy/load balancing files in workspace: %proxy_found%
) else (
    echo   [INFO] No local load balancer or reverse proxy configurations (nginx/traefik) found.
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

:DOCKER_HUB_MENU
cls
echo =========================================================
echo                     DOCKER HUB OPERATIONS
echo =========================================================
echo [1/L] Docker Login (docker login)
echo [2/B] Build Production Image (docker build)
echo [3/P] Push Production Image (docker push)
echo [4/A] Build and Push (All-in-one)
echo [5/M] Return to Main Menu
echo =========================================================
set /p dh_choice="Select an option (1-5 or shortcut): "

if "%dh_choice%"=="1" goto DH_LOGIN
if /i "%dh_choice%"=="l" goto DH_LOGIN
if "%dh_choice%"=="2" goto DH_BUILD
if /i "%dh_choice%"=="b" goto DH_BUILD
if "%dh_choice%"=="3" goto DH_PUSH
if /i "%dh_choice%"=="p" goto DH_PUSH
if "%dh_choice%"=="4" goto DH_ALL
if /i "%dh_choice%"=="a" goto DH_ALL
if "%dh_choice%"=="5" goto MENU
if /i "%dh_choice%"=="m" goto MENU
echo Invalid choice. Please try again.
pause
goto DOCKER_HUB_MENU

:DH_LOGIN
echo.
echo Please log in to Docker Hub...
docker login
pause
goto DOCKER_HUB_MENU

:DH_BUILD
call :GET_DOCKER_DETAILS
echo.
echo Building production image !FULL_IMAGE_NAME!...
docker build --target runner -t !FULL_IMAGE_NAME! .
if !errorlevel! equ 0 (
    echo.
    echo Image built successfully: !FULL_IMAGE_NAME!
) else (
    echo.
    echo Error: Failed to build image.
)
pause
goto DOCKER_HUB_MENU

:DH_PUSH
call :GET_DOCKER_DETAILS
echo.
echo Pushing image !FULL_IMAGE_NAME! to Docker Hub...
docker push !FULL_IMAGE_NAME!
if !errorlevel! equ 0 (
    echo.
    echo Image pushed successfully: !FULL_IMAGE_NAME!
) else (
    echo.
    echo Error: Failed to push image. Ensure you are logged in (Option 1).
)
pause
goto DOCKER_HUB_MENU

:DH_ALL
call :GET_DOCKER_DETAILS
echo.
echo 1. Building production image !FULL_IMAGE_NAME!...
docker build --target runner -t !FULL_IMAGE_NAME! .
if !errorlevel! equ 0 (
    echo.
    echo 2. Pushing image !FULL_IMAGE_NAME! to Docker Hub...
    docker push !FULL_IMAGE_NAME!
    if !errorlevel! equ 0 (
        echo.
        echo Success: Image built and pushed successfully!
    ) else (
        echo.
        echo Error: Failed to push image. Ensure you are logged in (Option 1).
    )
) else (
    echo.
    echo Error: Failed to build image.
)
pause
goto DOCKER_HUB_MENU
echo Invalid choice. Please try again.
pause
goto DOCKER_HUB_MENU

:GET_DOCKER_DETAILS
echo.
set /p DOCKER_USER="Enter Docker Hub Username: "
if "!DOCKER_USER!"=="" (
    echo Username cannot be empty.
    pause
    goto GET_DOCKER_DETAILS
)
set /p IMAGE_NAME="Enter Image Name [tracly-tag-final]: "
if "!IMAGE_NAME!"=="" (
    set IMAGE_NAME=tracly-tag-final
)
set /p IMAGE_TAG="Enter Image Tag [latest]: "
if "!IMAGE_TAG!"=="" (
    set IMAGE_TAG=latest
)
set FULL_IMAGE_NAME=!DOCKER_USER!/!IMAGE_NAME!:!IMAGE_TAG!
goto :EOF

:JENKINS_MENU
cls
echo =========================================================
echo            JENKINS ^& DOCKER DESKTOP INTEGRATION
echo =========================================================
echo [1/L] Local DevSecOps Loop (Build, Scan ^& Publish)
echo [2/A] Provision Jenkins Inbound Agent (Docker-in-Docker)
echo [3/C] Spin up local Jenkins Controller
echo [4/S] Run Jenkinsfile ^& Docker Registry Security Auditor
echo [5/K] Test Jenkins CLI connection (jenkins-cli.jar)
echo [6/M] Return to Main Menu
echo =========================================================
set /p j_choice="Select an option (1-6 or shortcut): "

if "%j_choice%"=="1" goto JK_BUILD_SCAN_PUSH
if /i "%j_choice%"=="l" goto JK_BUILD_SCAN_PUSH
if "%j_choice%"=="2" goto JK_AGENT
if /i "%j_choice%"=="a" goto JK_AGENT
if "%j_choice%"=="3" goto JK_CONTROLLER
if /i "%j_choice%"=="c" goto JK_CONTROLLER
if "%j_choice%"=="4" goto JK_AUDIT
if /i "%j_choice%"=="s" goto JK_AUDIT
if "%j_choice%"=="5" goto JK_CLI
if /i "%j_choice%"=="k" goto JK_CLI
if "%j_choice%"=="6" goto MENU
if /i "%j_choice%"=="m" goto MENU
echo Invalid choice. Please try again.
pause
goto JENKINS_MENU

:JK_BUILD_SCAN_PUSH
call "%~dp0devsecops-audit\jenkins-docker\build-scan-publish.bat"
goto JENKINS_MENU

:JK_AGENT
call "%~dp0devsecops-audit\jenkins-docker\jenkins-agent.bat"
goto JENKINS_MENU

:JK_CONTROLLER
call "%~dp0devsecops-audit\jenkins-docker\jenkins-controller.bat"
goto JENKINS_MENU

:JK_AUDIT
call "%~dp0devsecops-audit\jenkins-docker\audit-jenkins-docker.bat"
goto JENKINS_MENU

:JK_CLI
call "%~dp0devsecops-audit\jenkins-docker\jenkins-cli-helper.bat"
goto JENKINS_MENU

:EXIT
echo Exiting CLI...
exit /b 0
