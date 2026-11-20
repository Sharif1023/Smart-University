@echo off
setlocal
cd /d "%~dp0"
where node.exe >nul 2>&1
if errorlevel 1 (
 echo Install Node.js 24 LTS for Windows, then reopen this file.
 pause
 exit /b 1
)
node scripts\windows.js
if errorlevel 1 pause
