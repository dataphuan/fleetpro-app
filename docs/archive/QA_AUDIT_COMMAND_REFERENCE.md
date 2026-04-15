# QA Audit Command Reference
**FleetPro V1 Online | Production Release Audit**

---

## QUICK START (Copy-Paste Ready)

### Environment Setup (Run Once)

```powershell
# Navigate to project root
cd d:\AI-KILLS\V1-quanlyxeonline

# Create audit output directory
New-Item -ItemType Directory -Path "./audit-run-$(Get-Date -Format 'yyyyMMdd-HHmmss')" -Force

# Set production endpoint variable
$ENDPOINT = "https://fleetpro-app.pages.dev"
$WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxAa4tpkPPQdbEPqSd_xv9Wb5U0fpe6nYcwTSfWw-cwwuojRN7mw9lM3rybxjpaldDeCg/exec"
$TENANT_A = "internal-tenant-1"
$TENANT_B = "internal-tenant-2"
```

---

## PHASE A: PRE-FLIGHT COMMANDS

### A6: Local Build Verification

```powershell
# Clean install
rm -Recurse node_modules -Force
npm install

# Lint
npm run lint 2>&1 | Tee-Object -FilePath "./audit-run-$(Get-Date -Format 'yyyyMMdd')/lint.log"

# Type check
npm run typecheck 2>&1 | Tee-Object -FilePath "./audit-run-$(Get-Date -Format 'yyyyMMdd')/typecheck.log"

# Build
npm run build 2>&1 | Tee-Object -FilePath "./audit-run-$(Get-Date -Format 'yyyyMMdd')/build.log"
```

### A7: Environment Verification

```powershell
# Node version check
Write-Host "=== Node Version ===" 
node --version

# npm version check
Write-Host "=== npm Version ===" 
npm --version

# Firebase CLI check
Write-Host "=== Firebase CLI ===" 
firebase --version

# Check required scripts exist
Write-Host "=== Scripts Present ===" 
$scripts = @(
    "scripts/online-health-check.js",
    "scripts/online-release-gate.js",
    "scripts/qa-object-tab-audit.js",
    "scripts/qa-full-check.ps1",
    "scripts/run-audit-gates.ps1"
)
$scripts | ForEach-Object { 
    $exists = Test-Path $_
    Write-Host "$_`: $(if ($exists) { '✅' } else { '❌ MISSING' })"
}
```

---

## PHASE B: LEVEL 1 - HEALTH CHECK (5 mins)

```powershell
# One-liner: Quick health check
node scripts/online-health-check.js --endpoint $ENDPOINT

# With logging
node scripts/online-health-check.js --endpoint $ENDPOINT 2>&1 | `
    Tee-Object -FilePath "./audit-run-$(Get-Date -Format 'yyyyMMdd')/level-1-health.log"

# Manual verification if script fails
Write-Host "Testing endpoint manually..."
$response = Invoke-WebRequest -Uri "$ENDPOINT/auth" -Method GET
Write-Host "Status: $($response.StatusCode)"
Write-Host "Load time: Check Network tab in F12"
```

---

## PHASE C: LEVEL 2 - RELEASE GATE (15 mins)

```powershell
# Full release gate test
node scripts/online-release-gate.js `
    --webapp $WEBAPP_URL `
    --tenant-a $TENANT_A `
    --tenant-b $TENANT_B

# With logging
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
node scripts/online-release-gate.js `
    --webapp $WEBAPP_URL `
    --tenant-a $TENANT_A `
    --tenant-b $TENANT_B `
    --log "./audit-run-$timestamp/level-2-release-gate.log"

# Verify individual endpoints manually (if automated test fails)

Write-Host "=== Testing Tenant Resolver ==="
$payload = @{ action = "tenant-config"; tenant_id = $TENANT_A } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "$WEBAPP_URL" -Method POST -Body $payload -ContentType "application/json"
$response | ConvertTo-Json | Write-Host

