$ErrorActionPreference = "Stop"

$nodeDir = Join-Path $env:TEMP "node-v22.22.3-win-x64"
$node = Join-Path $nodeDir "node.exe"
$server = Join-Path (Get-Location) ".next\standalone\server.js"

$env:Path = "$nodeDir;$env:Path"
$env:PORT = "3000"
$env:HOSTNAME = "localhost"
$env:DATABASE_URL = "postgresql://postgres@localhost:55435/hallenverwaltung_phase35?schema=public"
$env:AUTH_SECRET = "local-clicktest-secret-local-clicktest-secret"
$env:AUTH_TRUST_HOST = "true"

& $node $server
