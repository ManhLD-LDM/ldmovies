@echo off
setlocal EnableDelayedExpansion
title LDMovies Launcher
color 0A

echo.
echo  ============================================================
echo   LDMovies - Production Launcher
echo   Khoi dong Backend (Production) + Cloudflare Tunnel
echo  ============================================================
echo.

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%frontend"
set "DIST_DIR=%FRONTEND_DIR%\dist"

:: ─── Kiem tra Node.js ───────────────────────────────────────────────────────
echo  [Kiem tra] Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  [LOI] Chua cai Node.js!
    echo  Tai tai: https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER%

:: ─── Kiem tra file .env cua Backend ─────────────────────────────────────────
echo  [Kiem tra] File .env cua backend...
if not exist "%BACKEND_DIR%\.env" (
    color 0E
    echo  [CANH BAO] Chua co file .env trong backend!
    echo  Dang copy tu .env.example...
    copy "%BACKEND_DIR%\.env.example" "%BACKEND_DIR%\.env" >nul
    echo  [OK] Da tao file backend\.env
    echo.
    echo  *** QUAN TRONG: Mo file backend\.env va dien MONGODB_URI! ***
    echo.
    pause
    color 0A
) else (
    echo  [OK] File .env da ton tai
)

:: ─── Kiem tra Backend node_modules ──────────────────────────────────────────
echo  [Kiem tra] Backend dependencies...
if not exist "%BACKEND_DIR%\node_modules" (
    echo  [INSTALL] Dang cai packages cho backend...
    cd /d "%BACKEND_DIR%"
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo  [LOI] npm install that bai o backend!
        pause
        exit /b 1
    )
    echo  [OK] Backend packages da cai xong!
) else (
    echo  [OK] Backend node_modules da ton tai
)

:: ─── Kiem tra Frontend node_modules ─────────────────────────────────────────
echo  [Kiem tra] Frontend dependencies...
if not exist "%FRONTEND_DIR%\node_modules" (
    echo  [INSTALL] Dang cai packages cho frontend...
    cd /d "%FRONTEND_DIR%"
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo  [LOI] npm install that bai o frontend!
        pause
        exit /b 1
    )
    echo  [OK] Frontend packages da cai xong!
) else (
    echo  [OK] Frontend node_modules da ton tai
)

:: ─── Build Frontend neu chua co dist ─────────────────────────────────────────
echo  [Kiem tra] Frontend production build...
if not exist "%DIST_DIR%\index.html" (
    color 0E
    echo  [BUILD] Chua co production build. Dang build frontend...
    echo  (Qua trinh nay co the mat 1-2 phut, vui long cho...)
    color 0A
    cd /d "%FRONTEND_DIR%"
    call npm run build
    if %errorlevel% neq 0 (
        color 0C
        echo  [LOI] Frontend build that bai!
        pause
        exit /b 1
    )
    echo  [OK] Frontend build thanh cong!
) else (
    echo  [OK] Production build da san sang (%DIST_DIR%)
)

:: ─── Khoi dong Backend (Production Mode) ─────────────────────────────────────
echo.
echo  [1/2] Dang khoi dong Backend Server (port 5000, mode: production)...
echo        Frontend duoc host qua Backend (khong can Vite Dev Server)

start "LDMovies Backend :5000" /d "%BACKEND_DIR%" cmd /k "color 0B && set NODE_ENV=production && node server.js"

:: Cho backend khoi dong truoc
timeout /t 4 >nul 2>nul

:: ─── Cloudflare Tunnel (neu co cau hinh) ─────────────────────────────────────
if exist "%FRONTEND_DIR%\config.yml" (
    echo  [2/2] Dang khoi dong Cloudflare Tunnel...
    timeout /t 2 >nul 2>nul
    start "LDMovies Cloudflare" /d "%FRONTEND_DIR%" cmd /k "color 06 && "%ROOT%cloudflared.exe" tunnel --config config.yml run"
) else (
    echo  [2/2] Cloudflare Tunnel: Khong co config.yml, bo qua.
)

:: ─── Hoan tat ─────────────────────────────────────────────────────────────────
echo.
echo  ============================================================
echo   [PRODUCTION MODE] Tat ca dich vu da duoc khoi dong!
echo  ============================================================
echo.
echo   Backend API + Frontend  : http://localhost:5000
if exist "%FRONTEND_DIR%\config.yml" (
    echo   Public URL              : https://ldmovies.mydrpet.io.vn
)
echo.
echo   [!] De cap nhat noi dung trang web, ban can:
echo       1. Chinh sua code trong frontend/src/
echo       2. Chay: cd frontend ^&^& npm run build
echo       3. Khoi dong lai Backend de ap dung thay doi
echo.
echo   Moi dich vu chay trong cua so rieng.
echo   Nhan phim bat ky de dong cua so nay...
echo  ============================================================
pause >nul
