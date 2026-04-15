# 🔧 Tenant Fallback Fix Guide - Issue #1
**FleetPro V1 Online | April 2, 2026**

---

## 🎯 Problem Statement

**Current Issue:** When an unknown tenant ID is sent to the Apps Script backend, it returns:
```json
{
  "status": "ok",
  "tenant": "DEFAULT_TENANT"
}
```

**Expected Response:** Should return an error:
```json
{
  "status": "error",
  "code": "TENANT_NOT_FOUND",
  "message": "Tenant <tenant_id> not found"
}
```

**Impact:** This allows requests with invalid tenant IDs to pass validation, creating a security breach and data isolation violation.

---

## 📋 Prerequisites

- Access to Google Apps Script project: https://script.google.com/home/projects
- Project name: **"FleetPro Online"**
- Current user must have **Editor** permission on the Apps Script project

---

## 🔍 Step 1: Locate Current Broken Code

### Access Google Apps Script
1. Open: https://script.google.com/home/projects
2. Click on **"FleetPro Online"** project
3. In the left sidebar, click on **"Code.gs"** or **"backend-gas.gs"**

### Find the Broken Function
Search (Ctrl+F) for: `handleTenantConfig`

### Current Broken Code Pattern
```javascript
// ❌ WRONG - This is what's currently deployed
function handleTenantConfig(tenantId) {
  let tenant;
  
  // Try to load from Sheets API / Database / etc
  // ... some code that might return undefined ...
  
  if (!tenant) {
    return {
      status: "ok",
      tenant: "DEFAULT_TENANT"  // ❌ SECURITY ISSUE: Returns default instead of error
    };
  }
  
  return {status: "ok", tenant: tenant};
}
```

---

## ✅ Step 2: Apply the Fix

### Replace with Corrected Code
```javascript
// ✅ CORRECT - Fixed version
function handleTenantConfig(tenantId) {
  // Step 1: Validate input
  if (!tenantId || tenantId.trim() === '') {
    return {
      status: "error",
      code: "INVALID_INPUT",
      message: "tenant_id is required"
    };
  }
  
  // Step 2: Get Tenants from Firestore or Sheets
  // Option A: If using Google Sheets as tenant registry
  const tenantsSheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName('Tenants');
  
  if (!tenantsSheet) {
    // Fallback: If Tenants sheet doesn't exist, check Firestore
    return handleTenantConfigFromFirestore(tenantId);
  }
  
  const data = tenantsSheet.getDataRange().getValues();
  
  // Step 3: Search for tenant in registry
  let foundTenant = null;
  for (let i = 1; i < data.length; i++) { // Start from row 1 (skip header)
    if (data[i][0] === tenantId) { // Column 0 = tenant_id
      foundTenant = {
        id: data[i][0],
        name: data[i][1],
        status: data[i][2],
        created_at: data[i][3],
        region: data[i][4]
        // Add other columns as needed
      };
      break;
    }
  }
  
  // Step 4: Return appropriate response
  if (!foundTenant) {
    return {
      status: "error",
      code: "TENANT_NOT_FOUND",
      message: `Tenant '${tenantId}' not found in registry`,
      fallback: "not-found"  // Signal to client: do NOT use DEFAULT_TENANT
    };
  }
  
  // Step 5: Validate tenant status
  if (foundTenant.status !== 'active') {
    return {
      status: "error",
      code: "TENANT_INACTIVE",
      message: `Tenant '${tenantId}' is not active (status: ${foundTenant.status})`,
      fallback: "inactive"
    };
  }
  
  return {
    status: "ok",
    tenant: foundTenant
  };
}

// 🔐 Alternative: Firestore-based lookup (more scalable)
function handleTenantConfigFromFirestore(tenantId) {
  try {
    // Using Google Apps Script Firestore library
    const firestore = FirestoreApp.getFirestore();
    const doc = firestore.getDocument(`tenants/${tenantId}`);
    
    if (!doc) {
      return {
        status: "error",
        code: "TENANT_NOT_FOUND",
        message: `Tenant '${tenantId}' not found in Firestore`,
        fallback: "not-found"
      };
    }
    
    const data = doc.obj;
    if (data.status !== 'active') {
      return {
        status: "error",
        code: "TENANT_INACTIVE",
        message: `Tenant '${tenantId}' is inactive`,
        fallback: "inactive"
      };
    }
    
    return {
      status: "ok",
      tenant: data
    };
  } catch (error) {
    return {
      status: "error",
      code: "FIRESTORE_ERROR",
      message: error.message,
      fallback: "error"
    };
  }
}
```

---

## 📝 Step 3: Update doPost/doGet Handlers

