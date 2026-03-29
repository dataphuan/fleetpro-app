# QA Full System Check for FleetPro V3 Online (PowerShell 5.1 compatible)

param(
    [string]$WebhookUrl = "https://script.google.com/macros/s/AKfycbxAa4tpkPPQdbEPqSd_xv9Wb5U0fpe6nYcwTSfWw-cwwuojRN7mw9lM3rybxjpaldDeCg/exec",
    [string]$TenantId = "internal-tenant-1",
    [string]$UnknownTenant = "unknown-tenant-zz"
)

$results = @{
    passed = 0
    failed = 0
    tests = @()
}

function Add-Pass([string]$Name, [string]$Detail = "") {
    $script:results.passed++
    $script:results.tests += @{ name = $Name; status = "PASS"; detail = $Detail }
    Write-Host "[PASS] $Name $Detail" -ForegroundColor Green
}

function Add-Fail([string]$Name, [string]$Detail = "") {
    $script:results.failed++
    $script:results.tests += @{ name = $Name; status = "FAIL"; detail = $Detail }
    Write-Host "[FAIL] $Name $Detail" -ForegroundColor Red
}

function Get-RowCount($Response) {
    if ($Response -is [array]) { return $Response.Length }
    if ($null -eq $Response) { return 0 }
    if ($Response.PSObject.Properties.Name -contains 'Count') { return [int]$Response.Count }
    return 1
}

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "FleetPro V3 Online - QA Full System Check" -ForegroundColor Cyan
Write-Host (Get-Date -Format "yyyy-MM-dd HH:mm:ss") -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# Test 1: env presence
if ((Test-Path ".\.env") -or (Test-Path ".\.env.local")) {
    Add-Pass ".env/.env.local exists"
} else {
    Add-Fail ".env/.env.local exists" "(missing both)"
}

# Test 2-4: core list endpoints
foreach ($resource in @("vehicles", "drivers", "trips")) {
    try {
        $apiUrl = "${WebhookUrl}?action=list&resource=$resource&tenant_id=$TenantId"
        $response = Invoke-RestMethod -Uri $apiUrl -Method Get -ErrorAction Stop
        $count = Get-RowCount $response
        Add-Pass "List $resource" "(rows=$count)"
    } catch {
        Add-Fail "List $resource" "($($_.Exception.Message))"
    }
}

# Test 5: tenant config for active tenant
try {
    $cfgUrl = "${WebhookUrl}?action=tenant-config&tenant_id=$TenantId"
    $cfg = Invoke-RestMethod -Uri $cfgUrl -Method Get -ErrorAction Stop
    if ($cfg.status -eq "ok") {
        Add-Pass "Tenant config active" "(tenant=$($cfg.tenant_id))"
    } else {
        Add-Fail "Tenant config active" "($($cfg.message))"
    }
} catch {
    Add-Fail "Tenant config active" "($($_.Exception.Message))"
}

# Test 6: tenant fallback contract
try {
    $unknownUrl = "${WebhookUrl}?action=tenant-config&tenant_id=$UnknownTenant"
    $unknown = Invoke-RestMethod -Uri $unknownUrl -Method Get -ErrorAction Stop
    if ($unknown.status -eq "error" -and $unknown.fallback -eq "not-found") {
        Add-Pass "Tenant fallback not-found"
    } else {
        Add-Fail "Tenant fallback not-found" "(status=$($unknown.status); fallback=$($unknown.fallback))"
    }
} catch {
    Add-Fail "Tenant fallback not-found" "($($_.Exception.Message))"
}

# Test 7: authLogin endpoint availability
try {
    $loginBody = @{ type = "authLogin"; tenant_id = $TenantId; email = "manager@internal.fleetpro.vn"; api_token = "REPLACE_MANAGER_TOKEN" } | ConvertTo-Json -Compress
    $loginRes = Invoke-RestMethod -Method Post -Uri $WebhookUrl -ContentType "application/json" -Body $loginBody -ErrorAction Stop
    if ($loginRes.message -eq "Unknown POST type") {
        Add-Fail "authLogin endpoint" "(unknown post type)"
    } else {
        Add-Pass "authLogin endpoint"
    }
} catch {
    Add-Fail "authLogin endpoint" "($($_.Exception.Message))"
}

# Test 8: registerUser endpoint availability
try {
    $stamp = Get-Date -Format "yyyyMMddHHmmss"
    $registerBody = @{ type = "registerUser"; tenant_id = $TenantId; user_id = ("qa-" + $stamp); email = ("qa." + $stamp + "@internal.fleetpro.vn"); display_name = "QA Probe"; role = "driver"; status = "active" } | ConvertTo-Json -Compress
    $registerRes = Invoke-RestMethod -Method Post -Uri $WebhookUrl -ContentType "application/json" -Body $registerBody -ErrorAction Stop
    if ($registerRes.message -eq "Unknown POST type") {
        Add-Fail "registerUser endpoint" "(unknown post type)"
    } else {
        Add-Pass "registerUser endpoint"
    }
} catch {
    Add-Fail "registerUser endpoint" "($($_.Exception.Message))"
}

$total = $results.passed + $results.failed
$rate = 0
if ($total -gt 0) {
    $rate = [math]::Round(($results.passed * 100.0) / $total, 2)
}

Write-Host ""
Write-Host "==================== SUMMARY ====================" -ForegroundColor Cyan
Write-Host "Passed: $($results.passed)" -ForegroundColor Green
Write-Host "Failed: $($results.failed)" -ForegroundColor Red
Write-Host "Success Rate: $rate%" -ForegroundColor Yellow

if ($results.failed -eq 0) {
    Write-Host "GO: QA gate passed for current checks." -ForegroundColor Green
    exit 0
}

Write-Host "NO-GO: Blocking checks failed." -ForegroundColor Red
exit 1
