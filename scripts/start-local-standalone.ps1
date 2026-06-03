$ErrorActionPreference = "Stop"

$nodeDir = Join-Path $env:TEMP "node-v22.22.3-win-x64"
$node = Join-Path $nodeDir "node.exe"
$server = Join-Path (Get-Location) ".next\standalone\server.js"
$standaloneStatic = Join-Path (Get-Location) ".next\standalone\.next\static"
$nextStatic = Join-Path (Get-Location) ".next\static"
$standalonePublic = Join-Path (Get-Location) ".next\standalone\public"
$public = Join-Path (Get-Location) "public"

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
$env:DATABASE_URL = "postgresql://postgres@localhost:55435/hallenverwaltung_phase35?schema=public"
$env:AUTH_SECRET = "local-clicktest-secret-local-clicktest-secret"
$env:AUTH_TRUST_HOST = "true"

& $node $server
