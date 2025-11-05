@echo off
REM Deployment Script for PDC Dashboard (Windows)
REM This script ensures firebase-config.public.js has the correct credentials before deploying

echo ================================
echo PDC Dashboard Deployment Script
echo ================================
echo.

REM Check if firebase-config.public.js exists
if not exist "firebase-config.public.js" (
    echo ERROR: firebase-config.public.js not found!
    exit /b 1
)

REM Check if it contains placeholder values
findstr /C:"YOUR_API_KEY_HERE" firebase-config.public.js >nul
if %ERRORLEVEL% EQU 0 (
    echo WARNING: firebase-config.public.js contains placeholder values!
    echo.
    echo Please update firebase-config.public.js with your actual Firebase configuration before deploying.
    echo.
    echo Steps:
    echo 1. Copy values from firebase-config.js ^(your local file^)
    echo 2. Paste them into firebase-config.public.js
    echo 3. Run this script again
    echo.
    exit /b 1
)

echo Configuration file looks good!
echo.
echo Deploying to Firebase Hosting...
echo.

REM Deploy to Firebase
firebase deploy

echo.
echo Deployment complete!
echo Your site: https://pdc-dashboard-8963a.web.app
