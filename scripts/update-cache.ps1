# PowerShell script to update cache (Windows)
# Can be scheduled with Task Scheduler

$ErrorActionPreference = "Stop"

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

# Change to project directory
Set-Location $projectRoot

# Check if Node.js is available
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Error "Node.js is not installed or not in PATH"
    exit 1
}

Write-Host "Updating cache..." -ForegroundColor Cyan
Write-Host "Project directory: $projectRoot" -ForegroundColor Gray

# Run the update script
node scripts/update-cache.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "Cache updated successfully!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Cache update failed!" -ForegroundColor Red
    exit 1
}

