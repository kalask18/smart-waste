@echo off
title SmartWaste Management System - Server
echo ========================================================
echo 🚀 Starting SmartWaste Management System Server...
echo ========================================================
cd /d "%~dp0"

echo [1/3] Cleaning stale Next.js cache...
if exist .next rmdir /s /q .next

echo [2/3] Launching Next.js Development Server...
echo [3/3] Opening http://localhost:3000 in your default browser...

start http://localhost:3000
npm run dev
