@echo off
title Microsoft Rewards - GUI
cd /d "%~dp0"

echo Starting Microsoft Rewards GUI...
npm run gui

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to start GUI. Make sure Node.js and dependencies are installed.
    echo Run: npm install
    pause
)
