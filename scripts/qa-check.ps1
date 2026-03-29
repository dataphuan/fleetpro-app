# QA Full System Check for FleetPro V3 Online - Simple Version

param(
    [string]$WebhookUrl = "https://script.google.com/macros/s/AKfycbxAa4tpkPPQdbEPqSd_xv9Wb5U0fpe6nYcwTSfWw-cwwuojRN7mw9lM3rybxjpaldDeCg/exec",
    [string]$TenantId = "internal-tenant-1"
)

Write-Host ""
Write-Host "======================================================" 
Write-Host "FleetPro V3 Online - QA Full System Check"
Write-Host "======================================================" 
Write-Host ""

$passed = 0
$failed = 0

# Test 1: Check .env.local
Write-Host "[TEST 1] Checking .env.local..."
if (Test-Path ".\1-ONLINE\.env.local") {
    Write-Host "PASS: .env.local exists" -ForegroundColor Green
    $passed++
} else {
    Write-Host "FAIL: .env.local not found" -ForegroundColor Red
    $failed++
}

# Test 2: API - List Vehicles
Write-Host "[TEST 2] Testing API - List Vehicles..."
try {
    $apiUrl = "$WebhookUrl`?action=list&resource=vehicles&tenant_id=$TenantId"
    $response = Invoke-RestMethod -Uri $apiUrl -Method Get -ErrorAction Stop
    $count = if ($response -is [array]) { $response.Length } else { 1 }
    Write-Host "PASS: API returned $count vehicles" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "FAIL: API error - $($_.Exception.Message)" -ForegroundColor Red
    $failed++
}

# Test 3: API - List Drivers
Write-Host "[TEST 3] Testing API - List Drivers..."
try {
    $apiUrl = "$WebhookUrl`?action=list&resource=drivers&tenant_id=$TenantId"
    $response = Invoke-RestMethod -Uri $apiUrl -Method Get -ErrorAction Stop
    $count = if ($response -is [array]) { $response.Length } else { 1 }
    Write-Host "PASS: API returned $count drivers" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "FAIL: API error - $($_.Exception.Message)" -ForegroundColor Red
    $failed++
}

# Test 4: API - List Trips
Write-Host "[TEST 4] Testing API - List Trips..."
try {
    $apiUrl = "$WebhookUrl`?action=list&resource=trips&tenant_id=$TenantId"
    $response = Invoke-RestMethod -Uri $apiUrl -Method Get -ErrorAction Stop
    $count = if ($response -is [array]) { $response.Length } else { 1 }
    Write-Host "PASS: API returned $count trips" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "FAIL: API error - $($_.Exception.Message)" -ForegroundColor Red
    $failed++
}

# Test 5: Tenant Config
Write-Host "[TEST 5] Testing Tenant Config Endpoint..."
try {
    $apiUrl = "$WebhookUrl`?action=tenant-config&tenant_id=$TenantId"
    $response = Invoke-RestMethod -Uri $apiUrl -Method Get -ErrorAction Stop
    if ($response.status -eq "ok") {
        Write-Host "PASS: Tenant config OK - $($response.tenant_id)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "FAIL: Tenant config error" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "FAIL: Endpoint error - $($_.Exception.Message)" -ForegroundColor Red
    $failed++
}

# Test 6: package.json
Write-Host "[TEST 6] Checking package.json..."
if (Test-Path ".\1-ONLINE\package.json") {
    Write-Host "PASS: package.json exists" -ForegroundColor Green
    $passed++
} else {
    Write-Host "FAIL: package.json not found" -ForegroundColor Red
    $failed++
}

# Test 7: vite.config.ts
Write-Host "[TEST 7] Checking vite.config.ts..."
if (Test-Path ".\1-ONLINE\vite.config.ts") {
    Write-Host "PASS: vite.config.ts exists" -ForegroundColor Green
    $passed++
} else {
    Write-Host "FAIL: vite.config.ts not found" -ForegroundColor Red
    $failed++
}

Write-Host ""
Write-Host "======================================================" 
Write-Host "SUMMARY"
Write-Host "======================================================" 
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red

$successRate = if ($passed + $failed -gt 0) { [math]::Round(($passed / ($passed + $failed)) * 100, 2) } else { 0 }
Write-Host "Success Rate: $successRate%"

if ($failed -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS! System is ready." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "  1. cd 1-ONLINE"
    Write-Host "  2. npm run dev"
    Write-Host "  3. Go to http://localhost:5173"
} else {
    Write-Host ""
    Write-Host "WARNING: Some tests failed!" -ForegroundColor Yellow
}

Write-Host ""
