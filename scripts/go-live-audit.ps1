param(
    [string]$WebappUrl = "https://script.google.com/macros/s/AKfycbxAa4tpkPPQdbEPqSd_xv9Wb5U0fpe6nYcwTSfWw-cwwuojRN7mw9lM3rybxjpaldDeCg/exec",
    [string]$TenantA = "internal-tenant-1",
    [string]$TenantB = "internal-tenant-2"
)

$ErrorActionPreference = "Continue"

function Run-Step {
    param(
        [string]$Name,
        [scriptblock]$Command
    )

    Write-Host ""
    Write-Host "=== $Name ===" -ForegroundColor Cyan
    & $Command
    $exitCode = $LASTEXITCODE
    if ($exitCode -eq 0) {
        Write-Host "[PASS] $Name" -ForegroundColor Green
        return @{ name = $Name; status = "PASS"; exitCode = $exitCode }
    }

    Write-Host "[FAIL] $Name (exit=$exitCode)" -ForegroundColor Red
    return @{ name = $Name; status = "FAIL"; exitCode = $exitCode }
}

Write-Host "FleetPro V1 Go-Live Audit" -ForegroundColor Yellow
Write-Host "Webapp: $WebappUrl"
Write-Host "Tenant A: $TenantA"
Write-Host "Tenant B: $TenantB"

$results = @()

$results += Run-Step -Name "Health Gate" -Command {
    node scripts/online-health-check.js --webapp $WebappUrl
}

$results += Run-Step -Name "Release Gate" -Command {
    node scripts/online-release-gate.js --webapp $WebappUrl --tenant-a $TenantA --tenant-b $TenantB
}

$results += Run-Step -Name "Object Tab Audit" -Command {
    node scripts/qa-object-tab-audit.js --webapp-a $WebappUrl --tenant-a $TenantA
}

$results += Run-Step -Name "Full QA Check" -Command {
    .\scripts\qa-full-check.ps1 -WebhookUrl $WebappUrl -TenantId $TenantA
}

$passCount = ($results | Where-Object { $_.status -eq "PASS" }).Count
$failCount = ($results | Where-Object { $_.status -eq "FAIL" }).Count

Write-Host ""
Write-Host "================ SUMMARY ================" -ForegroundColor Cyan
Write-Host "Passed: $passCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red

if ($failCount -eq 0) {
    Write-Host "GO: All go-live gates passed." -ForegroundColor Green
    exit 0
}

Write-Host "NO-GO: One or more blocking gates failed." -ForegroundColor Red
Write-Host "Focus areas: tenant fallback contract, phase-2 auth endpoints, tenant-B readiness, RBAC token checks." -ForegroundColor Yellow
exit 1
