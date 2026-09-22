@echo off
setlocal
pushd "%~dp0"
if errorlevel 1 (
    echo ERROR: Could not access:
    echo %~dp0
    pause
    exit /b 1
)
echo Current mapped folder:
cd
echo.
echo Original application path:
echo %~dp0
echo.
echo Files:
dir /b
echo.
echo Node:
node --version
echo.
echo server.js check:
if exist "server.js" (echo FOUND) else (echo NOT FOUND)
echo.
popd
pause
