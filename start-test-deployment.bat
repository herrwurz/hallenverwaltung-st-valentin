@echo off
setlocal

cd /d "%~dp0"

echo.
echo Hallenverwaltung St. Valentin - lokales Test-Deployment
echo =======================================================
echo.

set "NODE_DIR=%TEMP%\node-v22.22.3-win-x64"
if exist "%NODE_DIR%\npm.cmd" (
  set "PATH=%NODE_DIR%;%PATH%"
)

set "DATABASE_URL=postgresql://postgres@localhost:55435/hallenverwaltung_phase35?schema=public"
set "AUTH_SECRET=local-clicktest-secret-local-clicktest-secret"
set "AUTH_TRUST_HOST=true"

where npm >nul 2>nul
if errorlevel 1 (
  echo Fehler: npm wurde nicht gefunden.
  echo Bitte npm installieren oder den lokalen Node-Pfad pruefen: %NODE_DIR%
  pause
  exit /b 1
)

if not exist "node_modules\next" (
  echo node_modules fehlen. Fuehre npm install aus...
  call npm install
  if errorlevel 1 goto :error
)

echo.
echo [1/5] Migrationen anwenden...
call npm run db:deploy
if errorlevel 1 goto :error

echo.
echo [2/5] Stammdaten seeden...
call npm run db:seed
if errorlevel 1 goto :error

echo.
echo [3/5] Demo-Daten seeden...
call npm run demo:seed
if errorlevel 1 goto :error

echo.
echo [4/5] Produktionsbuild erstellen...
call npm run build
if errorlevel 1 goto :error

echo.
echo [5/5] Standalone-Testserver starten...
start "Hallenverwaltung Testserver" powershell -NoProfile -ExecutionPolicy Bypass -File "%CD%\scripts\start-local-standalone.ps1"

echo.
echo Warte auf http://localhost:3000 ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ready=$false; for($i=0;$i -lt 30;$i++){ try { $r=Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 3; if($r.StatusCode -ge 200){ $ready=$true; break } } catch {}; Start-Sleep -Seconds 1 }; if(-not $ready){ exit 1 }"
if errorlevel 1 (
  echo Der Server wurde gestartet, war aber noch nicht erreichbar.
  echo Bitte das Fenster "Hallenverwaltung Testserver" pruefen.
  pause
  exit /b 1
)

echo.
echo Test-Deployment laeuft:
echo   http://localhost:3000
echo.
echo Demo-Logins:
echo   Admin:      demo.admin@example.test / DemoAdminPassword!2026
echo   Verein:     demo.verein@example.test / DemoVereinPassword!2026
echo   Hallenwart: demo.hallenwart@example.test / DemoHallenwartPassword!2026
echo.

start "" "http://localhost:3000"
pause
exit /b 0

:error
echo.
echo Fehler: Test-Deployment konnte nicht vollstaendig gestartet werden.
echo Bitte die Ausgabe oben pruefen.
pause
exit /b 1
