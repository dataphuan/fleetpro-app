## ⚠️ Deprecated

This runbook previously referenced Apps Script/GAS. The project is now Firebase-only.

Use the Firebase-only runbook instead:

See: docs/FIREBASE_ONLY_RUNBOOK.md
   {"status":"ok",...registerUser...}
```

### 1E: Deploy to Production
```
1. Click: Deploy → New deployment → Type: Web app
2. Execute as: [Your Service Account]
3. Who has access: Anyone
4. Click: Deploy
5. Copy the new deployment URL
6. ✅ Note new URL for STEP 4
```

**⏱️ Time Check: Should be ~20 min. Continue to Step 2 if success.**

---

## 🔥 STEP 2: CREATE FIRESTORE TENANT B (10 minutes)

### 2A: Open Firebase Console
```
URL: https://console.firebase.google.com/project/fleetpro-app/firestore/data
```

### 2B: Create Document: tenants/internal-tenant-2
```
1. Click: + Add collection
2. Collection name: tenants (if doesn't exist)
3. Document ID: internal-tenant-2
4. Click: Auto ID or type "internal-tenant-2"
5. Add fields:

   Field Name          | Type      | Value
   ─────────────────────────────────────────────
   name                | String    | "Tenant B - Test"
   status              | String    | "active"
   created_at          | Timestamp | (current time)
   max_vehicles        | Number    | 50
   max_users           | Number    | 20

6. Click: Save
```

### 2C: Verify Tenant B Created
```
In Firestore console, navigate to:
Collections → tenants → Check if "internal-tenant-2" exists ✅

If YES → Continue to Step 3
If NO → Repeat 2B
```

**⏱️ Time Check: Should be ~10 min. Continue to Step 3 if success.**

---

## ✅ STEP 3: VERIFY DEPLOYMENTS (5 minutes)

### 3A: Copy Your Apps Script Deployment URL
```
From Google Apps Script:
Click: Deploy (top right)
Copy the URL from dialog
Should look like: https://script.google.com/macros/s/AKfycbxAa4...
```

### 3B: Test Apps Script is Reachable
```powershell
# In PowerShell terminal:
$url = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=tenant-config&tenant_id=internal-tenant-1"
Invoke-WebRequest -Uri $url

# Should return HTTP 200 ✅
```

### 3C: Quick Sanity Test
```powershell
# Test unknown tenant returns ERROR (not default)
$url = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=tenant-config&tenant_id=unknown-xyz"
Invoke-WebRequest -Uri $url

# Should show: "code":"TENANT_NOT_FOUND" ✅
```

**⏱️ Time Check: Should be ~5 min. Continue to Step 4 if all tests pass.**

---

## 🧪 STEP 4: RUN RELEASE GATE TEST (5 minutes)

### 4A: Update Apps Script URL in Command
```powershell
# Replace YOUR_DEPLOYMENT_ID with actual ID from Step 3A
$webappUrl = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"

node scripts/online-release-gate.js `
  --webapp $webappUrl `
  --tenant-a internal-tenant-1 `
  --tenant-b internal-tenant-2
```

### 4B: Check Results

**Expected Output:**
```
✅ Tenant A resolver: PASS
✅ Unknown tenant error: PASS  ← FIX #1 VERIFIED
✅ Tenant B resolver: PASS
✅ authLogin endpoint: PASS    ← FIX #2 VERIFIED
✅ registerUser endpoint: PASS ← FIX #3 VERIFIED
```

**If ALL PASS:** 🎉 Proceed to Step 5

**If ANY FAIL:** 
- [ ] Go back to Step 1 - check Apps Script code
- [ ] Verify all 3 functions are in doPost()
- [ ] Redeploy Apps Script: Deploy → New deployment

**⏱️ Time Check: Should be ~5 min. Continue to Step 5 if PASS.**

---

## 📊 STEP 5: RUN FULL AUDIT TESTS (90 minutes)

### 5A: Level 1 - Health Check (5 min)
```powershell
node scripts/online-health-check.js --endpoint https://fleetpro-app.pages.dev

# Expected: ✅ PASS
# If FAIL → Check endpoint is correct
```

### 5B: Level 2 - Release Gate (Already done in Step 4)
```powershell
# This passed in Step 4, so ✅ PASS
```

### 5C: Level 3 - Full Smoke Test (60 min)
```powershell
.\scripts\qa-full-check.ps1

# Expected: ≥5/6 modules PASS
# If FAIL → Check [QA_AUDIT_COMMAND_REFERENCE.md](docs/QA_AUDIT_COMMAND_REFERENCE.md) for debugging
```

### 5D: Level 4 - RBAC Security Matrix (30 min)
```powershell
npm run test:security-matrix

# Expected: 20/20 RBAC test cases PASS
# If FAIL → Check security-matrix documentation
```

**⏱️ Time Check: Should be ~90 min. Continue to Step 6 if all levels pass.**

---

## ✅ STEP 6: FINAL VERIFICATION (10 minutes)

### 6A: Checklist - All Issues Fixed
- [ ] Issue #1: Tenant fallback returns ERROR for unknown (✅ Verified in Step 4)
- [ ] Issue #2: authLogin endpoint exists & works (✅ Verified in Step 4)
- [ ] Issue #3: registerUser endpoint exists & works (✅ Verified in Step 4)
- [ ] Issue #4: Tenant B in Firestore (✅ Verified in Step 2)

### 6B: Checklist - All Audit Levels Pass
- [ ] Level 1 Health Check: ✅ PASS
- [ ] Level 2 Release Gate: ✅ PASS
- [ ] Level 3 Full Smoke: ✅ PASS (≥5/6)
- [ ] Level 4 RBAC Matrix: ✅ PASS (20/20)

### 6C: Sign-off Required
- [ ] Backend Engineer: Code fixes verified ✅
- [ ] QA Lead: All tests passed ✅
- [ ] DevOps: Ready to deploy ✅
- [ ] Project Manager: GO-LIVE approved ✅

**If all ✅ → Proceed to Step 7**

---

## 🚀 STEP 7: DEPLOY TO PRODUCTION (5 minutes)

### 7A: Build Frontend
```powershell
npm run build

# Expected: ✅ SUCCESS in 40-50 seconds
```

### 7B: Deploy to Cloudflare Pages
```powershell
# Option 1: Using npm script (if configured)
npm run deploy

# Option 2: Manual Cloudflare deployment
# Go to: https://dash.cloudflare.com/
# Select: fleetpro-app
# Deploy dist/ folder
```

### 7C: Verify Production is Live
```powershell
# Health check on production
node scripts/online-health-check.js --endpoint https://fleetpro-app.pages.dev

# Expected: ✅ PASS (HTTP 200)
```

### 7D: Final Release Gate on Production
```powershell
$webappUrl = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"

node scripts/online-release-gate.js `
  --webapp $webappUrl `
  --tenant-a internal-tenant-1 `
  --tenant-b internal-tenant-2

# Expected: ✅ ALL PASS
```

### 7E: Document GO-LIVE
```
Create file: docs/GO_LIVE_SIGNED_OFF_20260331.md
Include:
- Timestamp of deployment
- Build commit hash
- All 4 issues fixed
- All audit levels passed
- Team sign-offs
```

**🎉 GO-LIVE COMPLETE!**

---

## 🚨 TROUBLESHOOTING QUICK REFERENCE

| Problem | Solution |
|---------|----------|
| Apps Script deploy fails | → Check you have Editor permission, try "New deployment" again |
| Tenant B creation fails | → Check you're in correct Firebase project (fleetpro-app), use correct collection name |
| Release Gate test fails | → apps Script URL wrong? Run testHandlers() in Apps Script console to verify |
| Full Smoke test fails | → Use QA_AUDIT_COMMAND_REFERENCE.md for module-by-module debugging |
| RBAC Matrix fails | → Check token setup, use docs/QA_AUDIT_COMMAND_REFERENCE.md |
| Production deploy fails | → Check Cloudflare credentials, verify dist/ has files |

---

## 📋 FINAL CHECKLIST

- [ ] Step 1: Apps Script fixes deployed ✅
- [ ] Step 2: Firestore Tenant B created ✅
- [ ] Step 3: Deployments verified ✅
- [ ] Step 4: Release Gate test PASS ✅
- [ ] Step 5: All audit levels PASS ✅
- [ ] Step 6: Final verification complete ✅
- [ ] Step 7: Production deployment live ✅

---

## ⏰ TIME TRACKING

```
START TIME:     ________
Step 1 Done:    ________ (should be +20 min)
Step 2 Done:    ________ (should be +10 min)
Step 3 Done:    ________ (should be +5 min)
Step 4 Done:    ________ (should be +5 min)
Step 5 Done:    ________ (should be +90 min)
Step 6 Done:    ________ (should be +10 min)
Step 7 Done:    ________ (should be +5 min)
TOTAL:          ________ (should be ~145 min)
```

---

## 💬 STATUS UPDATE

**When you finish each step, report back:**

✅ "Step 1 complete - Apps Script deployed"  
✅ "Step 2 complete - Tenant B created"  
✅ "Step 3 complete - Deployments verified"  
✅ "Step 4 complete - Release Gate PASS"  
✅ "Step 5 complete - All audit levels PASS"  
✅ "Step 6 complete - Final verification done"  
✅ "Step 7 complete - LIVE IN PRODUCTION! 🚀"

---

**START WITH STEP 1 NOW! ⏱️**

```
👉 Open: APPS_SCRIPT_FIXES.js
👉 Copy code
👉 Paste into Google Apps Script
👉 Deploy
👉 Report back with deployment URL
```

**TIME STARTS NOW!** ⏳
