# Firebase-Only Runbook (Go-Live)

## Scope
- Runtime uses Firebase Auth + Firestore + Storage only.
- No Google Apps Script / Google Sheets in production.

## Preflight
1) Verify Firebase env vars in Cloudflare Pages:
   - VITE_FIREBASE_API_KEY
   - VITE_FIREBASE_AUTH_DOMAIN
   - VITE_FIREBASE_PROJECT_ID
   - VITE_FIREBASE_STORAGE_BUCKET
   - VITE_FIREBASE_MESSAGING_SENDER_ID
   - VITE_FIREBASE_APP_ID
   - VITE_FIREBASE_MEASUREMENT_ID

2) Verify domain
- https://tnc.io.vn resolves to Cloudflare Pages and HTTPS is OK.

## Data Readiness
1) Firestore collections must exist:
   - tenants, users, vehicles, drivers, customers, routes, trips, expenses, maintenance
2) Every document has:
   - tenant_id, created_at, updated_at

## Auth Readiness
1) Firebase Auth users exist for demo/testing
2) Firestore users/{uid} contains:
   - email, full_name, role, tenant_id, status

## Release Gate (Firebase-only)
1) Build locally
- npm run lint
- npm run typecheck
- npm run build

2) Manual smoke (browser)
- Login, dashboard, vehicles, drivers, trips, reports
- No console errors

## Go-Live
1) Deploy Cloudflare Pages
2) Verify https://tnc.io.vn/auth
3) Verify login and primary flows

## Post-Deploy
- Monitor errors in browser console
- Check Firestore usage and quotas
