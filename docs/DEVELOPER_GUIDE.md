# FleetPro — Developer Guide

## Prerequisites

- Node.js 18+
- npm 9+
- Firebase CLI: `npm install -g firebase-tools`
- Git

## Local Development Setup

### 1. Clone & Install

```bash
git clone https://github.com/dataphuan/fleetpro-app.git
cd fleetpro-app
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in Firebase config:

```bash
cp .env.example .env.local
```

Required variables:
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=fleetpro-app
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 3. Generate Seed Data

The seed data file is **not committed to git** (730KB). You must generate it:

```bash
node scripts/generate-tenant-demo-seed.mjs
```

This creates:
- `src/data/tenantDemoSeed.ts` — TypeScript import for the build
- `scripts/tenantDemoSeed.json` — JSON for admin scripts

### 4. Start Dev Server

```bash
npm run dev
# → http://localhost:5173
```

---

## Build & Deploy

### Production Build
```bash
npm run build
# Output: dist/
```

### Cloudflare Pages
Production auto-deploys on `git push origin main`. The build is handled by Cloudflare Pages:
- Build command: `npm run build`
- Output directory: `dist`
- Node version: 18

### Firestore Rules
```bash
npx firebase deploy --only firestore:rules
```

### Cloud Functions
```bash
cd functions
npm install
npm run deploy
```

---

## Admin Scripts

All admin scripts require `fleetpro-app-service-account.json` in the project root. **This file is gitignored** — get it from Firebase Console → Settings → Service Accounts.

### Seed Demo Data (Admin SDK)
Bypasses Firestore rules. Seeds both internal tenants:
```bash
node scripts/admin-seed-demo.mjs
```

Seed a specific tenant:
```bash
node scripts/admin-seed-demo.mjs internal-tenant-phuan
```

### Cleanup Garbage Data
Deletes all documents from non-whitelisted tenants:
```bash
node scripts/admin-cleanup-garbage.mjs
```

### Regenerate Seed Data
When you change the seed generator logic:
```bash
node scripts/generate-tenant-demo-seed.mjs
```

---

## Key File Reference

| File | Size | Purpose |
|---|---|---|
| `src/lib/data-adapter.ts` | 147KB | ALL Firestore CRUD, seed logic, auth flow |
| `src/contexts/AuthContext.tsx` | — | Global auth state, tenant resolution |
| `src/lib/rbac.ts` | — | Role definitions, permission checks |
| `src/lib/schemas.ts` | — | Zod validation for all forms |
| `src/config/constants.ts` | — | Feature flags, tenant whitelist |
| `firestore.rules` | 7.6KB | Server-side security rules |

---

## Common Tasks

### Add a New Page
1. Create `src/pages/MyPage.tsx`
2. Add route in `src/App.tsx`
3. Add menu item in `src/components/layout/AppSidebar.tsx`
4. Add RBAC permission in `AppSidebar.tsx` route map

### Add a New Firestore Collection
1. Add collection name to `firestore.rules` → `isAllowedCollection()`
2. Add `createFirestoreAdapter('myCollection')` call in `data-adapter.ts`
3. Create hook in `src/hooks/useMyCollection.ts`
4. Add to `clearTenantOperationalData` wipe list (if demo-resetable)
5. Add to seed generator if demo data needed

### Add a New Role
1. Define in `src/lib/rbac.ts`
2. Add route access in `AppSidebar.tsx`
3. Update `firestore.rules` if role-specific access needed

### Debug "Permission Denied" Errors
1. Check Firestore rules → `isAllowedCollection()` whitelist
2. Check user doc → `tenant_id` field must be set
3. Check document → `tenant_id` must match user's tenant
4. Use Firebase Console → Rules Playground to simulate

---

## Testing Checklist

Before pushing to production:

```bash
# TypeScript check
npx tsc --noEmit

# Build check
npm run build

# Manual smoke test (4 roles)
# 1. Admin: Dashboard, Settings, Demo Tool
# 2. Manager: Dispatch, Trips
# 3. Accountant: Expenses, Reports
# 4. Driver: DriverDashboard (mobile view)
```

---

## Tenant Management

### Current Tenants
| ID | Domain | Plan |
|---|---|---|
| `internal-tenant-1` | tnc.io.vn | Enterprise (demo) |
| `internal-tenant-phuan` | phuan.tnc.io.vn | Enterprise |

### New Tenant Registration
New tenants are created automatically when a user registers:
1. User signs up on the landing page
2. `AuthContext` creates a new tenant ID: `tenant-{randomId}`
3. `ensureTenantDemoReadiness()` seeds demo data if it's a demo tenant
4. User gets 14-day trial with full features

### Custom Domain
Configure in Cloudflare Pages → Custom Domains. The app reads `window.location.hostname` to resolve tenant-specific branding.
