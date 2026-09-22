@echo off
setlocal
set "MN_NODE=node"
where node >nul 2>nul
if errorlevel 1 set "MN_NODE=%USERPROFILE%\nodejs\node.exe"
"%MN_NODE%" "%~dp0serve.cjs"
pause
