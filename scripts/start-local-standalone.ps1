$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location -LiteralPath $root

$logPath = Join-Path $root "testserver.log"
"[$(Get-Date -Format s)] Starte Hallenverwaltung Testserver..." | Set-Content -LiteralPath $logPath -Encoding UTF8

$nodeDir = Join-Path $env:TEMP "node-v22.22.3-win-x64"
$node = Join-Path $nodeDir "node.exe"
if (-not (Test-Path -LiteralPath $node)) {
  $nodeCommand = Get-Command "node.exe" -ErrorAction SilentlyContinue
  if (-not $nodeCommand) {
    throw "Node.js wurde nicht gefunden. Bitte Node.js installieren oder npm install erneut pruefen."
  }
  $node = $nodeCommand.Source
}

$server = Join-Path $root ".next\standalone\server.js"
$standaloneStatic = Join-Path $root ".next\standalone\.next\static"
$nextStatic = Join-Path $root ".next\static"
$standalonePublic = Join-Path $root ".next\standalone\public"
$public = Join-Path $root "public"

if (-not (Test-Path -LiteralPath $server)) {
  throw "Standalone build fehlt. Bitte zuerst npm run build ausfuehren."
}

if ((Test-Path -LiteralPath $nextStatic) -and -not (Test-Path -LiteralPath $standaloneStatic)) {
  New-Item -ItemType Directory -Path (Split-Path -Parent $standaloneStatic) -Force | Out-Null
  Copy-Item -LiteralPath $nextStatic -Destination $standaloneStatic -Recurse -Force
}

if ((Test-Path -LiteralPath $public) -and -not (Test-Path -LiteralPath $standalonePublic)) {
  Copy-Item -LiteralPath $public -Destination $standalonePublic -Recurse -Force
}

$env:Path = "$nodeDir;$env:Path"
$env:PORT = "3000"
$env:HOSTNAME = "localhost"
if (-not $env:DATABASE_URL) {
  $env:DATABASE_URL = "postgresql://hallenverwaltung:change-me@localhost:55435/hallenverwaltung?schema=public"
}
$env:AUTH_SECRET = "local-clicktest-secret-local-clicktest-secret"
$env:AUTH_TRUST_HOST = "true"

"[$(Get-Date -Format s)] Node: $node" | Add-Content -LiteralPath $logPath -Encoding UTF8
"[$(Get-Date -Format s)] Server: $server" | Add-Content -LiteralPath $logPath -Encoding UTF8
"[$(Get-Date -Format s)] DATABASE_URL: $env:DATABASE_URL" | Add-Content -LiteralPath $logPath -Encoding UTF8

try {
  & $node $server 2>&1 | ForEach-Object {
    $line = $_.ToString()
    Write-Output $line
    $line | Add-Content -LiteralPath $logPath -Encoding UTF8
  }
} catch {
  "[$(Get-Date -Format s)] Fehler: $($_.Exception.Message)" | Add-Content -LiteralPath $logPath -Encoding UTF8
  throw
}
