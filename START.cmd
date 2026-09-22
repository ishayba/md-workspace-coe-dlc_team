@echo off
setlocal

REM Support both local drive paths and UNC network paths.
REM pushd automatically maps a temporary drive letter for UNC locations.
pushd "%~dp0"
if errorlevel 1 (
    echo.
    echo ERROR: Could not access the application folder:
    echo %~dp0
    echo.
    echo Check that the network path is reachable and that you have permissions.
    pause
    exit /b 1
)

echo.
echo Starting MD Workspace...
echo Folder: %CD%
echo.

if not exist "server.js" (
    echo ERROR: server.js was not found in:
    echo %CD%
    echo.
    echo Make sure START.cmd and server.js are in the same extracted folder.
    popd
    pause
    exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js was not found in PATH.
    echo Run: node --version
    echo to verify the installation.
    popd
    pause
    exit /b 1
)

start "" "http://localhost:8080"
node "server.js"

echo.
echo Server stopped.
popd
pause
