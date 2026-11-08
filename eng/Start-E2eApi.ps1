#Requires -Version 7
<#
.SYNOPSIS
  Starts the Greenlit API on :5100 for Playwright, on a fresh SQLite file
  instead of SQL Server.

.DESCRIPTION
  Stops any running API, deletes the e2e database under .run/e2e, and starts
  the API with Greenlit:Database:Provider=Sqlite; on SQLite the API creates
  the schema from the model on startup. The script then seeds the demo team
  with the CLI (`greenlit seed --provider Sqlite`) and checks that Swagger
  answers. No LocalDB, no `greenlit migrate`, and every run starts from the
  same data. Logs go to .run/logs.

.PARAMETER Build
  Build the API and CLI first (by default the solution is assumed built).

.PARAMETER Port
  The API port. Default 5100, which the Angular environment compiles in.
#>
param(
    [switch]$Build,
    [int]$Port = 5100
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $repoRoot 'backend'
$dataDir = Join-Path $repoRoot '.run/e2e'
$logDir = Join-Path $repoRoot '.run/logs'
$database = Join-Path $dataDir 'greenlit-e2e.db'
$connection = "Data Source=$database"
New-Item -ItemType Directory -Force $dataDir, $logDir | Out-Null

$running = Get-Process -Name dotnet, Greenlit.Api -ErrorAction SilentlyContinue |
    # The apphost is named Greenlit.Api; CommandLine is only filled in on Linux and Windows, not macOS.
    Where-Object { $_.ProcessName -eq 'Greenlit.Api' -or $_.CommandLine -like '*Greenlit.Api*' }
foreach ($p in $running) {
    Write-Host "Stopping API process $($p.Id)."
    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
}
if ($running) { Start-Sleep -Seconds 2 }

Get-ChildItem $dataDir -Filter 'greenlit-e2e.db*' | Remove-Item -Force

if ($Build) {
    dotnet build (Join-Path $backend 'Greenlit.sln') --nologo
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:Greenlit__Database__Provider = 'Sqlite'
$env:GREENLIT_CONNECTION = $connection
# Google is stood in for by the fake accounts reader (ADR-012): the Playwright suite makes its own tokens.
$env:Greenlit__Google__Accounts = 'Fake'

$out = Join-Path $logDir 'e2e-api.out.log'
$err = Join-Path $logDir 'e2e-api.err.log'
$apiProject = Join-Path $backend 'src/Greenlit.Api'
if ($IsWindows) {
    $api = Start-Process -FilePath 'dotnet' -PassThru -WorkingDirectory $backend `
        -RedirectStandardOutput $out -RedirectStandardError $err `
        -ArgumentList 'run', '--project', $apiProject, '--no-build', '--urls', "http://localhost:$Port"
} else {
    # On Linux and macOS PowerShell's redirected output reaches the file late, and the Playwright
    # fixtures read the emailed links from it (ADR-006), so the shell does the redirecting.
    # One script file, because Start-Process joins its arguments with spaces and would hand bash the
    # command as several words.
    $launcher = Join-Path $logDir 'start-e2e-api.sh'
    Set-Content -Path $launcher -Value ("exec dotnet run --project '{0}' --no-build --urls 'http://localhost:{1}' > '{2}' 2> '{3}'" -f $apiProject, $Port, $out, $err)
    $api = Start-Process -FilePath 'bash' -PassThru -WorkingDirectory $backend -ArgumentList $launcher
}
Write-Host "API starting on SQLite (pid $($api.Id)); database $database; logs in $logDir"

$deadline = (Get-Date).AddSeconds(60)
$up = $false
do {
    Start-Sleep -Seconds 2
    if ($api.HasExited) { throw "The API exited with code $($api.ExitCode). Check $err and $out." }
    try {
        $up = (Invoke-WebRequest -Uri "http://localhost:$Port/swagger/index.html" -TimeoutSec 5 -UseBasicParsing).StatusCode -eq 200
    } catch { }
} while (-not $up -and (Get-Date) -lt $deadline)
if (-not $up) { throw "The API did not answer on :$Port within 60 s. Check $out." }

dotnet run --project (Join-Path $backend 'src/Greenlit.Cli') --no-build -- `
    seed --provider Sqlite --connection $connection
if ($LASTEXITCODE -ne 0) { throw "greenlit seed failed with exit code $LASTEXITCODE." }

Write-Host "API is up on SQLite with the demo team seeded."
