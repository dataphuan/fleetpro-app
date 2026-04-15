# 🔧 Firebase Connection Information Standard

**Document Version:** 1.0  
**Last Updated:** March 31, 2026  
**Status:** ✅ ACTIVE STANDARD

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Complete Configuration](#complete-configuration)
3. [Environment Variables Reference](#environment-variables-reference)
4. [Configuration File Locations](#configuration-file-locations)
5. [Verification Checklist](#verification-checklist)
6. [Common Issues & Solutions](#common-issues--solutions)

---

## Overview

The FleetPro application requires **8 mandatory Firebase configuration fields** to connect to the Firebase project. This document defines the standard format and location for all Firebase connection information.

### Project Details

| Field | Value |
|-------|-------|
| **Project Name** | fleetpro-app |
| **Project ID** | `fleetpro-app` |
| **Region** | asia-southeast1 (Singapore) |
| **Services** | Auth, Firestore, Realtime Database, Storage, Analytics |

---

## Complete Configuration

### Standard Format (JavaScript/TypeScript)

```javascript
// src/lib/firebase.ts - CANONICAL SOURCE OF TRUTH

export const firebaseConfig = {
  // 1. Web API Key (public - safe to expose in frontend)
  apiKey: "AIzaSyDYCsMHuHyQSJ0PMTyibPT86SeLAYSdEn4",
  
  // 2. Authentication Domain
  authDomain: "fleetpro-app.firebaseapp.com",
  
  // 3. Realtime Database URL (recently added - DO NOT OMIT)
  databaseURL: "https://fleetpro-app-default-rtdb.asia-southeast1.firebasedatabase.app",
  
  // 4. Project ID
  projectId: "fleetpro-app",
  
  // 5. Cloud Storage Bucket
  storageBucket: "fleetpro-app.firebasestorage.app",
  
  // 6. Cloud Messaging Sender ID
  messagingSenderId: "1094737819291",
  
  // 7. Firebase App ID
  appId: "1:1094737819291:web:15871bf0c228943519f83e",
  
  // 8. Google Analytics Measurement ID (optional but recommended)
  measurementId: "G-H5WZJ5X22T"
};
```

### Environment Variables Format (.env.local / .env)

```bash
# ===== Firebase Web SDK Configuration (Required for Runtime) =====

# 1. Web API Key
VITE_FIREBASE_API_KEY=AIzaSyDYCsMHuHyQSJ0PMTyibPT86SeLAYSdEn4

# 2. Authentication Domain
VITE_FIREBASE_AUTH_DOMAIN=fleetpro-app.firebaseapp.com

# 3. Realtime Database URL
VITE_FIREBASE_DATABASE_URL=https://fleetpro-app-default-rtdb.asia-southeast1.firebasedatabase.app

# 4. Project ID
VITE_FIREBASE_PROJECT_ID=fleetpro-app

# 5. Cloud Storage Bucket
VITE_FIREBASE_STORAGE_BUCKET=fleetpro-app.firebasestorage.app

# 6. Cloud Messaging Sender ID
VITE_FIREBASE_MESSAGING_SENDER_ID=1094737819291

# 7. Firebase App ID
VITE_FIREBASE_APP_ID=1:1094737819291:web:15871bf0c228943519f83e

# 8. Google Analytics Measurement ID
VITE_FIREBASE_MEASUREMENT_ID=G-H5WZJ5X22T
```

### GitHub Actions Secrets Format

All 8 Firebase configuration values must be added as **GitHub Secrets** in the repository:

```
Settings → Secrets and variables → Actions → New repository secret
```

| Secret Name | Value |
|---|---|
| `VITE_FIREBASE_API_KEY` | `AIzaSyDYCsMHuHyQSJ0PMTyibPT86SeLAYSdEn4` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `fleetpro-app.firebaseapp.com` |
| `VITE_FIREBASE_DATABASE_URL` | `https://fleetpro-app-default-rtdb.asia-southeast1.firebasedatabase.app` |
| `VITE_FIREBASE_PROJECT_ID` | `fleetpro-app` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `fleetpro-app.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `1094737819291` |
| `VITE_FIREBASE_APP_ID` | `1:1094737819291:web:15871bf0c228943519f83e` |
| `VITE_FIREBASE_MEASUREMENT_ID` | `G-H5WZJ5X22T` |

---

## Environment Variables Reference

### Field Descriptions

| Variable | Type | Required | Scope | Description |
|----------|------|----------|-------|-------------|
| `VITE_FIREBASE_API_KEY` | String | ✅ YES | Public | Browser-safe API key for web SDK authentication |
| `VITE_FIREBASE_AUTH_DOMAIN` | String | ✅ YES | Public | Domain for OAuth redirects and auth UI |
| `VITE_FIREBASE_DATABASE_URL` | String | ✅ YES | Public | Realtime Database endpoint (recently required) |
| `VITE_FIREBASE_PROJECT_ID` | String | ✅ YES | Public | Firebase project identifier |
| `VITE_FIREBASE_STORAGE_BUCKET` | String | ✅ YES | Public | Cloud Storage bucket for file uploads |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | String | ✅ YES | Public | Cloud Messaging sender ID for notifications |
| `VITE_FIREBASE_APP_ID` | String | ✅ YES | Public | Unique Firebase app identifier |
| `VITE_FIREBASE_MEASUREMENT_ID` | String | ⚠️ Optional | Public | Google Analytics tracking ID |

### Safety Notes

🔓 **PUBLIC VARIABLES** - All 8 Firebase config values are public and safe to expose in frontend code. They are NOT secrets.

🔐 **ACTUAL SECRETS** - Protect these separately:
- Firebase Admin SDK credentials (backend only)
- OAuth credentials for external services
- API keys for third-party services (Cal.com, etc.)
- Google Sheets API credentials

---

## Configuration File Locations

### Production Configuration

| File | Purpose | Status |
|------|---------|--------|
| **src/lib/firebase.ts** | ✅ CANONICAL SOURCE | Hardcoded + env variable fallbacks |
| **.env.local** | ✅ LOCAL DEVELOPMENT | Git-ignored, local machine only |
| **.env.example** | ✅ REPOSITORY TEMPLATE | Public reference with placeholders |
| **ci/deploy-example.yml** | ✅ CI/CD PIPELINE | GitHub Actions secret references |

### File Hierarchy (Priority Order)

```
1. Environment Variables (Runtime)
   ↓ VITE_FIREBASE_* from .env.local
   
2. Hardcoded Fallback (Development)
   ↓ Direct values in src/lib/firebase.ts
   
3. GitHub Actions Secrets (CI/CD)
   ↓ Injected during build process
   
4. Browser localStorage (Session)
   ↓ Persisted for user sessions
```

---

## Verification Checklist

### ✅ Pre-Development Setup

- [ ] Copy `.env.example` → `.env.local`
- [ ] Update all 8 `VITE_FIREBASE_*` values in `.env.local`
- [ ] Run `npm run build` to verify no env var errors
- [ ] Test login functionality with demo accounts

### ✅ Code Configuration Verification

**In src/lib/firebase.ts:**
```bash
# Check for all 8 config fields
grep -E "apiKey|authDomain|databaseURL|projectId|storageBucket|messagingSenderId|appId|measurementId" src/lib/firebase.ts
```

**Expected output:** All 8 fields present ✅

### ✅ Environment Variables Verification

```bash
# Check .env.local has all variables
grep "^VITE_FIREBASE_" .env.local | wc -l
# Expected: 8 lines

# Verify no placeholder values in .env.local
grep "REPLACE_" .env.local
# Expected: (empty - no matches)
```

### ✅ GitHub Secrets Verification

```bash
# List all Firebase secrets in GitHub
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/your-org/repo/actions/secrets
```

**Expected:** All 8 VITE_FIREBASE_* secrets present

### ✅ Runtime Verification

```javascript
// Open Browser DevTools Console (F12)
Object.keys(window.firebaseConfig)
// Expected: 8 keys (apiKey, authDomain, databaseURL, projectId, etc.)

// Verify specific field
import { firebaseConfig } from './lib/firebase.ts'
console.log(firebaseConfig.databaseURL)
// Expected: https://fleetpro-app-default-rtdb.asia-southeast1.firebasedatabase.app
```

### ✅ Build Verification

```bash
npm run build 2>&1 | tail -20
```

**Expected Output:**
```
done in 22.87s
✓ 4,179 modules transformed, 0 errors
```

---

## Common Issues & Solutions

### Issue 1: `auth/api-key-not-valid`

**Symptoms:**
- Login fails with error: `auth/api-key-not-valid`
- All auth attempts fail immediately

**Root Causes:**
1. Missing `VITE_FIREBASE_DATABASE_URL` in .env.local
2. Empty/null VITE_FIREBASE_API_KEY variable
3. Typo in Firebase config object

**Solution:**
```bash
# 1. Verify .env.local has exact 8 lines
grep "VITE_FIREBASE_" .env.local | wc -l  # Should be 8

# 2. Check databaseURL specifically
grep "VITE_FIREBASE_DATABASE_URL" .env.local

# 3. Rebuild
rm -rf dist
npm run build

# 4. Hard refresh browser (Ctrl+Shift+R on Windows/Linux, Cmd+Shift+R on Mac)
```

### Issue 2: `auth/too-many-requests`

**Symptoms:**
- Error after 5+ failed login attempts
- Blocks login for specified period

**Root Causes:**
- Firebase rate limiting (security feature)
- Testing multiple accounts rapidly

**Solution:**
```
✅ Wait 5-10 minutes for Firebase to auto-reset rate limit
   (This proves the API Key IS valid)
   
✅ Clear browser cache & cookies:
   - Press Ctrl+Shift+Delete
   - Select "All time" for time range
   - Check: Cookies, Cached images/files
   - Click "Clear data"
   
✅ Refresh page: Ctrl+F5
```

### Issue 3: `TypeError: Cannot read property 'databaseURL'`

**Symptoms:**
- Build fails or app crashes on startup
- Error mentions undefined `databaseURL`

**Root Cause:**
- `VITE_FIREBASE_DATABASE_URL` missing from config object

**Solution:**
```bash
# Verify src/lib/firebase.ts has databaseURL field
grep -A 2 "databaseURL" src/lib/firebase.ts

# Should show:
# databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 
# 'https://fleetpro-app-default-rtdb.asia-southeast1.firebasedatabase.app'
```

### Issue 4: Environment Variables Not Loaded

**Symptoms:**
- Build succeeds but variables are undefined
- `process.env` shows empty values

**Root Causes:**
- Variables named without `VITE_` prefix
- .env file not saved
- Node process not restarted

**Solution:**
```bash
# CORRECT naming convention (must start with VITE_)
✅ VITE_FIREBASE_API_KEY=...
❌ FIREBASE_API_KEY=...

# Restart dev server
npm run dev

# Clear node_modules cache
rm -rf node_modules/.vite
npm run build
```

---

## Reference: Field Definitions

### 1. apiKey (Web API Key)
- **What:** Browser-safe authentication key for web SDK
- **Where to find:** Firebase Console → Project Settings → General → Web API Key
- **Format:** Long alphanumeric string starting with "AIzaSy..."
- **Safety:** PUBLIC - OK to expose in frontend code
- **Example:** `AIzaSyDYCsMHuHyQSJ0PMTyibPT86SeLAYSdEn4`

### 2. authDomain
- **What:** Domain used for OAuth redirects and authentication UI
- **Where to find:** Firebase Console → Project Settings → General → Auth Domain
- **Format:** `{PROJECT_ID}.firebaseapp.com`
- **Safety:** PUBLIC
- **Example:** `fleetpro-app.firebaseapp.com`

### 3. databaseURL ⭐ (RECENTLY ADDED)
- **What:** Endpoint for Realtime Database operations
- **Where to find:** Firebase Console → Database → Copy URL
- **Format:** `https://{PROJECT_ID}-default-rtdb.{REGION}.firebasedatabase.app`
- **Regions:** asia-southeast1, us-central1, europe-west1, asia-northeast1, etc.
- **Safety:** PUBLIC
- **Note:** Previously missing - now REQUIRED for complete Firebase setup
- **Example:** `https://fleetpro-app-default-rtdb.asia-southeast1.firebasedatabase.app`

### 4. projectId
- **What:** Unique project identifier in Firebase Console
- **Where to find:** Firebase Console → Project Settings → General → Project ID
- **Format:** Lowercase alphanumeric with hyphens
- **Safety:** PUBLIC
- **Example:** `fleetpro-app`

### 5. storageBucket
- **What:** Cloud Storage bucket for file uploads/downloads
- **Where to find:** Firebase Console → Storage → Bucket name
- **Format:** `{PROJECT_ID}.appspot.com`
- **Safety:** PUBLIC
- **Example:** `fleetpro-app.firebasestorage.app`

### 6. messagingSenderId
- **What:** Identifier for Cloud Messaging service
- **Where to find:** Firebase Console → Project Settings → General → Sender ID
- **Format:** Numeric string
- **Safety:** PUBLIC
- **Example:** `1094737819291`

### 7. appId
- **What:** Unique identifier for this web app instance
- **Where to find:** Firebase Console → Project Settings → General → App ID
- **Format:** `1:{SENDER_ID}:web:{HEX_STRING}`
- **Safety:** PUBLIC
- **Example:** `1:1094737819291:web:15871bf0c228943519f83e`

### 8. measurementId (Optional)
- **What:** Google Analytics tracking ID
- **Where to find:** Firebase Console → Project Settings → General → Measurement ID
- **Format:** `G-` prefix followed by alphanumeric string
- **Safety:** PUBLIC
- **Optional:** Only needed if using Firebase Analytics
- **Example:** `G-H5WZJ5X22T`

---

## Update History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-31 | Initial standard document, added databaseURL as required field |

## Related Documents

- [FIREBASE_API_KEY_FIX_GUIDE.md](FIREBASE_API_KEY_FIX_GUIDE.md) - Detailed troubleshooting
- [FIREBASE_CONFIG_FIXED_20260331.md](FIREBASE_CONFIG_FIXED_20260331.md) - Configuration history
- [AUTH_FIXES_COMPLETED_20260331.md](AUTH_FIXES_COMPLETED_20260331.md) - Authentication fixes
- [.env.example](../.env.example) - Template with all 8 fields

---

**Last Verified:** 2026-03-31  
**Next Review:** 2026-04-30  
**Maintained By:** Development Team