Write-Host "=== Testing Unknown Tenant Fallback ==="
$payload = @{ action = "tenant-config"; tenant_id = "unknown-xyz-zz" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "$WEBAPP_URL" -Method POST -Body $payload -ContentType "application/json"
$response | ConvertTo-Json | Write-Host
Write-Host "Expected: status=error, code=TENANT_NOT_FOUND"

Write-Host "=== Testing authLogin Endpoint ==="
$payload = @{ 
    type = "authLogin"
    username = "testuser"
    password = "testpass"
} | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri "$WEBAPP_URL" -Method POST -Body $payload -ContentType "application/json"
    $response | ConvertTo-Json | Write-Host
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Status: Should NOT be 'Unknown POST type'"
}

Write-Host "=== Testing registerUser Endpoint ==="
$payload = @{ 
    type = "registerUser"
    email = "test@example.com"
    password = "TestPass123"
} | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri "$WEBAPP_URL" -Method POST -Body $payload -ContentType "application/json"
    $response | ConvertTo-Json | Write-Host
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Status: Should NOT be 'Unknown POST type'"
}
```

---

## PHASE D: LEVEL 3 - FULL SMOKE (60 mins)

### Automated (if available)

```powershell
# Full smoke test script
./scripts/qa-full-check.ps1 -Endpoint $ENDPOINT -Verbose

# OR with detailed logging
./scripts/qa-full-check.ps1 `
    -Endpoint $ENDPOINT `
    -OutputPath "./audit-run-$(Get-Date -Format 'yyyyMMdd')" `
    -Verbose
```

### Manual Testing (Browser)

```javascript
// Open browser console (F12) and run:

// 1. Test auth & session
console.log("Testing Auth & Session...")
document.location.href = "https://fleetpro-app.pages.dev/auth"
// Wait for page load, open DevTools, check Network tab

// Record all network requests (DevTools → Network tab)
// Right-click → Save all as HAR with content
// Save to: audit-run-[DATE]/network-capture.har
```

**Manual Smoke Test Checklist:**

```
Browser: Open https://fleetpro-app.pages.dev

1. AUTH FLOW
   [ ] Login page loads in <5s
   [ ] Enter demo credentials
   [ ] Click Login
   [ ] See dashboard
   [ ] Refresh page (F5) - session persists
   [ ] Click Logout

2. VEHICLES
   [ ] Click Vehicles menu
   [ ] List shows vehicles
   [ ] Click first row - detail page
   [ ] Check "Edit" button works
   [ ] Click back

3. DRIVERS
   [ ] Click Drivers menu
   [ ] List shows drivers
   [ ] Click first row
   [ ] Check Edit works

4. TRIPS
   [ ] Click Trips menu
   [ ] List shows trips
   [ ] Click "Create Trip"
   [ ] Fill form, click Save
   [ ] New trip appears in list
   [ ] Click trip status dropdown, change status

5. DASHBOARD
   [ ] Click Dashboard
   [ ] Widgets render (charts, KPIs)
   [ ] No blank areas

6. REPORTS
   [ ] Click Reports
   [ ] Generate report
   [ ] Wait <5s for result

7. CONSOLE CHECK
   [ ] Press F12
   [ ] Go to Console tab
   [ ] Look for red error messages
   [ ] Should be NONE
   [ ] Screenshot console

8. NETWORK CHECK
   [ ] Press F12
   [ ] Go to Network tab
   [ ] Reload page
   [ ] Look for red (error) requests
   [ ] Should be NONE
   [ ] All responses should be 200-300 range
```

---

## PHASE E: LEVEL 4 - RHBAC MATRIX (90 mins)

### Setup Test Tokens

