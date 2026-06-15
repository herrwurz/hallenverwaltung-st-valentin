@echo off
setlocal

cd /d "%~dp0\.."

set "NODE_DIR=%TEMP%\node-v22.22.3-win-x64"
if exist "%NODE_DIR%\node.exe" (
  set "PATH=%NODE_DIR%;%PATH%"
)

if "%PORT%"=="" set "PORT=3000"
if "%HOSTNAME%"=="" set "HOSTNAME=localhost"
if "%DATABASE_URL%"=="" set "DATABASE_URL=postgresql://hallenverwaltung:change-me@localhost:55435/hallenverwaltung?schema=public"
if "%AUTH_SECRET%"=="" set "AUTH_SECRET=local-clicktest-secret-local-clicktest-secret"
if "%AUTH_TRUST_HOST%"=="" set "AUTH_TRUST_HOST=true"

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Fehler: npm.cmd wurde nicht gefunden.
  pause
  exit /b 1
)

if not exist ".next\BUILD_ID" (
  echo Fehler: Produktionsbuild fehlt. Bitte zuerst npm run build ausfuehren.
  pause
  exit /b 1
)

echo Hallenverwaltung Testserver
echo ==========================
echo.
echo URL: http://localhost:%PORT%
echo.
echo Startmodus: npm run start
echo Hinweis: Dieses Fenster waehrend des Klicktests offen lassen.
echo.

npm.cmd run start 1>testserver.out.log 2>testserver.err.log

echo.
echo Testserver wurde beendet.
if exist testserver.out.log (
  echo.
  echo Letzte Logzeilen:
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -LiteralPath 'testserver.out.log' -Tail 40"
)
if exist testserver.err.log (
  echo.
  echo Letzte Fehlerlogzeilen:
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -LiteralPath 'testserver.err.log' -Tail 40"
)
pause
