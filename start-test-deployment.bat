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

set "POSTGRES_PORT=55435"
set "POSTGRES_DB=hallenverwaltung"
set "POSTGRES_USER=hallenverwaltung"
set "POSTGRES_PASSWORD=change-me"
set "DATABASE_URL=postgresql://%POSTGRES_USER%:%POSTGRES_PASSWORD%@localhost:%POSTGRES_PORT%/%POSTGRES_DB%?schema=public"
set "AUTH_SECRET=local-clicktest-secret-local-clicktest-secret"
set "AUTH_TRUST_HOST=true"
set "TESTSERVER_LOG=%CD%\testserver.log"

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
echo [0/5] PostgreSQL-Testdatenbank pruefen...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$client = New-Object Net.Sockets.TcpClient; try { $connect = $client.BeginConnect('localhost', %POSTGRES_PORT%, $null, $null); if (-not $connect.AsyncWaitHandle.WaitOne(1500)) { exit 1 }; $client.EndConnect($connect); exit 0 } catch { exit 1 } finally { $client.Close() }"
if errorlevel 1 (
  echo PostgreSQL ist auf localhost:%POSTGRES_PORT% nicht erreichbar.
  echo Starte lokalen PostgreSQL-Container ueber Docker Compose...

  where docker >nul 2>nul
  if errorlevel 1 (
    echo Fehler: Docker wurde nicht gefunden.
    echo Bitte Docker Desktop starten/installieren oder eine PostgreSQL-Datenbank auf Port %POSTGRES_PORT% bereitstellen.
    goto :error
  )

  call docker compose up -d db
  if errorlevel 1 goto :error

  echo Warte auf PostgreSQL unter localhost:%POSTGRES_PORT% ...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ready=$false; for($i=0;$i -lt 60;$i++){ $client = New-Object Net.Sockets.TcpClient; try { $connect = $client.BeginConnect('localhost', %POSTGRES_PORT%, $null, $null); if($connect.AsyncWaitHandle.WaitOne(1000)){ $client.EndConnect($connect); $ready=$true; break } } catch {} finally { $client.Close() }; Start-Sleep -Seconds 1 }; if(-not $ready){ exit 1 }"
  if errorlevel 1 (
    echo Fehler: PostgreSQL konnte nicht gestartet oder erreicht werden.
    echo Bitte Docker Desktop pruefen und anschliessend diese Datei erneut starten.
    goto :error
  )
) else (
  echo PostgreSQL ist erreichbar.
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
echo [5/5] Lokalen Testserver starten...
if exist "%TESTSERVER_LOG%" del "%TESTSERVER_LOG%" >nul 2>nul
start "Hallenverwaltung Testserver" /D "%CD%" cmd /k "set PORT=3000&& set HOSTNAME=localhost&& set DATABASE_URL=%DATABASE_URL%&& set AUTH_SECRET=%AUTH_SECRET%&& set AUTH_TRUST_HOST=%AUTH_TRUST_HOST%&& npm.cmd run start"

echo.
echo Warte auf http://localhost:3000 ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ready=$false; for($i=0;$i -lt 90;$i++){ try { $r=Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 3; if($r.StatusCode -ge 200){ $ready=$true; break } } catch {}; Start-Sleep -Seconds 1 }; if(-not $ready){ exit 1 }"
if errorlevel 1 (
  echo Der Server wurde gestartet, war aber noch nicht erreichbar.
  echo Bitte das Fenster "Hallenverwaltung Testserver" pruefen.
  if exist "%TESTSERVER_LOG%" (
    echo.
    echo Letzte Testserver-Logzeilen:
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -LiteralPath '%TESTSERVER_LOG%' -Tail 40"
  ) else (
    echo Hinweis: Der Testserver laeuft im Fenster "Hallenverwaltung Testserver".
    echo Bitte dort die Fehlermeldung pruefen.
  )
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