```powershell
# Generate tokens (using your auth backend)
# Store in GitHub Secrets or local environment

# Source from GitHub Secrets (if configured in CI)
Write-Host "Loading tokens from GitHub Secrets..."
$tokens = @{
    'USER_ADMIN_TENANT_A' = (Read-Host "Enter USER_ADMIN_TENANT_A")
    'USER_MANAGER_TENANT_A' = (Read-Host "Enter USER_MANAGER_TENANT_A")
    'USER_DISPATCHER_TENANT_A' = (Read-Host "Enter USER_DISPATCHER_TENANT_A")
    'USER_ACCOUNTANT_TENANT_A' = (Read-Host "Enter USER_ACCOUNTANT_TENANT_A")
    'USER_DRIVER_TENANT_A' = (Read-Host "Enter USER_DRIVER_TENANT_A")
    'USER_VIEWER_TENANT_A' = (Read-Host "Enter USER_VIEWER_TENANT_A")
    'USER_ADMIN_TENANT_B' = (Read-Host "Enter USER_ADMIN_TENANT_B")
}

# Set environment variables
$tokens.GetEnumerator() | ForEach-Object {
    [Environment]::SetEnvironmentVariable($_.Key, $_.Value, [EnvironmentVariableTarget]::Process)
    Write-Host "Set $($_.Key) ✅"
}

# Verify tokens loaded
Write-Host "Verifying tokens..."
$env:USER_ADMIN_TENANT_A # Should show token, not empty
```

### Run Security Matrix Test

```powershell
# Option 1: If npm test exists
npm run test:security-matrix -- --reporter json > security-matrix-results.json

# Option 2: Manual test each case
Write-Host "=== RBAC Test: A-001 (vehicles/read by viewer_a on tenant_a) ==="
$token = $env:USER_VIEWER_TENANT_A
$response = Invoke-RestMethod -Uri "$WEBAPP_URL" `
    -Headers @{ Authorization = "Bearer $token" } `
    -Method POST `
    -Body (@{ 
        type = "vehicleList"
        tenant_id = $TENANT_A
    } | ConvertTo-Json) `
    -ContentType "application/json"

# Expected: Should return vehicle list (ALLOW)
# If 403 or error: FAIL
Write-Host $response | ConvertTo-Json

# Repeat for all 20 test cases (see matrix in execution tracker)
```

---

## ONE-COMMAND FULL AUDIT (All Levels)

```powershell
# If using the orchestration script:
./scripts/run-audit-gates.ps1 `
    -Endpoint $ENDPOINT `
    -WebappUrl $WEBAPP_URL `
    -TenantA $TENANT_A `
    -TenantB $TENANT_B `
    -Level 4 `
    -Output "./audit-run-$(Get-Date -Format 'yyyyMMdd')" `
    -Verbose

# Expected output structure:
# audit-run-20260330/
#   ├─ level-1-health-check.json
#   ├─ level-2-release-gate.json
#   ├─ level-3-smoke-results.json
#   ├─ level-4-rbac-matrix.json
#   └─ decision-metrics.json
```

---

## Troubleshooting Commands

### Connection Issues

```powershell
# Test endpoint reachability
Test-NetConnection -ComputerName fleetpro-app.pages.dev -Port 443

# Test DNS resolution
[System.Net.Dns]::GetHostAddresses("fleetpro-app.pages.dev")

# Detailed HTTP test
Invoke-WebRequest -Uri "https://fleetpro-app.pages.dev/auth" -Verbose
```

### Firestore Issues

```powershell
# Verify Firebase CLI login
firebase login:list

# Check Firestore connection
firebase firestore:indexes:list

# View specific collection
firebase firestore:documents:list --collection-path=tenants
```

### Apps Script Issues

```powershell
# Check Apps Script deployment status
# (Requires Google Cloud credentials)
gcloud apps describe --project=<PROJECT_ID>

# View Apps Script logs
# Go to: https://script.google.com/
#   → Your script → Execution tab
#   → View error logs
```

### Console Errors (Browser DevTools)

```javascript
// Copy-paste in F12 Console to capture errors:

