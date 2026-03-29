param(
    [string]$ScriptTitle = "FleetPro V1 Online Backend",
    [string]$DeployDescription = "FleetPro V1 go-live deploy",
    [switch]$LoginIfNeeded
)

$ErrorActionPreference = "Stop"

function Step([string]$Message) {
    Write-Host "" -ForegroundColor Cyan
    Write-Host "=== $Message ===" -ForegroundColor Cyan
}

function Invoke-Checked([scriptblock]$Command, [string]$ErrorMessage) {
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw $ErrorMessage
    }
}

function Ensure-Clasp {
    Step "Check clasp"
    $clasp = Get-Command clasp -ErrorAction SilentlyContinue
    if (-not $clasp) {
        throw "clasp is missing. Install first: npm install -g @google/clasp"
    }
    Invoke-Checked { clasp --version } "clasp is installed but failed to run"
}

function Ensure-Auth {
    Step "Check clasp auth"
    Invoke-Checked { clasp list-scripts --json | Out-Null } "No clasp credentials found"
}

function Ensure-Project {
    Step "Check clasp project"
    if (Test-Path ".clasp.json") {
        Write-Host "Found .clasp.json" -ForegroundColor Green
        return
    }

    Write-Host "No .clasp.json found. Creating Apps Script project..." -ForegroundColor Yellow
    Invoke-Checked { clasp create-script --type standalone --title "$ScriptTitle" --rootDir . } "Failed to create Apps Script project"
}

function Deploy-Project {
    Step "Push project"
    Invoke-Checked { clasp push } "Failed to push project to Apps Script"

    Step "Create version"
    $versionOut = (& clasp create-version "$DeployDescription" | Out-String)
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create Apps Script version"
    }
    $versionNumber = [regex]::Match($versionOut, '(\d+)').Groups[1].Value
    if (-not $versionNumber) {
        throw "Cannot parse version number from output: $versionOut"
    }

    Step "Create deployment"
    Invoke-Checked { clasp create-deployment -V $versionNumber -d "$DeployDescription" } "Failed to create deployment"

    Step "Deployment list"
    Invoke-Checked { clasp list-deployments } "Failed to list deployments"
}

try {
    Set-Location "d:\AI-KILLS\V1-quanlyxeonline"

    Ensure-Clasp

    try {
        Ensure-Auth
        Write-Host "clasp auth OK" -ForegroundColor Green
    }
    catch {
        Write-Host "clasp auth missing" -ForegroundColor Yellow
        if ($LoginIfNeeded) {
            Step "Login with clasp"
            Invoke-Checked { clasp login --no-localhost } "clasp login failed"
            Ensure-Auth
            Write-Host "clasp auth OK after login" -ForegroundColor Green
        }
        else {
            throw "No clasp credentials found. Run: .\scripts\deploy-gas.ps1 -LoginIfNeeded"
        }
    }

    Ensure-Project
    Deploy-Project

    Write-Host "" -ForegroundColor Green
    Write-Host "Done: Apps Script deploy pipeline completed." -ForegroundColor Green
    exit 0
}
catch {
    Write-Host "" -ForegroundColor Red
    Write-Host "Deploy failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
