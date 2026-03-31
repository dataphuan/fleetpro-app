# 🔧 ISSUE #4 FIX: Manual Steps to Create Firestore Tenants

## ⚠️ Context
The automated script encountered permission issues with the service account. Use the **Firebase Console UI** instead (most reliable method).

## 📋 Quick Steps (3-5 minutes)

### Step 1: Open Firebase Console
1. Navigate to: **https://console.firebase.google.com/project/fleetpro-app/firestore**
2. Select the `fleetpro-app` Firebase project if prompted

### Step 2: Create Tenants Collection
1. Click **"Create collection"** (or **"Start collection"** if empty)
2. Collection ID: `tenants`
3. Click **"Next"**

### Step 3: Add Tenant Document 1
1. Document ID (select "**Auto ID**" dropdown and choose "**Custom ID**"):
   - ID: `internal-tenant-1`
2. Click "**Add field**" and enter these fields:

```
Field Name          Type       Value
────────────────────────────────────────────────
name                String     Tenant Alpha
status              String     active
tier                String     standard
region              String     us-east-1
created_at          Number     1711804800
owner_email         String     admin@tenant-a.example.com
domain              String     tenant-a.example.com
app_name            String     FleetPro Alpha
```

3. Click **"Save"**

### Step 4: Add Tenant Document 2
1. Click **"Add document"** button in the tenants collection
2. Document ID (custom): `internal-tenant-2`
3. Add these fields:

```
Field Name          Type       Value
────────────────────────────────────────────────
name                String     Tenant Beta
status              String     active
tier                String     standard
region              String     us-east-1
created_at          Number     1711804800
owner_email         String     admin@tenant-b.example.com
domain              String     tenant-b.example.com
app_name            String     FleetPro Beta
```

4. Click **"Save"**

## ✅ Verification
After creating both documents, you should see:
- Collection: `tenants`
  - Document: `internal-tenant-1` ✓
  - Document: `internal-tenant-2` ✓

## 🚀 Next Step
After creating the documents, run the Phase C Release Gate test:
```powershell
$webapp = "https://script.google.com/macros/s/AKfycbxAa4tpkPPQdbEPqSd_xv9Wb5U0fpe6nYcwTSfWw-cwwuojRN7mw9lM3rybxjpaldDeCg/exec"
node scripts/online-release-gate.js --webapp $webapp --tenant-a internal-tenant-1 --tenant-b internal-tenant-2
```

Expected result: **6/6 tests PASS** ✓

---

### Alternative: CLI Method (if console doesn't work)
```bash
# Note: These may require authentication setup
firebase firestore:documents:create tenants/internal-tenant-1 \
  --data '{"name":"Tenant Alpha","status":"active","tier":"standard","region":"us-east-1","created_at":1711804800,"owner_email":"admin@tenant-a.example.com","domain":"tenant-a.example.com","app_name":"FleetPro Alpha"}'

firebase firestore:documents:create tenants/internal-tenant-2 \
  --data '{"name":"Tenant Beta","status":"active","tier":"standard","region":"us-east-1","created_at":1711804800,"owner_email":"admin@tenant-b.example.com","domain":"tenant-b.example.com","app_name":"FleetPro Beta"}'
```

---

### Troubleshooting
- **"Permission Denied"** in console? → Check you're logged into the correct Google account tied to fleetpro-app
- **Can't find fleetpro-app project?** → Ensure you're in the correct Google organization/workspace
- **Collection not created?** → Try refreshing the page and clicking "Create collection" again