### Ensure Tenant Config is Called Correctly
```javascript
function doGet(e) {
  const action = e.parameter.action || '';
  const tenantId = e.parameter.tenant_id || '';
  
  // Route to tenant-config handler
  if (action === 'tenant-config') {
    const result = handleTenantConfig(tenantId);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput('Unknown action');
}

function doPost(e) {
  const type = e.postData.getParameters().type?.[0] || '';
  const params = e.postData.getParameters();
  
  // Handle tenant-config POST requests
  if (type === 'tenant-config') {
    const tenantId = params.tenant_id?.[0] || '';
    const result = handleTenantConfig(tenantId);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: "error",
    message: "Unknown POST type"
  })).setMimeType(ContentService.MimeType.JSON);
}
```

---

## 🚀 Step 4: Deploy to Production

### Option A: Quick Deploy (Existing Deployment)
1. In Apps Script editor, click **Deploy** (gear icon) → **Manage deployments**
2. Find the active deployment (usually web app)
3. Click **Edit** and select the latest version
4. Click **Deploy**
5. Copy the new **Deployment URL**

### Option B: Create New Deployment
1. Click **Deploy** → **New deployment**
2. Select **Type**: "Web app"
3. Set **Execute as**: Your account
4. Set **Who has access**: "Anyone"
5. Click **Deploy**
6. Copy the new **Deployment URL**

### Update Webhook URL (If Changed)
If you created a new deployment with a new URL:
1. Update `add-to-gsheet.mjs`:
   ```javascript
   const webapp = 'https://script.google.com/macros/s/NEW_DEPLOYMENT_ID/usercontent';
   ```
2. Update any client code that calls the tenant-config endpoint
3. Update `EXECUTE_GO_LIVE_NOW.md` with new URL

---

## 🧪 Step 5: Test the Fix

### Test 1: Valid Tenant
```powershell
$url = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=tenant-config&tenant_id=internal-tenant-1"

$response = Invoke-RestMethod -Uri $url -Method Get

# Expected:
# {
#   "status": "ok",
#   "tenant": { "id": "internal-tenant-1", ... }
# }
```

### Test 2: Invalid Tenant (The Fix)
```powershell
$url = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=tenant-config&tenant_id=unknown-xyz"

$response = Invoke-RestMethod -Uri $url -Method Get

# Expected: ✅ NOW RETURNS ERROR (not DEFAULT_TENANT)
# {
#   "status": "error",
#   "code": "TENANT_NOT_FOUND",
#   "message": "Tenant 'unknown-xyz' not found in registry",
#   "fallback": "not-found"
# }
```

### Test 3: Empty Tenant ID
```powershell
$url = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=tenant-config&tenant_id="

$response = Invoke-RestMethod -Uri $url -Method Get

# Expected:
# {
#   "status": "error",
#   "code": "INVALID_INPUT",
#   "message": "tenant_id is required"
# }
```

---

## ✅ Verification Checklist

- [ ] Accessed Google Apps Script project "FleetPro Online"
- [ ] Located `handleTenantConfig()` function
- [ ] Replaced DEFAULT_TENANT fallback with proper error response
- [ ] Added input validation for tenantId
- [ ] Updated doGet() / doPost() to route tenant-config correctly
- [ ] Deployed code to production
- [ ] Tested with valid tenant → Returns OK
- [ ] Tested with invalid tenant → Returns TENANT_NOT_FOUND error
- [ ] Tested with empty tenant_id → Returns INVALID_INPUT error
- [ ] Updated deployment URL in client code if necessary

---

## 📊 Issue Status

| Step | Status | Notes |
|------|--------|-------|
| 1. Identify Problem | ✅ Complete | DEFAULT_TENANT fallback found |
| 2. Fix Code | ⏳ YOUR ACTION | Apply code replacement in Apps Script |
| 3. Deploy | ⏳ YOUR ACTION | Deploy new version |
| 4. Test | ⏳ YOUR ACTION | Verify with test requests |
| **Final Status** | 🚀 READY | Ready for GO LIVE after completion |

---

## 🔗 Related Issues

- **Issue #2:** Missing `authLogin` handler
- **Issue #3:** Missing `registerUser` handler  
- **Issue #4:** Tenant B (internal-tenant-2) not created in Firestore

See [CRITICAL_FIX_GO_LIVE_20260331.md](CRITICAL_FIX_GO_LIVE_20260331.md) for complete action plan.

---

## 📞 Support

If the Apps Script project is not accessible:
1. Check you have **Editor** permission
2. Verify the correct project: "FleetPro Online"
3. Ask project owner to grant access
4. Try different Google account with project access
