@echo off
title LDMovies - Dung tat ca dich vu
color 0C

echo.
echo  ============================================================
echo   LDMovies - Dung tat ca dich vu
echo  ============================================================
echo.

:: ─── Hoi xac nhan ─────────────────────────────────────────────────────────
set /p CONFIRM= Ban co chac muon dung tat ca server? (Y/N): 
if /i not "%CONFIRM%"=="Y" (
    echo  Da huy.
    timeout /t 2 >nul 2>nul
    exit /b 0
)

echo.
echo  Dang dung cac dich vu...
echo.

:: ─── Dung Frontend + Backend (Node.js) ────────────────────────────────────
echo  [1/2] Dung Node.js (Frontend + Backend)...
taskkill /f /im node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo  [OK] Tat Frontend va Backend thanh cong
) else (
    echo  [--] Khong tim thay process Node.js dang chay
)

:: ─── Dung Cloudflare Tunnel ────────────────────────────────────────────────
echo  [2/2] Dung Cloudflare Tunnel...
taskkill /f /im cloudflared.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo  [OK] Tat Cloudflare Tunnel thanh cong
) else (
    echo  [--] Khong tim thay Cloudflare Tunnel dang chay
)

echo.
echo  ============================================================
color 0A
echo   Tat ca dich vu da dung!
echo   De chay lai, mo file START.bat
echo  ============================================================
echo.
pause
