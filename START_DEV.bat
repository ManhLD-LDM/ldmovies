@echo off
setlocal EnableDelayedExpansion
title LDMovies DEV Launcher
color 0D

echo.
echo  ============================================================
echo   LDMovies - DEVELOPMENT Launcher
echo   Khoi dong Backend + Vite Dev Server (hot-reload)
echo   Chi dung khi lap trinh, KHONG dung cho production!
echo  ============================================================
echo.

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%frontend"

:: ─── Khoi dong Backend (Dev Mode) ────────────────────────────────────────────
echo  [1/2] Dang khoi dong Backend (port 5000, mode: development)...
start "LDMovies Backend :5000 [DEV]" /d "%BACKEND_DIR%" cmd /k "color 0B && npm run dev"

timeout /t 3 >nul 2>nul

:: ─── Khoi dong Frontend Vite Dev Server ──────────────────────────────────────
echo  [2/2] Dang khoi dong Vite Dev Server (port 3000)...
start "LDMovies Frontend :3000 [DEV]" /d "%FRONTEND_DIR%" cmd /k "color 0D && npm run dev"

echo.
echo  ============================================================
echo   [DEV MODE] Da khoi dong!
echo  ============================================================
echo   Backend API  : http://localhost:5000
echo   Frontend     : http://localhost:3000
echo.
echo   Hot-reload dang hoat dong. Luu file de thay doi ngay.
echo  ============================================================
pause >nul