// Get all console messages
const logs = {
    errors: [],
    warns: [],
    logs: []
};

const originalError = console.error;
const originalWarn = console.warn;
const originalLog = console.log;

console.error = function() {
    logs.errors.push(Array.from(arguments));
    originalError.apply(console, arguments);
};

console.warn = function() {
    logs.warns.push(Array.from(arguments));
    originalWarn.apply(console, arguments);
};

console.log = function() {
    logs.logs.push(Array.from(arguments));
    originalLog.apply(console, arguments);
};

// After using app for a bit, check:
JSON.stringify(logs, null, 2)
// Copy output and save to file
```

### Network Debugging

```javascript
// Check all failed requests (F12 Console):
const failedRequests = Array.from(document.querySelectorAll('[data-requests]'))
    .filter(r => r.status >= 400)
    .map(r => ({ url: r.url, status: r.status }));

console.table(failedRequests);
```

---

## Evidence Collection

### Screenshot Checklist

```powershell
# Windows: Use Snip & Sketch or ShareX
# Keyboard: Windows Key + Shift + S (Snip tool)

# Name screenshots descriptively:
# 01-auth-login-page.png
# 02-dashboard-overview.png
# 03-vehicles-list.png
# 04-trips-workflow.png
# 05-reports-generated.png
# 06-console-no-errors.png
# 07-network-all-200.png
```

### HAR File (Network Capture)

```javascript
// DevTools → Network tab
// Right-click in Network table
// Select "Save all as HAR with content"
// Save as: audit-run-[DATE]/network-capture.har
```

### Log Consolidation

```powershell
# Combine all logs
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logFiles = @(
    "./audit-run-$timestamp/lint.log",
    "./audit-run-$timestamp/typecheck.log",
    "./audit-run-$timestamp/build.log",
    "./audit-run-$timestamp/level-1-health.log",
    "./audit-run-$timestamp/level-2-release-gate.log"
)

$allLogs = $logFiles | ForEach-Object { 
    "===== $_ =====" + (Get-Content $_)
}

$allLogs | Out-File -FilePath "./audit-run-$timestamp/commands.log"
```

---

## Archive & Cleanup

```powershell
# Archive audit artifacts
$date = Get-Date -Format 'yyyyMMdd'
Compress-Archive -Path "./audit-run-$date" -DestinationPath "./audit-archives/audit-run-$date.zip" -Force

# Cleanup if successful
if ($LASTEXITCODE -eq 0) {
    Remove-Item -Path "./audit-run-$date" -Recurse -Force
    Write-Host "✅ Audit archived and cleaned up"
}

# Backup to cloud (optional)
# gsutil cp ./audit-archives/audit-run-*.zip gs://your-bucket/
```

---

## Success Indicators

### ✅ Level 1 PASS
```
✅ Endpoint reachable: 200 OK
✅ GET parsing functional
✅ POST handler available
✅ Error handling present
```

### ✅ Level 2 PASS
```
✅ Tenant resolver works
✅ Unknown tenant returns error
✅ authLogin endpoint available
✅ registerUser endpoint available
✅ Trip lists load
```

### ✅ Level 3 PASS
```
✅ Auth login/logout works
✅ All menus navigate <3s
✅ Vehicles/Drivers/Trips CRUD works
✅ Dashboard renders
✅ Reports generate
✅ No console JS errors
✅ No 500 errors
```

### ✅ Level 4 PASS
```
✅ 20/20 RBAC test cases PASS
✅ No DENY cases returning ALLOW
✅ No ALLOW cases returning DENY
✅ Cross-tenant access blocked
```

---

**Updated:** 2026-03-30  
**For:** Production Online Audit  
**Reference:** [QA_AUDIT_PLAN_PRODUCTION_ONLINE_20260330.md](QA_AUDIT_PLAN_PRODUCTION_ONLINE_20260330.md)
