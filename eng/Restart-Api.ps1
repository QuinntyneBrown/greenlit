#Requires -Version 7
<#
.SYNOPSIS
  Stops any running Greenlit API and starts it again on :5100.
#>
param(
    [switch]$Build,
    [int]$Port = 5100
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $repoRoot 'backend'

$running = Get-Process -Name dotnet, Greenlit.Api -ErrorAction SilentlyContinue |
    # The apphost is named Greenlit.Api; CommandLine is only filled in on Linux and Windows, not macOS.
    Where-Object { $_.ProcessName -eq 'Greenlit.Api' -or $_.CommandLine -like '*Greenlit.Api*' }
foreach ($p in $running) {
    Write-Host "Stopping API process $($p.Id)."
    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
}
if ($running) { Start-Sleep -Seconds 2 }

if ($Build) {
    dotnet build (Join-Path $backend 'Greenlit.sln') --nologo
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$env:ASPNETCORE_ENVIRONMENT = 'Development'
Start-Process -FilePath 'dotnet' -WorkingDirectory $backend `
    -ArgumentList 'run', '--project', (Join-Path $backend 'src/Greenlit.Api'), '--no-build', '--urls', "http://localhost:$Port"
Write-Host "API starting on http://localhost:$Port"
