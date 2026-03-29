# FleetPro V1 Online - Full Cleanup Release Notes

Date: 2026-03-28
Scope: Full cleanup and hardening for Cloudflare Pages deployment.
Branch: master

## 1. Executive Summary

This release completes a full cleanup wave to stabilize production deployment on Cloudflare Pages with Firebase-first runtime.

Key outcomes:
- Security hardening completed (removed hardcoded login bypass paths).
- Legacy GAS runtime dependencies removed from active frontend flows.
- Dead code and noisy lint configuration cleaned.
- Build, typecheck, and lint gates all passing.
- Firestore rules/index artifacts added for tenant isolation baseline.

## 2. Included Commits

- ff652c2 chore: finalize lint cleanup and remove noisy script directives
- 3a163a8 chore: remove dead GAS context/service and simplify env template
- f391a29 refactor: remove GAS dependency from tenant context and cloud settings
- 1d83472 security: remove admin bypass and document cloudflare+firebase architecture
- 0f40e2f feat(security): add firestore rules, indexes, and tenant isolation test gate
- 093e36d chore(qa): unblock lint errors and add firestore migration execution plan

## 3. Functional/Code Changes

### Security
- Removed hardcoded admin bypass flows from frontend auth-related data paths.
- Added Firestore security baseline artifacts:
  - firestore.rules
  - firestore.indexes.json
  - tests/firestore.rules.test.cjs

### Runtime Architecture
- Removed legacy runtime dependency files no longer used by active code path.
- Migrated tenant/cloud settings behavior toward Firebase-first checks.
- Maintained compatibility for current app pages while deprecating GAS runtime usage.

### Codebase Hygiene
- Deleted dead context/service files no longer referenced.
- Simplified env template for Firebase-first production setup.
- Removed noisy script-level eslint directives and tuned lint config for cleaner CI output.

## 4. QA/Verification Result

Validated locally after cleanup:
- npm run lint -> PASS
- npm run typecheck -> PASS
- npm run build -> PASS

Result: frontend bundle is deploy-ready for Cloudflare Pages.

## 5. Cloudflare Pages Deployment Runbook (One-shot)

### Step A - Build Configuration
- Framework preset: Vite
- Build command: npm run build
- Output directory: dist

### Step B - Required Environment Variables
Set in Cloudflare Pages (Production and Preview):
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- VITE_FIREBASE_MEASUREMENT_ID

Important:
- Do not place server-side secrets in VITE_ variables.
- Treat previously exposed tokens/keys as compromised and rotate immediately.

### Step C - Firebase Data/Security Baseline
Apply and verify:
- Firestore rules from firestore.rules
- Firestore indexes from firestore.indexes.json

### Step D - Smoke Test After Deploy
- Login with valid Firebase account.
- Verify tenant-scoped data read/write.
- Verify Vehicles/Drivers/Trips list and mutation flow.
- Verify Pricing/Paywall pages render correctly.
- Verify mobile driver route and customer portal route still load.

### Step E - Rollback
- Roll back Cloudflare Pages deployment to previous healthy build.
- Keep Firestore data intact; only rollback frontend artifact.

## 6. Known Operational Notes

- Firestore emulator tests require Java runtime installed locally.
- Git remote was not configured in this workspace at the time of cleanup; push must be done after adding remote.

## 7. Files Most Relevant to This Release

- src/lib/data-adapter.ts
- src/components/settings/GDriveSettingsForm.tsx
- eslint.config.js
- .env.example
- firestore.rules
- firestore.indexes.json
- tests/firestore.rules.test.cjs
- docs/ONLINE_ARCHITECTURE_CLOUDFLARE_FIREBASE.md
- docs/FIRESTORE_MIGRATION_EXECUTION_PLAN.md
