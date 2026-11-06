#Requires -Version 7
<#
.SYNOPSIS
  Resets and seeds the database, then starts the API and the Angular app.

.DESCRIPTION
  The all-in-one local run: `greenlit reset --yes` on the configured database
  (SQL Server LocalDB by default; pass -Sqlite to run on a file under .run),
  then the API on :5100 and `ng serve` on :4200. Ctrl+C stops the dev server;
  the API keeps running until `eng/Restart-Api.ps1` or a reboot.

.PARAMETER Sqlite
  Run on a SQLite file under .run/dev instead of SQL Server.
#>
param(
    [switch]$Sqlite
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $repoRoot 'backend'
$frontend = Join-Path $repoRoot 'frontend'

dotnet build (Join-Path $backend 'Greenlit.sln') --nologo
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$provider = 'SqlServer'
if ($Sqlite) {
    $dataDir = Join-Path $repoRoot '.run/dev'
    New-Item -ItemType Directory -Force $dataDir | Out-Null
    $env:Greenlit__Database__Provider = 'Sqlite'
    $env:GREENLIT_CONNECTION = "Data Source=$(Join-Path $dataDir 'greenlit.db')"
    $provider = 'Sqlite'
}

dotnet run --project (Join-Path $backend 'src/Greenlit.Cli') --no-build -- reset --yes --provider $provider
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$env:ASPNETCORE_ENVIRONMENT = 'Development'
Start-Process -FilePath 'dotnet' -WorkingDirectory $backend `
    -ArgumentList 'run', '--project', (Join-Path $backend 'src/Greenlit.Api'), '--no-build', '--urls', 'http://localhost:5100'

Push-Location $frontend
try {
    if (-not (Test-Path 'node_modules')) { npm ci }
    npm start
} finally {
    Pop-Location
}
