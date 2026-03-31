# Firestore Data Setup Guide
**FleetPro V1 | Date: 2026-03-30**

---

## 🔍 Discovery: Apps Script is Working Correctly

From diagnostic script results:

✅ **Apps Script endpoints ARE responding**  
✅ **Error codes are correct** (returning `tenant_not_found` for missing tenants)  
✅ **Auth endpoints exist** (not throwing "Unknown POST type")

❌ **Problem:** Firestore database doesn't have test data set up

---

## 🚀 Quick Setup: Create Firestore Documents

### Using Firebase Console (Easiest)

1. Go to: https://console.firebase.google.com/project/fleetpro-app/firestore
2. Create collection: `tenants`

**Create Document 1: internal-tenant-1**
```json
{
  "name": "Tenant Alpha",
  "status": "active",
  "tier": "standard",
  "region": "us-east-1",
  "created_at": 1711804800,
  "owner_email": "admin@tenant-a.example.com"
}
```

**Create Document 2: internal-tenant-2**
```json
{
  "name": "Tenant Beta",
  "status": "active",
  "tier": "standard",
  "region": "us-east-1",
  "created_at": 1711804800,
  "owner_email": "admin@tenant-b.example.com"
}
```

### Using Firebase CLI (For Deep Integration)

```powershell
# Set project
firebase use --add

# Create tenants collection with documents programmatically
firebase firestore:delete tenants --recursive --yes
firebase firestore:documents:create tenants/internal-tenant-1 --data '{
  "name": "Tenant Alpha",
  "status": "active"
}'

# Verify
firebase firestore:documents:list tenants
```

### Using TypeScript/Node (For CI/CD)

```bash
# Create file: setup-firestore.js
const admin = require('firebase-admin');

// Initialize Firebase (requires credentials)
const serviceAccount = require('./credentials.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function setupTestData() {
  // Create Tenant A
  await db.collection('tenants').doc('internal-tenant-1').set({
    name: 'Tenant Alpha',
    status: 'active',
    tier: 'standard',
    region: 'us-east-1'
  });

  // Create Tenant B
  await db.collection('tenants').doc('internal-tenant-2').set({
    name: 'Tenant Beta',
    status: 'active',
    tier: 'standard',
    region: 'us-east-1'
  });

  console.log('✅ Firestore setup complete');
}

setupTestData().catch(console.error);
```

---

## ✅ ACTUAL ACTION: Unblock Phase B Immediately

Since the issue is **data setup (not code bugs)**, here's what needs to happen:

### OPTION 1: Manual Setup (5 mins) - FASTEST

**Do this NOW in Firebase Console:**

1. Open: https://console.firebase.google.com/project/fleetpro-app/firestore

2. Create collection: `tenants`

3. Add two documents:
   - `internal-tenant-1` with fields: name, status="active"
   - `internal-tenant-2` with fields: name, status="active"

4. Retest with curl:
   ```
   curl -X POST https://script.google.com/.../exec \
     -H "Content-Type: application/json" \
     -d '{"action":"tenant-config","tenant_id":"internal-tenant-1"}'
   ```
   Expected: Returns tenant info (not error)

---

## 📋 Revised Blocking Issues Assessment

Based on diagnostic script:

| # | Issue | Previous Assessment | Actual State | Fix Required |
|---|-------|---------------------|--------------|--------------|
| 1 | Tenant fallback | Apps Script bug | ✅ Working correctly | ✈️ Setup Firestore data |
| 2 | authLogin endpoint | Not implemented | ✅ Handler exists | ✈️ Add test users to Firestore |
| 3 | registerUser endpoint | Not implemented | ✅ Handler exists | ✈️ Firestore ready for user creation |
| 4 | Tenant B missing | Need to create | ✅ Just needs data | ✈️ Create in Firestore NOW |

**CRITICAL DISCOVERY:** The blockers are **NOT code issues** but **data setup issues**

---

## 🎯 NEW CRITICAL PATH

### TODAY (2026-03-30)

```
NOW   → Manual: Create 2 tenant documents in Firestore (5 mins)
10:00 → Verify by re-running diagnostic
10:15 → Phase B Level 1 Health Check (SHOULD PASS NOW)
16:00 → READY FOR TOMORROW
```

---

## 📝 Manual Steps (Copy-Paste Ready)

### Step 1: Open Firestore

```
1. Go to: https://console.firebase.google.com/
2. Select project: fleetpro-app
3. Click "Firestore Database" (left menu)
4. Click "Create collection"
```

### Step 2: Create Collection "tenants"

```
Collection name: tenants
Click Create Collection
First Document ID: internal-tenant-1
```

### Step 3: Add Fields to internal-tenant-1

```
Add Field:
  name (String) = "Tenant Alpha"
  status (String) = "active"
  tier (String) = "standard"
  region (String) = "us-east-1"
```

### Step 4: Create Second Document

```
Click "Add document"
Document ID: internal-tenant-2

Add Field:
  name (String) = "Tenant Beta"
  status (String) = "active"
  tier (String) = "standard"
  region (String) = "us-east-1"
```

### Step 5: Verify

```powershell
# Run diagnostic again
powershell -ExecutionPolicy Bypass .\scripts\diagnose-blocking-issues.ps1
```

Expected output:
```
✅ PASS: Tenant A resolves correctly
✅ PASS: Unknown tenant returns error correctly
✅ All critical blockers appear to be FIXED!
```

---

## 🚨 IF IT'S STILL NOT WORKING

**Check:**
1. Firestore rules - Are they too restrictive?
   - Go to: Firestore Rules tab
   - Verify: Allow reads/writes to `tenants` collection
   
2. Is the apps script reading from correct database?
   - Check Apps Script console for connection errors
   
3. Are documentIDs exact?
   - Must be: `internal-tenant-1` (not `internal_tenant_1`)

---

## ✅ POST-SETUP CHECKLIST

Once Firestore has 2 tenant documents:

- [ ] Re-run diagnostic script
- [ ] Verify all 4 "blockers" now resolve
- [ ] Run Phase B Health Check at 16:00
- [ ] Expected: PASS → Ready for tomorrow

---

**Time to Fix:** 5-10 minutes (faster than expected!)  
**Blocker Status:** Changed from **code bugs** to **data setup**  
**Impact:** Timeline moved UP by ~3 hours!  
**Next:** Manual Firestore setup NOW, then Phase B at 16:00

