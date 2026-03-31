#!/usr/bin/env pwsh
# Blocking Issues Diagnostic Script
# Purpose: Identify and document the exact state of 4 blocking issues
# Owner: Backend Engineer + QA Lead
# Time: Use before 12:00 deadline

param(
    [string]$WebappUrl = "https://script.google.com/macros/s/AKfycbxAa4tpkPPQdbEPqSd_xv9Wb5U0fpe6nYcwTSfWw-cwwuojRN7mw9lM3rybxjpaldDeCg/exec",
    [string]$TenantA = "internal-tenant-1",
    [string]$TenantB = "internal-tenant-2",
    [string]$OutputFile = "./blocking-issues-diagnostic.md"
)

$ErrorActionPreference = "Continue"
$report = @()

function Write-Report {
    param([string]$msg)
    Write-Host $msg
    $report += $msg
}

Write-Report "# Blocking Issues Diagnostic Report"
Write-Report "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Report ""
Write-Report "## Issue #1: Tenant Fallback Contract"
Write-Report ""

# Test 1.1: Known tenant
Write-Report "### Test 1.1: Known Tenant Resolution"
$payload = @{ action = "tenant-config"; tenant_id = $TenantA } | ConvertTo-Json
Write-Report "Request: GET action=tenant-config tenant_id=$TenantA"
try {
    $response = Invoke-RestMethod -Uri $WebappUrl -Method POST -Body $payload -ContentType "application/json" -TimeoutSec 10
    Write-Report "Response: $(($response | ConvertTo-Json -Depth 10))"
    if ($response.status -eq "ok" -and $response.tenant_id -eq $TenantA) {
        Write-Report "✅ PASS: Tenant A resolves correctly"
    } else {
        Write-Report "❌ UNEXPECTED: Response structure doesn't match expected"
    }
} catch {
    Write-Report "❌ ERROR: $($_.Exception.Message)"
}
Write-Report ""

# Test 1.2: Unknown tenant
Write-Report "### Test 1.2: Unknown Tenant Fallback (BLOCKER)"
$unknownTenant = "unknown-tenant-xyz-$(Get-Random)"
$payload = @{ action = "tenant-config"; tenant_id = $unknownTenant } | ConvertTo-Json
Write-Report "Request: GET action=tenant-config tenant_id=$unknownTenant"
Write-Report "Expected: {status: 'error', code: 'TENANT_NOT_FOUND'}"
try {
    $response = Invoke-RestMethod -Uri $WebappUrl -Method POST -Body $payload -ContentType "application/json" -TimeoutSec 10
    Write-Report "Response: $(($response | ConvertTo-Json -Depth 10))"
    
    if ($response.status -eq "error" -and $response.code -eq "TENANT_NOT_FOUND") {
        Write-Report "✅ PASS: Unknown tenant returns error correctly"
    } elseif ($response.status -eq "ok") {
        Write-Report "❌ FAIL: Unknown tenant returns OK (SHOULD RETURN ERROR) - BLOCKER #1 NOT FIXED"
        Write-Report "Issue: Fallback to default tenant when unknown tenant_id provided"
    } else {
        Write-Report "⚠️ DIFFERENT error response: $(($response | ConvertTo-Json))"
    }
} catch {
    Write-Report "❌ ERROR: $($_.Exception.Message)"
}
Write-Report ""

# Test Issue #2 & #3: Auth Endpoints
Write-Report "## Issue #2: authLogin Endpoint"
Write-Report ""
$payload = @{ 
    type = "authLogin"
    username = "test@example.com"
    password = "testpass123"
} | ConvertTo-Json
Write-Report "Request: POST type=authLogin with test credentials"
Write-Report "Expected: {status: 'ok', token: '...'} OR {status: 'error', code: 'INVALID_CREDENTIALS'}"
try {
    $response = Invoke-RestMethod -Uri $WebappUrl -Method POST -Body $payload -ContentType "application/json" -TimeoutSec 10
    Write-Report "Response: $(($response | ConvertTo-Json -Depth 10))"
    
    if ($response -match "Unknown POST type") {
        Write-Report "❌ FAIL: authLogin handler not implemented (returns 'Unknown POST type') - BLOCKER #2"
    } elseif ($response.status -eq "ok" -and $response.token) {
        Write-Report "✅ PASS: authLogin returns token"
    } elseif ($response.status -eq "error") {
        Write-Report "⚠️ ERROR response: $($response.code) - Handler exists but auth failed (OK for now)"
    } else {
        Write-Report "⚠️ UNEXPECTED response structure"
    }
} catch {
    $msg = $_.Exception.Message
    Write-Report "Response: $msg"
    if ($msg -match "Unknown POST type") {
        Write-Report "❌ FAIL: authLogin handler not implemented - BLOCKER #2"
    } else {
        Write-Report "❌ ERROR: $msg"
    }
}
Write-Report ""

