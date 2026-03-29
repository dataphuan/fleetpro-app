tiếp # FleetPro V1 - Deploy Execution Plan (Cloudflare Pages)

Date: 2026-03-29
Owner: Deployment Operator
Target: Cloudflare Pages + Firebase runtime

## A. Current Reality Check

- Local quality gate is green:
  - npm run lint -> PASS
  - npm run typecheck -> PASS
  - npm run build -> PASS
- Branch: master
- Current release baseline commits:
  - e9460c5
  - ff652c2
  - 3a163a8
  - f391a29
  - 1d83472
  - 0f40e2f
  - 093e36d
- Blocking conditions before publish:
  1) Git remote is not configured.
  2) Working tree contains many pending changes unrelated to this release scope.

## B. One-Shot Execution Flow

### Step 1 - Freeze release scope

Goal: avoid shipping unrelated WIP files.

Option recommended:
1. Create a release branch from current HEAD:
   - git checkout -b release/cloudflare-20260329
2. Keep only release-approved commits/files in this branch.
3. If needed, stash unrelated local changes before push.

### Step 2 - Configure GitHub remote

1. Add remote:
   - git remote add origin <YOUR_GITHUB_REPO_URL>
2. Verify:
   - git remote -v
3. Push branch:
   - git push -u origin release/cloudflare-20260329

### Step 3 - Cloudflare Pages project setup

1. Connect repository/branch:
   - repo: FleetPro V1
   - branch: release/cloudflare-20260329 (or main/master by policy)
2. Build settings:
   - Framework: Vite
   - Build command: npm run build
   - Output directory: dist

### Step 4 - Set production env vars in Cloudflare Pages

Set all below in Production and Preview:
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- VITE_FIREBASE_MEASUREMENT_ID
- VITE_DEV_AUTO_LOGIN=false

Security note:
- Never place server-side secrets in VITE_* vars.

### Step 5 - Firebase security baseline apply

Before opening traffic:
1. Apply firestore rules from:
   - firestore.rules
2. Apply indexes from:
   - firestore.indexes.json
3. Confirm tenant isolation behavior with test tenant data.

### Step 6 - Post-deploy smoke test

1. Login with valid Firebase account.
2. Verify tenant-scoped reads/writes:
   - vehicles
   - drivers
   - trips
   - expenses
3. Verify critical pages render:
   - /pricing
   - /driver
   - /portal
4. Verify no runtime calls to removed legacy GAS service in browser network logs.

### Step 7 - Rollback (if incident)

1. Roll back Cloudflare Pages to previous successful deployment.
2. Keep Firestore data untouched.
3. Re-run smoke tests on rollback build.

## C. Exit Criteria

Deployment is considered complete only when all are true:
- Cloudflare deploy successful from release branch
- Firebase env vars correctly applied
- Smoke tests all pass
- No critical auth/tenant leakage observed

## D. Operator Checklist (tick at run time)

- [ ] Release branch created
- [ ] Remote configured
- [ ] Branch pushed to GitHub
- [ ] Cloudflare project linked
- [ ] Env vars configured
- [ ] Firestore rules/indexes applied
- [ ] Smoke tests passed
- [ ] Release marked GO
