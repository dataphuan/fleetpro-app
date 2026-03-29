param(
  [string]$versionNumber = "1",
  [string]$description = "FleetPro V3 deploy",
  [switch]$create
)

Write-Host "Deploying 1-ONLINE Apps Script with clasp..."

$clasp = Get-Command clasp -ErrorAction SilentlyContinue
if (-not $clasp) {
  Write-Error "clasp not found. Install with: npm i -g @google/clasp"
  exit 2
}

Push-Location -Path (Split-Path -Path $MyInvocation.MyCommand.Definition -Parent)
Set-Location -Path ..\

if ($create) {
  Write-Host "Creating new clasp project (standalone)..."
  clasp create --type standalone --title "FleetPro V3 Backend" --rootDir ./
}

Write-Host "Pushing local files to Apps Script..."
clasp push

Write-Host "Deploying new version ($versionNumber) ..."
clasp deploy --description "$description" --versionNumber $versionNumber

Write-Host "Done. Check clasp status with 'clasp deployments' or view the Apps Script project in the browser."

Pop-Location