# Test Issue #3: registerUser Endpoint
Write-Report "## Issue #3: registerUser Endpoint"
Write-Report ""
$payload = @{ 
    type = "registerUser"
    email = "newuser-$(Get-Random)@example.com"
    password = "TestPass123!"
} | ConvertTo-Json
Write-Report "Request: POST type=registerUser with new email"
Write-Report "Expected: {status: 'ok', user_id: '...'} OR {status: 'error', code: '...'}"
try {
    $response = Invoke-RestMethod -Uri $WebappUrl -Method POST -Body $payload -ContentType "application/json" -TimeoutSec 10
    Write-Report "Response: $(($response | ConvertTo-Json -Depth 10))"
    
    if ($response -match "Unknown POST type") {
        Write-Report "❌ FAIL: registerUser handler not implemented (returns 'Unknown POST type') - BLOCKER #3"
    } elseif ($response.status -eq "ok" -and $response.user_id) {
        Write-Report "✅ PASS: registerUser creates user"
    } elseif ($response.status -eq "error") {
        Write-Report "⚠️ ERROR response: $($response.code) - Handler exists but validation failed (OK for now)"
    } else {
        Write-Report "⚠️ UNEXPECTED response structure"
    }
} catch {
    $msg = $_.Exception.Message
    Write-Report "Response: $msg"
    if ($msg -match "Unknown POST type") {
        Write-Report "❌ FAIL: registerUser handler not implemented - BLOCKER #3"
    } else {
        Write-Report "❌ ERROR: $msg"
    }
}
Write-Report ""

# Test Issue #4: Tenant B in Firestore
Write-Report "## Issue #4: Tenant B in Firestore"
Write-Report ""
Write-Report "Checking if: firebase firestore:documents:list --collection-path=tenants"
try {
    $tenantsList = firebase firestore:documents:list --collection-path="tenants" 2>&1 | Out-String
    Write-Report "Output:"
    Write-Report "$tenantsList"
    
    if ($tenantsList -match "internal-tenant-1" -and $tenantsList -match "internal-tenant-2") {
        Write-Report "✅ PASS: Both Tenant A and Tenant B found in Firestore"
    } elseif ($tenantsList -match "internal-tenant-1" -and $tenantsList -notmatch "internal-tenant-2") {
        Write-Report "❌ FAIL: Tenant B missing from Firestore - BLOCKER #4"
    } else {
        Write-Report "⚠️ Cannot verify - Firebase CLI not properly configured or no tenants collection"
    }
} catch {
    Write-Report "⚠️ ERROR: Cannot query Firestore - $($_.Exception.Message)"
    Write-Report "Manual check needed: Go to Firebase Console → Firestore → tenants collection"
}
Write-Report ""

# Summary
Write-Report "## Summary"
Write-Report ""
Write-Report "**Blocking Issues Status:**"

$blockers = @()
if ($report -match "BLOCKER #1") { $blockers += "❌ Issue #1: Tenant fallback (not fixed)" }
if ($report -match "BLOCKER #2") { $blockers += "❌ Issue #2: authLogin endpoint (not implemented)" }
if ($report -match "BLOCKER #3") { $blockers += "❌ Issue #3: registerUser endpoint (not implemented)" }
if ($report -match "BLOCKER #4") { $blockers += "❌ Issue #4: Tenant B missing (not created)" }

if ($blockers.count -eq 0) {
    Write-Report "✅ All critical blockers appear to be FIXED!"
} else {
    Write-Report "Found $($blockers.Count) active blockers:"
    $blockers | ForEach-Object { Write-Report $_ }
}

Write-Report ""
Write-Report "---"
Write-Report "**Next Steps:**"
Write-Report "1. If blockers found: Backend engineer must fix before 12:00"
Write-Report "2. If all pass: Ready for Phase B Level 1 Health Check at 16:00"
Write-Report "3. Save this report to docs/ for audit trail"

# Write to file
$report | Out-File -FilePath $OutputFile -Encoding UTF8
Write-Report ""
Write-Report "Report saved to: $OutputFile"
